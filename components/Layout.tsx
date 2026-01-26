"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '../supabaseClient';
import { ICONS } from '../constants';
import { useWorkspace } from '../contexts/WorkspaceContext';

const SidebarItem = ({ to, icon: Icon, label }: { to: string, icon: any, label: string }) => {
  const pathname = usePathname();
  const isActive = pathname === to;

  return (
    <Link
      href={to}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
        }`}
    >
      <Icon />
      <span className="font-medium">{label}</span>
    </Link>
  );
};

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { workspace, role, isOwner } = useWorkspace();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-white fixed h-full z-10 print:hidden">
        <div className="p-6">
          <h1 className="text-xl font-bold tracking-tight text-white truncate">
            {workspace ? workspace.name : 'Conselho de Bolso'}
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${role === 'owner' ? 'bg-emerald-600' : role === 'viewer' ? 'bg-blue-600' : 'bg-slate-700'}`}>
              {role === 'owner' ? 'Dono' : role === 'viewer' ? 'Visualizador' : 'Dono (Offline)'}
            </span>
            {!workspace && <span className="text-[10px] bg-yellow-600 text-white px-2 py-0.5 rounded">Local</span>}
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto">
          <SidebarItem to="/dashboard" icon={ICONS.Dashboard} label="Dashboard" />
          <SidebarItem to="/receitas" icon={ICONS.Income} label="Receitas" />
          <SidebarItem to="/despesas" icon={ICONS.Expenses} label="Despesas" />
          <SidebarItem to="/marketing" icon={ICONS.Marketing} label="Marketing" />
          <SidebarItem to="/metas" icon={ICONS.Check} label="Metas" />
          <SidebarItem to="/precificacao" icon={ICONS.Calculator} label="Precificação" />
          <SidebarItem to="/relatorios" icon={ICONS.FileText} label="Relatórios" />
          <SidebarItem to="/entidades" icon={ICONS.Entities} label="Cadastros" />

          {/* Access & Invites - Only for Owners or if Local (implicit owner) */}
          {(isOwner || !workspace) && (
            <div className="pt-4 mt-4 border-t border-slate-800">
              <SidebarItem to="/time" icon={() => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>} label="Acesso & Convites" />
              <SidebarItem to="/importar" icon={ICONS.Import} label="Importar CSV" />
            </div>
          )}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-2 text-slate-400 hover:text-white transition-colors"
          >
            <ICONS.Logout />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main key={workspace?.id || 'local'} className="flex-1 md:ml-64 p-4 md:p-8 pb-24 md:pb-8 print:ml-0 print:p-0">
        {children}
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-3 flex justify-between items-center z-50 print:hidden">
        <Link href="/dashboard" className={pathname === '/dashboard' ? 'text-indigo-600' : 'text-slate-400'}><ICONS.Dashboard /></Link>
        <Link href="/receitas" className={pathname === '/receitas' ? 'text-indigo-600' : 'text-slate-400'}><ICONS.Income /></Link>
        <Link href="/precificacao" className={pathname === '/precificacao' ? 'text-indigo-600' : 'text-slate-400'}><ICONS.Calculator /></Link>
        <Link href="/relatorios" className={pathname === '/relatorios' ? 'text-indigo-600' : 'text-slate-400'}><ICONS.FileText /></Link>
        <div onClick={handleLogout} className="text-slate-400 cursor-pointer"><ICONS.Logout /></div>
      </nav>
    </div>
  );
};

export default Layout;
