
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { createClient, seedHistoricalRevenue } from '../services/dataService';
import { IncomeStatus } from '../types';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { ICONS } from '../constants';


const ImportData: React.FC = () => {
    const { isOwner, workspace } = useWorkspace(); // Get WS
    const [log, setLog] = useState<string[]>([]);
    const [uploading, setUploading] = useState(false);
    const [userEmail, setUserEmail] = useState<string | null>(null);

    // Import Preview State
    const [parsedData, setParsedData] = useState<any[]>([]);
    const [previewStats, setPreviewStats] = useState({ total: 0, dups: 0, new: 0 });
    const [step, setStep] = useState<'upload' | 'preview' | 'processing' | 'done'>('upload');

    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
            setUserEmail(data.session?.user?.email || null);
        });
    }, []);

    const handleFilesSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        if (!isOwner) {
            setLog(['Erro: Apenas o dono pode importar dados.']);
            return;
        }

        setUploading(true);
        setLog(['Lendo arquivos...']);

        let allRows: any[] = [];

        for (let i = 0; i < files.length; i++) {
            const text = await files[i].text();
            const rows = parseCSVContent(text);
            allRows = [...allRows, ...rows];
        }

        setParsedData(allRows);
        setPreviewStats({
            total: allRows.length,
            dups: 0, // We will calculate this more accurately during insert or pre-check if budget allows
            new: allRows.length
        });
        setStep('preview');
        setUploading(false);
    };

    const parseCSVContent = (text: string) => {
        // Auto-detect delimiter
        const firstLine = text.split('\n')[0];
        const delimiter = firstLine.includes(';') ? ';' : ',';

        const lines = text.split('\n');
        // Normalize headers: remove BOM, trim, lowercase
        const headers = lines[0].replace(/^\uFEFF/, '').toLowerCase().split(delimiter).map(h => h.trim());

        const getIndex = (keys: string[]) => headers.findIndex(h => keys.some(k => h.includes(k)));

        const dateIdx = getIndex(['data_lancamento', 'data', 'date']);
        const amountIdx = getIndex(['valor', 'amount']);
        const typeIdx = getIndex(['tipo_linha', 'type']);
        const descIdx = getIndex(['descricao', 'description', 'obs']);
        // const payerIdx = getIndex(['cliente', 'payer']); // Not present in this CSV format

        if (dateIdx === -1 || amountIdx === -1) return [];

        const validRows: any[] = [];

        for (let i = 1; i < lines.length; i++) {
            const row = lines[i].split(delimiter).map(c => c.trim().replace(/^"|"$/g, ''));
            if (row.length < 2) continue;

            // Filter: Only "ENTRADA"
            if (typeIdx !== -1) {
                const typeVal = row[typeIdx].toUpperCase();
                if (typeVal !== 'ENTRADA') continue;
            }

            // Parse Amount (handle 1.200,50 -> 1200.50)
            let amountStr = row[amountIdx];
            if (!amountStr) continue;

            // Remove dots (thousand separators) and replace comma with dot
            amountStr = amountStr.replace(/\./g, '').replace(',', '.');
            const amount = parseFloat(amountStr);

            if (isNaN(amount) || amount <= 0) continue;

            // Parse Date (DD/MM/YYYY -> YYYY-MM-DD or ISO)
            const dateStr = row[dateIdx];
            if (!dateStr) continue;

            let isoDate = dateStr;
            // Basic check for DD/MM/YYYY
            if (dateStr.includes('/')) {
                const parts = dateStr.split('/');
                if (parts.length === 3) {
                    // YYYY-MM-DD
                    isoDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
                }
            }

            validRows.push({
                date: isoDate,
                amount,
                payer: null, // No client in CSV
                desc: descIdx !== -1 ? row[descIdx] : 'Receita Importada (CSV)'
            });
        }
        return validRows;
    };

    const confirmImport = async () => {
        if (step !== 'preview') return;
        setStep('processing');
        setLog(['Iniciando importação...']);
        setUploading(true);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            setLog(prev => [...prev, 'Erro: Usuário não autenticado.']);
            setUploading(false);
            return;
        }

        let success = 0;
        let skipped = 0;
        let errors = 0;

        try {
            for (const item of parsedData) {
                try {
                    // Check dup (Simple check by date + amount + workspace)
                    const { data: dup } = await supabase.from('income')
                        .select('id')
                        .eq('date', item.date)
                        .eq('amount', item.amount)
                        .eq('workspace_id', workspace?.id)
                        .maybeSingle();

                    if (dup) {
                        skipped++;
                        continue;
                    }

                    // Insert
                    const { error } = await supabase.from('income').insert({
                        user_id: user.id,
                        workspace_id: workspace?.id,
                        date: item.date,
                        amount: item.amount,
                        client_id: null, // Optional
                        notes: item.desc,
                        status: IncomeStatus.RECEIVED,
                        source: 'csv_import'
                    });

                    if (error) throw error;
                    success++;

                } catch (e: any) {
                    console.error("Row Error:", e);
                    errors++;
                }
            }
            setLog([`Importação Finalizada!`, `Sucesso: ${success}`, `Duplicados/Ignorados: ${skipped}`, `Erros: ${errors}`]);
            setStep('done');

        } catch (err: any) {
            setLog(prev => [...prev, `Erro Geral: ${err.message}`]);
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
            {/* CSV Section */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                <h1 className="text-2xl font-bold mb-4">Importar Histórico</h1>

                {step === 'upload' && (
                    <>
                        <p className="text-slate-600 mb-6">Selecione um ou mais arquivos CSV contendo seu histórico financeiro.</p>
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
                    <div className="text-center space-y-6">
                        <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-100">
                            <h3 className="font-bold text-indigo-900 text-lg mb-2">Prévia da Importação</h3>
                            <div className="grid grid-cols-3 gap-4 text-center">
                                <div><p className="text-2xl font-bold text-indigo-700">{previewStats.total}</p><p className="text-xs text-indigo-600 uppercase font-bold">Linhas Encontradas</p></div>
                                <div><p className="text-2xl font-bold text-slate-700">?</p><p className="text-xs text-slate-500 uppercase font-bold">Duplicados (Check ao Importar)</p></div>
                                <div><p className="text-2xl font-bold text-slate-400">N/A</p><p className="text-xs text-slate-400 uppercase font-bold">Novos Clientes</p></div>
                            </div>
                        </div>
                        <div className="flex gap-4 justify-center">
                            <button onClick={() => { setStep('upload'); setParsedData([]); }} className="px-6 py-3 rounded-lg border border-slate-300 text-slate-600 font-bold hover:bg-slate-50">Cancelar</button>
                            <button onClick={confirmImport} className="px-6 py-3 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-200">Confirmar Importação</button>
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
                        <h3 className="text-xl font-bold text-emerald-700 mb-2">Importação Concluída!</h3>
                        <button onClick={() => { setStep('upload'); setLog([]); }} className="text-indigo-600 font-bold hover:underline">Importar mais arquivos</button>
                    </div>
                )}
            </div>

            {/* Log Output */}
            {log.length > 0 && (
                <div className="bg-slate-900 text-slate-200 p-4 rounded-xl shadow-sm text-sm font-mono h-64 overflow-y-auto">
                    {log.map((line, i) => <div key={i} className="border-b border-white/5 py-1 last:border-0">{line}</div>)}
                </div>
            )}

            {/* Seed Admin Tool */}
            {(!userEmail || userEmail === 'pedrinhorodrigues.souza@gmail.com') && step === 'upload' && (
                <div className="mt-8 pt-8 border-t border-slate-200">
                    <p className="text-xs text-center text-slate-400 mb-2">Ferramenta Administrativa</p>
                    <button onClick={handleSeed} className="block mx-auto text-xs text-orange-600 hover:underline">Carregar Seed Padrão</button>
                </div>
            )}
        </div>
    );
};

export default ImportData;
