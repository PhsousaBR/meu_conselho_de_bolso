
import React, { useState, useEffect } from 'react';
import { getIncomes, createClient, createSale, getClients, getServices, deleteIncome, getCampaigns, getPricingSettings, updateIncome } from '../services/dataService';
import { Income, Client, Service, IncomeStatus, Campaign, PaymentMethodType, PricingSettings } from '../types';
import { PageHeader, Drawer, Tabs } from './Shared';
import { Combobox } from './Combobox';
import { ICONS, MONTH_NAMES } from '../constants';
import { useWorkspace } from '../contexts/WorkspaceContext';

const IncomePage: React.FC = () => {
    return <IncomePageContent />;
};

// Sub-components
const YearAccordion = ({ year, monthsData, isOwner, onDelete, onMarkReceived }: any) => {
    const [isOpen, setIsOpen] = useState(year === new Date().getFullYear());

    // Explicitly cast curr.total to number if needed
    const yearlyTotal = Object.values(monthsData).reduce((acc: number, curr: any) => acc + (curr.total || 0), 0) as number;

    return (
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
            >
                <div className="flex items-center gap-3">
                    <div className={`transition-transform duration-200 ${isOpen ? 'rotate-90' : ''} text-slate-400`}>
                        <ICONS.ChevronRight />
                    </div>
                    <span className="text-lg font-bold text-slate-800">{year}</span>
                    <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-bold">
                        {Object.keys(monthsData).length} meses
                    </span>
                </div>
                <div className="font-bold text-emerald-700 text-lg">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(yearlyTotal)}
                </div>
            </button>

            {isOpen && (
                <div className="divide-y divide-slate-100 border-t border-slate-200">
                    {Object.keys(monthsData).map(Number).sort((a, b) => b - a).map(month => (
                        <MonthAccordion
                            key={month}
                            year={year}
                            month={month}
                            data={monthsData[month]}
                            isOwner={isOwner}
                            onDelete={onDelete}
                            onMarkReceived={onMarkReceived}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

const MonthAccordion = ({ year, month, data, isOwner, onDelete, onMarkReceived }: any) => {
    // Default open if current month and current year
    const isCurrentMonth = month === new Date().getMonth() && year === new Date().getFullYear();
    const [isOpen, setIsOpen] = useState(isCurrentMonth);

    return (
        <div className="bg-white">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-3 pl-8 hover:bg-slate-50 transition-colors text-left border-l-4 border-transparent hover:border-emerald-400"
            >
                <div className="flex items-center gap-3">
                    <div className={`transition-transform duration-200 ${isOpen ? 'rotate-90' : ''} text-slate-300`}>
                        <ICONS.ChevronRight />
                    </div>
                    <span className="font-bold text-slate-700 uppercase tracking-wide text-sm">
                        {MONTH_NAMES[month]}
                    </span>
                    <span className="text-xs text-slate-400 font-normal">
                        ({data.items.length} itens)
                    </span>
                </div>
                <span className="font-bold text-emerald-600">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.total as number)}
                </span>
            </button>

            {isOpen && (
                <div className="pl-0 md:pl-12 pr-0 md:pr-4 pb-4">
                    {/* List of Items */}
                    <div className="grid grid-cols-1 gap-2">
                        {data.items.map((item: any) => (
                            <div key={item.id} className="relative bg-white md:bg-slate-50 border border-slate-100 rounded-lg p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:shadow-sm transition-shadow">
                                {/* Left: Info */}
                                <div className="flex items-start gap-3">
                                    <div className="flex flex-col items-center justify-center bg-slate-100 rounded p-2 min-w-[3rem] text-center">
                                        <span className="text-xs font-bold text-slate-500 uppercase">{MONTH_NAMES[new Date(item.date).getMonth()].substring(0, 3)}</span>
                                        <span className="text-lg font-bold text-slate-700 leading-none">{new Date(item.date).getDate()}</span>
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-800 line-clamp-1">{item.client?.name || 'Cliente não identificado'}</div>
                                        <div className="text-xs text-slate-500 line-clamp-1">{item.notes || item.service?.name || item.desc || 'Receita'}</div>
                                        {/* Mobile Tags */}
                                        <div className="flex md:hidden gap-2 mt-1">
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${item.status === 'received' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                                {item.status === 'received' ? 'Recebido' : 'Pendente'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Right: Values & Actions */}
                                <div className="flex items-center justify-between md:justify-end gap-6 pl-[3.5rem] md:pl-0">
                                    <div className="text-right">
                                        <div className="font-bold text-emerald-700">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((item.net_amount || item.amount) as number)}
                                        </div>
                                        <span className={`hidden md:inline-block text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${item.status === 'received' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                            {item.status === 'received' ? 'Recebido' : 'Pendente'}
                                        </span>
                                    </div>

                                    {/* Actions */}
                                    {isOwner && (
                                        <div className="flex items-center gap-1">
                                            {item.status === 'pending' && (
                                                <button onClick={() => onMarkReceived(item)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-full" title="Receber">
                                                    <ICONS.Check />
                                                </button>
                                            )}
                                            <button onClick={() => onDelete(item.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full" title="Excluir">
                                                <ICONS.Trash />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const IncomePageContent: React.FC = () => {
    const { isOwner, workspace } = useWorkspace();
    const [activeTab, setActiveTab] = useState('Lançamentos');
    const [incomes, setIncomes] = useState<Income[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [pricingSettings, setPricingSettings] = useState<PricingSettings | null>(null);
    const [loading, setLoading] = useState(true);

    // Filters
    const [filterStatus, setFilterStatus] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    // Drawer Form
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    // Form State
    const [clientId, setClientId] = useState('');
    const [serviceId, setServiceId] = useState('');
    const [grossTotal, setGrossTotal] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>(PaymentMethodType.CASH);
    const [notes, setNotes] = useState('');
    const [campaignId, setCampaignId] = useState('');
    const [newCustomer, setNewCustomer] = useState(false);

    // Payment Specifics
    // 1. Cash / Generic
    const [cashDate, setCashDate] = useState(new Date().toISOString().split('T')[0]);
    const [cashReceived, setCashReceived] = useState(true); // true = RECEIVED, false = PENDING

    // 2. Split
    const [splitDate1, setSplitDate1] = useState(new Date().toISOString().split('T')[0]);
    const [splitDate2, setSplitDate2] = useState('');

    // 3. Card (MP)
    const [feePercent, setFeePercent] = useState('4.99');

    const fetchData = async () => {
        const [inc, cli, srv, cmp, set] = await Promise.all([
            getIncomes(), getClients(), getServices(), getCampaigns(), getPricingSettings()
        ]);
        setIncomes(inc);
        setClients(cli);
        setServices(srv);
        setCampaigns(cmp);
        setPricingSettings(set);
        if (set?.mp_default_fee_percent) {
            setFeePercent(set.mp_default_fee_percent.toString());
        }
        setLoading(false);
    };

    useEffect(() => {
        if (workspace?.id) fetchData();
    }, [workspace?.id]);

    const handleServiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const sId = e.target.value;
        const srv = services.find(s => s.id === sId);
        setServiceId(sId);
        if (srv && srv.base_price) setGrossTotal(srv.base_price.toString());
    };

    const handlePaymentMethodChange = (method: PaymentMethodType) => {
        setPaymentMethod(method);
        // Reset defaults when switching
        if (method === PaymentMethodType.CARD_MP && pricingSettings) {
            setFeePercent(pricingSettings.mp_default_fee_percent.toString());
        }
    };

    const handleCreateClient = async (name: string) => {
        if (!isOwner) return;
        try {
            // Need to import createClient if not available in closure, but it is imported at top
            const newClient = await createClient({ name });
            if (newClient) {
                setClients(prev => [...prev, newClient]);
                setClientId(newClient.id);
            }
        } catch (error) {
            console.error(error);
            alert('Erro ao criar cliente.');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isOwner) return;

        const total = parseFloat(grossTotal);
        if (isNaN(total) || total <= 0) return alert('Valor inválido');
        if (!clientId) return alert('Selecione um cliente');

        const baseIncomeData = {
            campaign_id: campaignId || undefined,
            customer_acquired: newCustomer,
            notes: notes,
            source: 'app_launch'
        };

        const receivables: Partial<Income>[] = [];

        if (paymentMethod === PaymentMethodType.CASH) {
            // Single income, simple
            receivables.push({
                ...baseIncomeData,
                date: cashDate,
                amount: total,
                gross_amount: total,
                net_amount: total,
                status: cashReceived ? IncomeStatus.RECEIVED : IncomeStatus.PENDING,
                installment_no: 1,
                installment_count: 1,
                payment_method: 'À vista'
            });
        } else if (paymentMethod === PaymentMethodType.SPLIT_50_50) {
            if (!splitDate2) return alert('Data de entrega é obrigatória para 50/50');
            const half = total / 2;

            // Entry (50%) - Received
            receivables.push({
                ...baseIncomeData,
                date: splitDate1,
                amount: half,
                gross_amount: half,
                net_amount: half,
                status: IncomeStatus.RECEIVED,
                installment_no: 1,
                installment_count: 2,
                payment_method: '50/50 - Entrada'
            });

            // Delivery (50%) - Pending
            receivables.push({
                ...baseIncomeData,
                date: splitDate2,
                amount: half,
                gross_amount: half,
                net_amount: half,
                status: IncomeStatus.PENDING,
                installment_no: 2,
                installment_count: 2,
                payment_method: '50/50 - Entrega'
            });
        } else if (paymentMethod === PaymentMethodType.CARD_MP) {
            const fee = parseFloat(feePercent) || 0;
            const feeVal = total * (fee / 100);
            const net = total - feeVal;

            receivables.push({
                ...baseIncomeData,
                date: cashDate, // Received now usually
                amount: net, // Crucial: Amount is the Net for cashflow
                gross_amount: total,
                net_amount: net,
                fee_percent: fee,
                fee_amount: feeVal,
                status: IncomeStatus.RECEIVED,
                installment_no: 1,
                installment_count: 1,
                payment_method: 'Mercado Pago'
            });
        }

        try {
            await createSale({
                client_id: clientId,
                service_id: serviceId || undefined,
                gross_total: total,
                payment_method: paymentMethod
            }, receivables);

            setIsDrawerOpen(false);
            resetForm();
            fetchData();
        } catch (error) {
            console.error(error);
            alert('Erro ao criar venda.');
        }
    };

    const resetForm = () => {
        setGrossTotal('');
        setNotes('');
        setCampaignId('');
        setNewCustomer(false);
        setServiceId('');
        setClientId('');
        setPaymentMethod(PaymentMethodType.CASH);
        setSplitDate2('');
    };

    const handleDelete = async (id: string) => {
        if (!isOwner) return;
        if (confirm('Excluir parcela?')) {
            await deleteIncome(id);
            fetchData();
        }
    };

    const handleMarkReceived = async (inc: Income) => {
        if (!isOwner) return;
        if (confirm('Marcar como recebido hoje?')) {
            await updateIncome(inc.id, {
                status: IncomeStatus.RECEIVED,
                date: new Date().toISOString().split('T')[0]
            });
            fetchData();
        }
    };

    const filteredIncomes = incomes.filter(inc => {
        const matchesSearch =
            (inc.client?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (inc.notes || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = filterStatus === 'all' || inc.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    // Preview for Card
    const cardPreview = () => {
        const tot = parseFloat(grossTotal) || 0;
        const fee = parseFloat(feePercent) || 0;
        const feeVal = tot * (fee / 100);
        return { feeVal, net: tot - feeVal };
    };

    // --- FORECAST LOGIC (Reused from before, but tab logic might change if user wants only this)
    // Keeping it as existing feature
    const getForecastData = () => {
        const now = new Date();
        const pending = incomes.filter(i => i.status === IncomeStatus.PENDING && new Date(i.date) >= now);

        // Group by Month
        const grouped: any = {};
        pending.forEach(inc => {
            const d = new Date(inc.date);
            const key = `${d.getFullYear()}-${d.getMonth()}`;
            if (!grouped[key]) grouped[key] = { year: d.getFullYear(), month: d.getMonth(), total: 0, count: 0, items: [] };
            grouped[key].total += (inc.net_amount || inc.amount);
            grouped[key].count += 1;
            grouped[key].items.push(inc);
        });

        return Object.values(grouped).sort((a: any, b: any) => {
            return (a.year - b.year) || (a.month - b.month);
        });
    };

    const forecast = getForecastData();

    return (
        <div className="max-w-7xl mx-auto">
            <PageHeader
                title="Receitas & Vendas"
                description="Controle avançado de recebíveis e fluxo de caixa."
                actions={
                    isOwner && (
                        <button onClick={() => setIsDrawerOpen(true)} className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 font-medium shadow-sm transition-colors">
                            <ICONS.Plus /> Nova Venda
                        </button>
                    )
                }
            />

            <Tabs tabs={['Lançamentos', 'Previsão de Caixa']} activeTab={activeTab} onChange={setActiveTab} />

            {activeTab === 'Lançamentos' && (
                <>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
                        {/* Filters */}
                        <div className="relative w-full md:w-96">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                <ICONS.Search />
                            </div>
                            <input
                                type="text"
                                placeholder="Buscar por cliente ou descrição..."
                                className="pl-10 w-full border border-slate-300 rounded-lg py-2 focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 bg-white"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2 w-full md:w-auto">
                            <select
                                value={filterStatus}
                                onChange={e => setFilterStatus(e.target.value)}
                                className="border border-slate-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-emerald-500 outline-none w-full md:w-auto text-slate-900 bg-white"
                            >
                                <option value="all">Todos os Status</option>
                                <option value="received">Recebidos</option>
                                <option value="pending">Pendentes</option>
                            </select>
                        </div>
                    </div>

                    {/* ACCORDION VIEW (Mobile & Desktop) */}
                    <div className="space-y-4">
                        {loading ? (
                            <div className="text-center py-12 text-slate-400">Carregando lançamentos...</div>
                        ) : filteredIncomes.length === 0 ? (
                            <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                                Nenhuma receita encontrada.
                            </div>
                        ) : (
                            // Group and Render
                            (() => {
                                // 1. Group by Year > Month
                                const groups: Record<number, Record<number, { items: Income[], total: number }>> = {};

                                filteredIncomes.forEach(inc => {
                                    const d = new Date(inc.date);
                                    const y = d.getFullYear();
                                    const m = d.getMonth(); // 0-11

                                    if (!groups[y]) groups[y] = {};
                                    if (!groups[y][m]) groups[y][m] = { items: [], total: 0 };

                                    groups[y][m].items.push(inc);
                                    groups[y][m].total += (inc.net_amount || inc.amount);
                                });

                                // Sort Years Descending
                                const years = Object.keys(groups).map(Number).sort((a, b) => b - a);

                                return years.map(year => (
                                    <YearAccordion
                                        key={year}
                                        year={year}
                                        monthsData={groups[year]}
                                        isOwner={isOwner}
                                        onDelete={handleDelete}
                                        onMarkReceived={handleMarkReceived}
                                    />
                                ));
                            })()
                        )}
                    </div>
                </>
            )}

            {activeTab === 'Previsão de Caixa' && (
                <div className="space-y-6">
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
                        <h3 className="text-lg font-bold text-amber-800 mb-2">Visão Macro: A Receber</h3>
                        <p className="text-amber-700 text-sm">
                            Valores futuros já contratados (pendentes). Use para planejar seus gastos.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                        {(forecast as any[]).map((group: any, idx) => (
                            <div key={idx} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <div className="font-bold text-slate-700 text-lg uppercase tracking-wide">
                                            {MONTH_NAMES[group.month]} <span className="text-slate-400">{group.year}</span>
                                        </div>
                                        <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded-full text-xs font-bold">
                                            {group.count} pagamentos
                                        </span>
                                    </div>
                                    <div className="text-emerald-600 font-bold text-xl">
                                        R$ {group.total.toLocaleString('pt-BR')}
                                    </div>
                                </div>
                                <div className="divide-y divide-slate-100">
                                    {group.items.map((inc: Income) => (
                                        <div key={inc.id} className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="text-sm font-bold text-slate-400 w-12">
                                                    {new Date(inc.date).getDate()}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-slate-800">{inc.client?.name}</div>
                                                    <div className="text-xs text-slate-500">{inc.notes || inc.service?.name || 'Parcela'}</div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-bold text-slate-700">R$ {(inc.net_amount || inc.amount).toFixed(2)}</div>
                                                {isOwner && (
                                                    <button onClick={() => handleMarkReceived(inc)} className="text-xs text-emerald-600 font-medium hover:underline mt-1">
                                                        Marcar Recebido
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                        {forecast.length === 0 && (
                            <div className="text-center py-12 text-slate-500 bg-white rounded-xl border border-dashed border-slate-300">
                                Nada a receber previsto para os próximos meses.
                            </div>
                        )}
                    </div>
                </div>
            )}

            <Drawer title="Nova Venda / Receita" isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)}>
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* 1. Client & Service */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Cliente</label>
                            <Combobox
                                options={clients.map(c => ({ id: c.id, label: c.name }))}
                                value={clientId}
                                onChange={setClientId}
                                onCreate={handleCreateClient}
                                placeholder="Buscar ou criar cliente..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Serviço (Opcional)</label>
                            <select
                                className="w-full border border-slate-200 bg-slate-50 p-3 rounded-lg text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500"
                                value={serviceId}
                                onChange={handleServiceChange}
                            >
                                <option value="">Avulso / Outro</option>
                                {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Valor Bruto Total (R$)</label>
                            <input
                                type="number" step="0.01" required
                                className="w-full border border-slate-200 bg-slate-50 p-3 rounded-lg text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 text-lg font-bold"
                                value={grossTotal}
                                onChange={e => setGrossTotal(e.target.value)}
                            />
                        </div>
                    </div>
                    {/* 2. Payment Method Selector */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Forma de Pagamento</label>
                        <div className="grid grid-cols-3 gap-2">
                            <button type="button" onClick={() => handlePaymentMethodChange(PaymentMethodType.CASH)} className={`p-2 text-sm rounded-lg border font-medium ${paymentMethod === PaymentMethodType.CASH ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>À Vista</button>
                            <button type="button" onClick={() => handlePaymentMethodChange(PaymentMethodType.SPLIT_50_50)} className={`p-2 text-sm rounded-lg border font-medium ${paymentMethod === PaymentMethodType.SPLIT_50_50 ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>50/50</button>
                            <button type="button" onClick={() => handlePaymentMethodChange(PaymentMethodType.CARD_MP)} className={`p-2 text-sm rounded-lg border font-medium ${paymentMethod === PaymentMethodType.CARD_MP ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>Cartão (MP)</button>
                        </div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                        {paymentMethod === PaymentMethodType.CASH && (
                            <div className="space-y-3">
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">Data do Pagamento</label><input type="date" required className="w-full border border-slate-300 rounded p-2 text-slate-900 bg-white" value={cashDate} onChange={e => setCashDate(e.target.value)} /></div>
                                <label className="flex items-center gap-2 cursor-pointer select-none"><input type="checkbox" checked={cashReceived} onChange={e => setCashReceived(e.target.checked)} className="rounded text-emerald-600" /><span className="text-sm font-medium text-slate-700">Já Recebido?</span></label>
                            </div>
                        )}
                        {paymentMethod === PaymentMethodType.SPLIT_50_50 && (
                            <div className="space-y-3">
                                <div className="flex gap-2 items-center text-xs text-slate-500 mb-2"><span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">Entrada 50%</span><span>+</span><span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded">Entrega 50%</span></div>
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">Data Entrada (Recebido)</label><input type="date" required className="w-full border border-slate-300 rounded p-2 text-slate-900 bg-white" value={splitDate1} onChange={e => setSplitDate2(e.target.value)} /></div>
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">Data Entrega (Pendente)</label><input type="date" required className="w-full border border-slate-300 rounded p-2 text-slate-900 bg-white" value={splitDate2} onChange={e => setSplitDate2(e.target.value)} /></div>
                            </div>
                        )}
                        {paymentMethod === PaymentMethodType.CARD_MP && (
                            <div className="space-y-3">
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">Taxa Mercado Pago (%)</label><input type="number" step="0.01" className="w-full border border-slate-300 rounded p-2 text-slate-900 bg-white" value={feePercent} onChange={e => setFeePercent(e.target.value)} /></div>
                                {grossTotal && (
                                    <div className="text-sm border-t border-slate-200 pt-2 mt-2">
                                        <div className="flex justify-between text-slate-500 mb-1"><span>Bruto:</span> <span>R$ {parseFloat(grossTotal).toFixed(2)}</span></div>
                                        <div className="flex justify-between text-red-500 mb-1"><span>Taxa:</span> <span>- R$ {cardPreview().feeVal.toFixed(2)}</span></div>
                                        <div className="flex justify-between text-emerald-700 font-bold"><span>Líquido:</span> <span>R$ {cardPreview().net.toFixed(2)}</span></div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="pt-2">
                        <div className="flex gap-4 mb-3">
                            <div className="flex-1">
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Origem / Campanha</label>
                                <select className="w-full border border-slate-200 rounded p-2 text-sm text-slate-900 bg-white" value={campaignId} onChange={e => setCampaignId(e.target.value)}>
                                    <option value="">Nenhuma</option>{campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer mb-3 select-none"><input type="checkbox" className="rounded text-emerald-600" checked={newCustomer} onChange={e => setNewCustomer(e.target.checked)} /><span className="text-sm text-slate-700">Este é um novo cliente?</span></label>
                        <textarea className="w-full border border-slate-200 bg-slate-50 p-3 rounded-lg text-slate-900 outline-none text-sm placeholder-slate-400" rows={2} placeholder="Observações..." value={notes} onChange={e => setNotes(e.target.value)} />
                    </div>

                    <button className="w-full bg-emerald-600 text-white py-3 rounded-lg font-bold hover:bg-emerald-700 shadow-md mt-4">
                        Confirmar Venda
                    </button>
                </form>
            </Drawer>
        </div>
    );
};

export default IncomePage;
