
import React, { useState, useEffect } from 'react';
import { getCampaigns, createCampaign, deleteCampaign, updateCampaign, getIncomes } from '../services/dataService';
import { Campaign, MarketingChannel, IncomeStatus, Income } from '../types';
import { PageHeader, Drawer } from './Shared';
import { ICONS } from '../constants';
import { useWorkspace } from '../contexts/WorkspaceContext';

const MarketingPage: React.FC = () => {
    const { isOwner } = useWorkspace();
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [incomes, setIncomes] = useState<Income[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form
    const [formData, setFormData] = useState<Partial<Campaign>>({
        name: '',
        channel: MarketingChannel.META_ADS,
        spend: 0,
        start_date: new Date().toISOString().split('T')[0]
    });

    const fetchData = async () => {
        setLoading(true);
        const [cmp, inc] = await Promise.all([getCampaigns(), getIncomes()]);
        
        // Compute metrics
        const processedCampaigns = cmp.map(c => {
            const attributedIncomes = inc.filter(i => i.campaign_id === c.id && i.status === IncomeStatus.RECEIVED);
            const revenue = attributedIncomes.reduce((acc, curr) => acc + Number(curr.amount), 0);
            const customers = attributedIncomes.filter(i => i.customer_acquired).length;
            
            return {
                ...c,
                attributed_revenue: revenue,
                roas: c.spend > 0 ? revenue / c.spend : 0,
                acquired_customers: customers,
                cac: customers > 0 ? c.spend / customers : 0
            };
        });

        setCampaigns(processedCampaigns);
        setIncomes(inc);
        setLoading(false);
    };

    useEffect(() => { fetchData(); }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isOwner) return;
        if (editingId) {
            await updateCampaign(editingId, formData);
        } else {
            await createCampaign(formData);
        }
        closeDrawer();
        fetchData();
    };

    const handleEdit = (c: Campaign) => {
        if(!isOwner) return;
        setEditingId(c.id);
        setFormData({
            name: c.name,
            channel: c.channel,
            spend: c.spend,
            start_date: c.start_date,
            end_date: c.end_date,
            notes: c.notes
        });
        setIsDrawerOpen(true);
    }

    const handleDelete = async (id: string) => {
        if(!isOwner) return;
        if(confirm('Tem certeza? Receitas vinculadas perderão a atribuição.')) {
            await deleteCampaign(id);
            fetchData();
        }
    }

    const openNewDrawer = () => {
        if(!isOwner) return;
        setEditingId(null);
        setFormData({ name: '', channel: MarketingChannel.META_ADS, spend: 0, start_date: new Date().toISOString().split('T')[0] });
        setIsDrawerOpen(true);
    }

    const closeDrawer = () => {
        setIsDrawerOpen(false);
        setEditingId(null);
    }

    const totalSpend = campaigns.reduce((acc, c) => acc + Number(c.spend), 0);
    const totalRevenue = campaigns.reduce((acc, c) => acc + (c.attributed_revenue || 0), 0);
    const globalRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
    const totalCustomers = campaigns.reduce((acc, c) => acc + (c.acquired_customers || 0), 0);
    const globalCac = totalCustomers > 0 ? totalSpend / totalCustomers : 0;

    return (
        <div className="max-w-7xl mx-auto space-y-8">
            <PageHeader 
                title="Marketing & Performance" 
                description="Acompanhe ROI, ROAS e Custo por Aquisição (CAC)."
                actions={
                    isOwner && (
                        <button onClick={openNewDrawer} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 font-medium shadow-sm transition-colors">
                            <ICONS.Plus /> Nova Campanha
                        </button>
                    )
                }
            />

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                    <p className="text-sm text-slate-500 mb-1">Investimento Total</p>
                    <p className="text-2xl font-bold text-slate-900">R$ {totalSpend.toLocaleString('pt-BR')}</p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                    <p className="text-sm text-slate-500 mb-1">Receita Atribuída</p>
                    <p className="text-2xl font-bold text-emerald-600">R$ {totalRevenue.toLocaleString('pt-BR')}</p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                    <p className="text-sm text-slate-500 mb-1">ROAS Global</p>
                    <p className={`text-2xl font-bold ${globalRoas >= 2 ? 'text-emerald-500' : 'text-amber-500'}`}>
                        {globalRoas.toFixed(2)}x
                    </p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                    <p className="text-sm text-slate-500 mb-1">CAC Médio Global</p>
                    <p className="text-2xl font-bold text-slate-900">R$ {globalCac.toFixed(2)}</p>
                </div>
            </div>

            {/* Campaign Table */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                        <tr>
                            <th className="p-4 font-semibold">Campanha</th>
                            <th className="p-4 font-semibold">Canal</th>
                            <th className="p-4 font-semibold text-right">Investimento</th>
                            <th className="p-4 font-semibold text-right">Retorno</th>
                            <th className="p-4 font-semibold text-center">ROAS</th>
                            <th className="p-4 font-semibold text-center" title="Novos Clientes Adquiridos">Clientes (Novos)</th>
                            <th className="p-4 font-semibold text-center" title="Custo de Aquisição por Cliente">CAC</th>
                            {isOwner && <th className="p-4 font-semibold text-center">Ações</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? <tr><td colSpan={8} className="p-6 text-center">Carregando...</td></tr> : 
                         campaigns.length === 0 ? <tr><td colSpan={8} className="p-6 text-center text-slate-400">Nenhuma campanha registrada.</td></tr> :
                         campaigns.map(c => (
                            <tr key={c.id} className="hover:bg-slate-50">
                                <td className="p-4 font-medium text-slate-900">{c.name}</td>
                                <td className="p-4">
                                    <span className="bg-slate-100 px-2 py-1 rounded text-xs text-slate-600 uppercase font-bold">{c.channel.replace('_', ' ')}</span>
                                </td>
                                <td className="p-4 text-right text-slate-600">R$ {Number(c.spend).toLocaleString('pt-BR')}</td>
                                <td className="p-4 text-right text-emerald-600 font-bold">R$ {(c.attributed_revenue || 0).toLocaleString('pt-BR')}</td>
                                <td className="p-4 text-center font-bold text-slate-800">
                                    {(c.roas || 0).toFixed(1)}x
                                </td>
                                <td className="p-4 text-center text-slate-800">
                                    {(c.acquired_customers || 0)}
                                </td>
                                <td className="p-4 text-center text-slate-800">
                                    R$ {(c.cac || 0).toFixed(0)}
                                </td>
                                {isOwner && (
                                    <td className="p-4 text-center">
                                        <button onClick={() => handleEdit(c)} className="text-slate-400 hover:text-indigo-600 mr-2"><ICONS.Edit /></button>
                                        <button onClick={() => handleDelete(c.id)} className="text-slate-400 hover:text-red-500"><ICONS.Trash /></button>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Drawer title={editingId ? "Editar Campanha" : "Nova Campanha"} isOpen={isDrawerOpen} onClose={closeDrawer}>
                {/* Form same as before */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div><label className="block text-sm font-medium text-slate-700 mb-1">Nome da Campanha</label><input required className="w-full border border-slate-300 p-2 rounded-lg text-slate-900 bg-white" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Ex: Google Ads - Verão" /></div>
                    <div><label className="block text-sm font-medium text-slate-700 mb-1">Canal</label><select className="w-full border border-slate-300 p-2 rounded-lg text-slate-900 bg-white" value={formData.channel} onChange={e => setFormData({...formData, channel: e.target.value as MarketingChannel})}><option value={MarketingChannel.META_ADS}>Meta Ads (FB/IG)</option><option value={MarketingChannel.GOOGLE_ADS}>Google Ads</option><option value={MarketingChannel.INDICACAO}>Indicação</option><option value={MarketingChannel.THREADS}>Threads</option><option value={MarketingChannel.INSTAGRAM}>Instagram Orgânico</option><option value={MarketingChannel.OUTROS}>Outros</option></select></div>
                    <div><label className="block text-sm font-medium text-slate-700 mb-1">Investimento Total (R$)</label><input type="number" step="0.01" required className="w-full border border-slate-300 p-2 rounded-lg text-slate-900 bg-white" value={formData.spend} onChange={e => setFormData({...formData, spend: parseFloat(e.target.value)})} /></div>
                    <div><label className="block text-sm font-medium text-slate-700 mb-1">Data Início</label><input type="date" required className="w-full border border-slate-300 p-2 rounded-lg text-slate-900 bg-white" value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} /></div>
                    <div><label className="block text-sm font-medium text-slate-700 mb-1">Observações</label><textarea className="w-full border border-slate-300 p-2 rounded-lg text-slate-900 bg-white" rows={2} value={formData.notes || ''} onChange={e => setFormData({...formData, notes: e.target.value})} /></div>
                    <button className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700 shadow-md mt-4">{editingId ? "Salvar Alterações" : "Criar Campanha"}</button>
                </form>
            </Drawer>
        </div>
    );
};

export default MarketingPage;
