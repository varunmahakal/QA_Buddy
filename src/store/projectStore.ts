import { create } from 'zustand';
import type { Project, LifecycleStage, SeverityLevel, PriorityLevel } from '../types';
import {
  fetchProjects,
  createProject,
  updateProject as svcUpdateProject,
  deleteProject as svcDeleteProject,
} from '../lib/projectService';
import { supabase } from '../lib/supabase';

export const DEFAULT_LIFECYCLE: LifecycleStage[] = [
  { id: 'open',      name: 'Open',             color: '#3b82f6', order: 0, isDefault: true },
  { id: 'under-dev', name: 'Under Development', color: '#f59e0b', order: 1 },
  { id: 'testing',   name: 'Testing',           color: '#8b5cf6', order: 2 },
  { id: 'resolved',  name: 'Resolved',          color: '#10b981', order: 3 },
  { id: 'closed',    name: 'Closed',            color: '#6b7280', order: 4, isFinal: true },
  { id: 'reopened',  name: 'Reopened',          color: '#ef4444', order: 5 },
];

export const DEFAULT_SEVERITY: SeverityLevel[] = [
  { id: 'critical', name: 'Critical', color: '#fef2f2', textColor: '#dc2626' },
  { id: 'high',     name: 'High',     color: '#fff7ed', textColor: '#ea580c' },
  { id: 'medium',   name: 'Medium',   color: '#fefce8', textColor: '#ca8a04' },
  { id: 'low',      name: 'Low',      color: '#f0fdf4', textColor: '#16a34a' },
];

export const DEFAULT_PRIORITY: PriorityLevel[] = [
  { id: 'p1', name: 'P1 - Immediate', color: '#fef2f2', textColor: '#dc2626' },
  { id: 'p2', name: 'P2 - High',      color: '#fff7ed', textColor: '#ea580c' },
  { id: 'p3', name: 'P3 - Normal',    color: '#eff6ff', textColor: '#2563eb' },
  { id: 'p4', name: 'P4 - Low',       color: '#f0fdf4', textColor: '#16a34a' },
];

interface ProjectStore {
  projects: Project[];
  loading:  boolean;
  error:    string | null;

  loadProjects:  () => Promise<void>;
  addProject:    (data: { name: string; description: string; color: string }) => Promise<Project>;
  updateProject: (id: string, data: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  getProject:    (id: string) => Project | undefined;

  updateLifecycleStages: (projectId: string, stages: LifecycleStage[]) => Promise<void>;
  updateSeverityLevels:  (projectId: string, levels: SeverityLevel[])   => Promise<void>;
  updatePriorityLevels:  (projectId: string, levels: PriorityLevel[])   => Promise<void>;
}

export const useProjectStore = create<ProjectStore>()((set, get) => ({
  projects: [],
  loading:  false,
  error:    null,

  loadProjects: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    set({ loading: true, error: null });
    try {
      const projects = await fetchProjects(user.id);
      set({ projects, loading: false });
    } catch (e) {
      set({ loading: false, error: String(e) });
    }
  },

  addProject: async (data) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const project = await createProject(user.id, {
      ...data,
      lifecycleStages: DEFAULT_LIFECYCLE,
      severityLevels:  DEFAULT_SEVERITY,
      priorityLevels:  DEFAULT_PRIORITY,
    });
    set((s) => ({ projects: [...s.projects, project] }));
    return project;
  },

  updateProject: async (id, data) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    await svcUpdateProject(id, user.id, data);
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === id ? { ...p, ...data, updatedAt: new Date().toISOString() } : p
      ),
    }));
  },

  deleteProject: async (id) => {
    await svcDeleteProject(id);
    set((s) => ({ projects: s.projects.filter((p) => p.id !== id) }));
  },

  getProject: (id) => get().projects.find((p) => p.id === id),

  updateLifecycleStages: async (projectId, stages) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    await svcUpdateProject(projectId, user.id, { lifecycleStages: stages });
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === projectId ? { ...p, lifecycleStages: stages, updatedAt: new Date().toISOString() } : p
      ),
    }));
  },

  updateSeverityLevels: async (projectId, levels) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    await svcUpdateProject(projectId, user.id, { severityLevels: levels });
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === projectId ? { ...p, severityLevels: levels, updatedAt: new Date().toISOString() } : p
      ),
    }));
  },

  updatePriorityLevels: async (projectId, levels) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    await svcUpdateProject(projectId, user.id, { priorityLevels: levels });
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === projectId ? { ...p, priorityLevels: levels, updatedAt: new Date().toISOString() } : p
      ),
    }));
  },
}));
