
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { createClient, seedHistoricalRevenue } from '../services/dataService';
import { IncomeStatus } from '../types';
import { useWorkspace } from '../contexts/WorkspaceContext';

const ImportData: React.FC = () => {
    const { isOwner, workspace } = useWorkspace();
    const [log, setLog] = useState<string[]>([]);
    const [uploading, setUploading] = useState(false);
    const [userEmail, setUserEmail] = useState<string | null>(null);

    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
            setUserEmail(data.session?.user?.email || null);
        });
    }, []);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!isOwner) {
            setLog(['Erro: Apenas o dono pode importar dados.']);
            return;
        }

        setUploading(true);
        setLog(['Lendo arquivo CSV...', 'Iniciando processamento...']);

        const reader = new FileReader();
        reader.onload = async (event) => {
            const text = event.target?.result as string;
            await processCSV(text);
            setUploading(false);
        };
        reader.readAsText(file);
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

    const processCSV = async (csvText: string) => {
        const lines = csvText.split('\n');
        const headers = lines[0].toLowerCase().split(',').map(h => h.trim());

        // Simple column mapping logic (simplified)
        const getIndex = (keys: string[]) => headers.findIndex(h => keys.some(k => h.includes(k)));

        const dateIdx = getIndex(['date', 'data']);
        const amountIdx = getIndex(['amount', 'valor']);
        const payerIdx = getIndex(['counterparty', 'pagador', 'cliente']);
        const descIdx = getIndex(['description', 'descricao']);
        const classIdx = getIndex(['class', 'classe']); // Filter column

        if (dateIdx === -1 || amountIdx === -1) {
            setLog(prev => [...prev, 'ERRO: Colunas obrigatórias (data, valor) não encontradas.']);
            return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            setLog(prev => [...prev, 'ERRO: Usuário não autenticado.']);
            return;
        }

        let successCount = 0;
        let failCount = 0;

        // Process rows
        for (let i = 1; i < lines.length; i++) {
            const row = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, '')); // Simple unquote
            if (row.length < 2) continue;

            // Filter logic: "receita_cliente_provavel"
            if (classIdx !== -1 && row[classIdx] !== 'receita_cliente_provavel') {
                continue;
            }

            const dateStr = row[dateIdx];
            const amountStr = row[amountIdx];
            const payerName = payerIdx !== -1 ? row[payerIdx] : 'Desconhecido';
            const desc = descIdx !== -1 ? row[descIdx] : '';

            // Parse Amount
            const amount = parseFloat(amountStr);
            if (isNaN(amount) || amount <= 0) continue; // Skip expenses or invalid amounts

            try {
                // 1. Find or Create Client (Wrapped in dataService logic if using createClient, but here we use raw for speed - need to respect workspace)
                let clientId = null;
                if (payerName) {
                    // Check existing in workspace
                    const { data: existingClient } = await supabase
                        .from('clients')
                        .select('id')
                        .eq('workspace_id', workspace?.id)
                        .ilike('name', payerName)
                        .maybeSingle();

                    if (existingClient) {
                        clientId = existingClient.id;
                    } else {
                        const newClient = await createClient({ name: payerName });
                        if (newClient) clientId = newClient.id;
                        setLog(prev => [...prev, `Info: Cliente "${payerName}" criado.`]);
                    }
                }

                // 2. Insert Income
                const { data: dup } = await supabase.from('income')
                    .select('id')
                    .eq('date', dateStr)
                    .eq('amount', amount)
                    .eq('workspace_id', workspace?.id)
                    .eq('notes', desc)
                    .maybeSingle();

                if (!dup) {
                    const { error } = await supabase.from('income').insert({
                        user_id: user.id,
                        workspace_id: workspace?.id,
                        date: dateStr,
                        amount: amount,
                        client_id: clientId,
                        notes: desc,
                        status: IncomeStatus.RECEIVED,
                        source: 'csv_import'
                    });
                    if (error) throw error;
                    successCount++;
                } else {
                    setLog(prev => [...prev, `Skip: Registro duplicado linha ${i}`]);
                }

            } catch (err: any) {
                console.error(err);
                failCount++;
                setLog(prev => [...prev, `Erro na linha ${i}: ${err.message}`]);
            }
        }

        setLog(prev => [...prev, `Concluído: ${successCount} importados, ${failCount} falhas.`]);
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
                <p className="text-slate-600 mb-6">Selecione um arquivo CSV contendo seu histórico financeiro (2023-2025). O sistema importará apenas entradas classificadas como receitas.</p>

                <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center bg-slate-50">
                    <input
                        type="file"
                        accept=".csv"
                        onChange={handleFileUpload}
                        disabled={uploading}
                        className="block w-full text-sm text-slate-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-full file:border-0
                    file:text-sm file:font-semibold
                    file:bg-indigo-50 file:text-indigo-700
                    hover:file:bg-indigo-100"
                    />
                    {uploading && <p className="mt-4 text-indigo-600 font-medium animate-pulse">Processando...</p>}
                </div>
            </div>

            {/* Special Admin/Offline Seed Section */}
            {(!userEmail || userEmail === 'pedrinhorodrigues.souza@gmail.com') && (
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-6 rounded-xl shadow-sm border border-orange-100">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-lg font-bold text-orange-800">Carga Automática {userEmail ? '(Admin)' : ''}</h2>
                            <p className="text-sm text-orange-700">
                                {userEmail ? 'Detectado usuário 01.' : ''} Disponível carga de histórico 2023-2025.
                            </p>
                        </div>
                        <button
                            onClick={handleSeed}
                            disabled={uploading}
                            className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded shadow-sm transition-colors"
                        >
                            {uploading ? 'Carregando...' : 'Carregar Histórico (2023-2025)'}
                        </button>
                    </div>
                </div>
            )}

            {log.length > 0 && (
                <div className="bg-slate-900 text-slate-200 p-4 rounded-xl shadow-sm text-sm font-mono h-64 overflow-y-auto">
                    {log.map((line, i) => <div key={i}>{line}</div>)}
                </div>
            )}
        </div>
    );
};

export default ImportData;
