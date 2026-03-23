import { useState } from 'react';
import type { FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Minus, ChevronDown, ChevronUp, Bug } from 'lucide-react';
import { useProjectStore } from '../store/projectStore';
import { useBugStore } from '../store/bugStore';
import { Header } from '../components/layout/Header';
import { FileUpload } from '../components/ui/FileUpload';
import type { Screenshot } from '../types';
import toast from 'react-hot-toast';

const BUG_TYPES = ['Functional','UI/UX','Performance','Security','Data Integrity','AI Output','API','Accessibility'];
const REPRO    = ['Always','Intermittent','Rare','Unable to Reproduce'];
const BROWSERS = ['Chrome','Firefox','Safari','Edge','Opera','Samsung Internet','Other'];
const OS_LIST  = ['Windows 11','Windows 10','macOS Ventura','macOS Sonoma','Ubuntu','Android','iOS','Other'];
const DEVICES  = ['Desktop','Laptop','Tablet','Mobile'];

const inputCls  = "w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
const selectCls = "w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";

// ── Stable module-level helpers (prevents focus-loss on re-render) ───────────
function FormSection({
  title: t,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-slate-50 transition-colors"
      >
        <h3 className="font-semibold text-slate-800">{t}</h3>
        {open
          ? <ChevronUp   size={16} className="text-slate-400" />
          : <ChevronDown size={16} className="text-slate-400" />}
      </button>
      {open && <div className="px-6 pb-6 pt-2 space-y-4">{children}</div>}
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}
// ────────────────────────────────────────────────────────────────────────────

export function EditBugPage() {
  const { projectId, bugId } = useParams<{ projectId: string; bugId: string }>();
  const { getProject }  = useProjectStore();
  const { getBug, updateBug, updateBugStatus } = useBugStore();
  const navigate = useNavigate();

  const project = getProject(projectId!);
  const bug     = getBug(bugId!);

  if (!project || !bug) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-slate-400">
          <Bug size={48} className="mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">Bug not found</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-3 text-sm text-blue-500 hover:underline"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  // ── Form state — initialised from existing bug ───────────────────────────
  const [title,            setTitle]            = useState(bug.title);
  const [module,           setModule]           = useState(bug.module);
  const [bugType,          setBugType]          = useState(bug.bugType);
  const [reproducibility,  setReproducibility]  = useState(bug.reproducibility);
  const [description,      setDescription]      = useState(bug.description);
  const [expectedBehavior, setExpectedBehavior] = useState(bug.expectedBehavior);
  const [actualBehavior,   setActualBehavior]   = useState(bug.actualBehavior);
  const [steps,            setSteps]            = useState<string[]>(
    bug.stepsToReproduce?.length ? bug.stepsToReproduce : ['']
  );
  const [severity,  setSeverity]  = useState(bug.severity);
  const [priority,  setPriority]  = useState(bug.priority);
  const [status,    setStatus]    = useState(bug.status);
  const [reporter,  setReporter]  = useState(bug.reporter);
  const [assignee,  setAssignee]  = useState(bug.assignee);
  const [workaround,       setWorkaround]       = useState(bug.workaround);
  const [additionalNotes,  setAdditionalNotes]  = useState(bug.additionalNotes);
  const [screenshots,      setScreenshots]      = useState<Screenshot[]>(bug.screenshots ?? []);

  // Environment
  const [browser,          setBrowser]          = useState(bug.environment?.browser      ?? 'Chrome');
  const [os,               setOs]               = useState(bug.environment?.os           ?? 'Windows 11');
  const [deviceType,       setDeviceType]       = useState(bug.environment?.deviceType   ?? 'Desktop');
  const [screenResolution, setScreenResolution] = useState(bug.environment?.screenResolution ?? '');
  const [userRole,         setUserRole]         = useState(bug.environment?.userRole     ?? '');
  const [accountId,        setAccountId]        = useState(bug.environment?.accountId    ?? '');

  // AI / Diagnosis
  const ai = bug.aiDetails;
  const [inputSymptoms,    setInputSymptoms]    = useState(ai?.inputSymptoms    ?? '');
  const [patientHistory,   setPatientHistory]   = useState(ai?.patientHistory   ?? '');
  const [expectedDiagnosis,setExpectedDiagnosis]= useState(ai?.expectedDiagnosis ?? '');
  const [actualOutput,     setActualOutput]     = useState(ai?.actualOutput     ?? '');
  const [confidenceScore,  setConfidenceScore]  = useState(ai?.confidenceScore  ?? '');
  const [responseTime,     setResponseTime]     = useState(ai?.responseTime     ?? '');
  const [hallucinationNoted, setHallucinationNoted] = useState(ai?.hallucinationNoted ?? false);
  const [hallucinationDesc,  setHallucinationDesc]  = useState(ai?.hallucinationDesc  ?? '');

  // ── Steps helpers ─────────────────────────────────────────────────────────
  const addStep    = () => setSteps([...steps, '']);
  const removeStep = (i: number) => setSteps(steps.filter((_, idx) => idx !== i));
  const updateStep = (i: number, val: string) =>
    setSteps(steps.map((s, idx) => (idx === i ? val : s)));

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { toast.error('Title is required'); return; }

    // If status changed, record it in the history timeline
    if (status !== bug.status) {
      updateBugStatus(bug.id, status, reporter || 'QA Tester', 'Status updated via edit');
    }

    updateBug(bug.id, {
      title:           title.trim(),
      module,
      bugType,
      reproducibility,
      description,
      expectedBehavior,
      actualBehavior,
      stepsToReproduce: steps.filter(Boolean),
      environment:     { browser, os, deviceType, screenResolution, userRole, accountId },
      severity,
      priority,
      status,
      reporter,
      assignee,
      workaround,
      additionalNotes,
      screenshots,
      aiDetails: {
        inputSymptoms, patientHistory, expectedDiagnosis,
        actualOutput,  confidenceScore, responseTime,
        hallucinationNoted, hallucinationDesc,
      },
    });

    toast.success('Bug updated successfully!');
    navigate(`/projects/${projectId}/bugs/${bug.id}`);
  };

  return (
    <div className="flex-1">
      <Header />
      <form onSubmit={handleSubmit} className="p-6 space-y-4 max-w-4xl">
        {/* ── Page header ── */}
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Edit Bug</h2>
            <p className="text-sm text-slate-400 mt-0.5 font-mono">{bug.id}</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Save Changes
            </button>
          </div>
        </div>

        {/* ── Basic Information ── */}
        <FormSection title="Basic Information">
          <Field label="Bug Title" required>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="Short, descriptive bug title..."
              className={inputCls}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Module / Area">
              <input value={module} onChange={(e) => setModule(e.target.value)} placeholder="e.g. Diagnosis Engine, Auth, Patient Records" className={inputCls} />
            </Field>
            <Field label="Bug Type">
              <select value={bugType} onChange={(e) => setBugType(e.target.value)} className={selectCls}>
                {BUG_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Severity">
              <select value={severity} onChange={(e) => setSeverity(e.target.value)} className={selectCls}>
                {project.severityLevels.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field>
            <Field label="Priority">
              <select value={priority} onChange={(e) => setPriority(e.target.value)} className={selectCls}>
                {project.priorityLevels.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
            <Field label="Status">
              <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectCls}>
                {project.lifecycleStages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field>
            <Field label="Reproducibility">
              <select value={reproducibility} onChange={(e) => setReproducibility(e.target.value)} className={selectCls}>
                {REPRO.map((r) => <option key={r}>{r}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Reporter">
              <input value={reporter} onChange={(e) => setReporter(e.target.value)} placeholder="Your name" className={inputCls} />
            </Field>
            <Field label="Assignee">
              <input value={assignee} onChange={(e) => setAssignee(e.target.value)} placeholder="Developer name" className={inputCls} />
            </Field>
          </div>
        </FormSection>

        {/* ── Bug Description ── */}
        <FormSection title="Bug Description">
          <Field label="Description">
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Describe the issue..." className={inputCls + ' resize-none'} />
          </Field>
          <Field label="Expected Behavior">
            <textarea value={expectedBehavior} onChange={(e) => setExpectedBehavior(e.target.value)} rows={2} placeholder="What should happen?" className={inputCls + ' resize-none'} />
          </Field>
          <Field label="Actual Behavior">
            <textarea value={actualBehavior} onChange={(e) => setActualBehavior(e.target.value)} rows={2} placeholder="What actually happens?" className={inputCls + ' resize-none'} />
          </Field>
        </FormSection>

        {/* ── Steps to Reproduce ── */}
        <FormSection title="Steps to Reproduce">
          <div className="space-y-2">
            {steps.map((step, i) => (
              <div key={i} className="flex gap-2 items-start">
                <span className="mt-2 text-xs font-bold text-slate-400 w-6 flex-shrink-0">{i + 1}.</span>
                <input
                  value={step}
                  onChange={(e) => updateStep(i, e.target.value)}
                  placeholder={'Step ' + (i + 1) + '...'}
                  className={inputCls + ' flex-1'}
                />
                {steps.length > 1 && (
                  <button type="button" onClick={() => removeStep(i)} className="mt-2 p-1 text-slate-400 hover:text-red-500">
                    <Minus size={14} />
                  </button>
                )}
              </div>
            ))}
            <button type="button" onClick={addStep} className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 mt-1">
              <Plus size={14} /> Add step
            </button>
          </div>
        </FormSection>

        {/* ── Environment Details ── */}
        <FormSection title="Environment Details" defaultOpen={false}>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Browser">
              <select value={browser} onChange={(e) => setBrowser(e.target.value)} className={selectCls}>
                {BROWSERS.map((b) => <option key={b}>{b}</option>)}
              </select>
            </Field>
            <Field label="Operating System">
              <select value={os} onChange={(e) => setOs(e.target.value)} className={selectCls}>
                {OS_LIST.map((o) => <option key={o}>{o}</option>)}
              </select>
            </Field>
            <Field label="Device Type">
              <select value={deviceType} onChange={(e) => setDeviceType(e.target.value)} className={selectCls}>
                {DEVICES.map((d) => <option key={d}>{d}</option>)}
              </select>
            </Field>
            <Field label="Screen Resolution">
              <input value={screenResolution} onChange={(e) => setScreenResolution(e.target.value)} placeholder="e.g. 1920x1080" className={inputCls} />
            </Field>
            <Field label="User Role">
              <input value={userRole} onChange={(e) => setUserRole(e.target.value)} placeholder="e.g. Physician, Admin" className={inputCls} />
            </Field>
            <Field label="Account / User ID">
              <input value={accountId} onChange={(e) => setAccountId(e.target.value)} placeholder="Masked or test account" className={inputCls} />
            </Field>
          </div>
        </FormSection>

        {/* ── Screenshots ── */}
        <FormSection title="Screenshots" defaultOpen={false}>
          <FileUpload screenshots={screenshots} onChange={setScreenshots} />
        </FormSection>

        {/* ── AI / Diagnosis Details ── */}
        <FormSection title="AI / Diagnosis Details (DrBuddy Specific)" defaultOpen={false}>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Input Symptoms / Chief Complaint">
              <textarea value={inputSymptoms} onChange={(e) => setInputSymptoms(e.target.value)} rows={2} className={inputCls + ' resize-none'} />
            </Field>
            <Field label="Patient History Provided">
              <textarea value={patientHistory} onChange={(e) => setPatientHistory(e.target.value)} rows={2} className={inputCls + ' resize-none'} />
            </Field>
            <Field label="Expected Differential Diagnosis">
              <input value={expectedDiagnosis} onChange={(e) => setExpectedDiagnosis(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Actual AI Output">
              <input value={actualOutput} onChange={(e) => setActualOutput(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Confidence Score">
              <input value={confidenceScore} onChange={(e) => setConfidenceScore(e.target.value)} placeholder="e.g. 87%" className={inputCls} />
            </Field>
            <Field label="Response Time">
              <input value={responseTime} onChange={(e) => setResponseTime(e.target.value)} placeholder="e.g. 45s (expected <60s)" className={inputCls} />
            </Field>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="hallucination-edit"
              checked={hallucinationNoted}
              onChange={(e) => setHallucinationNoted(e.target.checked)}
              className="w-4 h-4 accent-blue-600"
            />
            <label htmlFor="hallucination-edit" className="text-sm text-slate-700">
              Hallucination / Incorrect Reasoning Noted
            </label>
          </div>
          {hallucinationNoted && (
            <Field label="Hallucination Description">
              <textarea
                value={hallucinationDesc}
                onChange={(e) => setHallucinationDesc(e.target.value)}
                rows={2}
                className={inputCls + ' resize-none'}
                placeholder="Describe the incorrect reasoning..."
              />
            </Field>
          )}
        </FormSection>

        {/* ── Additional Notes ── */}
        <FormSection title="Additional Notes" defaultOpen={false}>
          <Field label="Workaround">
            <textarea value={workaround} onChange={(e) => setWorkaround(e.target.value)} rows={2} placeholder="Is there a known workaround?" className={inputCls + ' resize-none'} />
          </Field>
          <Field label="Additional Notes / Context">
            <textarea value={additionalNotes} onChange={(e) => setAdditionalNotes(e.target.value)} rows={3} placeholder="Any other relevant context..." className={inputCls + ' resize-none'} />
          </Field>
        </FormSection>

        {/* ── Footer actions ── */}
        <div className="flex justify-end gap-2 pt-2 pb-8">
          <button type="button" onClick={() => navigate(-1)} className="px-5 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50">
            Cancel
          </button>
          <button type="submit" className="px-6 py-2 text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-semibold">
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
}
