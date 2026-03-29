import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
  createRecordingSession,
  stopRecordingSession,
  loadRecordingEvents,
  addManualEvent,
  deleteRecordingEvent,
  type RecordingEvent,
} from '../lib/recorderService';
import { createTestCase } from '../lib/testCaseService';
import type { TestCaseFormData } from '../types';
import toast from 'react-hot-toast';
import {
  Video, Square, Plus, Trash2, ChevronRight, Bookmark,
  Wand2, Save, Copy, MousePointer2, Keyboard, Globe,
  CheckCircle2, XCircle, ClipboardList, PenLine, Loader2,
  TriangleAlert, ExternalLink
} from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────────────
type Phase = 'setup' | 'recording' | 'review' | 'done';

interface GeneratedTC {
  title: string;
  module: string;
  testType: string;
  testScenario: string;
  preconditions: string;
  testSteps: { step: string; expected: string }[];
  expectedResult: string;
  actualResult: string;
  testData: string;
  tags: string[];
}

// ─── Event icon + label helpers ───────────────────────────────────────────────
function EventIcon({ type, assertionType }: { type: string; assertionType: string }) {
  const cls = 'shrink-0';
  switch (type) {
    case 'click':      return <MousePointer2 size={14} className={`${cls} text-blue-400`} />;
    case 'input':      return <Keyboard       size={14} className={`${cls} text-violet-400`} />;
    case 'navigation': return <Globe          size={14} className={`${cls} text-cyan-400`} />;
    case 'assertion':
      return assertionType === 'true'
        ? <CheckCircle2 size={14} className={`${cls} text-green-400`} />
        : <XCircle      size={14} className={`${cls} text-red-400`} />;
    case 'user_data':  return <ClipboardList  size={14} className={`${cls} text-amber-400`} />;
    case 'manual':     return <PenLine        size={14} className={`${cls} text-slate-400`} />;
    default:           return <ChevronRight   size={14} className={`${cls} text-slate-500`} />;
  }
}

function eventLabel(e: RecordingEvent): string {
  switch (e.eventType) {
    case 'click':
      return `Click "${e.targetText || e.targetSelector}"`;
    case 'input':
      return `Type "${e.value}" in "${e.targetText || 'field'}"`;
    case 'navigation':
      return e.value || `Navigate to ${e.url}`;
    case 'assertion':
      return `[${e.assertionType === 'true' ? 'PASS' : 'FAIL'}] ${e.value}`;
    case 'user_data':
      return `User Data — ${e.targetText}: "${e.value}"`;
    case 'manual':
      return e.targetText;
    default:
      return e.value || e.targetText || e.targetSelector;
  }
}

