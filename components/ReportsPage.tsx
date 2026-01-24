
import React, { useState, useEffect } from 'react';
import { getIncomes, getExpenses, getCampaigns } from '../services/dataService';
import { Income, Expense, Campaign, IncomeStatus } from '../types';
import { PageHeader, Tabs } from './Shared';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ICONS, MONTH_NAMES } from '../constants';

type ReportType = 'Resumo' | 'Receitas' | 'Despesas' | 'Marketing';

const ReportsPage: React.FC = () => {
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
        load();
    }, []);

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
                end = new Date(start.getTime() - 24*60*60*1000); // 1 day before start
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
            byClient: Object.entries(byClient).sort((a:any,b:any) => b[1]-a[1]).slice(0,5),
            byCategory: Object.entries(byCategory).sort((a:any,b:any) => b[1]-a[1]).slice(0,5),
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
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="print:hidden">
                <PageHeader 
                    title="Relatórios & Comparativos" 
                    description="Análise profunda do desempenho financeiro."
                    actions={
                        <div className="flex gap-2">
                            <button onClick={handleExportCSV} className="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50 font-medium text-sm flex items-center gap-2">
                                <ICONS.FileText /> Exportar CSV
                            </button>
                            <button onClick={handlePrint} className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 font-medium text-sm flex items-center gap-2">
                                <span>Imprimir / PDF</span>
                            </button>
                        </div>
                    }
                />

                {/* Filters */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap gap-4 items-center justify-between">
                    <div className="flex gap-4 items-center">
                        <select 
                            value={reportType} 
                            onChange={e => setReportType(e.target.value as ReportType)}
                            className="border border-slate-300 rounded-lg p-2 text-slate-900 bg-white"
                        >
                            <option value="Resumo">Resumo Executivo</option>
                            <option value="Receitas">Detalhamento Receitas</option>
                            <option value="Despesas">Detalhamento Despesas</option>
                            <option value="Marketing">Marketing</option>
                        </select>
                        <select 
                            value={periodA} 
                            onChange={e => setPeriodA(e.target.value)}
                            className="border border-slate-300 rounded-lg p-2 text-slate-900 bg-white"
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
                        <span className="text-sm font-medium text-slate-700">Comparar com período anterior</span>
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
                                    <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${(item[1]/dataA.totalRevenue)*100}%` }}></div>
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
                                Margem de Lucro atual: <strong>{dataA.totalRevenue > 0 ? ((dataA.netIncome/dataA.totalRevenue)*100).toFixed(1) : 0}%</strong>.
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
