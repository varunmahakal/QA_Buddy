import { useState } from 'react';
import type { FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Minus, ChevronDown, ChevronUp } from 'lucide-react';
import { useProjectStore } from '../store/projectStore';
import { useBugStore } from '../store/bugStore';
import { Header } from '../components/layout/Header';
import { FileUpload } from '../components/ui/FileUpload';
import type { Screenshot } from '../types';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

const BUG_TYPES = ['Functional','UI/UX','Performance','Security','Data Integrity','AI Output','API','Accessibility'];
const REPRO = ['Always','Intermittent','Rare','Unable to Reproduce'];
const BROWSERS = ['Chrome','Firefox','Safari','Edge','Opera','Samsung Internet','Other'];
const OS_LIST = ['Windows 11','Windows 10','macOS Ventura','macOS Sonoma','Ubuntu','Android','iOS','Other'];
const DEVICES = ['Desktop','Laptop','Tablet','Mobile'];

const inputCls = "w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
const selectCls = "w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";

// ── Defined at module level so React never recreates them on re-render ──────
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
          ? <ChevronUp size={16} className="text-slate-400" />
          : <ChevronDown size={16} className="text-slate-400" />}
      </button>
      {open && (
        <div className="px-6 pb-6 pt-2 space-y-4">{children}</div>
      )}
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

export function NewBugPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { getProject } = useProjectStore();
  const { addBug } = useBugStore();
  const { user } = useAuth();
  const navigate = useNavigate();
  const project = getProject(projectId!);
  if (!project) return <div className="p-10 text-slate-500">Project not found.</div>;

  const defaultStage = project.lifecycleStages.find((s) => s.isDefault) || project.lifecycleStages[0];

  const [title, setTitle] = useState('');
  const [module, setModule] = useState('');
  const [bugType, setBugType] = useState('Functional');
  const [reproducibility, setReproducibility] = useState('Always');
  const [description, setDescription] = useState('');
  const [expectedBehavior, setExpectedBehavior] = useState('');
  const [actualBehavior, setActualBehavior] = useState('');
  const [steps, setSteps] = useState(['']);
  const [severity, setSeverity] = useState(project.severityLevels[0]?.id || '');
  const [priority, setPriority] = useState(project.priorityLevels[0]?.id || '');
  const [status, setStatus] = useState(defaultStage?.id || '');
  const [reporter, setReporter] = useState(user?.email ?? '');
  const [assignee, setAssignee] = useState('');
  const [workaround, setWorkaround] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [browser, setBrowser] = useState('Chrome');
  const [os, setOs] = useState('Windows 11');
  const [deviceType, setDeviceType] = useState('Desktop');
  const [screenResolution, setScreenResolution] = useState('');
  const [userRole, setUserRole] = useState('');
  const [accountId, setAccountId] = useState('');

  const [inputSymptoms, setInputSymptoms] = useState('');
  const [patientHistory, setPatientHistory] = useState('');
  const [expectedDiagnosis, setExpectedDiagnosis] = useState('');
  const [actualOutput, setActualOutput] = useState('');
  const [confidenceScore, setConfidenceScore] = useState('');
  const [responseTime, setResponseTime] = useState('');
  const [hallucinationNoted, setHallucinationNoted] = useState(false);
  const [hallucinationDesc, setHallucinationDesc] = useState('');

  const addStep = () => setSteps([...steps, '']);
  const removeStep = (i: number) => setSteps(steps.filter((_, idx) => idx !== i));
  const updateStep = (i: number, val: string) =>
    setSteps(steps.map((s, idx) => (idx === i ? val : s)));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { toast.error('Title is required'); return; }
    await addBug(projectId!, {
      title: title.trim(), module, bugType, reproducibility, description,
      expectedBehavior, actualBehavior,
      stepsToReproduce: steps.filter(Boolean),
      environment: { browser, os, deviceType, screenResolution, userRole, accountId },
      severity, priority, status, reporter, assignee,
      workaround, additionalNotes, screenshots,
      aiDetails: {
        inputSymptoms, patientHistory, expectedDiagnosis,
        actualOutput, confidenceScore, responseTime,
        hallucinationNoted, hallucinationDesc,
      },
    });
    toast.success('Bug reported successfully!');
    navigate(`/projects/${projectId}/bugs`);
  };

  return (
    <div className="flex-1">
      <Header />
      <form onSubmit={(e) => void handleSubmit(e)} className="p-6 space-y-4 max-w-4xl">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold text-slate-800">Report a Bug</h2>
          <div className="flex gap-2">
            <button type="button" onClick={() => navigate(-1)} className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button>
            <button type="submit" className="px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">Submit Bug</button>
          </div>
        </div>

        <FormSection title="Basic Information">
          <Field label="Bug Title" required>
            <input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Short, descriptive bug title..." className={inputCls} />
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

        <FormSection title="Screenshots" defaultOpen={false}>
          <FileUpload screenshots={screenshots} onChange={setScreenshots} />
        </FormSection>

        <FormSection title="AI / Diagnosis Details (Optional)" defaultOpen={false}>
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
              id="hallucination"
              checked={hallucinationNoted}
              onChange={(e) => setHallucinationNoted(e.target.checked)}
              className="w-4 h-4 accent-blue-600"
            />
            <label htmlFor="hallucination" className="text-sm text-slate-700">
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

        <FormSection title="Additional Notes" defaultOpen={false}>
          <Field label="Workaround">
            <textarea value={workaround} onChange={(e) => setWorkaround(e.target.value)} rows={2} placeholder="Is there a known workaround?" className={inputCls + ' resize-none'} />
          </Field>
          <Field label="Additional Notes / Context">
            <textarea value={additionalNotes} onChange={(e) => setAdditionalNotes(e.target.value)} rows={3} placeholder="Any other relevant context..." className={inputCls + ' resize-none'} />
          </Field>
        </FormSection>

        <div className="flex justify-end gap-2 pt-2 pb-8">
          <button type="button" onClick={() => navigate(-1)} className="px-5 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button>
          <button type="submit" className="px-6 py-2 text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-semibold">Submit Bug Report</button>
        </div>
      </form>
    </div>
  );
}
