"use client";
import { Suspense } from 'react';
import InvitePage from '../../components/InvitePage';

function InvitePageContent() {
    return <InvitePage />;
}

export default function ConvitePage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center">
                    <h1 className="text-xl font-bold mb-4">Conselho de Bolso</h1>
                    <div className="text-slate-500 animate-pulse">Carregando...</div>
                </div>
            </div>
        }>
            <InvitePageContent />
        </Suspense>
    );
}