"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../supabaseClient';
import { acceptInvite } from '../services/dataService';

const InvitePage: React.FC = () => {
    const searchParams = useSearchParams();
    const token = searchParams.get('token');
    const router = useRouter();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [msg, setMsg] = useState('Processando convite...');

    useEffect(() => {
        const process = async () => {
            if (!token) {
                setStatus('error');
                setMsg('Token de convite não encontrado.');
                return;
            }

            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                // Save token to redirect back after login? 
                // Simple version: ask user to login manually then come back, or auto redirect to login
                setStatus('error');
                setMsg('Você precisa estar logado para aceitar o convite. Faça login e acesse o link novamente.');
                setTimeout(() => router.push('/login'), 3000);
                return;
            }

            try {
                await acceptInvite(token);
                setStatus('success');
                setMsg('Convite aceito! Redirecionando para o Dashboard...');
                setTimeout(() => router.push('/dashboard'), 2000);
            } catch (err: any) {
                setStatus('error');
                setMsg(err.message || 'Erro ao aceitar convite.');
            }
        };

        process();
    }, [token, router]);

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center">
                <h1 className="text-xl font-bold mb-4">Conselho de Bolso</h1>
                
                {status === 'loading' && <div className="text-slate-500 animate-pulse">{msg}</div>}
                
                {status === 'success' && (
                    <div className="text-emerald-600 font-medium">
                        <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                        {msg}
                    </div>
                )}
                
                {status === 'error' && (
                    <div className="text-red-500">
                        <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        <p className="mb-4">{msg}</p>
                        <button onClick={() => router.push('/login')} className="bg-indigo-600 text-white px-4 py-2 rounded">Ir para Login</button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default InvitePage;