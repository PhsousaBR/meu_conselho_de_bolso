import React, { useState } from 'react';
import { ICONS } from '../constants';

interface Field<T> {
    label: string;
    value: (item: T) => React.ReactNode;
    key?: string;
}

interface MobileDataListProps<T> {
    data: T[];
    title: (item: T) => React.ReactNode;
    subtitle?: (item: T) => React.ReactNode;
    fields: Field<T>[];
    actions?: (item: T) => React.ReactNode;
    emptyMessage?: string;
}

export function MobileDataList<T extends { id: string | number }>({
    data,
    title,
    subtitle,
    fields,
    actions,
    emptyMessage = "Nenhum item encontrado."
}: MobileDataListProps<T>) {
    // We can add simple accordion state here if needed, 
    // but for now let's just show fields. 
    // If the user requested Accordion for complex data, we can implement expansion.
    // For many fields, let's auto-hide some? Or just show all in a nice grid.

    // Let's implement generic expansion if fields.length > 3
    const [expandedIds, setExpandedIds] = useState<Set<string | number>>(new Set());

    const toggleExpand = (id: string | number) => {
        const newSet = new Set(expandedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setExpandedIds(newSet);
    };

    if (data.length === 0) {
        return <div className="p-8 text-center text-slate-400 bg-white rounded-xl border border-dashed border-slate-300 md:hidden">{emptyMessage}</div>;
    }

    return (
        <div className="space-y-4 md:hidden">
            {data.map((item) => {
                const isExpanded = expandedIds.has(item.id);
                // First 2 fields are always visible? Or all visible?
                // The requirements said: "Cabeçalho do card mostra os 2–3 dados mais importantes. Ao expandir, mostra o restante."
                // So let's show title + subtitle + first 2 fields always.
                const visibleFields = fields.slice(0, 2);
                const hiddenFields = fields.slice(2);
                const hasHidden = hiddenFields.length > 0;

                return (
                    <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                        {/* Header */}
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <h3 className="font-bold text-slate-800 text-lg">{title(item)}</h3>
                                {subtitle && <div className="text-sm text-slate-500 mt-0.5">{subtitle(item)}</div>}
                            </div>
                            {actions && (
                                <div className="flex gap-2">
                                    {actions(item)}
                                </div>
                            )}
                        </div>

                        {/* Visible Fields */}
                        <div className="grid grid-cols-2 gap-3 mb-2">
                            {visibleFields.map((f, idx) => (
                                <div key={idx} className="flex flex-col">
                                    <span className="text-[10px] uppercase font-bold text-slate-400">{f.label}</span>
                                    <span className="text-sm font-medium text-slate-700 break-words">{f.value(item)}</span>
                                </div>
                            ))}
                        </div>

                        {/* Hidden/Expanded Fields */}
                        {hasHidden && isExpanded && (
                            <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-100 animate-in fade-in slide-in-from-top-1 duration-200">
                                {hiddenFields.map((f, idx) => (
                                    <div key={idx} className="flex flex-col">
                                        <span className="text-[10px] uppercase font-bold text-slate-400">{f.label}</span>
                                        <span className="text-sm font-medium text-slate-700 break-words">{f.value(item)}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Expand Toggle */}
                        {hasHidden && (
                            <button
                                onClick={() => toggleExpand(item.id)}
                                className="w-full mt-2 py-1 flex items-center justify-center text-xs font-bold text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                            >
                                {isExpanded ? 'Ver Menos' : `Ver Mais (+${hiddenFields.length})`}
                            </button>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
