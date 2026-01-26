
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
        className={`pb-3 text-sm font-medium transition-colors whitespace-nowrap ${activeTab === tab
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
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end mt-0">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={onClose} />

      {/* Drawer Content */}
      <div className="relative w-full h-full md:max-w-md bg-white shadow-2xl overflow-hidden flex flex-col transform transition-transform animate-in slide-in-from-right duration-300">
        <div className="flex justify-between items-center p-4 md:p-6 border-b border-slate-100 flex-shrink-0 bg-white">
          <h2 className="text-lg md:text-xl font-bold text-slate-900">{title}</h2>
          <button onClick={onClose} className="p-2 -mr-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors">
            <ICONS.Close />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">
          {children}
        </div>
      </div>
    </div>
  );
};
