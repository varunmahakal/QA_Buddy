import { supabase } from './supabase';
import type { TestCase, TestCaseFormData } from '../types';

// ─── Row type returned by Supabase ───────────────────────────────────────────
interface TestCaseRow {
  id: string;
  project_id: string;
  user_id: string;
  title: string;
  module: string;
  test_type: string;
  test_scenario: string;
  preconditions: string;
  test_steps: unknown;
  screenshots: unknown;
  linked_bug_ids: unknown;
  tags: unknown;
  test_data: string;
  expected_result: string;
  actual_result: string;
  priority: string;
  status: string;
  remarks: string;
  created_at: string;
  updated_at: string;
}

// ─── Mappers ─────────────────────────────────────────────────────────────────
function toTestCase(row: TestCaseRow): TestCase {
  return {
    id:             row.id,
    projectId:      row.project_id,
    title:          row.title,
    module:         row.module,
    testType:       row.test_type,
    testScenario:   row.test_scenario,
    preconditions:  row.preconditions,
    testSteps:      (row.test_steps as TestCase['testSteps']) ?? [],
    screenshots:    (row.screenshots as TestCase['screenshots']) ?? [],
    linkedBugIds:   (row.linked_bug_ids as string[]) ?? [],
    tags:           (row.tags as string[]) ?? [],
    testData:       row.test_data,
    expectedResult: row.expected_result,
    actualResult:   row.actual_result,
    priority:       row.priority,
    status:         row.status as TestCase['status'],
    remarks:        row.remarks,
    createdAt:      row.created_at,
    updatedAt:      row.updated_at,
  };
}

function toRow(userId: string, projectId: string, tc: Partial<TestCase>) {
  const row: Record<string, unknown> = { user_id: userId, project_id: projectId };
  if (tc.title          !== undefined) row.title          = tc.title;
  if (tc.module         !== undefined) row.module         = tc.module;
  if (tc.testType       !== undefined) row.test_type      = tc.testType;
  if (tc.testScenario   !== undefined) row.test_scenario  = tc.testScenario;
  if (tc.preconditions  !== undefined) row.preconditions  = tc.preconditions;
  if (tc.testSteps      !== undefined) row.test_steps     = tc.testSteps;
  if (tc.screenshots    !== undefined) row.screenshots    = tc.screenshots;
  if (tc.linkedBugIds   !== undefined) row.linked_bug_ids = tc.linkedBugIds;
  if (tc.tags           !== undefined) row.tags           = tc.tags;
  if (tc.testData       !== undefined) row.test_data      = tc.testData;
  if (tc.expectedResult !== undefined) row.expected_result = tc.expectedResult;
  if (tc.actualResult   !== undefined) row.actual_result  = tc.actualResult;
  if (tc.priority       !== undefined) row.priority       = tc.priority;
  if (tc.status         !== undefined) row.status         = tc.status;
  if (tc.remarks        !== undefined) row.remarks        = tc.remarks;
  return row;
}

const padNum = (n: number) => String(n).padStart(3, '0');

// ─── CRUD ─────────────────────────────────────────────────────────────────────
export async function fetchTestCasesByProject(projectId: string): Promise<TestCase[]> {
  const { data, error } = await supabase
    .from('test_cases')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  return (data as TestCaseRow[]).map(toTestCase);
}

export async function createTestCase(
  userId: string,
  projectId: string,
  data: TestCaseFormData
): Promise<TestCase> {
  const year = new Date().getFullYear();
  const { count } = await supabase
    .from('test_cases')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', projectId);

  const num = padNum((count ?? 0) + 1);
  const id  = `TC-${year}-${num}`;

  const row = toRow(userId, projectId, data);
  row.id = id;

  const { data: inserted, error } = await supabase
    .from('test_cases')
    .insert(row)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return toTestCase(inserted as TestCaseRow);
}

export async function createTestCases(
  userId: string,
  projectId: string,
  cases: TestCaseFormData[]
): Promise<TestCase[]> {
  if (cases.length === 0) return [];

  const year = new Date().getFullYear();
  const { count } = await supabase
    .from('test_cases')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', projectId);

  const existing = count ?? 0;
  const rows = cases.map((data, i) => {
    const num = padNum(existing + i + 1);
    const row = toRow(userId, projectId, data);
    row.id = `TC-${year}-${num}`;
    return row;
  });

  const { data: inserted, error } = await supabase
    .from('test_cases')
    .insert(rows)
    .select();

  if (error) throw new Error(error.message);
  return (inserted as TestCaseRow[]).map(toTestCase);
}

export async function updateTestCase(id: string, data: Partial<TestCase>): Promise<void> {
  const row = toRow('', '', data);
  delete row.user_id;
  delete row.project_id;
  const { error } = await supabase.from('test_cases').update(row).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteTestCase(id: string): Promise<void> {
  const { error } = await supabase.from('test_cases').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
