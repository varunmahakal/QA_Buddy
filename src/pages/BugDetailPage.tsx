import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Trash2, Pencil, User, Calendar, Tag, Bug } from 'lucide-react';
import { useProjectStore } from '../store/projectStore';
import { useBugStore } from '../store/bugStore';
import { Header } from '../components/layout/Header';
import { Badge } from '../components/ui/Badge';
import { ImageLightbox } from '../components/ui/ImageLightbox';
import { formatDateTime } from '../utils/helpers';
import toast from 'react-hot-toast';

export function BugDetailPage() {
  const { projectId, bugId } = useParams<{ projectId: string; bugId: string }>();
  const { getProject } = useProjectStore();
  const { getBug, deleteBug, updateBugStatus } = useBugStore();
  const navigate = useNavigate();
  const project = getProject(projectId!);
  const bug = getBug(bugId!);

  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!project || !bug) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center text-slate-400">
        <Bug size={48} className="mx-auto mb-3 opacity-30"/>
        <p>Bug not found</p>
        <Link to={`/projects/${projectId}/bugs`} className="text-blue-500 text-sm mt-2 inline-block hover:underline">Back to bugs</Link>
      </div>
    </div>
  );

  const stage = project.lifecycleStages.find((s) => s.id === bug.status);
  const sev = project.severityLevels.find((s) => s.id === bug.severity);
  const pri = project.priorityLevels.find((p) => p.id === bug.priority);

  const handleDelete = () => {
    if (confirmDelete) {
      deleteBug(bug.id);
      toast.success('Bug deleted');
      navigate(`/projects/${projectId}/bugs`);
    } else {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
    }
  };

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-4">{title}</h3>
      {children}
    </div>
  );

  const InfoRow = ({ label, value }: { label: string; value?: string | React.ReactNode }) => (
    value ? (
      <div className="flex gap-3 py-2 border-b border-slate-100 last:border-0">
        <span className="text-sm text-slate-500 w-44 flex-shrink-0">{label}</span>
        <span className="text-sm text-slate-800 flex-1">{value}</span>
      </div>
    ) : null
  );

  return (
    <div className="flex-1">
      <Header />
      <div className="p-6 space-y-5 max-w-5xl">
        {/* Title bar */}
        <div className="flex items-start gap-4">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 mt-0.5"><ArrowLeft size={16}/></button>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-sm text-slate-400">{bug.id}</span>
              {sev && <Badge label={sev.name} color={sev.color} textColor={sev.textColor} size="sm"/>}
              {pri && <Badge label={pri.name} color={pri.color} textColor={pri.textColor} size="sm"/>}
              {stage && <Badge label={stage.name} color={stage.color + '22'} textColor={stage.color}/>}
            </div>
            <h1 className="text-2xl font-bold text-slate-800">{bug.title}</h1>
            <div className="flex items-center gap-4 mt-2 text-sm text-slate-400">
              <span className="flex items-center gap-1"><User size={13}/>{bug.reporter || 'Unknown'}</span>
              <span className="flex items-center gap-1"><Calendar size={13}/>{formatDateTime(bug.createdAt)}</span>
              {bug.module && <span className="flex items-center gap-1"><Tag size={13}/>{bug.module}</span>}
            </div>
          </div>
          <div className="flex gap-2">
            <select value={bug.status}
              onChange={(e) => { updateBugStatus(bug.id, e.target.value, 'QA Tester'); toast.success('Status updated'); }}
              className="text-sm border rounded-lg px-3 py-2 focus:outline-none"
              style={{ background: stage?.color + '15', borderColor: stage?.color + '44', color: stage?.color }}>
              {project.lifecycleStages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <Link
              to={`/projects/${projectId}/bugs/${bug.id}/edit`}
              className="px-3 py-2 text-sm rounded-lg border border-slate-300 text-slate-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 flex items-center gap-1.5 transition-colors"
            >
              <Pencil size={14}/> Edit
            </Link>
            <button onClick={handleDelete}
              className={`px-3 py-2 text-sm rounded-lg transition-colors flex items-center gap-1.5 ${confirmDelete ? 'bg-red-600 text-white' : 'border border-slate-300 text-slate-500 hover:border-red-400 hover:text-red-500'}`}>
              <Trash2 size={14}/>{confirmDelete ? 'Confirm?' : 'Delete'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-5">
          <div className="col-span-2 space-y-5">
            <Section title="Description">
              {bug.description && <p className="text-sm text-slate-700 mb-4">{bug.description}</p>}
              {bug.expectedBehavior && (
                <div className="mb-3 p-3 bg-green-50 rounded-xl border border-green-100">
                  <div className="text-xs font-semibold text-green-700 mb-1">Expected Behavior</div>
                  <p className="text-sm text-slate-700">{bug.expectedBehavior}</p>
                </div>
              )}
              {bug.actualBehavior && (
                <div className="p-3 bg-red-50 rounded-xl border border-red-100">
                  <div className="text-xs font-semibold text-red-700 mb-1">Actual Behavior</div>
                  <p className="text-sm text-slate-700">{bug.actualBehavior}</p>
                </div>
              )}
            </Section>

            {bug.stepsToReproduce?.length > 0 && (
              <Section title="Steps to Reproduce">
                <ol className="space-y-2">
                  {bug.stepsToReproduce.map((step, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center flex-shrink-0 font-bold">{i+1}</span>
                      <span className="text-sm text-slate-700 mt-0.5">{step}</span>
                    </li>
                  ))}
                </ol>
              </Section>
            )}

            {bug.screenshots?.length > 0 && (
              <Section title={'Screenshots (' + bug.screenshots.length + ')'} >
                <ImageLightbox screenshots={bug.screenshots} />
              </Section>
            )}

            {bug.aiDetails && (bug.aiDetails.inputSymptoms || bug.aiDetails.actualOutput) && (
              <Section title="AI / Diagnosis Details">
                <InfoRow label="Input Symptoms" value={bug.aiDetails.inputSymptoms} />
                <InfoRow label="Patient History" value={bug.aiDetails.patientHistory} />
                <InfoRow label="Expected Diagnosis" value={bug.aiDetails.expectedDiagnosis} />
                <InfoRow label="Actual AI Output" value={bug.aiDetails.actualOutput} />
                <InfoRow label="Confidence Score" value={bug.aiDetails.confidenceScore} />
                <InfoRow label="Response Time" value={bug.aiDetails.responseTime} />
                {bug.aiDetails.hallucinationNoted && (
                  <div className="mt-2 p-3 bg-orange-50 rounded-xl border border-orange-100">
                    <span className="text-xs font-bold text-orange-700">⚠ Hallucination Noted</span>
                    {bug.aiDetails.hallucinationDesc && <p className="text-sm text-slate-700 mt-1">{bug.aiDetails.hallucinationDesc}</p>}
                  </div>
                )}
              </Section>
            )}
          </div>

          <div className="space-y-5">
            <Section title="Details">
              <InfoRow label="Bug Type" value={bug.bugType} />
              <InfoRow label="Reproducibility" value={bug.reproducibility} />
              <InfoRow label="Assignee" value={bug.assignee} />
              {bug.workaround && <InfoRow label="Workaround" value={bug.workaround} />}
            </Section>

            <Section title="Environment">
              <InfoRow label="Browser" value={bug.environment?.browser} />
              <InfoRow label="OS" value={bug.environment?.os} />
              <InfoRow label="Device" value={bug.environment?.deviceType} />
              <InfoRow label="Resolution" value={bug.environment?.screenResolution} />
              <InfoRow label="User Role" value={bug.environment?.userRole} />
            </Section>

            <Section title="Status Timeline">
              <div className="space-y-3">
                {bug.statusHistory.map((h, i) => (
                  <div key={h.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-500 flex-shrink-0 mt-1" />
                      {i < bug.statusHistory.length - 1 && <div className="w-0.5 bg-slate-200 flex-1 mt-1" />}
                    </div>
                    <div className="pb-3">
                      <div className="text-xs font-semibold text-slate-700">
                        {h.from ? (h.from + ' -> ' + h.to) : h.to}
                      </div>
                      <div className="text-xs text-slate-400">{h.changedBy}{' · '}{formatDateTime(h.changedAt)}</div>
                      {h.note && <div className="text-xs text-slate-500 italic mt-0.5">{h.note}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          </div>
        </div>
      </div>
    </div>
  );
}
