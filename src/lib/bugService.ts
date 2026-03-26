import { supabase } from './supabase';
import type { Bug, BugFormData, StatusChange } from '../types';

// ─── Row type returned by Supabase ───────────────────────────────────────────
interface BugRow {
  id: string;
  project_id: string;
  user_id: string;
  title: string;
  module: string;
  bug_type: string;
  reproducibility: string;
  description: string;
  expected_behavior: string;
  actual_behavior: string;
  steps_to_reproduce: unknown;
  environment: unknown;
  screenshots: unknown;
  ai_details: unknown;
  patient_data_details: unknown;
  status_history: unknown;
  severity: string;
  priority: string;
  status: string;
  reporter: string;
  assignee: string;
  workaround: string;
  additional_notes: string;
  created_at: string;
  updated_at: string;
}

// ─── Mappers ─────────────────────────────────────────────────────────────────
function toBug(row: BugRow): Bug {
  return {
    id:                  row.id,
    projectId:           row.project_id,
    title:               row.title,
    module:              row.module,
    bugType:             row.bug_type,
    reproducibility:     row.reproducibility,
    description:         row.description,
    expectedBehavior:    row.expected_behavior,
    actualBehavior:      row.actual_behavior,
    stepsToReproduce:    (row.steps_to_reproduce as string[]) ?? [],
    environment:         (row.environment as Bug['environment']) ?? { browser: '', os: '', deviceType: '', screenResolution: '', userRole: '', accountId: '' },
    screenshots:         (row.screenshots as Bug['screenshots']) ?? [],
    aiDetails:           row.ai_details as Bug['aiDetails'],
    patientDataDetails:  row.patient_data_details as Bug['patientDataDetails'],
    statusHistory:       (row.status_history as StatusChange[]) ?? [],
    severity:            row.severity,
    priority:            row.priority,
    status:              row.status,
    reporter:            row.reporter,
    assignee:            row.assignee,
    workaround:          row.workaround,
    additionalNotes:     row.additional_notes,
    createdAt:           row.created_at,
    updatedAt:           row.updated_at,
  };
}

function toRow(userId: string, projectId: string, bug: Partial<Bug>) {
  const row: Record<string, unknown> = { user_id: userId, project_id: projectId };
  if (bug.title             !== undefined) row.title               = bug.title;
  if (bug.module            !== undefined) row.module              = bug.module;
  if (bug.bugType           !== undefined) row.bug_type            = bug.bugType;
  if (bug.reproducibility   !== undefined) row.reproducibility     = bug.reproducibility;
  if (bug.description       !== undefined) row.description         = bug.description;
  if (bug.expectedBehavior  !== undefined) row.expected_behavior   = bug.expectedBehavior;
  if (bug.actualBehavior    !== undefined) row.actual_behavior     = bug.actualBehavior;
  if (bug.stepsToReproduce  !== undefined) row.steps_to_reproduce  = bug.stepsToReproduce;
  if (bug.environment       !== undefined) row.environment         = bug.environment;
  if (bug.screenshots       !== undefined) row.screenshots         = bug.screenshots;
  if (bug.aiDetails         !== undefined) row.ai_details          = bug.aiDetails;
  if (bug.patientDataDetails !== undefined) row.patient_data_details = bug.patientDataDetails;
  if (bug.statusHistory     !== undefined) row.status_history      = bug.statusHistory;
  if (bug.severity          !== undefined) row.severity            = bug.severity;
  if (bug.priority          !== undefined) row.priority            = bug.priority;
  if (bug.status            !== undefined) row.status              = bug.status;
  if (bug.reporter          !== undefined) row.reporter            = bug.reporter;
  if (bug.assignee          !== undefined) row.assignee            = bug.assignee;
  if (bug.workaround        !== undefined) row.workaround          = bug.workaround;
  if (bug.additionalNotes   !== undefined) row.additional_notes    = bug.additionalNotes;
  return row;
}

const padNum = (n: number) => String(n).padStart(3, '0');

// ─── CRUD ─────────────────────────────────────────────────────────────────────
export async function fetchBugsByProject(projectId: string): Promise<Bug[]> {
  const { data, error } = await supabase
    .from('bugs')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  return (data as BugRow[]).map(toBug);
}

export async function createBug(
  userId: string,
  projectId: string,
  data: BugFormData,
  reporter: string
): Promise<Bug> {
  // Safely generate next ID from DB count
  const year = new Date().getFullYear();
  const { count } = await supabase
    .from('bugs')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', projectId);

  const num = padNum((count ?? 0) + 1);
  const id  = `BUG-${year}-${num}`;

  const initialHistory: StatusChange = {
    id:        `sh-${Date.now()}`,
    from:      '',
    to:        data.status,
    changedBy: data.reporter || reporter,
    changedAt: new Date().toISOString(),
    note:      'Bug created',
  };

  const row = toRow(userId, projectId, {
    ...data,
    reporter: data.reporter || reporter,
    statusHistory: [initialHistory],
  });
  row.id = id;

  const { data: inserted, error } = await supabase
    .from('bugs')
    .insert(row)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return toBug(inserted as BugRow);
}

export async function updateBug(id: string, data: Partial<Bug>): Promise<void> {
  const row = toRow('', '', data);
  delete row.user_id;
  delete row.project_id;
  const { error } = await supabase.from('bugs').update(row).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteBug(id: string): Promise<void> {
  const { error } = await supabase.from('bugs').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
