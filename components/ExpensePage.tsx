"use client";

import React, { useState, useEffect } from 'react';
import { getExpenses, getExpenseTemplates, createExpense, deleteExpense } from '../services/dataService';
import { Expense, ExpenseFrequency } from '../types';
import { PageHeader, Drawer, Tabs } from './Shared';
import { ICONS } from '../constants';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { MobileDataList } from './MobileDataList';

const ExpensePage: React.FC = () => {
    const { isOwner, workspace } = useWorkspace(); // GET WORKSPACE FROM CONTEXT
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [templates, setTemplates] = useState<Expense[]>([]);
    const [activeTab, setActiveTab] = useState('Histórico');
    const [loading, setLoading] = useState(true);

    // Drawer
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [formData, setFormData] = useState({
        amount: '',
        date: new Date().toISOString().split('T')[0],
        category: '',
        description: '',
        is_recurring: false,
        recurring_frequency: ExpenseFrequency.MONTHLY
    });

    const fetchData = async () => {
        setLoading(true);
        const [exp, tpl] = await Promise.all([getExpenses(), getExpenseTemplates()]);
        setExpenses(exp.filter(e => !e.is_template));
        setTemplates(tpl);
        setLoading(false);
    };

    useEffect(() => {
        if (workspace?.id) fetchData();
    }, [workspace?.id]);

    const handleUseTemplate = (t: Expense) => {
        if (!isOwner) return;
        setFormData({
            amount: t.amount.toString(),
            date: new Date().toISOString().split('T')[0],
            category: t.category,
            description: t.description,
            is_recurring: t.is_recurring,
            recurring_frequency: t.recurring_frequency
        });
        setIsDrawerOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isOwner) return;
        await createExpense({
            amount: parseFloat(formData.amount),
            date: formData.date,
            category: formData.category,
            description: formData.description,
            is_recurring: formData.is_recurring,
            recurring_frequency: formData.is_recurring ? formData.recurring_frequency : ExpenseFrequency.NONE,
            is_template: false
        });
        setIsDrawerOpen(false);
        setFormData({ amount: '', date: new Date().toISOString().split('T')[0], category: '', description: '', is_recurring: false, recurring_frequency: ExpenseFrequency.MONTHLY });
        fetchData();
        setActiveTab('Histórico');
    };

    const handleDelete = async (id: string) => {
        if (!isOwner) return;
        if (confirm('Apagar despesa?')) {
            await deleteExpense(id);
            fetchData();
        }
    };

    // --- PROJECTION LOGIC ---
    const getProjection = () => {
        const months = [];
        const today = new Date();

        // Next 6 months
        for (let i = 0; i < 6; i++) {
            const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
            const monthIdx = d.getMonth(); // 0-11
            const year = d.getFullYear();

            // 1. Existing One-time Future Expenses in this month
            // Note: Our dataService usually returns history. If future expenses are stored, they are in 'expenses'.
            const oneTimeTotal = expenses
                .filter(e => !e.is_recurring)
                .filter(e => {
                    const ed = new Date(e.date);
                    return ed.getMonth() === monthIdx && ed.getFullYear() === year;
                })
                .reduce((acc, curr) => acc + Number(curr.amount), 0);

            // 2. Recurring Expenses
            // We assume active recurring expenses apply indefinitely for now (simplified)
            const recurringTotal = expenses
                .filter(e => e.is_recurring)
                .reduce((acc, curr) => {
                    let applies = false;
                    if (curr.recurring_frequency === ExpenseFrequency.MONTHLY) {
                        applies = true;
                    } else if (curr.recurring_frequency === ExpenseFrequency.YEARLY) {
                        const startMonth = new Date(curr.date).getMonth();
                        if (startMonth === monthIdx) applies = true;
                    }
                    return applies ? acc + Number(curr.amount) : acc;
                }, 0);

            months.push({
                date: d,
                label: `${d.toLocaleDateString('pt-BR', { month: 'long' })}/${year}`,
                total: oneTimeTotal + recurringTotal,
                recurring: recurringTotal,
                oneTime: oneTimeTotal
            });
        }
        return months;
    };

    const projection = getProjection();

    return (
        <div className="max-w-7xl mx-auto">
            <PageHeader
                title="Despesas"
                description="Gerencie custos operacionais e recorrências."
                actions={
                    isOwner && (
                        <button onClick={() => { setFormData({ amount: '', date: new Date().toISOString().split('T')[0], category: '', description: '', is_recurring: false, recurring_frequency: ExpenseFrequency.MONTHLY }); setIsDrawerOpen(true); }} className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 font-medium shadow-sm transition-colors">
                            <ICONS.Plus /> Nova Despesa
                        </button>
                    )
                }
            />

            <Tabs tabs={['Histórico', 'Templates Rápidos', 'Previsão Futura']} activeTab={activeTab} onChange={setActiveTab} />

            {activeTab === 'Templates Rápidos' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {templates.map(t => (
                        <div key={t.id}
                            onClick={() => isOwner && handleUseTemplate(t)}
                            className={`bg-white p-5 rounded-xl border border-slate-200 shadow-sm transition-all group ${isOwner ? 'hover:shadow-md hover:border-indigo-300 cursor-pointer' : ''}`}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <span className="bg-slate-100 text-slate-600 text-[10px] uppercase font-bold px-2 py-1 rounded">{t.category}</span>
                                {isOwner && <span className="text-indigo-600 opacity-0 group-hover:opacity-100 font-medium text-sm">Usar &rarr;</span>}
                            </div>
                            <h3 className="font-bold text-slate-800 mb-1">{t.description}</h3>
                            <p className="text-red-600 font-bold">R$ {Number(t.amount).toFixed(2)}</p>
                            {t.is_recurring && <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">↻ {t.recurring_frequency === 'monthly' ? 'Mensal' : 'Anual'}</p>}
                        </div>
                    ))}
                    {isOwner && (
                        <div onClick={() => { setFormData({ amount: '', date: new Date().toISOString().split('T')[0], category: '', description: '', is_recurring: false, recurring_frequency: ExpenseFrequency.MONTHLY }); setIsDrawerOpen(true); }}
                            className="border-2 border-dashed border-slate-300 rounded-xl p-5 flex flex-col items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-300 cursor-pointer transition-colors"
                        >
                            <ICONS.Plus />
                            <span className="mt-2 font-medium">Criar Personalizada</span>
                        </div>
                    )}
                </div>
            )}





            {activeTab === 'Histórico' && (
                <>
                    <div className="block md:hidden">
                        <MobileDataList
                            data={expenses}
                            title={(item) => item.description}
                            subtitle={(item) => new Date(item.date).toLocaleDateString('pt-BR')}
                            fields={[
                                {
                                    label: 'Valor',
                                    value: (item) => <span className="font-bold text-red-600">R$ {Number(item.amount).toFixed(2)}</span>
                                },
                                {
                                    label: 'Categoria',
                                    value: (item) => <span className="bg-slate-100 px-2 py-1 rounded text-xs text-slate-600 uppercase font-bold">{item.category}</span>
                                },
                                {
                                    label: 'Recorrência',
                                    value: (item) => item.is_recurring ? (
                                        <span className="px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[10px] font-bold border border-blue-100">
                                            {item.recurring_frequency === 'monthly' ? 'Mensal' : 'Anual'}
                                        </span>
                                    ) : '-'
                                }
                            ]}
                            actions={(item) => isOwner ? (
                                <button onClick={() => handleDelete(item.id)} className="p-2 text-red-400 hover:bg-red-50 rounded">
                                    <ICONS.Trash />
                                </button>
                            ) : null}
                        />
                    </div>

                    <div className="hidden md:block bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200 overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="p-4 font-semibold text-slate-600">Data</th>
                                    <th className="p-4 font-semibold text-slate-600">Categoria</th>
                                    <th className="p-4 font-semibold text-slate-600">Descrição</th>
                                    <th className="p-4 font-semibold text-slate-600 text-right">Valor</th>
                                    {isOwner && <th className="p-4 font-semibold text-slate-600 text-center">Ações</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? <tr><td colSpan={5} className="p-6 text-center">Carregando...</td></tr> :
                                    expenses.length === 0 ? <tr><td colSpan={5} className="p-6 text-center text-slate-400">Nenhuma despesa registrada.</td></tr> :
                                        expenses.map(exp => (
                                            <tr key={exp.id} className="hover:bg-slate-50">
                                                <td className="p-4 text-slate-700">{new Date(exp.date).toLocaleDateString('pt-BR')}</td>
                                                <td className="p-4"><span className="bg-slate-100 px-2 py-1 rounded text-xs text-slate-600 uppercase font-bold">{exp.category}</span></td>
                                                <td className="p-4 text-slate-600 font-medium">
                                                    {exp.description}
                                                    {exp.is_recurring && (
                                                        <span className="ml-2 px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[10px] font-bold border border-blue-100">
                                                            {exp.recurring_frequency === 'monthly' ? 'Mensal' : 'Anual'}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="p-4 text-right font-bold text-red-600">R$ {Number(exp.amount).toFixed(2)}</td>
                                                {isOwner && (
                                                    <td className="p-4 text-center">
                                                        <button onClick={() => handleDelete(exp.id)} className="text-slate-400 hover:text-red-500"><ICONS.Trash /></button>
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {activeTab === 'Previsão Futura' && (
                <div className="space-y-6">
                    <div className="bg-blue-50 border border-blue-100 p-6 rounded-xl">
                        <h3 className="font-bold text-blue-900 mb-2">Projeção de Gastos (6 Meses)</h3>
                        <p className="text-sm text-blue-800">
                            Baseado nas despesas recorrentes ativas e agendamentos futuros.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {projection.map((month, idx) => (
                            <div key={idx} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                                <h4 className="font-bold text-slate-600 uppercase text-xs tracking-wider mb-2">{month.label}</h4>
                                <div className="text-2xl font-bold text-slate-800 mb-4">R$ {month.total.toFixed(2)}</div>
                                <div className="space-y-2 text-sm border-t border-slate-100 pt-3">
                                    <div className="flex justify-between text-slate-500">
                                        <span>Recorrentes</span>
                                        <span className="font-medium text-slate-700">R$ {month.recurring.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-slate-500">
                                        <span>Avulsas / Únicas</span>
                                        <span className="font-medium text-slate-700">R$ {month.oneTime.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <Drawer title="Registrar Despesa" isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)}>
                {/* Same form content */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div><label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label><input required className="w-full border border-slate-300 p-2 rounded-lg text-slate-900 bg-white" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Ex: Aluguel, Software X" /></div>
                    <div><label className="block text-sm font-medium text-slate-700 mb-1">Categoria</label><input required className="w-full border border-slate-300 p-2 rounded-lg text-slate-900 bg-white" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} placeholder="Ex: Operacional, Software" /></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-sm font-medium text-slate-700 mb-1">Valor (R$)</label><input type="number" step="0.01" required className="w-full border border-slate-300 p-2 rounded-lg text-slate-900 bg-white" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} /></div>
                        <div><label className="block text-sm font-medium text-slate-700 mb-1">Data</label><input type="date" required className="w-full border border-slate-300 p-2 rounded-lg text-slate-900 bg-white" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} /></div>
                    </div>
                    <div className="border-t border-slate-100 pt-4 mt-2">
                        <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2"><input type="checkbox" checked={formData.is_recurring} onChange={e => setFormData({ ...formData, is_recurring: e.target.checked })} className="rounded text-indigo-600" /> Despesa Recorrente?</label>
                        {formData.is_recurring && (
                            <select className="w-full border border-slate-300 p-2 rounded-lg text-slate-900 bg-white" value={formData.recurring_frequency} onChange={e => setFormData({ ...formData, recurring_frequency: e.target.value as ExpenseFrequency })}>
                                <option value={ExpenseFrequency.MONTHLY}>Mensal</option>
                                <option value={ExpenseFrequency.YEARLY}>Anual</option>
                            </select>
                        )}
                    </div>
                    <button className="w-full bg-red-600 text-white py-3 rounded-lg font-bold hover:bg-red-700 shadow-md mt-4">Salvar Despesa</button>
                </form>
            </Drawer>
        </div>
    );
};

export default ExpensePage;