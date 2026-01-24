
import React from 'react';
import { ICONS } from '../constants';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, description, actions }) => (
  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-8">
    <div>
      <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>
      {description && <p className="text-slate-500 mt-1 text-sm">{description}</p>}
    </div>
    {actions && <div className="flex gap-2">{actions}</div>}
  </div>
);

interface TabsProps {
  tabs: string[];
  activeTab: string;
  onChange: (tab: string) => void;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onChange }) => (
  <div className="border-b border-slate-200 mb-6 flex gap-6 overflow-x-auto">
    {tabs.map((tab) => (
      <button
        key={tab}
        onClick={() => onChange(tab)}
        className={`pb-3 text-sm font-medium transition-colors whitespace-nowrap ${
          activeTab === tab
            ? 'border-b-2 border-indigo-600 text-indigo-600'
            : 'text-slate-500 hover:text-slate-700'
        }`}
      >
        {tab}
      </button>
    ))}
  </div>
);

interface DrawerProps {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export const Drawer: React.FC<DrawerProps> = ({ title, isOpen, onClose, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl p-6 overflow-y-auto transform transition-transform animate-in slide-in-from-right duration-300">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-900">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <ICONS.Close />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};
