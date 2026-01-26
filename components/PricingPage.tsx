
import React, { useState, useEffect } from 'react';
import { getFixedCosts, createFixedCost, deleteFixedCost, updateFixedCost, getPricingSettings, updatePricingSettings, getServices } from '../services/dataService';
import { FixedCost, PricingSettings, Service } from '../types';
import { PageHeader, Tabs, Drawer } from './Shared';
import { ICONS } from '../constants';
import { useWorkspace } from '../contexts/WorkspaceContext';

const PricingPage: React.FC = () => {
    const { isOwner, workspace } = useWorkspace();
    const [activeTab, setActiveTab] = useState('Calculadora');
    const [fixedCosts, setFixedCosts] = useState<FixedCost[]>([]);
    const [settings, setSettings] = useState<PricingSettings | null>(null);
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);

    // --- Tab 1: Fixed Costs CRUD ---
    const [fcDrawer, setFcDrawer] = useState(false);
    const [editingFcId, setEditingFcId] = useState<string | null>(null);
    const [newFc, setNewFc] = useState({ name: '', category: 'Software', monthly_amount: '' });

    // --- Tab 2: Calculator State ---
    const [calcServiceId, setCalcServiceId] = useState('');
    const [calcHours, setCalcHours] = useState('0');
    const [calcMargin, setCalcMargin] = useState('30');
    const [calcTax, setCalcTax] = useState('6');
    const [calcVars, setCalcVars] = useState<{ name: string, amount: string }[]>([]);

    // Results
    const [result, setResult] = useState<any>(null);

    useEffect(() => {
        const load = async () => {
            const [fc, set, srv] = await Promise.all([getFixedCosts(), getPricingSettings(), getServices()]);
            setFixedCosts(fc);
            setSettings(set);
            setServices(srv);

            // Init calc defaults
            if (set) {
                setCalcMargin(set.default_margin_percent.toString());
                setCalcTax(set.tax_percent.toString());
            }
            setLoading(false);
        };
        if (workspace?.id) load();
    }, [workspace?.id]);

    // --- HANDLERS ---

    const handleSaveFC = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isOwner) return;
        const payload = { ...newFc, monthly_amount: parseFloat(newFc.monthly_amount) };

        if (editingFcId) {
            await updateFixedCost(editingFcId, payload);
        } else {
            await createFixedCost(payload);
        }

        setFixedCosts(await getFixedCosts());
        setFcDrawer(false);
        setEditingFcId(null);
        setNewFc({ name: '', category: 'Software', monthly_amount: '' });
    };

    const handleEditFC = (fc: FixedCost) => {
        if (!isOwner) return;
        setEditingFcId(fc.id);
        setNewFc({ name: fc.name, category: fc.category, monthly_amount: fc.monthly_amount.toString() });
        setFcDrawer(true);
    };

    const handleDeleteFC = async (id: string) => {
        if (!isOwner) return;
        if (confirm('Remover custo?')) {
            await deleteFixedCost(id);
            setFixedCosts(await getFixedCosts());
        }
    };

    const openNewFcDrawer = () => {
        if (!isOwner) return;
        setEditingFcId(null);
        setNewFc({ name: '', category: 'Software', monthly_amount: '' });
        setFcDrawer(true);
    };

    const handleSaveSettings = async () => {
        if (!settings || !isOwner) return;
        await updatePricingSettings(settings);
        alert('Configurações salvas!');
    };

    // --- CALCULATOR LOGIC ---

    // Calcs state
    const [useTargetRate, setUseTargetRate] = useState(false);

    // --- CALCULATOR LOGIC ---

    const calculatePrice = () => {
        if (!settings) return;

        const totalFixed = fixedCosts.reduce((acc, c) => acc + Number(c.monthly_amount), 0);
        const billableHours = settings.workable_hours_month * (1 - (settings.nonbillable_percent / 100));

        // Base Cost (Minimum to survive)
        const costPerHour = billableHours > 0 ? totalFixed / billableHours : 0;

        // Target Rate (To hit goal)
        const targetRate = (settings.monthly_goal && billableHours > 0)
            ? (settings.monthly_goal / billableHours)
            : 0;

        // Decide which base to use
        const baseRate = useTargetRate ? targetRate : costPerHour;

        const hours = parseFloat(calcHours) || 0;
        const allocatedFixed = baseRate * hours;

        const totalVars = calcVars.reduce((acc, v) => acc + (parseFloat(v.amount) || 0), 0);

        const totalCost = allocatedFixed + totalVars;

        const marginPct = (parseFloat(calcMargin) || 0) / 100;
        const priceWithMargin = totalCost * (1 + marginPct);

        const taxPct = (parseFloat(calcTax) || 0) / 100;
        const finalPrice = priceWithMargin / (1 - taxPct);

        const taxAmount = finalPrice * taxPct;
        const profit = finalPrice - allocatedFixed - totalVars - taxAmount; // Profit is what remains after base covers goal/cost + vars + tax

        setResult({
            totalFixed,
            costPerHour,
            allocatedFixed,
            totalVars,
            totalCost,
            finalPrice,
            profit,
            taxAmount,
            minPrice: totalCost / (1 - taxPct) // Price just to cover costs + tax
        });
    };

    const handleServiceSelect = (id: string) => {
        setCalcServiceId(id);
        const s = services.find(x => x.id === id);
        if (s && s.default_hours) {
            setCalcHours(s.default_hours.toString());
        }
    };

    const addVarCost = () => setCalcVars([...calcVars, { name: '', amount: '' }]);
    const updateVarCost = (idx: number, field: string, val: string) => {
        const n = [...calcVars];
        // @ts-ignore
        n[idx][field] = val;
        setCalcVars(n);
    };

    const handlePrintQuote = () => {
        window.print();
    };

    if (loading || !settings) return <div className="p-8 text-center">Carregando Precificação...</div>;

    const totalFixed = fixedCosts.reduce((acc, c) => acc + Number(c.monthly_amount), 0);
    const billableHours = settings.workable_hours_month * (1 - settings.nonbillable_percent / 100);

    // Hourly Rates Display
    const minHourlyRate = billableHours > 0 ? totalFixed / billableHours : 0;
    const minHourlyRateTaxed = minHourlyRate / (1 - settings.tax_percent / 100);

    // Target Rate logic (Goal / Billable)
    // Note: Target Rate usually includes profit implicitly if Goal is Revenue Goal. 
    // But here we treat Goal as "Gross Revenue Goal". 
    // If we use Goal as base, we are effectively ensuring that if we sell *all hours* at this rate, we hit the goal.
    const targetHourlyRate = (settings.monthly_goal && billableHours > 0)
        ? (settings.monthly_goal / billableHours)
        : 0;
    const targetHourlyRateTaxed = targetHourlyRate / (1 - settings.tax_percent / 100);

    return (
        <div className="max-w-7xl mx-auto">
            <div className="print:hidden">
                <PageHeader
                    title="Precificação Inteligente"
                    description="Calcule o preço ideal baseando-se em seus custos reais e meta de faturamento."
                />
                <Tabs tabs={['Calculadora', 'Custos Fixos', 'Configurações']} activeTab={activeTab} onChange={setActiveTab} />
            </div>

            {/* TAB 1: CALCULATOR */}
            {activeTab === 'Calculadora' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* FORM */}
                    <div className="space-y-6 print:hidden">
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <ICONS.Calculator /> Dados do Projeto
                            </h3>

                            <div className="space-y-4">
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">Serviço (Base)</label><select className="w-full border border-slate-300 p-2 rounded-lg bg-white text-slate-900" value={calcServiceId} onChange={e => handleServiceSelect(e.target.value)}><option value="">Personalizado / Novo Projeto</option>{services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">Horas Estimadas de Trabalho</label><input type="number" className="w-full border border-slate-300 p-2 rounded-lg bg-white text-slate-900" value={calcHours} onChange={e => setCalcHours(e.target.value)} /><div className="mt-2 flex gap-3 text-xs"><div className="bg-slate-100 p-1.5 rounded text-slate-600">Mínimo (Custo): <strong>R$ {minHourlyRateTaxed.toFixed(2)}/h</strong></div>{targetHourlyRate > 0 && (<div className="bg-emerald-50 p-1.5 rounded text-emerald-700">Alvo (Meta): <strong>R$ {targetHourlyRateTaxed.toFixed(2)}/h</strong></div>)}</div></div>

                                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Base de Cálculo</label>
                                    <div className="flex bg-white rounded-lg p-1 border border-slate-200">
                                        <button
                                            onClick={() => setUseTargetRate(false)}
                                            className={`flex-1 py-1.5 text-xs font-bold rounded ${!useTargetRate ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                                        >
                                            Cobrir Custos
                                        </button>
                                        <button
                                            onClick={() => setUseTargetRate(true)}
                                            className={`flex-1 py-1.5 text-xs font-bold rounded ${useTargetRate ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                                        >
                                            Atingir Meta
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-slate-500 mt-2">
                                        {useTargetRate
                                            ? `Usando taxa alvo (R$ ${targetHourlyRate.toFixed(2)}/h) baseada na meta mensal.`
                                            : `Usando custo mínimo (R$ ${minHourlyRate.toFixed(2)}/h) baseado nos custos fixos.`}
                                    </p>
                                </div>
                                <div><label className="block text-sm font-medium text-slate-700 mb-2">Custos Variáveis (Extras)</label>{calcVars.map((v, i) => (<div key={i} className="flex gap-2 mb-2"><input placeholder="Item (ex: Freelancer)" className="flex-1 border border-slate-300 p-2 rounded text-sm text-slate-900 bg-white" value={v.name} onChange={e => updateVarCost(i, 'name', e.target.value)} /><input placeholder="R$" type="number" className="w-24 border border-slate-300 p-2 rounded text-sm text-slate-900 bg-white" value={v.amount} onChange={e => updateVarCost(i, 'amount', e.target.value)} /></div>))}<button onClick={addVarCost} className="text-xs text-indigo-600 font-bold hover:underline">+ Adicionar Custo Variável</button></div>
                                <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-slate-700 mb-1">Margem de Lucro (%)</label><input type="number" className="w-full border border-slate-300 p-2 rounded-lg bg-white text-slate-900" value={calcMargin} onChange={e => setCalcMargin(e.target.value)} /></div><div><label className="block text-sm font-medium text-slate-700 mb-1">Impostos (%)</label><input type="number" className="w-full border border-slate-300 p-2 rounded-lg bg-white text-slate-900" value={calcTax} onChange={e => setCalcTax(e.target.value)} /></div></div>
                                <button onClick={calculatePrice} className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700 shadow-md">Calcular Preço Recomendado</button>
                            </div>
                        </div>
                    </div>

                    {/* RESULTS - Same as before */}
                    <div className="space-y-6">
                        {result ? (
                            <div className="bg-slate-900 text-white p-8 rounded-2xl shadow-xl relative overflow-hidden print:bg-white print:text-black print:border print:border-slate-300">
                                <div className="absolute top-0 right-0 p-6 opacity-10 print:hidden"><svg width="150" height="150" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.15-1.46-3.27-3.4h1.96c.1 1.05 1.18 1.91 2.53 1.91 1.29 0 2.13-.86 2.13-2.03 0-1.69-2.14-2.03-3.66-2.68C8.95 11.26 7.5 10.35 7.5 8.3c0-1.85 1.45-2.99 3.09-3.35V3h2.67v1.92c1.42.26 2.7 1.2 2.91 3.1h-1.96c-.12-.99-1.04-1.7-2.14-1.7-1.18 0-1.98.78-1.98 1.8 0 1.5 2.13 1.83 3.71 2.51 1.76.76 3.09 1.71 3.09 3.65 0 1.94-1.42 3.2-3.48 3.61z" /></svg></div>
                                <h3 className="text-slate-400 font-bold uppercase tracking-wider text-sm mb-2 print:text-slate-600">Preço Recomendado</h3><div className="text-5xl font-bold text-white mb-6 print:text-black">R$ {result.finalPrice.toFixed(2)}</div>
                                <div className="space-y-3 text-sm border-t border-slate-700 pt-4 print:border-slate-200"><div className="flex justify-between"><span className="text-slate-300 print:text-slate-600">Custos Fixos (Alocados)</span><span>R$ {result.allocatedFixed.toFixed(2)}</span></div><div className="flex justify-between"><span className="text-slate-300 print:text-slate-600">Custos Variáveis</span><span>R$ {result.totalVars.toFixed(2)}</span></div><div className="flex justify-between"><span className="text-slate-300 print:text-slate-600">Impostos ({calcTax}%)</span><span>R$ {result.taxAmount.toFixed(2)}</span></div><div className="flex justify-between font-bold text-emerald-400 print:text-emerald-700 text-lg mt-2"><span>Lucro Líquido Estimado</span><span>R$ {result.profit.toFixed(2)}</span></div></div>
                                {settings.monthly_goal > 0 && result.finalPrice > 0 && (<div className="mt-6 pt-4 border-t border-slate-700 print:hidden"><p className="text-sm text-slate-300">Para bater sua meta de <strong>R$ {settings.monthly_goal.toLocaleString()}</strong>, você precisa vender aprox. <strong className="text-white bg-indigo-600 px-1 rounded">{Math.ceil(settings.monthly_goal / result.finalPrice)}</strong> projetos como este por mês.</p></div>)}
                                <div className="mt-6 flex gap-2 print:hidden"><button onClick={handlePrintQuote} className="flex-1 bg-white/10 hover:bg-white/20 text-white py-2 rounded font-medium transition-colors">Imprimir Proposta</button></div>
                            </div>
                        ) : (<div className="h-full flex items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl p-12">Preencha os dados e calcule para ver o resultado.</div>)}
                    </div>
                </div>
            )}

            {/* TAB 2: FIXED COSTS */}
            {activeTab === 'Custos Fixos' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                        <div><h2 className="text-xl font-bold text-slate-800">Custo Fixo Mensal: R$ {totalFixed.toFixed(2)}</h2><p className="text-slate-500 text-sm">Inclua aluguel, softwares, contador e seu <strong>Pro-labore (salário)</strong>.</p></div>
                        {isOwner && <button onClick={openNewFcDrawer} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700">+ Adicionar Custo</button>}
                    </div>
                    {/* Table... (Wrapped Actions) */}
                    <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600"><tr><th className="p-4">Nome</th><th className="p-4">Categoria</th><th className="p-4 text-right">Valor Mensal</th>{isOwner && <th className="p-4 text-center">Ações</th>}</tr></thead>
                            <tbody className="divide-y divide-slate-100">{fixedCosts.map(fc => (<tr key={fc.id} className="hover:bg-slate-50"><td className="p-4 font-medium text-slate-800">{fc.name}</td><td className="p-4"><span className="bg-slate-100 px-2 py-1 rounded text-xs uppercase font-bold text-slate-600">{fc.category}</span></td><td className="p-4 text-right text-slate-900">R$ {Number(fc.monthly_amount).toFixed(2)}</td>{isOwner && <td className="p-4 text-center"><button onClick={() => handleEditFC(fc)} className="text-slate-400 hover:text-indigo-600 mr-2" title="Editar"><ICONS.Edit /></button><button onClick={() => handleDeleteFC(fc.id)} className="text-slate-400 hover:text-red-600" title="Excluir"><ICONS.Trash /></button></td>}</tr>))}</tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB 3: SETTINGS (View Only for Viewers) */}
            {activeTab === 'Configurações' && settings && (
                <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-2 bg-white p-8 rounded-xl border border-slate-200 shadow-sm relative">
                        {!isOwner && <div className="absolute inset-0 bg-white/50 z-10 cursor-not-allowed flex items-center justify-center font-bold text-slate-500">Visualização Apenas</div>}
                        <h3 className="font-bold text-lg mb-6 text-slate-800 border-b pb-2">Parâmetros de Precificação</h3>
                        {/* Fields... (Disabled implicitly via isOwner overlay or state check) */}
                        <div className="space-y-6">
                            <div><label className="block text-sm font-medium text-slate-700 mb-1">Meta de Faturamento Mensal (R$)</label><input type="number" className="w-full border border-slate-200 bg-emerald-50 p-3 rounded-lg text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 font-bold" value={settings.monthly_goal} onChange={e => setSettings({ ...settings, monthly_goal: parseFloat(e.target.value) })} /></div>
                            {/* ... Rest of fields ... */}
                            <div className="grid grid-cols-2 gap-6"><div><label className="block text-sm font-medium text-slate-700 mb-1">Horas Trabalháveis / Mês</label><input type="number" className="w-full border border-slate-200 bg-slate-50 p-3 rounded-lg text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500" value={settings.workable_hours_month} onChange={e => setSettings({ ...settings, workable_hours_month: parseFloat(e.target.value) })} /></div><div><label className="block text-sm font-medium text-slate-700 mb-1">% Horas Não-Faturáveis</label><input type="number" className="w-full border border-slate-200 bg-slate-50 p-3 rounded-lg text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500" value={settings.nonbillable_percent} onChange={e => setSettings({ ...settings, nonbillable_percent: parseFloat(e.target.value) })} /></div></div>
                            <div className="grid grid-cols-2 gap-6"><div><label className="block text-sm font-medium text-slate-700 mb-1">Margem Padrão (%)</label><input type="number" className="w-full border border-slate-200 bg-slate-50 p-3 rounded-lg text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500" value={settings.default_margin_percent} onChange={e => setSettings({ ...settings, default_margin_percent: parseFloat(e.target.value) })} /></div><div><label className="block text-sm font-medium text-slate-700 mb-1">Imposto Médio (%)</label><input type="number" className="w-full border border-slate-200 bg-slate-50 p-3 rounded-lg text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500" value={settings.tax_percent} onChange={e => setSettings({ ...settings, tax_percent: parseFloat(e.target.value) })} /></div></div>
                            <div className="pt-4">{isOwner && <button onClick={handleSaveSettings} className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-indigo-700 w-full transition-colors shadow-sm">Salvar Alterações</button>}</div>
                        </div>
                    </div>
                    {/* Side Info ... */}
                </div>
            )}

            <Drawer title={editingFcId ? "Editar Custo" : "Novo Custo Fixo"} isOpen={fcDrawer} onClose={() => setFcDrawer(false)}>
                {/* Form same as before */}
                <form onSubmit={handleSaveFC} className="space-y-6">
                    <div><label className="block text-sm font-medium text-slate-700 mb-1">Nome</label><input required className="w-full border border-slate-200 bg-slate-50 p-3 rounded-lg text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500" value={newFc.name} onChange={e => setNewFc({ ...newFc, name: e.target.value })} /></div>
                    <div><label className="block text-sm font-medium text-slate-700 mb-1">Categoria</label><select className="w-full border border-slate-200 bg-slate-50 p-3 rounded-lg text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500" value={newFc.category} onChange={e => setNewFc({ ...newFc, category: e.target.value })}><option>Software</option><option>Infraestrutura</option><option>Contabilidade</option><option>Marketing</option><option>Pessoal / Pro-labore</option><option>Outros</option></select></div>
                    <div><label className="block text-sm font-medium text-slate-700 mb-1">Valor Mensal (R$)</label><input required type="number" step="0.01" className="w-full border border-slate-200 bg-slate-50 p-3 rounded-lg text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500" value={newFc.monthly_amount} onChange={e => setNewFc({ ...newFc, monthly_amount: e.target.value })} /></div>
                    <button className="w-full bg-indigo-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-indigo-700 transition-colors shadow-sm mt-2">{editingFcId ? "Salvar Alterações" : "Adicionar Custo"}</button>
                </form>
            </Drawer>
        </div>
    );
};

export default PricingPage;
