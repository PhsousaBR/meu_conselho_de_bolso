"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../supabaseClient';
import { WorkspaceProvider } from '../../contexts/WorkspaceContext';
import { AppSidebar } from '../../components/AppSidebar';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
      } else {
        setLoading(false);
      }
    };
    checkAuth();
  }, [router]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-400">Carregando sessão...</div>;
  }

  return (
    <WorkspaceProvider>
      <div className="flex min-h-screen bg-slate-50">
        <AppSidebar />
        <main className="flex-1 md:ml-64 p-4 md:p-8 pb-24 md:pb-8 print:ml-0 print:p-0">
          {children}
        </main>
      </div>
    </WorkspaceProvider>
  );
}