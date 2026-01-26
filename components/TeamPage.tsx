"use client";

import React, { useState, useEffect } from 'react';
import { getWorkspaceMembers, getWorkspaceInvites, createInvite, revokeAccess, cancelInvite } from '../services/dataService';
import { WorkspaceMember, WorkspaceInvite, Role } from '../types';
import { PageHeader } from './Shared';
import { useWorkspace } from '../contexts/WorkspaceContext';

const TeamPage: React.FC = () => {
    // ... [código idêntico ao anterior, apenas adicionando "use client" no topo]
    const { isOwner, workspace } = useWorkspace();
    const [members, setMembers] = useState<WorkspaceMember[]>([]);
    const [invites, setInvites] = useState<WorkspaceInvite[]>([]);
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(true);
    const [generatedLink, setGeneratedLink] = useState('');

    const fetchData = async () => {
        setLoading(true);
        try {
            const [m, i] = await Promise.all([getWorkspaceMembers(), getWorkspaceInvites()]);
            setMembers(m);
            setInvites(i.filter(inv => inv.status === 'pending'));
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOwner && workspace?.id) fetchData();
    }, [isOwner, workspace?.id]);

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const token = await createInvite(email);
            // Fix URL for Next.js routing
            const link = `${window.location.origin}/convite?token=${token}`;
            setGeneratedLink(link);
            setEmail('');
            fetchData();
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handleRevoke = async (id: string) => {
        if (confirm('Remover acesso deste usuário?')) {
            // Optimistic
            setMembers(prev => prev.filter(m => m.id !== id));
            try {
                await revokeAccess(id);
            } catch (err) {
                console.error(err);
                alert("Erro ao remover usuário.");
                fetchData(); // Rollback
            }
        }
    }

    const handleCancelInvite = async (id: string) => {
        if (confirm('Cancelar convite?')) {
            // Optimistic
            setInvites(prev => prev.filter(i => i.id !== id));
            try {
                await cancelInvite(id);
            } catch (err) {
                console.error(err);
                alert("Erro ao cancelar convite.");
                fetchData(); // Rollback
            }
        }
    }

    if (!workspace) return <div className="p-8 text-center text-slate-500">Recurso disponível apenas online.</div>;
    if (!isOwner) return <div className="p-8 text-center text-red-500">Acesso negado. Apenas o dono pode gerenciar o time.</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <PageHeader
                title="Acesso & Convites"
                description={`Gerencie quem pode ver os dados de "${workspace.name}".`}
            />

            {/* Invite Form */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-lg mb-4 text-slate-800">Convidar Novo Membro</h3>
                <form onSubmit={handleInvite} className="flex flex-col md:flex-row gap-4 md:items-end">
                    <div className="flex-1 w-full">
                        <label className="block text-sm font-medium text-slate-700 mb-1">E-mail do Convidado</label>
                        <input
                            type="email"
                            required
                            className="w-full border border-slate-300 rounded-lg p-2 text-slate-900 bg-slate-50"
                            placeholder="colega@exemplo.com"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                        />
                    </div>
                    <div className="w-full md:w-40">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Permissão</label>
                        <select disabled className="w-full border border-slate-300 rounded-lg p-2 bg-slate-100 text-slate-500">
                            <option>Visualizador</option>
                        </select>
                    </div>
                    <button className="w-full md:w-auto bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-indigo-700 transition-colors">
                        Gerar Convite
                    </button>
                </form>

                {generatedLink && (
                    <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                        <p className="text-emerald-800 text-sm font-medium mb-2">Convite criado com sucesso! Copie o link abaixo e envie para o convidado:</p>
                        <div className="flex gap-2">
                            <input readOnly value={generatedLink} className="flex-1 text-sm bg-white border border-emerald-200 p-2 rounded text-slate-600 font-mono" />
                            <button
                                onClick={() => { navigator.clipboard.writeText(generatedLink); alert('Copiado!'); }}
                                className="bg-emerald-600 text-white px-3 py-1 rounded text-sm font-bold hover:bg-emerald-700"
                            >
                                Copiar
                            </button>
                        </div>
                        <p className="text-xs text-emerald-600 mt-2">Válido por 7 dias. O usuário precisará criar uma conta com o email convidado.</p>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Members List */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-4 bg-slate-50 border-b border-slate-200">
                        <h3 className="font-bold text-slate-700">Membros Ativos ({members.length})</h3>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {members.map(m => (
                            <div key={m.id} className="p-4 flex justify-between items-center">
                                <div>
                                    <p className="font-medium text-slate-900">{m.profile?.full_name || 'Usuário'}</p>
                                    <p className="text-xs text-slate-500">{m.profile?.email}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={`text-xs px-2 py-1 rounded font-bold uppercase ${m.role === 'owner' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
                                        {m.role === 'owner' ? 'Dono' : 'Viewer'}
                                    </span>
                                    {m.role !== Role.OWNER && (
                                        <button onClick={() => handleRevoke(m.id)} className="text-red-500 text-xs hover:underline">Remover</button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Pending Invites */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-4 bg-slate-50 border-b border-slate-200">
                        <h3 className="font-bold text-slate-700">Convites Pendentes ({invites.length})</h3>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {invites.length === 0 ? <p className="p-4 text-sm text-slate-400 text-center">Nenhum convite pendente.</p> :
                            invites.map(inv => (
                                <div key={inv.id} className="p-4 flex justify-between items-center">
                                    <div>
                                        <p className="font-medium text-slate-900">{inv.invited_email}</p>
                                        <p className="text-xs text-slate-500">Expira em: {new Date(inv.expires_at).toLocaleDateString()}</p>
                                    </div>
                                    <button onClick={() => handleCancelInvite(inv.id)} className="text-red-500 text-xs hover:underline">Cancelar</button>
                                </div>
                            ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TeamPage;