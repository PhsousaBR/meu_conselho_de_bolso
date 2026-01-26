
import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getGoals, setGoal, distributeAnnualGoal, getIncomes } from '../services/dataService';
import { GoalType, IncomeStatus } from '../types';
import { PageHeader, Drawer } from './Shared';
import { ICONS, MONTH_NAMES } from '../constants';
import { formatBRL2, formatAxisCompact } from '../utils/formatters';
import { useWorkspace } from '../contexts/WorkspaceContext';

type PeriodType = 'year' | 'half' | 'quarter' | 'month';

const Goals: React.FC = () => {
    const { isOwner, workspace } = useWorkspace(); // Get workspace
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [periodType, setPeriodType] = useState<PeriodType>('year');
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1); // 1-12

    const [goals, setGoals] = useState<any[]>([]);
    const [incomes, setIncomes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Distribution Form
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [annualTarget, setAnnualTarget] = useState('');
    const [distMode, setDistMode] = useState<'uniform' | 'seasonal'>('uniform');

    const loadData = async () => {
        setLoading(true);
        const [g, i] = await Promise.all([getGoals(selectedYear), getIncomes()]);
        setGoals(g);
        setIncomes(i.filter(inc => new Date(inc.date).getFullYear() === selectedYear && inc.status === IncomeStatus.RECEIVED));
        setLoading(false);
    };

    useEffect(() => {
        if (workspace?.id) loadData();
    }, [selectedYear, workspace?.id]);

    const handleDistribute = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isOwner) return;
        await distributeAnnualGoal(selectedYear, parseFloat(annualTarget), GoalType.REALISTIC, distMode);
        setIsDrawerOpen(false);
        loadData();
    };

    // --- LOGIC ---

    const getStatusLabel = (actual: number, goal: number) => {
        if (goal === 0) return { label: '-', color: 'text-slate-400 bg-slate-50' };
        const pct = actual / goal;
        if (pct >= 1) return { label: 'Batida 🚀', color: 'text-emerald-700 bg-emerald-100' };
        if (pct >= 0.8) return { label: 'Quase lá 📈', color: 'text-blue-700 bg-blue-100' };
        if (pct >= 0.5) return { label: 'Atenção ⚠️', color: 'text-amber-700 bg-amber-100' };
        return { label: 'Crítico 🔴', color: 'text-red-700 bg-red-100' };
    };

    const getMonthlyData = () => {
        return Array.from({ length: 12 }, (_, i) => {
            const m = i + 1;
            const goal = goals.find(g => g.month === m);
            const actual = incomes
                .filter(inc => new Date(inc.date).getMonth() === i)
                .reduce((acc, curr) => acc + Number(curr.amount), 0);

            const st = getStatusLabel(actual, goal?.target_amount || 0);

            return {
                month: MONTH_NAMES[i],
                monthIdx: m,
                goal: goal?.target_amount || 0,
                actual,
                statusLabel: st.label,
                statusColor: st.color
            };
        });
    };

    const monthlyData = getMonthlyData();

    // Aggregations based on PeriodType
    const calculatePeriodMetrics = () => {
        let startM = 0, endM = 11;
        if (periodType === 'month') { startM = selectedMonth - 1; endM = selectedMonth - 1; }
        if (periodType === 'quarter') {
            // Simplified: Q1 (0-2) based on selectedMonth being in that quarter or just defaulting
            const q = Math.ceil(selectedMonth / 3);
            startM = (q - 1) * 3; endM = startM + 2;
        }
        if (periodType === 'half') {
            const h = selectedMonth <= 6 ? 1 : 2;
            startM = (h - 1) * 6; endM = startM + 5;
        }

        const subset = monthlyData.slice(startM, endM + 1);
        const totalGoal = subset.reduce((acc, c) => acc + c.goal, 0);
        const totalActual = subset.reduce((acc, c) => acc + c.actual, 0);

        // Pace Projection
        const now = new Date();
        const isCurrentPeriod = selectedYear === now.getFullYear() && now.getMonth() >= startM && now.getMonth() <= endM;

        let projection = totalActual;
        if (isCurrentPeriod && totalGoal > 0) {
            // Very rough day-based projection for current active period
            const startOfPeriod = new Date(selectedYear, startM, 1);
            const endOfPeriod = new Date(selectedYear, endM + 1, 0);
            const totalDays = (endOfPeriod.getTime() - startOfPeriod.getTime()) / (1000 * 3600 * 24);
            const daysPassed = Math.max(1, (now.getTime() - startOfPeriod.getTime()) / (1000 * 3600 * 24));

            if (daysPassed < totalDays) {
                projection = (totalActual / daysPassed) * totalDays;
            }
        }

        return { totalGoal, totalActual, projection, subset };
    };

    const { totalGoal, totalActual, projection, subset } = calculatePeriodMetrics();
    const diff = projection - totalGoal;
    const paceStatus = projection >= totalGoal ? 'No Ritmo' : 'Fora do Ritmo';

    return (
        <div className="max-w-7xl mx-auto space-y-8">
            <PageHeader
                title="Metas 2.0"
                description="Planejamento estratégico e acompanhamento de ritmo."
                actions={
                    <div className="flex gap-2">
                        <select
                            value={selectedYear}
                            onChange={e => setSelectedYear(Number(e.target.value))}
                            className="bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-sm outline-none"
                        >
                            {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                        {isOwner && (
                            <button onClick={() => setIsDrawerOpen(true)} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 font-medium shadow-sm transition-colors text-sm">
                                <ICONS.Edit /> Definir Meta Anual
                            </button>
                        )}
                    </div>
                }
            />

            {/* Period Selector */}
            <div className="flex gap-2 bg-white p-2 rounded-xl border border-slate-200 w-fit shadow-sm">
                {(['year', 'half', 'quarter', 'month'] as PeriodType[]).map(t => (
                    <button
                        key={t}
                        onClick={() => setPeriodType(t)}
                        className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${periodType === t ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        {t === 'year' ? 'Ano' : t === 'half' ? 'Semestre' : t === 'quarter' ? 'Trimestre' : 'Mês'}
                    </button>
                ))}
            </div>

            {/* PROJECTION CARD */}
            <div className={`p-6 rounded-xl border-l-4 shadow-sm ${paceStatus === 'No Ritmo' ? 'bg-emerald-50 border-emerald-500' : 'bg-red-50 border-red-500'}`}>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h2 className={`text-lg font-bold ${paceStatus === 'No Ritmo' ? 'text-emerald-800' : 'text-red-800'}`}>
                            {paceStatus} — {selectedYear}
                        </h2>
                        <p className="text-slate-600 mt-1">
                            {paceStatus === 'No Ritmo'
                                ? `Nesse ritmo, você supera a meta em ${formatBRL2(Math.abs(diff))}.`
                                : `Para bater a meta do período, faltam ${formatBRL2(Math.abs(totalGoal - totalActual))}.`
                            }
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-slate-500">Meta do Período</p>
                        <p className="text-2xl font-bold text-slate-900">{formatBRL2(totalGoal)}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-slate-500">Realizado</p>
                        <p className="text-2xl font-bold text-indigo-600">{formatBRL2(totalActual)}</p>
                    </div>
                </div>
                {/* Progress Bar */}
                <div className="mt-4 w-full bg-slate-200 rounded-full h-2.5">
                    <div className={`h-2.5 rounded-full ${paceStatus === 'No Ritmo' ? 'bg-emerald-500' : 'bg-red-500'}`} style={{ width: `${Math.min((totalActual / totalGoal) * 100, 100)}%` }}></div>
                </div>
            </div>

            {/* LADDER TABLE & CHART */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Chart */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-96">
                    <h3 className="font-bold text-slate-700 mb-4">Tendência Mensal ({selectedYear})</h3>
                    <ResponsiveContainer>
                        <AreaChart data={monthlyData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                            <YAxis tickFormatter={formatAxisCompact} tick={{ fontSize: 12 }} />
                            <Tooltip formatter={(value: any) => formatBRL2(Number(value))} />
                            <Area type="monotone" dataKey="actual" name="Realizado" stroke="#4f46e5" fill="#e0e7ff" strokeWidth={2} />
                            <Area type="monotone" dataKey="goal" name="Meta" stroke="#10b981" fill="none" strokeDasharray="5 5" strokeWidth={2} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Table */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-4 bg-slate-50 border-b border-slate-200">
                        <h3 className="font-bold text-slate-700">Detalhamento Mensal</h3>
                    </div>
                    <div className="overflow-x-auto max-h-[350px] overflow-y-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-600 sticky top-0">
                                <tr>
                                    <th className="p-3">Mês</th>
                                    <th className="p-3 text-right">Meta</th>
                                    <th className="p-3 text-right">Realizado</th>
                                    <th className="p-3 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {monthlyData.map(d => (
                                    <tr key={d.month} className="hover:bg-slate-50">
                                        <td className="p-3 font-medium text-slate-900">{d.month}</td>
                                        <td className="p-3 text-right text-slate-500">{formatBRL2(d.goal)}</td>
                                        <td className="p-3 text-right font-bold text-indigo-600">{formatBRL2(d.actual)}</td>
                                        <td className="p-3 text-center">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${d.statusColor}`}>
                                                {d.statusLabel}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <Drawer title={`Definir Meta Anual (${selectedYear})`} isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)}>
                <form onSubmit={handleDistribute} className="space-y-4">
                    {/* Form same as before */}
                    <p className="text-sm text-slate-500">Isso irá redefinir todas as metas mensais deste ano.</p>
                    <div><label className="block text-sm font-medium text-slate-700 mb-1">Meta Anual (R$)</label><input type="number" required className="w-full border border-slate-300 rounded-lg p-2 text-slate-900 bg-white" value={annualTarget} onChange={e => setAnnualTarget(e.target.value)} /></div>
                    <div><label className="block text-sm font-medium text-slate-700 mb-1">Modo de Distribuição</label><select className="w-full border border-slate-300 rounded-lg p-2 text-slate-900 bg-white" value={distMode} onChange={e => setDistMode(e.target.value as any)}><option value="uniform">Uniforme (Divisão Igual)</option><option value="seasonal">Sazonal (Baseado no histórico)</option></select></div>
                    <button className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700 shadow-md mt-4">Aplicar Metas</button>
                </form>
            </Drawer>
        </div>
    );
};

export default Goals;
