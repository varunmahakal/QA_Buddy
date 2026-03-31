import { supabase } from './supabase';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface RecordingSession {
  id: string;
  userId: string;
  projectId: string | null;
  url: string;
  status: 'active' | 'stopped';
  createdAt: string;
}

export interface RecordingEvent {
  id: string;
  sessionId: string;
  eventType: 'click' | 'input' | 'navigation' | 'assertion' | 'user_data' | 'manual';
  targetSelector: string;
  targetText: string;
  value: string;
  url: string;
  pageTitle: string;
  assertionType: string;  // 'true' | 'false' | ''
  stepOrder: number;
  createdAt: string;
}

interface RecordingEventRow {
  id: string;
  session_id: string;
  event_type: string;
  target_selector: string;
  target_text: string;
  value: string;
  url: string;
  page_title: string;
  assertion_type: string;
  step_order: number;
  created_at: string;
}

function toRecordingEvent(row: RecordingEventRow): RecordingEvent {
  return {
    id:             row.id,
    sessionId:      row.session_id,
    eventType:      row.event_type as RecordingEvent['eventType'],
    targetSelector: row.target_selector,
    targetText:     row.target_text,
    value:          row.value,
    url:            row.url,
    pageTitle:      row.page_title,
    assertionType:  row.assertion_type,
    stepOrder:      row.step_order,
    createdAt:      row.created_at,
  };
}

// ─── Session CRUD ─────────────────────────────────────────────────────────────
export async function createRecordingSession(
  userId: string,
  projectId: string,
  url: string
): Promise<string> {
  const { data, error } = await supabase
    .from('recording_sessions')
    .insert({ user_id: userId, project_id: projectId, url, status: 'active' })
    .select('id')
    .single();

  if (error) throw new Error(error.message);
  return (data as { id: string }).id;
}

export async function stopRecordingSession(sessionId: string): Promise<void> {
  const { error } = await supabase
    .from('recording_sessions')
    .update({ status: 'stopped' })
    .eq('id', sessionId);

  if (error) throw new Error(error.message);
}

// ─── Event CRUD ───────────────────────────────────────────────────────────────
export async function loadRecordingEvents(sessionId: string): Promise<RecordingEvent[]> {
  const { data, error } = await supabase
    .from('recording_events')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  return (data as RecordingEventRow[]).map(toRecordingEvent);
}

export async function addManualEvent(
  sessionId: string,
  text: string,
  stepOrder: number
): Promise<RecordingEvent> {
  const { data, error } = await supabase
    .from('recording_events')
    .insert({
      session_id:     sessionId,
      event_type:     'manual',
      target_selector:'',
      target_text:    text,
      value:          '',
      url:            '',
      page_title:     '',
      assertion_type: '',
      step_order:     stepOrder,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return toRecordingEvent(data as RecordingEventRow);
}

export async function deleteRecordingEvent(id: string): Promise<void> {
  const { error } = await supabase.from('recording_events').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
