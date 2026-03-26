import { create } from 'zustand';
import type { TestCase, TestCaseFormData } from '../types';
import {
  fetchTestCasesByProject,
  createTestCase,
  createTestCases,
  updateTestCase as svcUpdateTestCase,
  deleteTestCase as svcDeleteTestCase,
} from '../lib/testCaseService';
import { supabase } from '../lib/supabase';

interface TestCaseStore {
  testCases:        TestCase[];
  loading:          boolean;
  error:            string | null;
  loadedProjectIds: Set<string>;

  loadTestCasesForProject: (projectId: string) => Promise<void>;
  addTestCase:             (projectId: string, data: TestCaseFormData) => Promise<TestCase>;
  addTestCases:            (projectId: string, cases: TestCaseFormData[]) => Promise<TestCase[]>;
  updateTestCase:          (id: string, data: Partial<TestCase>) => Promise<void>;
  deleteTestCase:          (id: string) => Promise<void>;
  getTestCase:             (id: string) => TestCase | undefined;
  getTestCasesByProject:   (projectId: string) => TestCase[];
}

export const useTestCaseStore = create<TestCaseStore>()((set, get) => ({
  testCases:        [],
  loading:          false,
  error:            null,
  loadedProjectIds: new Set<string>(),

  loadTestCasesForProject: async (projectId) => {
    if (get().loadedProjectIds.has(projectId)) return;
    set({ loading: true, error: null });
    try {
      const data = await fetchTestCasesByProject(projectId);
      set((s) => ({
        testCases:        [...s.testCases.filter((t) => t.projectId !== projectId), ...data],
        loadedProjectIds: new Set([...s.loadedProjectIds, projectId]),
        loading:          false,
      }));
    } catch (e) {
      set({ loading: false, error: String(e) });
    }
  },

  addTestCase: async (projectId, data) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const tc = await createTestCase(user.id, projectId, data);
    set((s) => ({ testCases: [...s.testCases, tc] }));
    return tc;
  },

  addTestCases: async (projectId, cases) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const newTCs = await createTestCases(user.id, projectId, cases);
    set((s) => ({ testCases: [...s.testCases, ...newTCs] }));
    return newTCs;
  },

  updateTestCase: async (id, data) => {
    await svcUpdateTestCase(id, data);
    set((s) => ({
      testCases: s.testCases.map((t) =>
        t.id === id ? { ...t, ...data, updatedAt: new Date().toISOString() } : t
      ),
    }));
  },

  deleteTestCase: async (id) => {
    await svcDeleteTestCase(id);
    set((s) => ({ testCases: s.testCases.filter((t) => t.id !== id) }));
  },

  getTestCase:           (id)        => get().testCases.find((t) => t.id === id),
  getTestCasesByProject: (projectId) => get().testCases.filter((t) => t.projectId === projectId),
}));
