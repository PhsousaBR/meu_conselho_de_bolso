
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { createClient, seedHistoricalRevenue, deleteImportedIncomesByYears } from '../services/dataService';
import { IncomeStatus } from '../types';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { ICONS } from '../constants';
import { parseMoneyBR } from '../utils/formatters';

const ImportData: React.FC = () => {
    const { isOwner, workspace } = useWorkspace();
    const [log, setLog] = useState<string[]>([]);
    const [uploading, setUploading] = useState(false);
    const [userEmail, setUserEmail] = useState<string | null>(null);

    // Import State
    const [parsedData, setParsedData] = useState<any[]>([]);
    const [detectedYears, setDetectedYears] = useState<number[]>([]);
    const [previewStats, setPreviewStats] = useState({ totalRows: 0, totalValue: 0, validRows: 0 });
    const [step, setStep] = useState<'upload' | 'preview' | 'processing' | 'done'>('upload');
    const [importMode, setImportMode] = useState<'append' | 'replace' | 'delete'>('append');

    // History Management State
    const [activeTab, setActiveTab] = useState<'import' | 'history'>('import');
    const [availableYears, setAvailableYears] = useState<number[]>([]);
    const [selectedHistoryYears, setSelectedHistoryYears] = useState<number[]>([]);

    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
            setUserEmail(data.session?.user?.email || null);
        });
        if (workspace?.id) fetchAvailableYears();
    }, [workspace?.id]);

    const fetchAvailableYears = async () => {
        // Find years with imported data
        // Uses a trick: select distinct years from data where is_imported = true
        // But supabase JS is cleaner with RPC or just fetching all dates (if small)
        // For efficiency, we'll try to get dates range or just last 5 years.
        // Let's just fetch all dates of is_imported=true to extract years (could be heavy if huge data, but ok for now)
        const { data, error } = await supabase
            .from('income')
            .select('date')
            .eq('workspace_id', workspace?.id)
            .eq('is_imported', true);

        if (data) {
            const years = new Set<number>();
            data.forEach((d: any) => years.add(new Date(d.date).getFullYear()));
            setAvailableYears(Array.from(years).sort().reverse());
        }
    };

    const handleFilesSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        if (!isOwner) {
            setLog(['Erro: Apenas o dono pode importar dados.']);
            return;
        }

        setUploading(true);
        setLog(['Lendo arquivos...']);
        setParsedData([]);
        setDetectedYears([]);

        let allRows: any[] = [];
        let allYears = new Set<number>();
        let totalVal = 0;

        for (let i = 0; i < files.length; i++) {
            const text = await files[i].text();
            const { rows, distinctYears } = parseCSVContent(text, files[i].name);
            allRows = [...allRows, ...rows];
            distinctYears.forEach(y => allYears.add(y));
        }

        // Calculate Total Value
        totalVal = allRows.reduce((acc, r) => acc + r.amount, 0);

        setParsedData(allRows);
        setDetectedYears(Array.from(allYears).sort());
        setPreviewStats({
            totalRows: allRows.length, // Valid "ENTRADA" rows
            totalValue: totalVal,
            validRows: allRows.length
        });

        setStep('preview');
        setUploading(false);
    };

    const parseCSVContent = (text: string, fileName: string) => {
        const firstLine = text.split('\n')[0];
        const delimiter = firstLine.includes(';') ? ';' : ',';
        const lines = text.split('\n');

        // Normalize headers
        const headers = lines[0].replace(/^\uFEFF/, '').toLowerCase().split(delimiter).map(h => h.trim());
        const getIndex = (keys: string[]) => headers.findIndex(h => keys.some(k => h.includes(k)));

        const dateIdx = getIndex(['data_lancamento', 'data', 'date']);

        // Priority: 'valor' (usually clean), then 'valor_br'
        const amountIdx = getIndex(['valor', 'amount']);
        const amountBrIdx = getIndex(['valor_br']);

        const typeIdx = getIndex(['tipo_linha', 'type']);
        const descIdx = getIndex(['descricao', 'description', 'obs']);

        if (dateIdx === -1 || (amountIdx === -1 && amountBrIdx === -1)) return { rows: [], distinctYears: [] };

        const validRows: any[] = [];
        const years = new Set<number>();

        for (let i = 1; i < lines.length; i++) {
            const row = lines[i].split(delimiter).map(c => c.trim().replace(/^"|"$/g, ''));
            if (row.length < 2) continue;

            // STRICT FILTER: Only 'ENTRADA'
            if (typeIdx !== -1) {
                const typeVal = row[typeIdx].toUpperCase();
                if (typeVal !== 'ENTRADA') continue;
            }

            // Amount Parsing
            let amount = 0;
            const valRaw = amountIdx !== -1 ? row[amountIdx] : '';
            const valBr = amountBrIdx !== -1 ? row[amountBrIdx] : '';

            // 1. Try raw value if it looks like a clean US float/int
            let usedVal = valRaw;
            // 2. If valid BR string exists and seems more descriptive, prefer it (sometimes raw is empty)
            if (!usedVal && valBr) usedVal = valBr;

            // 3. Use Robust Parser
            // Special Case: The user instructions explicitly say: 
            // "Se 'valor' for number... use directly. Se vazio use 'valor_br' convertendo."
            // We implement this logic inside parseMoneyBR mostly, but here we can be specific:

            if (valRaw && !isNaN(Number(valRaw)) && valRaw.includes('.')) {
                // It looks like a valid pre-formatted number, trust it?
                // Wait, "1.234" could be 1234 or 1.234. 
                // Let's rely on our Universal Parser which handles explicit dots vs US format intelligently.
                amount = parseMoneyBR(valRaw);
            } else if (valBr) {
                amount = parseMoneyBR(valBr);
            } else {
                amount = parseMoneyBR(valRaw); // Last resort
            }

            // Round to 2 decimals to match currency reality
            amount = Math.round(amount * 100) / 100;

            if (isNaN(amount) || amount <= 0) continue;

            // Date Parsing
            const dateStr = row[dateIdx];
            if (!dateStr) continue;
            let isoDate = dateStr;
            let year = 0;

            if (dateStr.includes('/')) {
                const parts = dateStr.split('/');
                if (parts.length === 3) {
                    isoDate = `${parts[2]}-${parts[1]}-${parts[0]}`; // YYYY-MM-DD
                    year = parseInt(parts[2]);
                }
            } else if (dateStr.includes('-')) {
                const parts = dateStr.split('-');
                if (parts.length === 3) year = parseInt(parts[0]);
            }

            if (year > 0) years.add(year);

            // Create consistently tagged note
            const originalDesc = descIdx !== -1 ? row[descIdx] : 'Receita Histórica';
            const tag = `[CSV_IMPORT] origem=historico_por_periodo;anos=${year};arquivo=${fileName}`;
            const finalDesc = `${originalDesc} ${tag}`;

            validRows.push({
                date: isoDate,
                amount,
                desc: finalDesc,
                year
            });
        }
        return { rows: validRows, distinctYears: Array.from(years) };
    };

    const confirmImport = async () => {
        if (step !== 'preview') return;
        setStep('processing');
        setLog(['Iniciando processamento...']);
        setUploading(true);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            setLog(prev => [...prev, 'Erro: Usuário não autenticado.']);
            setUploading(false);
            return;
        }

        const batchId = crypto.randomUUID();

        try {
            // STEP 1: DELETE (If Replace or Delete mode)
            if (importMode === 'replace' || importMode === 'delete') {
                if (detectedYears.length === 0) {
                    setLog(prev => [...prev, 'Aviso: Nenhum ano detectado para exclusão.']);
                } else {
                    setLog(prev => [...prev, `Modo ${importMode.toUpperCase()}: Removendo registros importados anteriores de: ${detectedYears.join(', ')}...`]);

                    // Use new safe deletion
                    const { count } = await deleteImportedIncomesByYears(detectedYears, workspace?.id);
                    setLog(prev => [...prev, ` -> Removidos ${count} registros importados anteriormente.`]);
                }
            }

            if (importMode === 'delete') {
                setLog(prev => [...prev, 'Operação de exclusão finalizada.']);
                setStep('done');
                setUploading(false);
                fetchAvailableYears(); // Refresh history tab
                return;
            }

            // STEP 2: INSERT (If Append or Replace)
            setLog(prev => [...prev, `Inserindo ${parsedData.length} novos registros...`]);

            // Insert in batches of 100
            const BATCH_SIZE = 100;
            let success = 0;
            let errors = 0;

            for (let i = 0; i < parsedData.length; i += BATCH_SIZE) {
                const batch = parsedData.slice(i, i + BATCH_SIZE).map(item => ({
                    user_id: user.id,
                    workspace_id: workspace?.id,
                    date: item.date,
                    amount: item.amount,
                    client_id: null,
                    notes: item.desc, // Legacy tag, kept for visibility
                    status: IncomeStatus.RECEIVED,
                    source: 'csv_import',
                    is_imported: true, // NEW SCHEMA FLAG
                    import_batch_id: batchId // NEW SCHEMA FLAG
                }));

                const { error } = await supabase.from('income').insert(batch);
                if (error) {
                    console.error(error);
                    errors += batch.length;
                    setLog(prev => [...prev, `Erro no lote ${i}: ${error.message}`]);
                } else {
                    success += batch.length;
                }
            }

            setLog(prev => [...prev, `Importação Finalizada!`, `Inseridos: ${success}`, `Erros: ${errors}`]);
            setStep('done');
            fetchAvailableYears(); // Refresh history tab

        } catch (err: any) {
            setLog(prev => [...prev, `Erro Geral: ${err.message}`]);
        } finally {
            setUploading(false);
        }
    };

    // History Cleanup
    const handleHistoryDelete = async () => {
        if (selectedHistoryYears.length === 0) return;
        const confirmed = confirm(`ATENÇÃO: Isso apagará TODO o histórico importado dos anos: ${selectedHistoryYears.join(', ')}. Registros manuais serão mantidos. Continuar?`);
        if (!confirmed) return;

        setUploading(true);
        try {
            const { count } = await deleteImportedIncomesByYears(selectedHistoryYears, workspace?.id);
            alert(`Histórico limpo! ${count} registros removidos.`);
            setSelectedHistoryYears([]);
            fetchAvailableYears();
        } catch (error) {
            alert('Erro ao limpar histórico.');
            console.error(error);
        } finally {
            setUploading(false);
        }
    };

    const handleSeed = async () => {
        if (!isOwner) return;
        setUploading(true);
        setLog(['Iniciando seed de histórico...']);
        try {
            const logs = await seedHistoricalRevenue();
            setLog(prev => [...prev, ...logs, 'Processo finalizado.']);
        } catch (err: any) {
            setLog(prev => [...prev, `ERRO FATAL: ${err.message}`]);
        } finally {
            setUploading(false);
        }
    };

    if (!isOwner) {
        return (
            <div className="max-w-3xl mx-auto p-8 bg-red-50 rounded-xl text-center text-red-600 border border-red-200">
                Apenas o dono do workspace pode importar dados.
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex gap-4 border-b border-slate-200 mb-6">
                <button
                    onClick={() => setActiveTab('import')}
                    className={`pb-3 px-4 font-bold border-b-2 transition-colors ${activeTab === 'import' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    Importar CSV
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    className={`pb-3 px-4 font-bold border-b-2 transition-colors ${activeTab === 'history' ? 'border-amber-600 text-amber-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    Gerenciar Histórico
                </button>
            </div>

            {activeTab === 'import' && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                    <h1 className="text-2xl font-bold mb-4">Importar Histórico</h1>

                    {step === 'upload' && (
                        <>
                            <p className="text-slate-600 mb-6">Selecione o arquivo CSV (formato <code>Entradas-202X-...csv</code>).</p>
                            <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center bg-slate-50 transition-colors hover:bg-slate-100">
                                <input
                                    type="file"
                                    accept=".csv"
                                    multiple
                                    onChange={handleFilesSelect}
                                    disabled={uploading}
                                    className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                                />
                                {uploading && <p className="mt-4 text-indigo-600 font-medium animate-pulse">Lendo arquivos...</p>}
                            </div>
                        </>
                    )}

                    {step === 'preview' && (
                        <div className="space-y-6">
                            <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-100 text-center">
                                <h3 className="font-bold text-indigo-900 text-lg mb-4">Prévia da Importação</h3>

                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <div>
                                        <p className="text-3xl font-bold text-indigo-700">{previewStats.validRows}</p>
                                        <p className="text-xs text-indigo-600 uppercase font-bold">Linhas "ENTRADA"</p>
                                    </div>
                                    <div>
                                        <p className="text-3xl font-bold text-emerald-600">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(previewStats.totalValue)}
                                        </p>
                                        <p className="text-xs text-emerald-600 uppercase font-bold">Valor Total</p>
                                    </div>
                                </div>

                                <div className="bg-white/50 p-3 rounded-lg text-sm text-indigo-800">
                                    <strong>Anos Detectados:</strong> {detectedYears.join(', ')}
                                </div>
                            </div>

                            {/* Mode Selector */}
                            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                                <h4 className="font-bold text-slate-800 mb-3">Como deseja importar?</h4>
                                <div className="space-y-3">
                                    <label className="flex items-start gap-3 p-3 bg-white rounded-lg border border-slate-200 cursor-pointer hover:border-indigo-300 transition-colors">
                                        <input type="radio" name="mode" value="append" checked={importMode === 'append'} onChange={() => setImportMode('append' as any)} className="mt-1" />
                                        <div>
                                            <div className="font-bold text-slate-700">Adicionar (Padrão)</div>
                                            <div className="text-xs text-slate-500">Mantém tudo o que já existe e adiciona estes novos dados.</div>
                                        </div>
                                    </label>
                                    <label className="flex items-start gap-3 p-3 bg-white rounded-lg border border-slate-200 cursor-pointer hover:border-indigo-300 transition-colors">
                                        <input type="radio" name="mode" value="replace" checked={importMode === 'replace'} onChange={() => setImportMode('replace' as any)} className="mt-1" />
                                        <div>
                                            <div className="font-bold text-amber-600">Substituir Anos ({detectedYears.join(', ')})</div>
                                            <div className="text-xs text-slate-500">
                                                ⚠️ Apaga apenas registros importados anteriormente destes anos e importa os novos.
                                                Registros manuais são preservados.
                                            </div>
                                        </div>
                                    </label>
                                    <label className="flex items-start gap-3 p-3 bg-white rounded-lg border border-slate-200 cursor-pointer hover:border-indigo-300 transition-colors">
                                        <input type="radio" name="mode" value="delete" checked={importMode === 'delete'} onChange={() => setImportMode('delete' as any)} className="mt-1" />
                                        <div>
                                            <div className="font-bold text-red-600">Apenas Apagar Anos ({detectedYears.join(', ')})</div>
                                            <div className="text-xs text-slate-500">
                                                🗑️ Remove registros importados anteriormente destes anos. Nada novo será criado.
                                            </div>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            <div className="flex gap-4 justify-center pt-2">
                                <button onClick={() => { setStep('upload'); setParsedData([]); }} className="px-6 py-3 rounded-lg border border-slate-300 text-slate-600 font-bold hover:bg-slate-50">Cancelar</button>
                                <button
                                    onClick={confirmImport}
                                    className={`px-6 py-3 rounded-lg font-bold text-white shadow-lg transition-colors ${importMode === 'delete' ? 'bg-red-600 hover:bg-red-700 shadow-red-200' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'}`}
                                >
                                    {importMode === 'delete' ? 'Confirmar Exclusão' : 'Confirmar Importação'}
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 'processing' && (
                        <div className="text-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                            <h3 className="text-lg font-bold text-slate-800">Processando...</h3>
                            <p className="text-slate-500">Isso pode levar alguns instantes. Não feche a página.</p>
                        </div>
                    )}

                    {step === 'done' && (
                        <div className="text-center py-8">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full mb-4">
                                <ICONS.Check />
                            </div>
                            <h3 className="text-xl font-bold text-emerald-700 mb-2">Operação Concluída!</h3>
                            <button onClick={() => { setStep('upload'); setLog([]); }} className="text-indigo-600 font-bold hover:underline">Processar mais arquivos</button>
                        </div>
                    )}

                    {/* Log Output */}
                    {log.length > 0 && (
                        <div className="bg-slate-900 text-slate-200 p-4 rounded-xl shadow-sm text-sm font-mono h-64 overflow-y-auto mt-6">
                            {log.map((line, i) => <div key={i} className="border-b border-white/5 py-1 last:border-0">{line}</div>)}
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'history' && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                    <h2 className="text-xl font-bold mb-4 text-slate-800">Gerenciar Histórico Importado</h2>
                    <p className="text-slate-600 mb-6 text-sm">
                        Aqui você pode apagar dados que foram importados via CSV.
                        Dados criados manualmente <strong>não</strong> serão afetados.
                    </p>

                    {availableYears.length === 0 ? (
                        <div className="text-center py-12 bg-slate-50 rounded-lg border border-dashed border-slate-200 text-slate-400">
                            Nenhum histórico importado encontrado.
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="flex flex-wrap gap-2">
                                {availableYears.map(year => (
                                    <label key={year} className={`cursor-pointer px-4 py-2 rounded-lg border transition-colors ${selectedHistoryYears.includes(year) ? 'bg-amber-50 border-amber-500 text-amber-700 font-bold' : 'bg-white border-slate-200 text-slate-600 hover:border-amber-300'}`}>
                                        <input
                                            type="checkbox"
                                            className="hidden"
                                            checked={selectedHistoryYears.includes(year)}
                                            onChange={e => {
                                                if (e.target.checked) setSelectedHistoryYears(prev => [...prev, year]);
                                                else setSelectedHistoryYears(prev => prev.filter(y => y !== year));
                                            }}
                                        />
                                        {year}
                                    </label>
                                ))}
                            </div>

                            <button
                                onClick={handleHistoryDelete}
                                disabled={selectedHistoryYears.length === 0 || uploading}
                                className="w-full py-4 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                <ICONS.Trash /> Apagar Histórico Selecionado
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Seed Admin Tool (Hidden) */}
            {(!userEmail || userEmail === 'pedrinhorodrigues.souza@gmail.com') && step === 'upload' && activeTab === 'import' && (
                <div className="mt-8 pt-8 border-t border-slate-200">
                    <p className="text-xs text-center text-slate-400 mb-2">Ferramenta Administrativa</p>
                    <button onClick={handleSeed} className="block mx-auto text-xs text-orange-600 hover:underline">Carregar Seed Padrão</button>
                </div>
            )}
        </div>
    );
};

export default ImportData;
