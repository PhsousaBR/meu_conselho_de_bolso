"use client";

import React, { useState, useEffect } from 'react';
import { getExpenses, getExpenseTemplates, createExpense, deleteExpense } from '../services/dataService';
import { Expense, ExpenseFrequency } from '../types';
import { PageHeader, Drawer, Tabs } from './Shared';
import { ICONS } from '../constants';
import { useWorkspace } from '../contexts/WorkspaceContext';

const ExpensePage: React.FC = () => {
    // ... [código idêntico ao anterior, apenas adicionando "use client" no topo]
    const { isOwner } = useWorkspace();
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

    useEffect(() => { fetchData(); }, []);

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
        if(confirm('Apagar despesa?')) {
            await deleteExpense(id);
            fetchData();
        }
    };

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

            <Tabs tabs={['Histórico', 'Templates Rápidos']} activeTab={activeTab} onChange={setActiveTab} />

            {activeTab === 'Templates Rápidos' ? (
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
            ) : (
                <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200">
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
                                    <td className="p-4 text-slate-600 font-medium">{exp.description}</td>
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
            )}

            <Drawer title="Registrar Despesa" isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)}>
                {/* Same form content */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div><label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label><input required className="w-full border border-slate-300 p-2 rounded-lg text-slate-900 bg-white" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Ex: Aluguel, Software X" /></div>
                    <div><label className="block text-sm font-medium text-slate-700 mb-1">Categoria</label><input required className="w-full border border-slate-300 p-2 rounded-lg text-slate-900 bg-white" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} placeholder="Ex: Operacional, Software" /></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-sm font-medium text-slate-700 mb-1">Valor (R$)</label><input type="number" step="0.01" required className="w-full border border-slate-300 p-2 rounded-lg text-slate-900 bg-white" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} /></div>
                        <div><label className="block text-sm font-medium text-slate-700 mb-1">Data</label><input type="date" required className="w-full border border-slate-300 p-2 rounded-lg text-slate-900 bg-white" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} /></div>
                    </div>
                    <div className="border-t border-slate-100 pt-4 mt-2">
                        <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2"><input type="checkbox" checked={formData.is_recurring} onChange={e => setFormData({...formData, is_recurring: e.target.checked})} className="rounded text-indigo-600" /> Despesa Recorrente?</label>
                        {formData.is_recurring && (
                            <select className="w-full border border-slate-300 p-2 rounded-lg text-slate-900 bg-white" value={formData.recurring_frequency} onChange={e => setFormData({...formData, recurring_frequency: e.target.value as ExpenseFrequency})}>
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