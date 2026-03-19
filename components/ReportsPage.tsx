
import React, { useState, useEffect } from 'react';
import { getIncomes, getExpenses, getCampaigns } from '../services/dataService';
import { Income, Expense, Campaign, IncomeStatus } from '../types';
import { PageHeader, Tabs } from './Shared';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ICONS, MONTH_NAMES } from '../constants';

import { useWorkspace } from '../contexts/WorkspaceContext';

type ReportType = 'Resumo' | 'Receitas' | 'Despesas' | 'Marketing';

const ReportsPage: React.FC = () => {
    const { workspace } = useWorkspace(); // Get workspace
    const [reportType, setReportType] = useState<ReportType>('Resumo');
    const [periodA, setPeriodA] = useState('this_month');
    const [compare, setCompare] = useState(false);

    // Data State
    const [incomes, setIncomes] = useState<Income[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [loading, setLoading] = useState(true);

    // Calculated metrics
    const [dataA, setDataA] = useState<any>(null);
    const [dataB, setDataB] = useState<any>(null);

    useEffect(() => {
        const load = async () => {
            const [inc, exp, cmp] = await Promise.all([getIncomes(), getExpenses(), getCampaigns()]);
            setIncomes(inc);
            setExpenses(exp);
            setCampaigns(cmp);
            setLoading(false);
        };
        if (workspace?.id) load();
    }, [workspace?.id]);

    useEffect(() => {
        if (loading) return;

        const now = new Date();
        const getRange = (preset: string, offset = 0): [Date, Date] => {
            let start = new Date(now.getFullYear(), now.getMonth(), 1);
            let end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

            if (preset === 'this_month') {
                // Default
            } else if (preset === 'last_month') {
                start.setMonth(start.getMonth() - 1);
                end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
            } else if (preset === 'last_3_months') {
                start.setMonth(start.getMonth() - 2);
            } else if (preset === 'last_6_months') {
                start.setMonth(start.getMonth() - 5);
            } else if (preset === 'year_to_date') {
                start = new Date(now.getFullYear(), 0, 1);
            } else if (preset === 'last_year') {
                start = new Date(now.getFullYear() - 1, 0, 1);
                end = new Date(now.getFullYear() - 1, 11, 31);
            }

            // Apply Compare Offset (Shift full range back)
            if (offset > 0) {
                const diff = end.getTime() - start.getTime();
                end = new Date(start.getTime() - 24 * 60 * 60 * 1000); // 1 day before start
                start = new Date(end.getTime() - diff);
            }
            return [start, end];
        };

        const [startA, endA] = getRange(periodA);
        setDataA(aggregateData(startA, endA));

        if (compare) {
            const [startB, endB] = getRange(periodA, 1);
            setDataB(aggregateData(startB, endB));
        } else {
            setDataB(null);
        }

    }, [loading, periodA, compare, incomes, expenses, campaigns]);

    const aggregateData = (start: Date, end: Date) => {
        const filterDate = (d: string) => {
            const date = new Date(d);
            return date >= start && date <= end;
        };

        // Filter Income (Received, ignore transfers if marked)
        const inc = incomes.filter(i =>
            filterDate(i.date) &&
            i.status === IncomeStatus.RECEIVED
        );

        // Filter Expenses
        const exp = expenses.filter(e => filterDate(e.date));

        // Filter Campaigns (Active in period)
        const cmp = campaigns.filter(c => {
            const cStart = new Date(c.start_date);
            const cEnd = c.end_date ? new Date(c.end_date) : new Date();
            return (cStart <= end && cEnd >= start);
        });

        // UPDATED: Use net_amount if available
        const getAmount = (i: Income) => i.net_amount !== undefined ? Number(i.net_amount) : Number(i.amount);

        const totalRevenue = inc.reduce((acc, c) => acc + getAmount(c), 0);
        const totalExpenses = exp.reduce((acc, c) => acc + Number(c.amount), 0);
        const netIncome = totalRevenue - totalExpenses;

        // Grouping for Charts
        const revenueByMonth: any = {};
        inc.forEach(i => {
            const k = i.date.substring(0, 7); // YYYY-MM
            revenueByMonth[k] = (revenueByMonth[k] || 0) + getAmount(i);
        });

        // Top Sources
        const byClient: any = {};
        inc.forEach(i => {
            const name = i.client?.name || 'Desconhecido';
            byClient[name] = (byClient[name] || 0) + getAmount(i);
        });

        // Top Expenses
        const byCategory: any = {};
        exp.forEach(e => {
            byCategory[e.category] = (byCategory[e.category] || 0) + Number(e.amount);
        });

        return {
            start, end,
            totalRevenue, totalExpenses, netIncome,
            countIncomes: inc.length,
            countExpenses: exp.length,
            revenueByMonth,
            byClient: Object.entries(byClient).sort((a: any, b: any) => b[1] - a[1]).slice(0, 5),
            byCategory: Object.entries(byCategory).sort((a: any, b: any) => b[1] - a[1]).slice(0, 5),
            campaigns: cmp
        };
    };

    const getGrowth = (curr: number, prev: number) => {
        if (!prev) return 0;
        return ((curr - prev) / prev) * 100;
    };

    const handlePrint = () => {
        window.print();
    };

    const handleExportPDF = () => {
        // Uses the browser's print-to-PDF, which leverages our existing print CSS
        // This gives a clean, formatted PDF without external dependencies
        const printWindow = window.open('', '_blank');
        if (!printWindow || !dataA) return;

        const periodLabel = `${dataA.start.toLocaleDateString('pt-BR')} a ${dataA.end.toLocaleDateString('pt-BR')}`;
        const profitMargin = dataA.totalRevenue > 0 ? ((dataA.netIncome / dataA.totalRevenue) * 100).toFixed(1) : '0';

        printWindow.document.write(`
            <!DOCTYPE html>
            <html><head><title>Relatório ${reportType} - Conselho de Bolso</title>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 40px; color: #1e293b; }
                h1 { font-size: 24px; margin-bottom: 4px; }
                h2 { font-size: 18px; margin-top: 32px; margin-bottom: 16px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
                .subtitle { color: #64748b; font-size: 14px; margin-bottom: 32px; }
                .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 32px; }
                .kpi { border: 1px solid #e2e8f0; padding: 16px; border-radius: 8px; }
                .kpi-label { font-size: 12px; color: #64748b; margin-bottom: 4px; }
                .kpi-value { font-size: 20px; font-weight: bold; }
                .green { color: #059669; } .red { color: #dc2626; } .blue { color: #4f46e5; }
                table { width: 100%; border-collapse: collapse; margin-top: 16px; }
                th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
                th { background: #f8fafc; font-weight: 600; color: #64748b; }
                .text-right { text-align: right; }
                .footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; }
                @media print { body { padding: 20px; } }
            </style></head><body>
            <h1>Relatório: ${reportType}</h1>
            <p class="subtitle">Período: ${periodLabel} | Gerado em ${new Date().toLocaleDateString('pt-BR')}</p>

            <div class="kpi-grid">
                <div class="kpi"><div class="kpi-label">Receita Total</div><div class="kpi-value green">R$ ${dataA.totalRevenue.toLocaleString('pt-BR')}</div></div>
                <div class="kpi"><div class="kpi-label">Despesas</div><div class="kpi-value red">R$ ${dataA.totalExpenses.toLocaleString('pt-BR')}</div></div>
                <div class="kpi"><div class="kpi-label">Lucro Líquido</div><div class="kpi-value blue">R$ ${dataA.netIncome.toLocaleString('pt-BR')}</div></div>
            </div>

            <h2>Top 5 Fontes de Receita</h2>
            <table>
                <thead><tr><th>Cliente</th><th class="text-right">Receita</th><th class="text-right">% do Total</th></tr></thead>
                <tbody>
                    ${dataA.byClient.map((c: any) => `<tr><td>${c[0]}</td><td class="text-right">R$ ${c[1].toLocaleString('pt-BR')}</td><td class="text-right">${dataA.totalRevenue > 0 ? ((c[1] / dataA.totalRevenue) * 100).toFixed(1) : 0}%</td></tr>`).join('')}
                    ${dataA.byClient.length === 0 ? '<tr><td colspan="3" style="text-align:center;color:#94a3b8;">Sem dados</td></tr>' : ''}
                </tbody>
            </table>

            <h2>Top 5 Categorias de Despesa</h2>
            <table>
                <thead><tr><th>Categoria</th><th class="text-right">Valor</th><th class="text-right">% do Total</th></tr></thead>
                <tbody>
                    ${dataA.byCategory.map((c: any) => `<tr><td>${c[0]}</td><td class="text-right">R$ ${c[1].toLocaleString('pt-BR')}</td><td class="text-right">${dataA.totalExpenses > 0 ? ((c[1] / dataA.totalExpenses) * 100).toFixed(1) : 0}%</td></tr>`).join('')}
                    ${dataA.byCategory.length === 0 ? '<tr><td colspan="3" style="text-align:center;color:#94a3b8;">Sem dados</td></tr>' : ''}
                </tbody>
            </table>

            <h2>Insights</h2>
            <ul>
                <li>Margem de Lucro: <strong>${profitMargin}%</strong></li>
                <li>Maior Despesa: <strong>${dataA.byCategory[0]?.[0] || 'N/A'}</strong> (R$ ${dataA.byCategory[0]?.[1]?.toLocaleString('pt-BR') || '0'})</li>
                <li>Total de Receitas: <strong>${dataA.countIncomes}</strong> lançamentos</li>
                <li>Total de Despesas: <strong>${dataA.countExpenses}</strong> lançamentos</li>
            </ul>

            <div class="footer">
                Conselho de Bolso - Relatório gerado automaticamente
            </div>
            </body></html>
        `);
        printWindow.document.close();
        setTimeout(() => { printWindow.print(); }, 500);
    };

    const handleExportCSV = () => {
        if (!dataA) return;

        const rows = [
            ['Relatório', reportType],
            ['Período', `${dataA.start.toLocaleDateString()} - ${dataA.end.toLocaleDateString()}`],
            [],
            ['Resumo Financeiro'],
            ['Receita Total', dataA.totalRevenue],
            ['Despesas Total', dataA.totalExpenses],
            ['Lucro Líquido', dataA.netIncome],
            [],
            ['Principais Clientes'],
            ...dataA.byClient.map((c: any) => [c[0], c[1]]),
            [],
            ['Principais Despesas'],
            ...dataA.byCategory.map((c: any) => [c[0], c[1]])
        ];

        let csvContent = "data:text/csv;charset=utf-8,"
            + rows.map(e => e.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `relatorio_${reportType.toLowerCase()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (!dataA) return <div className="p-8 text-center text-slate-500">Carregando dados...</div>;

    return (
        <div className="max-w-7xl mx-auto space-y-4 md:space-y-6 overflow-x-hidden min-w-0 w-full">
            <div className="print:hidden">
                <PageHeader
                    title="Relatórios & Comparativos"
                    description="Análise profunda do desempenho financeiro."
                    actions={
                        <div className="flex gap-2">
                            <button onClick={handleExportCSV} className="bg-white border border-slate-300 text-slate-700 px-3 py-2 md:px-4 md:py-2 rounded-lg hover:bg-slate-50 font-medium text-xs md:text-sm flex items-center gap-2">
                                <ICONS.FileText /> <span className="hidden md:inline">Exportar CSV</span><span className="md:hidden">CSV</span>
                            </button>
                            <button onClick={handleExportPDF} className="bg-white border border-slate-300 text-slate-700 px-3 py-2 md:px-4 md:py-2 rounded-lg hover:bg-slate-50 font-medium text-xs md:text-sm flex items-center gap-2">
                                <ICONS.FileText /> <span className="hidden md:inline">Exportar PDF</span><span className="md:hidden">PDF</span>
                            </button>
                            <button onClick={handlePrint} className="bg-indigo-600 text-white px-3 py-2 md:px-4 md:py-2 rounded-lg hover:bg-indigo-700 font-medium text-xs md:text-sm flex items-center gap-2">
                                <span>Imprimir</span>
                            </button>
                        </div>
                    }
                />

                {/* Filters */}
                <div className="bg-white p-3 md:p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row flex-wrap gap-4 items-start md:items-center justify-between">
                    <div className="flex flex-col md:flex-row gap-2 md:gap-4 w-full md:w-auto">
                        <select
                            value={reportType}
                            onChange={e => setReportType(e.target.value as ReportType)}
                            className="border border-slate-300 rounded-lg p-2 text-slate-900 bg-white w-full md:w-auto"
                        >
                            <option value="Resumo">Resumo Executivo</option>
                            <option value="Receitas">Receitas</option>
                            <option value="Despesas">Despesas</option>
                            <option value="Marketing">Marketing</option>
                        </select>
                        <select
                            value={periodA}
                            onChange={e => setPeriodA(e.target.value)}
                            className="border border-slate-300 rounded-lg p-2 text-slate-900 bg-white w-full md:w-auto"
                        >
                            <option value="this_month">Este Mês</option>
                            <option value="last_month">Mês Passado</option>
                            <option value="last_3_months">Últimos 3 Meses</option>
                            <option value="last_6_months">Últimos 6 Meses</option>
                            <option value="year_to_date">Este Ano (YTD)</option>
                            <option value="last_year">Ano Passado</option>
                        </select>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                        <div className={`w-10 h-6 rounded-full p-1 transition-colors ${compare ? 'bg-indigo-600' : 'bg-slate-300'}`} onClick={() => setCompare(!compare)}>
                            <div className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform ${compare ? 'translate-x-4' : ''}`}></div>
                        </div>
                        <span className="text-sm font-medium text-slate-700">Comparar</span>
                    </label>
                </div>
            </div>

            {/* PRINT HEADER */}
            <div className="hidden print:block mb-8">
                <h1 className="text-3xl font-bold text-slate-900">Relatório: {reportType}</h1>
                <p className="text-slate-500">
                    Período: {dataA.start.toLocaleDateString()} a {dataA.end.toLocaleDateString()}
                    {compare && dataB && ` vs ${dataB.start.toLocaleDateString()} a ${dataB.end.toLocaleDateString()}`}
                </p>
            </div>

            {/* KPI CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { label: 'Receita Total', valA: dataA.totalRevenue, valB: dataB?.totalRevenue, color: 'text-emerald-600' },
                    { label: 'Despesas', valA: dataA.totalExpenses, valB: dataB?.totalExpenses, color: 'text-red-600' },
                    { label: 'Lucro Líquido', valA: dataA.netIncome, valB: dataB?.netIncome, color: 'text-indigo-600' }
                ].map((kpi, idx) => {
                    const growth = compare ? getGrowth(kpi.valA, kpi.valB) : 0;
                    return (
                        <div key={idx} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm print:border-slate-300">
                            <p className="text-sm text-slate-500 mb-1">{kpi.label}</p>
                            <h3 className={`text-2xl font-bold ${kpi.color}`}>R$ {kpi.valA.toLocaleString('pt-BR')}</h3>
                            {compare && dataB && (
                                <div className="flex items-center gap-2 mt-2 text-sm">
                                    <span className="text-slate-400">vs R$ {kpi.valB.toLocaleString('pt-BR')}</span>
                                    <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${growth >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                        {growth > 0 ? '+' : ''}{growth.toFixed(1)}%
                                    </span>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* CHARTS & INSIGHTS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200 print:border-slate-300">
                    <h3 className="font-bold text-slate-800 mb-4">Top 5 Fontes de Receita</h3>
                    <div className="space-y-4">
                        {dataA.byClient.map((item: any, i: number) => (
                            <div key={i}>
                                <div className="flex justify-between text-sm mb-1 text-slate-700">
                                    <span>{item[0]}</span>
                                    <span className="font-bold">R$ {item[1].toLocaleString('pt-BR')}</span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-2">
                                    <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${(item[1] / dataA.totalRevenue) * 100}%` }}></div>
                                </div>
                            </div>
                        ))}
                        {dataA.byClient.length === 0 && <p className="text-slate-400 italic">Sem dados neste período.</p>}
                    </div>
                </div>

                <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-100 print:bg-white print:border-slate-300">
                    <h3 className="font-bold text-indigo-900 mb-4 flex items-center gap-2">
                        <ICONS.Bolt /> Insights do Período
                    </h3>
                    <ul className="space-y-3 text-sm text-indigo-800">
                        {compare && dataB && (
                            <li className="flex gap-2">
                                <span className="font-bold">&bull;</span>
                                <span>
                                    Sua receita {getGrowth(dataA.totalRevenue, dataB.totalRevenue) >= 0 ? 'cresceu' : 'caiu'}
                                    <strong> {Math.abs(getGrowth(dataA.totalRevenue, dataB.totalRevenue)).toFixed(1)}%</strong> em relação ao período anterior.
                                </span>
                            </li>
                        )}
                        <li className="flex gap-2">
                            <span className="font-bold">&bull;</span>
                            <span>
                                Sua maior despesa foi <strong>{dataA.byCategory[0]?.[0] || 'N/A'}</strong>
                                (R$ {dataA.byCategory[0]?.[1]?.toLocaleString('pt-BR')}).
                            </span>
                        </li>
                        <li className="flex gap-2">
                            <span className="font-bold">&bull;</span>
                            <span>
                                Margem de Lucro atual: <strong>{dataA.totalRevenue > 0 ? ((dataA.netIncome / dataA.totalRevenue) * 100).toFixed(1) : 0}%</strong>.
                            </span>
                        </li>
                    </ul>
                </div>
            </div>

            {/* Comparison Table */}
            {reportType === 'Resumo' && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden print:border-slate-300">
                    <div className="p-4 bg-slate-50 border-b border-slate-200">
                        <h3 className="font-bold text-slate-700">Demonstrativo Detalhado</h3>
                    </div>
                    <table className="w-full text-sm text-left">
                        <thead className="text-slate-500 border-b border-slate-100">
                            <tr>
                                <th className="p-3">Categoria</th>
                                <th className="p-3 text-right">Período Atual</th>
                                {compare && <th className="p-3 text-right">Período Anterior</th>}
                                {compare && <th className="p-3 text-right">Variação</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            <tr>
                                <td className="p-3 font-medium text-slate-700">Receita Bruta</td>
                                <td className="p-3 text-right text-emerald-600 font-bold">R$ {dataA.totalRevenue.toLocaleString('pt-BR')}</td>
                                {compare && <td className="p-3 text-right text-slate-500">R$ {dataB?.totalRevenue.toLocaleString('pt-BR')}</td>}
                                {compare && <td className="p-3 text-right text-xs text-slate-500">{getGrowth(dataA.totalRevenue, dataB?.totalRevenue).toFixed(1)}%</td>}
                            </tr>
                            <tr>
                                <td className="p-3 font-medium text-slate-700">Despesas Operacionais</td>
                                <td className="p-3 text-right text-red-600">R$ {dataA.totalExpenses.toLocaleString('pt-BR')}</td>
                                {compare && <td className="p-3 text-right text-slate-500">R$ {dataB?.totalExpenses.toLocaleString('pt-BR')}</td>}
                                {compare && <td className="p-3 text-right text-xs text-slate-500">{getGrowth(dataA.totalExpenses, dataB?.totalExpenses).toFixed(1)}%</td>}
                            </tr>
                            <tr className="bg-slate-50 font-bold">
                                <td className="p-3 text-slate-800">Resultado Líquido</td>
                                <td className="p-3 text-right text-slate-900">R$ {dataA.netIncome.toLocaleString('pt-BR')}</td>
                                {compare && <td className="p-3 text-right text-slate-600">R$ {dataB?.netIncome.toLocaleString('pt-BR')}</td>}
                                {compare && <td className="p-3 text-right text-xs text-slate-500">{getGrowth(dataA.netIncome, dataB?.netIncome).toFixed(1)}%</td>}
                            </tr>
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default ReportsPage;
