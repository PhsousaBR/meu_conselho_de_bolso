"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Workspace, Role } from '../types';
import { getActiveWorkspace, getAvailableWorkspaces } from '../services/dataService';

interface WorkspaceContextType {
  workspace: Workspace | null;
  role: Role | null;
  loading: boolean;
  refreshWorkspace: () => Promise<void>;
  switchWorkspace: (workspaceId: string) => Promise<void>;
  availableWorkspaces: { workspace: Workspace, role: Role, ownerName: string }[];
  isOwner: boolean;
  isViewer: boolean;
}

const WorkspaceContext = createContext<WorkspaceContextType>({
  workspace: null,
  role: null,
  loading: true,
  refreshWorkspace: async () => { },
  switchWorkspace: async () => { },
  availableWorkspaces: [],
  isOwner: false,
  isViewer: false,
});

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [availableWorkspaces, setAvailableWorkspaces] = useState<{ workspace: Workspace, role: Role, ownerName: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshWorkspace = async () => {
    try {
      setLoading(true);
      // Fetches active based on localStorage internal logic in dataService -- WE WILL IMPROVE THIS NEXT
      const { workspace: ws, role: r } = await getActiveWorkspace();
      setWorkspace(ws);
      setRole(r);

      // Also fetch list
      const all = await getAvailableWorkspaces();
      setAvailableWorkspaces(all);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const switchWorkspace = async (workspaceId: string) => {
    localStorage.setItem('conselho_active_workspace_id', workspaceId);
    // Force immediate refresh
    await refreshWorkspace();
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
      switchWorkspace,
      availableWorkspaces,
      isOwner: role === Role.OWNER,
      isViewer: role === Role.VIEWER
    }}>
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = () => useContext(WorkspaceContext);