import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Project, LifecycleStage, SeverityLevel, PriorityLevel } from '../types';

const DEFAULT_LIFECYCLE: LifecycleStage[] = [
  { id: 'open', name: 'Open', color: '#3b82f6', order: 0, isDefault: true },
  { id: 'under-dev', name: 'Under Development', color: '#f59e0b', order: 1 },
  { id: 'testing', name: 'Testing', color: '#8b5cf6', order: 2 },
  { id: 'resolved', name: 'Resolved', color: '#10b981', order: 3 },
  { id: 'closed', name: 'Closed', color: '#6b7280', order: 4, isFinal: true },
  { id: 'reopened', name: 'Reopened', color: '#ef4444', order: 5 },
];

const DEFAULT_SEVERITY: SeverityLevel[] = [
  { id: 'critical', name: 'Critical', color: '#fef2f2', textColor: '#dc2626' },
  { id: 'high', name: 'High', color: '#fff7ed', textColor: '#ea580c' },
  { id: 'medium', name: 'Medium', color: '#fefce8', textColor: '#ca8a04' },
  { id: 'low', name: 'Low', color: '#f0fdf4', textColor: '#16a34a' },
];

const DEFAULT_PRIORITY: PriorityLevel[] = [
  { id: 'p1', name: 'P1 - Immediate', color: '#fef2f2', textColor: '#dc2626' },
  { id: 'p2', name: 'P2 - High', color: '#fff7ed', textColor: '#ea580c' },
  { id: 'p3', name: 'P3 - Normal', color: '#eff6ff', textColor: '#2563eb' },
  { id: 'p4', name: 'P4 - Low', color: '#f0fdf4', textColor: '#16a34a' },
];

const DRBUDDY_PROJECT: Project = {
  id: 'drbuddy-default',
  name: 'DrBuddy',
  description: 'AI-Powered Clinical Diagnosis Platform — https://drbuddy.online/',
  color: '#2563eb',
  lifecycleStages: DEFAULT_LIFECYCLE,
  severityLevels: DEFAULT_SEVERITY,
  priorityLevels: DEFAULT_PRIORITY,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

interface ProjectStore {
  projects: Project[];
  addProject: (project: { name: string; description: string; color: string }) => Project;
  updateProject: (id: string, data: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  getProject: (id: string) => Project | undefined;
  updateLifecycleStages: (projectId: string, stages: LifecycleStage[]) => void;
  updateSeverityLevels: (projectId: string, levels: SeverityLevel[]) => void;
  updatePriorityLevels: (projectId: string, levels: PriorityLevel[]) => void;
}

export const useProjectStore = create<ProjectStore>()(
  persist(
    (set, get) => ({
      projects: [DRBUDDY_PROJECT],
      addProject: (data) => {
        const project: Project = {
          ...data,
          id: `proj-${Date.now()}`,
          lifecycleStages: DEFAULT_LIFECYCLE,
          severityLevels: DEFAULT_SEVERITY,
          priorityLevels: DEFAULT_PRIORITY,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((s) => ({ projects: [...s.projects, project] }));
        return project;
      },
      updateProject: (id, data) => set((s) => ({
        projects: s.projects.map((p) => p.id === id ? { ...p, ...data, updatedAt: new Date().toISOString() } : p),
      })),
      deleteProject: (id) => set((s) => ({ projects: s.projects.filter((p) => p.id !== id) })),
      getProject: (id) => get().projects.find((p) => p.id === id),
      updateLifecycleStages: (projectId, stages) => set((s) => ({
        projects: s.projects.map((p) => p.id === projectId ? { ...p, lifecycleStages: stages, updatedAt: new Date().toISOString() } : p),
      })),
      updateSeverityLevels: (projectId, levels) => set((s) => ({
        projects: s.projects.map((p) => p.id === projectId ? { ...p, severityLevels: levels, updatedAt: new Date().toISOString() } : p),
      })),
      updatePriorityLevels: (projectId, levels) => set((s) => ({
        projects: s.projects.map((p) => p.id === projectId ? { ...p, priorityLevels: levels, updatedAt: new Date().toISOString() } : p),
      })),
    }),
    { name: 'drbuddy-projects' }
  )
);