import { create } from 'zustand';
import type { Bug, BugFormData, StatusChange } from '../types';
import {
  fetchBugsByProject,
  createBug,
  updateBug as svcUpdateBug,
  deleteBug as svcDeleteBug,
} from '../lib/bugService';
import { supabase } from '../lib/supabase';

interface BugStore {
  bugs:             Bug[];
  loading:          boolean;
  error:            string | null;
  loadedProjectIds: Set<string>;

  loadBugsForProject: (projectId: string) => Promise<void>;
  addBug:             (projectId: string, data: BugFormData, reporter?: string) => Promise<Bug>;
  updateBug:          (id: string, data: Partial<Bug>) => Promise<void>;
  updateBugStatus:    (id: string, newStatus: string, changedBy: string, note?: string) => Promise<void>;
  deleteBug:          (id: string) => Promise<void>;
  getBug:             (id: string) => Bug | undefined;
  getBugsByProject:   (projectId: string) => Bug[];
}

export const useBugStore = create<BugStore>()((set, get) => ({
  bugs:             [],
  loading:          false,
  error:            null,
  loadedProjectIds: new Set<string>(),

  loadBugsForProject: async (projectId) => {
    if (get().loadedProjectIds.has(projectId)) return;
    set({ loading: true, error: null });
    try {
      const data = await fetchBugsByProject(projectId);
      set((s) => ({
        bugs:             [...s.bugs.filter((b) => b.projectId !== projectId), ...data],
        loadedProjectIds: new Set([...s.loadedProjectIds, projectId]),
        loading:          false,
      }));
    } catch (e) {
      set({ loading: false, error: String(e) });
    }
  },

  addBug: async (projectId, data, reporter = 'QA Tester') => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const bug = await createBug(user.id, projectId, data, reporter);
    set((s) => ({ bugs: [...s.bugs, bug] }));
    return bug;
  },

  updateBug: async (id, data) => {
    await svcUpdateBug(id, data);
    set((s) => ({
      bugs: s.bugs.map((b) =>
        b.id === id ? { ...b, ...data, updatedAt: new Date().toISOString() } : b
      ),
    }));
  },

  updateBugStatus: async (id, newStatus, changedBy, note) => {
    const bug = get().bugs.find((b) => b.id === id);
    if (!bug) return;

    const change: StatusChange = {
      id:        `sh-${Date.now()}`,
      from:      bug.status,
      to:        newStatus,
      changedBy,
      changedAt: new Date().toISOString(),
      note,
    };

    const updatedHistory = [...bug.statusHistory, change];
    await svcUpdateBug(id, { status: newStatus, statusHistory: updatedHistory });
    set((s) => ({
      bugs: s.bugs.map((b) =>
        b.id === id
          ? { ...b, status: newStatus, statusHistory: updatedHistory, updatedAt: new Date().toISOString() }
          : b
      ),
    }));
  },

  deleteBug: async (id) => {
    await svcDeleteBug(id);
    set((s) => ({ bugs: s.bugs.filter((b) => b.id !== id) }));
  },

  getBug:           (id)        => get().bugs.find((b) => b.id === id),
  getBugsByProject: (projectId) => get().bugs.filter((b) => b.projectId === projectId),
}));
