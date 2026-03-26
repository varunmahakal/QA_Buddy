import { supabase } from './supabase';
import type { Project, LifecycleStage, SeverityLevel, PriorityLevel } from '../types';

// ─── Row type returned by Supabase ───────────────────────────────────────────
interface ProjectRow {
  id: string;
  user_id: string;
  name: string;
  description: string;
  color: string;
  lifecycle_stages: unknown;
  severity_levels: unknown;
  priority_levels: unknown;
  created_at: string;
  updated_at: string;
}

// ─── Mappers ─────────────────────────────────────────────────────────────────
function toProject(row: ProjectRow): Project {
  return {
    id:              row.id,
    name:            row.name,
    description:     row.description,
    color:           row.color,
    lifecycleStages: (row.lifecycle_stages as LifecycleStage[]) ?? [],
    severityLevels:  (row.severity_levels as SeverityLevel[])  ?? [],
    priorityLevels:  (row.priority_levels as PriorityLevel[])  ?? [],
    createdAt:       row.created_at,
    updatedAt:       row.updated_at,
  };
}

function toRow(userId: string, p: Partial<Project> & { name?: string }) {
  const row: Record<string, unknown> = { user_id: userId };
  if (p.name            !== undefined) row.name             = p.name;
  if (p.description     !== undefined) row.description      = p.description;
  if (p.color           !== undefined) row.color            = p.color;
  if (p.lifecycleStages !== undefined) row.lifecycle_stages = p.lifecycleStages;
  if (p.severityLevels  !== undefined) row.severity_levels  = p.severityLevels;
  if (p.priorityLevels  !== undefined) row.priority_levels  = p.priorityLevels;
  return row;
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────
export async function fetchProjects(userId: string): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  return (data as ProjectRow[]).map(toProject);
}

export async function createProject(
  userId: string,
  data: { name: string; description: string; color: string; lifecycleStages: LifecycleStage[]; severityLevels: SeverityLevel[]; priorityLevels: PriorityLevel[] }
): Promise<Project> {
  const row = toRow(userId, data);
  const { data: inserted, error } = await supabase
    .from('projects')
    .insert(row)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return toProject(inserted as ProjectRow);
}

export async function updateProject(id: string, userId: string, data: Partial<Project>): Promise<void> {
  const row = toRow(userId, data);
  delete row.user_id; // don't overwrite owner
  const { error } = await supabase
    .from('projects')
    .update(row)
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteProject(id: string): Promise<void> {
  const { error } = await supabase.from('projects').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
