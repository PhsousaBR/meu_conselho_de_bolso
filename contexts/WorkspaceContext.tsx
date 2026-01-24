"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Workspace, Role } from '../types';
import { getActiveWorkspace } from '../services/dataService';

interface WorkspaceContextType {
  workspace: Workspace | null;
  role: Role | null;
  loading: boolean;
  refreshWorkspace: () => Promise<void>;
  isOwner: boolean;
  isViewer: boolean;
}

const WorkspaceContext = createContext<WorkspaceContextType>({
  workspace: null,
  role: null,
  loading: true,
  refreshWorkspace: async () => { },
  isOwner: false,
  isViewer: false,
});

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshWorkspace = async () => {
    try {
      setLoading(true);
      const { workspace: ws, role: r } = await getActiveWorkspace();
      setWorkspace(ws);
      setRole(r);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshWorkspace();

    // Listen to Auth changes to refresh workspace context
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      refreshWorkspace();
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <WorkspaceContext.Provider value={{
      workspace,
      role,
      loading,
      refreshWorkspace,
      // Treat as owner if explicitly owner OR if no workspace (local/offline mode)
      isOwner: role === Role.OWNER,
      isViewer: role === Role.VIEWER
    }}>
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = () => useContext(WorkspaceContext);