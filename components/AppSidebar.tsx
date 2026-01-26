"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '../supabaseClient';
import { ICONS } from '../constants';
import { useWorkspace } from '../contexts/WorkspaceContext';

const SidebarItem = ({ to, icon: Icon, label, onClick }: { to: string, icon: any, label: string, onClick?: () => void }) => {
  const pathname = usePathname();
  const isActive = pathname === to;

  return (
    <Link
      href={to}
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
        }`}
    >
      <Icon />
      <span className="font-medium">{label}</span>
    </Link>
  );
};

export const AppSidebar: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { workspace, role, isOwner, availableWorkspaces, switchWorkspace } = useWorkspace();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const handleLogout = async () => {
    setIsMobileMenuOpen(false);
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-white fixed h-full z-10 print:hidden">
        <div className="p-6">
          <div className="mb-1">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Meus Negócios</span>
          </div>

          {availableWorkspaces && availableWorkspaces.length > 0 ? (
            <div className="relative">
              <select
                value={workspace?.id || ''}
                onChange={(e) => switchWorkspace(e.target.value)}
                className="w-full bg-slate-800 text-white border border-slate-700 text-sm rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-indigo-500 appearance-none font-bold cursor-pointer"
              >
                {availableWorkspaces.map(({ workspace: w }) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-slate-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>
          ) : (
            <h1 className="text-xl font-bold tracking-tight text-white truncate">
              {workspace ? workspace.name : 'Conselho de Bolso'}
            </h1>
          )}

          <div className="flex items-center gap-2 mt-3">
            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${role === 'owner' ? 'bg-emerald-600 text-white' : 'bg-indigo-600 text-white'}`}>
              {role === 'owner'
                ? 'MEU WORKSPACE'
                : 'CONVIDADO'
              }
            </span>
            {role !== 'owner' && workspace && (
              <span className="text-[10px] text-slate-400 uppercase font-bold">
                DE {availableWorkspaces.find(w => w.workspace.id === workspace.id)?.ownerName?.split(' ')[0] || '...'}
              </span>
            )}
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

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-3 flex justify-between items-center z-50 print:hidden pb-[env(safe-area-inset-bottom)]">
        {[
          { to: '/dashboard', icon: ICONS.Dashboard, label: 'Dash' },
          { to: '/receitas', icon: ICONS.Income, label: 'Receitas' },
          { to: '/despesas', icon: ICONS.Expenses, label: 'Despesas' },
          { to: '/metas', icon: ICONS.Check, label: 'Metas' },
        ].map(({ to, icon: Icon, label }) => {
          const isActive = pathname === to;
          return (
            <Link key={to} href={to} className={`flex flex-col items-center gap-1 p-2 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`}>
              <Icon />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="flex flex-col items-center gap-1 p-2 text-slate-400"
        >
          <div className="flex gap-0.5">
            <span className="w-1 h-1 rounded-full bg-current"></span>
            <span className="w-1 h-1 rounded-full bg-current"></span>
            <span className="w-1 h-1 rounded-full bg-current"></span>
          </div>
          <span className="text-[10px] font-medium">Mais</span>
        </button>
      </nav>

      {/* Mobile Extra Menu Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}></div>
          <div className="absolute left-0 top-0 bottom-0 w-[80%] max-w-[320px] bg-slate-900 text-white p-6 shadow-2xl flex flex-col transform transition-transform duration-300">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold">Menu</h2>
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-slate-400 hover:text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>

            <div className="space-y-4 mb-6">
              {/* Mobile Workspace Switcher */}
              {availableWorkspaces && availableWorkspaces.length > 0 && (
                <div className="p-3 bg-slate-800 rounded-lg">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block mb-2">Workspace</span>
                  <select
                    value={workspace?.id || ''}
                    onChange={(e) => { switchWorkspace(e.target.value); setIsMobileMenuOpen(false); }}
                    className="w-full bg-slate-900 text-white border border-slate-700 text-sm rounded p-2"
                  >
                    {availableWorkspaces.map(({ workspace: w }) => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <nav className="flex-1 space-y-2 overflow-y-auto">
              <SidebarItem to="/marketing" icon={ICONS.Marketing} label="Marketing" onClick={() => setIsMobileMenuOpen(false)} />
              <SidebarItem to="/precificacao" icon={ICONS.Calculator} label="Precificação" onClick={() => setIsMobileMenuOpen(false)} />
              <SidebarItem to="/relatorios" icon={ICONS.FileText} label="Relatórios" onClick={() => setIsMobileMenuOpen(false)} />
              <SidebarItem to="/entidades" icon={ICONS.Entities} label="Cadastros" onClick={() => setIsMobileMenuOpen(false)} />
              {(isOwner || !workspace) && (
                <>
                  <div className="h-px bg-slate-800 my-2"></div>
                  <SidebarItem to="/time" icon={() => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>} label="Acesso & Convites" onClick={() => setIsMobileMenuOpen(false)} />
                  <SidebarItem to="/importar" icon={ICONS.Import} label="Importar CSV" onClick={() => setIsMobileMenuOpen(false)} />
                </>
              )}
            </nav>

            <div className="pt-4 border-t border-slate-800 mt-4">
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 w-full px-4 py-2 text-slate-400 hover:text-white transition-colors"
              >
                <ICONS.Logout />
                <span>Sair</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};