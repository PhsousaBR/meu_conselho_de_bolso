"use client";

import React, { useState, useEffect, useRef } from 'react';
import { ICONS } from '../constants';

interface Option {
    id: string;
    label: string;
}

interface ComboboxProps {
    options: Option[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    onCreate?: (name: string) => void;
}

export const Combobox: React.FC<ComboboxProps> = ({ options, value, onChange, placeholder = "Selecione...", onCreate }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Sync internal search with external value
    useEffect(() => {
        const selected = options.find(o => o.id === value);
        if (selected) {
            setSearchTerm(selected.label);
        } else if (!value) {
            setSearchTerm('');
        }
    }, [value, options]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                // Revert to selected value if closed without selection
                const selected = options.find(o => o.id === value);
                if (selected) setSearchTerm(selected.label);
                else if (!value) setSearchTerm('');
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [value, options]);

    const filteredOptions = options.filter(option =>
        option.label.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSelect = (option: Option) => {
        onChange(option.id);
        setSearchTerm(option.label);
        setIsOpen(false);
    };

    const handleCreate = () => {
        if (onCreate && searchTerm.trim()) {
            onCreate(searchTerm.trim());
            setIsOpen(false);
        }
    };

    return (
        <div className="relative" ref={wrapperRef}>
            <div className="relative">
                <input
                    ref={inputRef}
                    type="text"
                    className="w-full border border-slate-200 bg-slate-50 p-3 rounded-lg text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 pl-10"
                    placeholder={placeholder}
                    value={searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setIsOpen(true);
                        // If user clears input, clear value
                        if (e.target.value === '') onChange('');
                    }}
                    onFocus={() => setIsOpen(true)}
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <ICONS.Search />
                </div>
            </div>

            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredOptions.length > 0 ? (
                        filteredOptions.map((option) => (
                            <div
                                key={option.id}
                                className={`px-4 py-2 cursor-pointer hover:bg-slate-50 text-sm ${option.id === value ? 'bg-emerald-50 text-emerald-700 font-medium' : 'text-slate-700'}`}
                                onClick={() => handleSelect(option)}
                            >
                                {option.label}
                            </div>
                        ))
                    ) : (
                        <div className="p-2 text-center text-sm text-slate-500">
                            <p className="mb-2">Nenhum resultado.</p>
                            {onCreate && searchTerm.trim() && (
                                <button
                                    type="button"
                                    onClick={handleCreate}
                                    className="text-emerald-600 font-bold hover:underline"
                                >
                                    + Criar "{searchTerm}"
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
