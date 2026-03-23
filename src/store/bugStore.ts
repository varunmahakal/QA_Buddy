import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Bug, BugFormData, StatusChange } from '../types';

const padNum = (n: number) => String(n).padStart(3, '0');

interface BugStore {
  bugs: Bug[];
  addBug: (projectId: string, data: BugFormData, reporter?: string) => Bug;
  updateBug: (id: string, data: Partial<Bug>) => void;
  updateBugStatus: (id: string, newStatus: string, changedBy: string, note?: string) => void;
  deleteBug: (id: string) => void;
  getBug: (id: string) => Bug | undefined;
  getBugsByProject: (projectId: string) => Bug[];
}

export const useBugStore = create<BugStore>()(
  persist(
    (set, get) => ({
      bugs: [],
      addBug: (projectId, data, reporter = 'QA Tester') => {
        const year = new Date().getFullYear();
        const projectBugs = get().bugs.filter((b) => b.projectId === projectId);
        const num = padNum(projectBugs.length + 1);
        const bug: Bug = {
          ...data,
          id: `BUG-${year}-${num}`,
          projectId,
          reporter: data.reporter || reporter,
          statusHistory: [{
            id: `sh-${Date.now()}`,
            from: '',
            to: data.status,
            changedBy: data.reporter || reporter,
            changedAt: new Date().toISOString(),
            note: 'Bug created',
          }],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((s) => ({ bugs: [...s.bugs, bug] }));
        return bug;
      },
      updateBug: (id, data) => set((s) => ({
        bugs: s.bugs.map((b) => b.id === id ? { ...b, ...data, updatedAt: new Date().toISOString() } : b),
      })),
      updateBugStatus: (id, newStatus, changedBy, note) => set((s) => {
        const bug = s.bugs.find((b) => b.id === id);
        if (!bug) return s;
        const change: StatusChange = {
          id: `sh-${Date.now()}`,
          from: bug.status,
          to: newStatus,
          changedBy,
          changedAt: new Date().toISOString(),
          note,
        };
        return {
          bugs: s.bugs.map((b) => b.id === id ? {
            ...b,
            status: newStatus,
            statusHistory: [...b.statusHistory, change],
            updatedAt: new Date().toISOString(),
          } : b),
        };
      }),
      deleteBug: (id) => set((s) => ({ bugs: s.bugs.filter((b) => b.id !== id) })),
      getBug: (id) => get().bugs.find((b) => b.id === id),
      getBugsByProject: (projectId) => get().bugs.filter((b) => b.projectId === projectId),
    }),
    { name: 'drbuddy-bugs' }
  )
);