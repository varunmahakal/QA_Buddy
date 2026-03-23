import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TestCase, TestCaseFormData } from '../types';

const padNum = (n: number) => String(n).padStart(3, '0');

interface TestCaseStore {
  testCases: TestCase[];
  addTestCase: (projectId: string, data: TestCaseFormData) => TestCase;
  addTestCases: (projectId: string, cases: TestCaseFormData[]) => TestCase[];
  updateTestCase: (id: string, data: Partial<TestCase>) => void;
  deleteTestCase: (id: string) => void;
  getTestCase: (id: string) => TestCase | undefined;
  getTestCasesByProject: (projectId: string) => TestCase[];
}

export const useTestCaseStore = create<TestCaseStore>()(
  persist(
    (set, get) => ({
      testCases: [],
      addTestCase: (projectId, data) => {
        const year = new Date().getFullYear();
        const projectTCs = get().testCases.filter((t) => t.projectId === projectId);
        const num = padNum(projectTCs.length + 1);
        const tc: TestCase = {
          ...data,
          id: `TC-${year}-${num}`,
          projectId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((s) => ({ testCases: [...s.testCases, tc] }));
        return tc;
      },
      addTestCases: (projectId, cases) => {
        const year = new Date().getFullYear();
        const existing = get().testCases.filter((t) => t.projectId === projectId);
        const newTCs: TestCase[] = cases.map((data, i) => {
          const num = padNum(existing.length + i + 1);
          return {
            ...data,
            id: `TC-${year}-${num}`,
            projectId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
        });
        set((s) => ({ testCases: [...s.testCases, ...newTCs] }));
        return newTCs;
      },
      updateTestCase: (id, data) => set((s) => ({
        testCases: s.testCases.map((t) => t.id === id ? { ...t, ...data, updatedAt: new Date().toISOString() } : t),
      })),
      deleteTestCase: (id) => set((s) => ({ testCases: s.testCases.filter((t) => t.id !== id) })),
      getTestCase: (id) => get().testCases.find((t) => t.id === id),
      getTestCasesByProject: (projectId) => get().testCases.filter((t) => t.projectId === projectId),
    }),
    { name: 'drbuddy-testcases' }
  )
);