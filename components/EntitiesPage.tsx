
import React, { useState, useEffect } from 'react';
import { getClients, createClient, deleteClient, updateClient, getServices, createService, deleteService, updateService } from '../services/dataService';
import { Client, Service } from '../types';
import { PageHeader, Tabs, Drawer } from './Shared';
import { MobileDataList } from './MobileDataList';
import { ICONS } from '../constants';
import { useWorkspace } from '../contexts/WorkspaceContext';

const EntitiesPage: React.FC = () => {
    const { isOwner, workspace } = useWorkspace(); // Get workspace
    const [activeTab, setActiveTab] = useState('Clientes');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [clients, setClients] = useState<Client[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Forms
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Client Form State
    const [cName, setCName] = useState('');
    const [cCNPJ, setCCNPJ] = useState('');
    const [cWhatsapp, setCWhatsapp] = useState('');
    const [cNotes, setCNotes] = useState('');

    // Service Form State
    const [sName, setSName] = useState('');
    const [sDesc, setSDesc] = useState('');
    const [sPrice, setSPrice] = useState('');
    const [sHours, setSHours] = useState('');

    const fetchData = async () => {
        setLoading(true);
        const [c, s] = await Promise.all([getClients(), getServices()]);
        setClients(c);
        setServices(s);
        setLoading(false);
    };

    useEffect(() => {
        if (workspace?.id) fetchData();
    }, [workspace?.id]);

    // --- UTILS ---
    const formatPhone = (val: string) => {
        return val.replace(/\D/g, '')
            .replace(/(\d{2})(\d)/, '($1) $2')
            .replace(/(\d{5})(\d)/, '$1-$2')
            .replace(/(-\d{4})\d+?$/, '$1');
    };

    const formatCNPJ = (val: string) => {
        return val.replace(/\D/g, '')
            .replace(/^(\d{2})(\d)/, '$1.$2')
            .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
            .replace(/\.(\d{3})(\d)/, '.$1/$2')
            .replace(/(\d{4})(\d)/, '$1-$2')
            .substr(0, 18);
    };

    const cleanNumber = (val: string) => val.replace(/\D/g, '');

    const handleSaveClient = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isOwner) return;
        // Save clean numbers to DB
        const payload = {
            name: cName,
            cnpj: cleanNumber(cCNPJ),
            whatsapp: cWhatsapp,
            notes: cNotes
        };
        if (editingId) {
            await updateClient(editingId, payload);
        } else {
            await createClient(payload);
        }
        closeDrawer();
        fetchData();
    };

    const handleSaveService = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isOwner) return;
        const payload = {
            name: sName,
            description: sDesc,
            base_price: parseFloat(sPrice),
            default_hours: parseFloat(sHours) || 0
        };
        if (editingId) {
            await updateService(editingId, payload);
        } else {
            await createService(payload);
        }
        closeDrawer();
        fetchData();
    };

    const handleEditClient = (c: Client) => {
        if (!isOwner) return;
        setActiveTab('Clientes');
        setEditingId(c.id);
        setCName(c.name);
        setCCNPJ(c.cnpj ? formatCNPJ(c.cnpj) : '');
        setCWhatsapp(c.whatsapp || '');
        setCNotes(c.notes || '');
        setIsDrawerOpen(true);
    };

    const handleEditService = (s: Service) => {
        if (!isOwner) return;
        setActiveTab('Serviços');
        setEditingId(s.id);
        setSName(s.name);
        setSDesc(s.description || '');
        setSPrice(s.base_price ? s.base_price.toString() : '');
        setSHours(s.default_hours ? s.default_hours.toString() : '0');
        setIsDrawerOpen(true);
    };

    const handleDeleteClient = async (id: string) => {
        if (!isOwner) return;
        if (confirm('Tem certeza? Receitas associadas perderão o vínculo.')) {
            await deleteClient(id);
            fetchData();
        }
    }

    const handleDeleteService = async (id: string) => {
        if (!isOwner) return;
        if (confirm('Tem certeza? Receitas associadas perderão o vínculo.')) {
            await deleteService(id);
            fetchData();
        }
    }

    const openNewDrawer = () => {
        if (!isOwner) return;
        setEditingId(null);
        setCName(''); setCCNPJ(''); setCWhatsapp(''); setCNotes('');
        setSName(''); setSDesc(''); setSPrice(''); setSHours('');
        setIsDrawerOpen(true);
    }

    const closeDrawer = () => {
        setIsDrawerOpen(false);
        setEditingId(null);
        setCName(''); setCCNPJ(''); setCWhatsapp(''); setCNotes('');
        setSName(''); setSDesc(''); setSPrice(''); setSHours('');
    }

    const filteredClients = clients.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const filteredServices = services.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="max-w-7xl mx-auto">
            <PageHeader
                title="Cadastros"
                description="Gerencie seus clientes e portfólio de serviços."
                actions={
                    <div className="flex gap-2">
                        <div className="bg-white border border-slate-300 rounded-lg flex overflow-hidden shadow-sm">
                            <button onClick={() => setViewMode('grid')} className={`px-3 py-2 ${viewMode === 'grid' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`} title="Grade">
                                <ICONS.Dashboard />
                            </button>
                            <div className="w-[1px] bg-slate-300"></div>
                            <button onClick={() => setViewMode('list')} className={`px-3 py-2 ${viewMode === 'list' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`} title="Lista">
                                <ICONS.FileText />
                            </button>
                        </div>
                        {isOwner && (
                            <button onClick={openNewDrawer} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 font-medium transition-colors shadow-sm">
                                <ICONS.Plus /> Novo {activeTab === 'Clientes' ? 'Cliente' : 'Serviço'}
                            </button>
                        )}
                    </div>
                }
            />

            {/* List and Grid views same as before but wrapping edit/delete buttons in {isOwner && ...} */}

            <Tabs tabs={['Clientes', 'Serviços']} activeTab={activeTab} onChange={setActiveTab} />
            <div className="mb-6 relative"><div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400"><ICONS.Search /></div><input type="text" placeholder={`Buscar ${activeTab.toLowerCase()}...`} className="pl-10 w-full md:w-96 border border-slate-300 rounded-lg py-2 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 bg-white" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>

            {loading ? <div className="text-center py-12 text-slate-500">Carregando...</div> :
                viewMode === 'grid' ? (

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {activeTab === 'Clientes' ? filteredClients.map(client => (
                            <div key={client.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow group relative">
                                {isOwner && <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2"><button onClick={() => handleEditClient(client)} className="text-slate-400 hover:text-indigo-600"><ICONS.Edit /></button><button onClick={() => handleDeleteClient(client.id)} className="text-slate-400 hover:text-red-600"><ICONS.Trash /></button></div>}
                                <div className="flex items-center gap-3 mb-3"><div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold">{client.name.charAt(0)}</div><h3 className="font-bold text-slate-800 truncate pr-16">{client.name}</h3></div>
                                <div className="space-y-2 text-sm text-slate-500">{client.cnpj && <p>CNPJ: {formatCNPJ(client.cnpj)}</p>}{client.whatsapp && <p className="flex items-center gap-2"><ICONS.Phone /> {client.whatsapp}</p>}{client.notes && <p className="italic text-slate-400 mt-2 border-t pt-2">{client.notes}</p>}</div>
                            </div>
                        )) : filteredServices.map(service => (
                            <div key={service.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow group relative">
                                {isOwner && <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2"><button onClick={() => handleEditService(service)} className="text-slate-400 hover:text-indigo-600"><ICONS.Edit /></button><button onClick={() => handleDeleteService(service.id)} className="text-slate-400 hover:text-red-600"><ICONS.Trash /></button></div>}
                                <h3 className="font-bold text-slate-800 mb-1">{service.name}</h3><p className="text-sm text-slate-500 mb-4 line-clamp-2 min-h-[40px]">{service.description || 'Sem descrição.'}</p>
                                <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-50"><span className="text-xs text-slate-400">{service.default_hours || 0}h estimadas</span><span className="font-bold text-emerald-600">{service.base_price ? `R$ ${service.base_price.toLocaleString('pt-BR')}` : 'Sob consulta'}</span></div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <>
                        {/* Mobile List View (Cards) */}
                        <div className="block md:hidden">
                            {activeTab === 'Clientes' ? (
                                <MobileDataList
                                    data={filteredClients}
                                    title={(c) => c.name}
                                    subtitle={(c) => c.whatsapp || ''}
                                    fields={[
                                        { label: 'CNPJ', value: (c) => c.cnpj ? formatCNPJ(c.cnpj) : '-' },
                                        { label: 'Obs', value: (c) => c.notes || '-' }
                                    ]}
                                    actions={(c) => isOwner ? (
                                        <>
                                            <button onClick={() => handleEditClient(c)} className="p-2 text-indigo-400 hover:bg-indigo-50 rounded"><ICONS.Edit /></button>
                                            <button onClick={() => handleDeleteClient(c.id)} className="p-2 text-red-400 hover:bg-red-50 rounded"><ICONS.Trash /></button>
                                        </>
                                    ) : null}
                                />
                            ) : (
                                <MobileDataList
                                    data={filteredServices}
                                    title={(s) => s.name}
                                    subtitle={(s) => s.base_price ? `R$ ${s.base_price.toLocaleString('pt-BR')}` : 'Sob consulta'}
                                    fields={[
                                        { label: 'Horas Est.', value: (s) => `${s.default_hours || 0}h` },
                                        { label: 'Descrição', value: (s) => s.description || '-' }
                                    ]}
                                    actions={(s) => isOwner ? (
                                        <>
                                            <button onClick={() => handleEditService(s)} className="p-2 text-indigo-400 hover:bg-indigo-50 rounded"><ICONS.Edit /></button>
                                            <button onClick={() => handleDeleteService(s.id)} className="p-2 text-red-400 hover:bg-red-50 rounded"><ICONS.Trash /></button>
                                        </>
                                    ) : null}
                                />
                            )}
                        </div>

                        {/* Desktop Table View */}
                        <div className="hidden md:block bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600"><tr><th className="p-4 font-semibold">Nome</th>{activeTab === 'Clientes' ? <><th className="p-4 font-semibold">CNPJ</th><th className="p-4 font-semibold">WhatsApp</th><th className="p-4 font-semibold">Observações</th></> : <><th className="p-4 font-semibold">Descrição</th><th className="p-4 font-semibold text-center">Horas Est.</th><th className="p-4 font-semibold text-right">Valor Base</th></>}{isOwner && <th className="p-4 font-semibold text-center">Ações</th>}</tr></thead>
                                <tbody className="divide-y divide-slate-100">
                                    {activeTab === 'Clientes' ? filteredClients.map(c => (
                                        <tr key={c.id} className="hover:bg-slate-50">
                                            <td className="p-4 font-medium text-slate-800">{c.name}</td><td className="p-4 text-slate-600 font-mono text-xs">{c.cnpj ? formatCNPJ(c.cnpj) : '-'}</td><td className="p-4 text-slate-600">{c.whatsapp || '-'}</td><td className="p-4 text-slate-600 truncate max-w-xs">{c.notes || '-'}</td>
                                            {isOwner && <td className="p-4 text-center"><button onClick={() => handleEditClient(c)} className="text-slate-400 hover:text-indigo-600 mr-2"><ICONS.Edit /></button><button onClick={() => handleDeleteClient(c.id)} className="text-slate-400 hover:text-red-500"><ICONS.Trash /></button></td>}
                                        </tr>
                                    )) : filteredServices.map(s => (
                                        <tr key={s.id} className="hover:bg-slate-50">
                                            <td className="p-4 font-medium text-slate-800">{s.name}</td><td className="p-4 text-slate-600 truncate max-w-xs">{s.description || '-'}</td><td className="p-4 text-center text-slate-600">{s.default_hours || 0}</td><td className="p-4 text-right text-emerald-600 font-bold">{s.base_price ? `R$ ${s.base_price.toLocaleString('pt-BR')}` : '-'}</td>
                                            {isOwner && <td className="p-4 text-center"><button onClick={() => handleEditService(s)} className="text-slate-400 hover:text-indigo-600 mr-2"><ICONS.Edit /></button><button onClick={() => handleDeleteService(s.id)} className="text-slate-400 hover:text-red-500"><ICONS.Trash /></button></td>}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

            <Drawer title={editingId ? `Editar ${activeTab === 'Clientes' ? 'Cliente' : 'Serviço'}` : `Novo ${activeTab === 'Clientes' ? 'Cliente' : 'Serviço'}`} isOpen={isDrawerOpen} onClose={closeDrawer}>
                {/* Form fields same as before... */}
                {activeTab === 'Clientes' ? (
                    <form onSubmit={handleSaveClient} className="space-y-4 text-slate-900">
                        <div><label className="block text-sm font-medium text-slate-700 mb-1">Nome da Empresa/Pessoa</label><input required className="w-full border border-slate-300 p-2 rounded-lg text-slate-900 bg-white" value={cName} onChange={e => setCName(e.target.value)} /></div>
                        <div><label className="block text-sm font-medium text-slate-700 mb-1">CNPJ (Opcional)</label><input className="w-full border border-slate-300 p-2 rounded-lg text-slate-900 bg-white placeholder-slate-400" value={cCNPJ} onChange={e => setCCNPJ(formatCNPJ(e.target.value))} placeholder="00.000.000/0000-00" maxLength={18} /></div>
                        <div><label className="block text-sm font-medium text-slate-700 mb-1">WhatsApp</label><input required className="w-full border border-slate-300 p-2 rounded-lg text-slate-900 bg-white placeholder-slate-400" value={cWhatsapp} onChange={e => setCWhatsapp(formatPhone(e.target.value))} placeholder="(11) 99999-9999" /></div>
                        <div><label className="block text-sm font-medium text-slate-700 mb-1">Observações</label><textarea className="w-full border border-slate-300 p-2 rounded-lg text-slate-900 bg-white placeholder-slate-400" rows={3} value={cNotes} onChange={e => setCNotes(e.target.value)} placeholder="Preferências, histórico..." /></div>
                        <button className="w-full bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700 mt-4">Salvar Cliente</button>
                    </form>
                ) : (
                    <form onSubmit={handleSaveService} className="space-y-4 text-slate-900">
                        <div><label className="block text-sm font-medium text-slate-700 mb-1">Nome do Serviço</label><input required className="w-full border border-slate-300 p-2 rounded-lg text-slate-900 bg-white" value={sName} onChange={e => setSName(e.target.value)} /></div>
                        <div><label className="block text-sm font-medium text-slate-700 mb-1">Descrição Curta</label><textarea className="w-full border border-slate-300 p-2 rounded-lg text-slate-900 bg-white" rows={3} value={sDesc} onChange={e => setSDesc(e.target.value)} /></div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="block text-sm font-medium text-slate-700 mb-1">Valor Base (R$)</label><input type="number" step="0.01" className="w-full border border-slate-300 p-2 rounded-lg text-slate-900 bg-white" value={sPrice} onChange={e => setSPrice(e.target.value)} /></div>
                            <div><label className="block text-sm font-medium text-slate-700 mb-1">Horas Estimadas</label><input type="number" step="0.5" className="w-full border border-slate-300 p-2 rounded-lg text-slate-900 bg-white placeholder-slate-400" value={sHours} onChange={e => setSHours(e.target.value)} placeholder="Ex: 20" /></div>
                        </div>
                        <button className="w-full bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700 mt-4">Salvar Serviço</button>
                    </form>
                )}
            </Drawer>
        </div>
    );
};

export default EntitiesPage;