// ─── Main Component ────────────────────────────────────────────────────────────
export function TestCaseRecorderPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate      = useNavigate();
  const { user }      = useAuth();

  // Phase state machine
  const [phase,      setPhase]     = useState<Phase>('setup');
  const [url,        setUrl]       = useState('');
  const [sessionId,  setSessionId] = useState<string | null>(null);
  const [events,     setEvents]    = useState<RecordingEvent[]>([]);

  // AI + save
  const [generated,  setGenerated] = useState<GeneratedTC | null>(null);
  const [edited,     setEdited]    = useState<GeneratedTC | null>(null);
  const [apiKey,     setApiKey]    = useState(() => localStorage.getItem('qa-claude-key') || '');
  const [generating, setGenerating] = useState(false);
  const [saving,     setSaving]    = useState(false);
  const [error,      setError]     = useState('');

  // Manual step input
  const [manualStep, setManualStep] = useState('');

  // Refs
  const channelRef   = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const eventsEndRef = useRef<HTMLDivElement>(null);

  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
  const ANON_KEY     = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
  const APP_ORIGIN   = window.location.origin;

  // ── Bookmarklet href (generated after session created) ─────────────────────
  const bookmarkletHref = sessionId
    ? (() => {
        const src = `${APP_ORIGIN}/recorder.js?s=${sessionId}&u=${encodeURIComponent(SUPABASE_URL)}&k=${encodeURIComponent(ANON_KEY)}&t=${Date.now()}`;
        const code = `(function(){if(window.__QABuddy__){window.__QABuddy__.destroy();return;}var s=document.createElement('script');s.src='${src}';document.head.appendChild(s);})()`;
        return `javascript:${encodeURIComponent(code)}`;
      })()
    : '#';

  // ── Start recording ────────────────────────────────────────────────────────
  const startRecording = async () => {
    if (!url.trim() || !projectId || !user) return;
    setError('');
    try {
      let target = url.trim();
      if (!target.startsWith('http')) target = 'https://' + target;
      const id = await createRecordingSession(user.id, projectId, target);
      setUrl(target);
      setSessionId(id);
      setPhase('recording');
      window.open(target, '_blank');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to start recording session');
    }
  };

  // ── Realtime subscription ──────────────────────────────────────────────────
  useEffect(() => {
    if (!sessionId) return;

    // Load existing events first
    loadRecordingEvents(sessionId)
      .then(setEvents)
      .catch(() => {});

    // Subscribe for live inserts
    const channel = supabase
      .channel(`rec:${sessionId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'recording_events', filter: `session_id=eq.${sessionId}` },
        (payload) => {
          const row = payload.new as {
            id: string; session_id: string; event_type: string;
            target_selector: string; target_text: string; value: string;
            url: string; page_title: string; assertion_type: string;
            step_order: number; created_at: string;
          };
          const newEvent: RecordingEvent = {
            id: row.id, sessionId: row.session_id,
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
          setEvents(prev => {
            if (prev.find(e => e.id === newEvent.id)) return prev;
            return [...prev, newEvent].sort((a, b) => a.stepOrder - b.stepOrder);
          });
        }
      )
      .subscribe();

    channelRef.current = channel;
    return () => { void supabase.removeChannel(channel); };
  }, [sessionId]);

  // Auto-scroll to latest event
  useEffect(() => {
    eventsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events]);

  // ── Stop recording ─────────────────────────────────────────────────────────
  const stopRecording = async () => {
    if (!sessionId) return;
    await stopRecordingSession(sessionId);
    setPhase('review');
  };

  // ── Add manual step ────────────────────────────────────────────────────────
  const handleAddManualStep = async () => {
    if (!manualStep.trim() || !sessionId) return;
    const maxOrder = events.length > 0 ? Math.max(...events.map(e => e.stepOrder)) : 0;
    try {
      const newEvent = await addManualEvent(sessionId, manualStep.trim(), maxOrder + 1);
      setEvents(prev => [...prev, newEvent]);
      setManualStep('');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to add step');
    }
  };

  // ── Delete event ───────────────────────────────────────────────────────────
  const handleDeleteEvent = async (id: string) => {
    await deleteRecordingEvent(id);
    setEvents(prev => prev.filter(e => e.id !== id));
  };

  // ── Generate test case with AI ─────────────────────────────────────────────
  const generateTestCase = useCallback(async () => {
    if (events.length === 0) { setError('No steps recorded yet.'); return; }
    setGenerating(true);
    setError('');
    if (apiKey) localStorage.setItem('qa-claude-key', apiKey);
    try {
      const res = await fetch('/.netlify/functions/generate-test-case', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ events, url, apiKey: apiKey || undefined }),
      });
      const data = await res.json() as { error?: string } & GeneratedTC;
      if (!res.ok) throw new Error(data.error || 'AI generation failed');
      setGenerated(data as GeneratedTC);
      setEdited({ ...(data as GeneratedTC) });
      setPhase('done');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'AI generation failed');
    } finally {
      setGenerating(false);
    }
  }, [events, url, apiKey]);

  // ── Copy prompt fallback ───────────────────────────────────────────────────
  const copyPrompt = () => {
    const steps = events.map((e, i) => `${i + 1}. ${eventLabel(e)}`).join('\n');
    const text  = `Please generate a structured QA test case from these recorded browser actions for URL: ${url}\n\n${steps}`;
    navigator.clipboard.writeText(text).then(() => toast.success('Prompt copied — paste into Claude or ChatGPT'));
  };

  // ── Save generated test case ───────────────────────────────────────────────
  const saveTestCase = async () => {
    if (!edited || !projectId || !user) return;
    setSaving(true);
    setError('');
    try {
      const formData: TestCaseFormData = {
        title:          edited.title,
        module:         edited.module,
        testType:       edited.testType,
        testScenario:   edited.testScenario,
        preconditions:  edited.preconditions,
        testSteps:      edited.testSteps.map((s, i) => ({
          id:              crypto.randomUUID(),
          stepNumber:      i + 1,
          action:          s.step,
          expectedOutcome: s.expected,
        })),
        testData:       edited.testData,
        expectedResult: edited.expectedResult,
        actualResult:   edited.actualResult,
        priority:       'Medium',
        status:         'Not Tested',
        remarks:        '',
        screenshots:    [],
        linkedBugIds:   [],
        tags:           edited.tags,
      };
      await createTestCase(user.id, projectId, formData);
      toast.success('Test case saved!');
      navigate(`/projects/${projectId}/test-cases`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save test case');
    } finally {
      setSaving(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center">
          <Video size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800">Test Case Recorder</h1>
          <p className="text-sm text-slate-500">Perform your test — actions are recorded automatically</p>
        </div>
        {/* Phase breadcrumb */}
        <div className="ml-auto flex items-center gap-2 text-xs text-slate-400">
          {(['setup','recording','review','done'] as Phase[]).map((p, i) => (
            <span key={p} className="flex items-center gap-2">
              {i > 0 && <ChevronRight size={12} />}
              <span className={phase === p ? 'text-violet-600 font-semibold' : ''}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <TriangleAlert size={16} className="shrink-0 mt-0.5" />
          <span>{error}</span>
          <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {/* ── SETUP PHASE ─────────────────────────────────────────────────── */}
      {phase === 'setup' && (
        <div className="space-y-5">
          {/* URL input */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
            <h2 className="font-semibold text-slate-700">Step 1 — Enter the URL to test</h2>
            <div className="flex gap-3">
              <input
                type="url"
                value={url}
                onChange={e => setUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && void startRecording()}
                placeholder="https://your-app.com/login"
                className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
              />
              <button
                onClick={() => void startRecording()}
                disabled={!url.trim()}
                className="flex items-center gap-2 bg-violet-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Video size={15} />
                Start Recording
              </button>
            </div>
          </div>

          {/* How it works */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 space-y-3">
            <h2 className="font-semibold text-slate-700">How it works</h2>
            <div className="space-y-2 text-sm text-slate-600">
              <div className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-violet-100 text-violet-700 text-xs font-bold flex items-center justify-center shrink-0">1</span>
                <span>Enter the URL and click <strong>Start Recording</strong> — the page opens in a new tab</span>
              </div>
              <div className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-violet-100 text-violet-700 text-xs font-bold flex items-center justify-center shrink-0">2</span>
                <span>Drag the <strong>QA Buddy Recorder</strong> bookmarklet to your browser's bookmarks bar (do this once)</span>
              </div>
              <div className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-violet-100 text-violet-700 text-xs font-bold flex items-center justify-center shrink-0">3</span>
                <span>In the new tab, click the bookmarklet — a red recording toolbar appears</span>
              </div>
              <div className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-violet-100 text-violet-700 text-xs font-bold flex items-center justify-center shrink-0">4</span>
                <span>Perform your test. Every click, input, and navigation is captured here live</span>
              </div>
              <div className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-violet-100 text-violet-700 text-xs font-bold flex items-center justify-center shrink-0">5</span>
                <span>Click <strong>Stop</strong> in the toolbar → review steps → <strong>Generate Test Case with AI</strong></span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── RECORDING PHASE ─────────────────────────────────────────────── */}
      {phase === 'recording' && (
        <div className="space-y-4">
          {/* Status bar */}
          <div className="flex items-center gap-4 p-4 bg-red-50 border border-red-200 rounded-xl">
            <span className="flex items-center gap-2 font-semibold text-red-700">
              <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
              Recording Active
            </span>
            <a href={url} target="_blank" rel="noopener noreferrer"
               className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 truncate max-w-xs">
              <ExternalLink size={12} />
              {url}
            </a>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-sm text-slate-500">{events.length} steps</span>
              <button
                onClick={() => void stopRecording()}
                className="flex items-center gap-2 bg-red-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-red-700"
              >
                <Square size={13} />
                Stop Recording
              </button>
            </div>
          </div>

          {/* Bookmarklet install (shown until first event arrives) */}
          {events.length === 0 && (
            <div className="bg-white rounded-xl border-2 border-dashed border-violet-300 p-5 space-y-3">
              <div className="flex items-center gap-2 text-violet-700 font-semibold">
                <Bookmark size={18} />
                Install the Recording Bookmarklet
              </div>
              <p className="text-sm text-slate-600">
                Drag the button below to your browser's bookmarks bar. Then click it on the new tab to start capturing actions.
              </p>
              <div className="flex items-center gap-3 flex-wrap">
                <a
                  href={bookmarkletHref}
                  draggable
                  className="inline-flex items-center gap-2 bg-violet-600 text-white px-4 py-2 rounded-lg text-sm font-medium cursor-grab active:cursor-grabbing select-none hover:bg-violet-700"
                  onClick={e => e.preventDefault()}
                  title="Drag this to your bookmarks bar"
                >
                  <Video size={14} />
                  🔴 QA Buddy Recorder
                </a>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(bookmarkletHref);
                    toast.success('Bookmarklet copied — create a new bookmark and paste as the URL');
                  }}
                  className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 border border-slate-300 px-3 py-2 rounded-lg"
                >
                  <Copy size={13} /> Copy URL
                </button>
              </div>
              <p className="text-xs text-slate-400">
                Already installed? Just click the bookmarklet on the target tab. Steps will appear below in real-time.
              </p>
            </div>
          )}

          {/* Manual step input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={manualStep}
              onChange={e => setManualStep(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && void handleAddManualStep()}
              placeholder="Add a manual step (e.g. 'Verified page loaded successfully')"
              className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
            <button
              onClick={() => void handleAddManualStep()}
              disabled={!manualStep.trim()}
              className="flex items-center gap-1.5 bg-slate-100 text-slate-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-slate-200 disabled:opacity-50"
            >
              <Plus size={14} /> Add
            </button>
          </div>

          {/* Live events feed */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-600">Recorded Steps</span>
              <span className="text-xs text-slate-400">{events.length} captured</span>
            </div>
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
              {events.length === 0 ? (
                <div className="py-10 text-center text-sm text-slate-400">
                  Waiting for actions… Install the bookmarklet and perform test steps on the target page.
                </div>
              ) : (
                events.map((e, i) => (
                  <div key={e.id} className="flex items-start gap-3 px-4 py-2.5 hover:bg-slate-50">
                    <span className="text-xs text-slate-400 w-5 shrink-0 pt-0.5">{i + 1}</span>
                    <EventIcon type={e.eventType} assertionType={e.assertionType} />
                    <span className="text-sm text-slate-700 flex-1 min-w-0 break-words">{eventLabel(e)}</span>
                    {e.pageTitle && (
                      <span className="text-xs text-slate-400 shrink-0 max-w-[120px] truncate">{e.pageTitle}</span>
                    )}
                  </div>
                ))
              )}
              <div ref={eventsEndRef} />
            </div>
          </div>

          {events.length > 0 && (
            <div className="flex justify-end">
              <button
                onClick={() => void stopRecording()}
                className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-900"
              >
                <Square size={14} />
                Stop & Review Steps
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── REVIEW PHASE ────────────────────────────────────────────────── */}
      {phase === 'review' && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="flex items-center gap-4 p-4 bg-green-50 border border-green-200 rounded-xl">
            <CheckCircle2 size={20} className="text-green-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-green-800">Recording complete — {events.length} steps captured</p>
              <p className="text-xs text-green-600">{url}</p>
            </div>
          </div>

          {/* Steps list (editable) */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-600">Review Recorded Steps</span>
              <span className="text-xs text-slate-400">Delete unwanted steps before generating</span>
            </div>
            <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
              {events.map((e, i) => (
                <div key={e.id} className="flex items-start gap-3 px-4 py-2.5 hover:bg-slate-50 group">
                  <span className="text-xs text-slate-400 w-5 shrink-0 pt-0.5">{i + 1}</span>
                  <EventIcon type={e.eventType} assertionType={e.assertionType} />
                  <span className="text-sm text-slate-700 flex-1 min-w-0 break-words">{eventLabel(e)}</span>
                  <button
                    onClick={() => void handleDeleteEvent(e.id)}
                    className="shrink-0 text-slate-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete step"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Add manual step */}
          <div className="flex gap-2">
            <input
              type="text"
              value={manualStep}
              onChange={e => setManualStep(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && void handleAddManualStep()}
              placeholder="Add a manual step…"
              className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
            <button
              onClick={() => void handleAddManualStep()}
              disabled={!manualStep.trim()}
              className="flex items-center gap-1.5 bg-slate-100 text-slate-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-slate-200 disabled:opacity-50"
            >
              <Plus size={14} /> Add
            </button>
          </div>

          {/* AI Key + Generate */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
            <h3 className="font-semibold text-slate-700 flex items-center gap-2">
              <Wand2 size={16} className="text-violet-600" />
              Generate Test Case with AI
            </h3>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-500">
                Claude API Key <span className="font-normal">(optional if CLAUDE_API_KEY is set in Netlify)</span>
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="sk-ant-…  (leave empty if configured in Netlify)"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => void generateTestCase()}
                disabled={generating}
                className="flex items-center gap-2 bg-violet-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-violet-700 disabled:opacity-60"
              >
                {generating ? <Loader2 size={15} className="animate-spin" /> : <Wand2 size={15} />}
                {generating ? 'Generating…' : 'Generate Test Case'}
              </button>
              <button
                onClick={copyPrompt}
                className="flex items-center gap-2 border border-slate-300 text-slate-600 px-4 py-2 rounded-lg text-sm hover:bg-slate-50"
              >
                <Copy size={14} />
                Copy Prompt (manual)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DONE PHASE — Edit & Save generated test case ────────────────── */}
      {phase === 'done' && edited && generated && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-violet-50 border border-violet-200 rounded-xl">
            <Wand2 size={18} className="text-violet-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-violet-800">Test case generated! Review and save.</p>
              <p className="text-xs text-violet-600">All fields are editable before saving.</p>
            </div>
            <button
              onClick={() => void generateTestCase()}
              className="ml-auto text-xs text-violet-600 hover:text-violet-800 border border-violet-300 px-2 py-1 rounded"
            >
              Regenerate
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
            {/* Title */}
            <Field label="Title" required>
              <input
                type="text"
                value={edited.title}
                onChange={e => setEdited(p => p && ({ ...p, title: e.target.value }))}
                className={inputCls}
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Module">
                <input
                  type="text"
                  value={edited.module}
                  onChange={e => setEdited(p => p && ({ ...p, module: e.target.value }))}
                  className={inputCls}
                />
              </Field>
              <Field label="Test Type">
                <input
                  type="text"
                  value={edited.testType}
                  onChange={e => setEdited(p => p && ({ ...p, testType: e.target.value }))}
                  className={inputCls}
                />
              </Field>
            </div>

            <Field label="Test Scenario">
              <textarea
                value={edited.testScenario}
                onChange={e => setEdited(p => p && ({ ...p, testScenario: e.target.value }))}
                rows={2}
                className={inputCls}
              />
            </Field>

            <Field label="Preconditions">
              <textarea
                value={edited.preconditions}
                onChange={e => setEdited(p => p && ({ ...p, preconditions: e.target.value }))}
                rows={2}
                className={inputCls}
              />
            </Field>

            {/* Test Steps */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Test Steps</label>
              <div className="space-y-2">
                {edited.testSteps.map((step, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <span className="text-xs text-slate-400 w-5 shrink-0 pt-2">{i + 1}</span>
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={step.step}
                        onChange={e => setEdited(p => {
                          if (!p) return p;
                          const ts = [...p.testSteps];
                          ts[i] = { ...ts[i], step: e.target.value };
                          return { ...p, testSteps: ts };
                        })}
                        placeholder="Action"
                        className={inputCls}
                      />
                      <input
                        type="text"
                        value={step.expected}
                        onChange={e => setEdited(p => {
                          if (!p) return p;
                          const ts = [...p.testSteps];
                          ts[i] = { ...ts[i], expected: e.target.value };
                          return { ...p, testSteps: ts };
                        })}
                        placeholder="Expected result"
                        className={inputCls}
                      />
                    </div>
                    <button
                      onClick={() => setEdited(p => p && ({ ...p, testSteps: p.testSteps.filter((_, j) => j !== i) }))}
                      className="text-slate-300 hover:text-red-400 mt-1.5 shrink-0"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setEdited(p => p && ({ ...p, testSteps: [...p.testSteps, { step: '', expected: '' }] }))}
                className="text-xs flex items-center gap-1 text-violet-600 hover:text-violet-800"
              >
                <Plus size={12} /> Add Step
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Expected Result">
                <textarea
                  value={edited.expectedResult}
                  onChange={e => setEdited(p => p && ({ ...p, expectedResult: e.target.value }))}
                  rows={3}
                  className={inputCls}
                />
              </Field>
              <Field label="Actual Result">
                <textarea
                  value={edited.actualResult}
                  onChange={e => setEdited(p => p && ({ ...p, actualResult: e.target.value }))}
                  rows={3}
                  className={inputCls}
                />
              </Field>
            </div>

            <Field label="Test Data">
              <textarea
                value={edited.testData}
                onChange={e => setEdited(p => p && ({ ...p, testData: e.target.value }))}
                rows={2}
                className={inputCls}
              />
            </Field>

            <Field label="Tags (comma-separated)">
              <input
                type="text"
                value={edited.tags.join(', ')}
                onChange={e => setEdited(p => p && ({
                  ...p,
                  tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean)
                }))}
                className={inputCls}
              />
            </Field>
          </div>

          {/* Save */}
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setPhase('review')}
              className="border border-slate-300 text-slate-600 px-4 py-2 rounded-lg text-sm hover:bg-slate-50"
            >
              ← Back to Review
            </button>
            <button
              onClick={() => void saveTestCase()}
              disabled={saving || !edited.title}
              className="flex items-center gap-2 bg-green-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-60"
            >
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              {saving ? 'Saving…' : 'Save Test Case'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helper sub-components ─────────────────────────────────────────────────────
const inputCls = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400';

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
