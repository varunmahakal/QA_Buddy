import { useState, Fragment } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Wand2, Plus, Trash2, Save, ChevronDown, ChevronUp } from 'lucide-react';
import { useProjectStore } from '../store/projectStore';
import { useTestCaseStore } from '../store/testCaseStore';
import { Header } from '../components/layout/Header';
import { FileUpload } from '../components/ui/FileUpload';
import { generateTestCases } from '../utils/testCaseGenerator';
import type { TestCaseFormData, Screenshot, TestStep } from '../types';
import { generateId } from '../utils/helpers';
import toast from 'react-hot-toast';

const TEST_TYPES = ['Functional','Regression','Smoke','Sanity','Integration'];
const TC_STATUSES = ['Not Tested','Pass','Fail','Blocked','In Progress','Skipped'] as const;

const ALL_COLUMNS = [
  { id: 'title', label: 'Title', required: true },
  { id: 'module', label: 'Module', required: true },
  { id: 'testType', label: 'Test Type' },
  { id: 'testScenario', label: 'Test Scenario' },
  { id: 'preconditions', label: 'Preconditions' },
  { id: 'testSteps', label: 'Test Steps' },
  { id: 'testData', label: 'Test Data' },
  { id: 'expectedResult', label: 'Expected Result' },
  { id: 'actualResult', label: 'Actual Result' },
  { id: 'priority', label: 'Priority' },
  { id: 'status', label: 'Status', required: true },
  { id: 'remarks', label: 'Remarks' },
  { id: 'linkedBugIds', label: 'Linked Bugs' },
];

type TCDraft = TestCaseFormData & { _key: string };

export function TestCaseGeneratorPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { getProject } = useProjectStore();
  const { addTestCases } = useTestCaseStore();
  const navigate = useNavigate();
  const project = getProject(projectId!);

  const [featureName, setFeatureName] = useState('');
  const [module, setModule] = useState('');
  const [testType, setTestType] = useState('Functional');
  const [featureDescription, setFeatureDescription] = useState('');
  const [userFlowSteps, setUserFlowSteps] = useState('');
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [selectedColumns, setSelectedColumns] = useState<string[]>(['title','module','testScenario','testSteps','expectedResult','actualResult','status','remarks']);
  const [count, setCount] = useState(5);
  const [priority, setPriority] = useState('');
  const [generated, setGenerated] = useState<TCDraft[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  if (!project) return <div className="p-10 text-slate-500">Project not found.</div>;

  const toggleColumn = (id: string, required?: boolean) => {
    if (required) return;
    setSelectedColumns((prev) => prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]);
  };

  const handleGenerate = () => {
    if (!featureName.trim()) { toast.error('Feature name is required'); return; }
    setIsGenerating(true);
    setTimeout(() => {
      const cases = generateTestCases({
        featureName: featureName.trim(),
        module: module || featureName,
        testType,
        featureDescription,
        userFlowSteps,
        count,
        priority: priority || project.priorityLevels[2]?.id || 'p3',
      });
      const drafts: TCDraft[] = cases.map((c) => ({ ...c, _key: generateId() }));
      setGenerated(drafts);
      setIsGenerating(false);
      toast.success(`Generated ${cases.length} test cases`);
    }, 800);
  };

  const updateDraft = (key: string, field: keyof TestCaseFormData, value: any) => {
    setGenerated((prev) => prev.map((d) => d._key === key ? { ...d, [field]: value } : d));
  };

  const removeDraft = (key: string) => {
    setGenerated((prev) => prev.filter((d) => d._key !== key));
  };

  const addDraft = () => {
    const draft: TCDraft = {
      _key: generateId(),
      title: 'New Test Case',
      module: module || '',
      testType,
      testScenario: '',
      preconditions: '',
      testSteps: [],
      testData: '',
      expectedResult: '',
      actualResult: '',
      priority: priority || project.priorityLevels[2]?.id || 'p3',
      status: 'Not Tested',
      remarks: '',
      screenshots: [],
      linkedBugIds: [],
      tags: [],
    };
    setGenerated((prev) => [...prev, draft]);
  };

  const handleSave = async () => {
    if (generated.length === 0) { toast.error('No test cases to save'); return; }
    await addTestCases(projectId!, generated.map(({ _key, ...tc }) => tc));
    toast.success(`Saved ${generated.length} test cases!`);
    navigate(`/projects/${projectId}/test-cases`);
  };

  const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
    'Not Tested': { bg: '#f1f5f9', text: '#64748b' },
    'Pass':       { bg: '#f0fdf4', text: '#16a34a' },
    'Fail':       { bg: '#fef2f2', text: '#dc2626' },
    'Blocked':    { bg: '#fff7ed', text: '#ea580c' },
    'In Progress':{ bg: '#eff6ff', text: '#2563eb' },
    'Skipped':    { bg: '#faf5ff', text: '#7c3aed' },
  };

  return (
    <div className="flex-1">
      <Header />
      <div className="p-6 space-y-6 max-w-6xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Wand2 size={20} className="text-blue-600"/>AI Test Case Generator</h2>
            <p className="text-sm text-slate-500 mt-0.5">Describe your feature and user flow — the generator will create structured test cases automatically.</p>
          </div>
          {generated.length > 0 && (
            <button onClick={() => void handleSave()} className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 font-medium">
              <Save size={16}/> Save {generated.length} Test Cases
            </button>
          )}
        </div>

        {/* Input Form */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
          <h3 className="font-semibold text-slate-700 text-sm uppercase tracking-wide">1. Feature Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Feature Name *</label>
              <input value={featureName} onChange={(e) => setFeatureName(e.target.value)} placeholder="e.g. Patient Login, Diagnosis Engine"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Module</label>
              <input value={module} onChange={(e) => setModule(e.target.value)} placeholder="e.g. Auth, AI Engine, Records"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Test Type</label>
              <select value={testType} onChange={(e) => setTestType(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                {TEST_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                <option value="">Select priority</option>
                {project.priorityLevels.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Feature Description</label>
            <textarea value={featureDescription} onChange={(e) => setFeatureDescription(e.target.value)} rows={2}
              placeholder="Briefly describe what this feature does…"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>

          <div className="pt-2 border-t border-slate-100">
            <h3 className="font-semibold text-slate-700 text-sm uppercase tracking-wide mb-3">2. User Flow</h3>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">User Flow Steps</label>
              <textarea value={userFlowSteps} onChange={(e) => setUserFlowSteps(e.target.value)} rows={5}
                placeholder={"1. User navigates to login page\n2. User enters credentials\n3. User clicks Login button\n4. System validates and redirects to dashboard"}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono" />
              <p className="text-xs text-slate-400 mt-1">Enter steps one per line. These will be used to generate test steps.</p>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <h3 className="font-semibold text-slate-700 text-sm uppercase tracking-wide mb-3">3. UI Flow Screenshots (Optional)</h3>
            <FileUpload screenshots={screenshots} onChange={setScreenshots} />
            {screenshots.length > 0 && <p className="text-xs text-slate-400 mt-2">{screenshots.length} screenshot(s) uploaded — they will be attached to generated test cases.</p>}
          </div>

          <div className="pt-2 border-t border-slate-100">
            <h3 className="font-semibold text-slate-700 text-sm uppercase tracking-wide mb-3">4. Column Selection</h3>
            <div className="flex flex-wrap gap-2">
              {ALL_COLUMNS.map((col) => (
                <button key={col.id} type="button" onClick={() => toggleColumn(col.id, col.required)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all border ${
                    selectedColumns.includes(col.id)
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-600 border-slate-300 hover:border-blue-400'
                  } ${col.required ? 'opacity-80 cursor-default' : 'cursor-pointer'}`}>
                  {col.label}{col.required && ' *'}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-2">* Required columns cannot be deselected. Selected columns will appear in the generated table.</p>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Number of Test Cases</label>
              <div className="flex items-center gap-2">
                <input type="range" min={3} max={30} value={count} onChange={(e) => setCount(Number(e.target.value))} className="w-32 accent-blue-600" />
                <span className="text-sm font-bold text-blue-600 w-6">{count}</span>
              </div>
            </div>
            <button onClick={handleGenerate} disabled={isGenerating}
              className="ml-auto flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-semibold text-sm disabled:opacity-60 disabled:cursor-not-allowed transition-colors">
              <Wand2 size={16}/>{isGenerating ? 'Generating…' : 'Generate Test Cases'}
            </button>
          </div>
        </div>

        {/* Generated Table */}
        {generated.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <h3 className="font-semibold text-slate-800">{generated.length} Test Cases Generated</h3>
              <div className="flex gap-2">
                <button onClick={addDraft} className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 px-3 py-1.5 rounded-lg hover:bg-blue-50 border border-blue-200">
                  <Plus size={14}/> Add Row
                </button>
                <button onClick={() => void handleSave()} className="flex items-center gap-2 px-4 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium">
                  <Save size={14}/> Save All
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-400 uppercase w-8">#</th>
                    {ALL_COLUMNS.filter((c) => selectedColumns.includes(c.id)).map((c) => (
                      <th key={c.id} className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{c.label}</th>
                    ))}
                    <th className="px-3 py-2 w-16"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {generated.map((draft, idx) => {
                    const sc = STATUS_COLORS[draft.status] || STATUS_COLORS['Not Tested'];
                    const pri = project.priorityLevels.find((p) => p.id === draft.priority);
                    const isExpanded = expandedRow === draft._key;
                    return (
                      <Fragment key={draft._key}>
                        <tr className="hover:bg-slate-50 transition-colors">
                          <td className="px-3 py-2 text-xs text-slate-400 font-bold">{idx + 1}</td>
                          {selectedColumns.includes('title') && (
                            <td className="px-3 py-2 min-w-52">
                              <input value={draft.title} onChange={(e) => updateDraft(draft._key, 'title', e.target.value)}
                                className="w-full text-sm border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-400 rounded px-1 font-medium" />
                            </td>
                          )}
                          {selectedColumns.includes('module') && (
                            <td className="px-3 py-2 whitespace-nowrap">
                              <input value={draft.module} onChange={(e) => updateDraft(draft._key, 'module', e.target.value)}
                                className="w-full text-xs border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-400 rounded px-1 text-slate-500" />
                            </td>
                          )}
                          {selectedColumns.includes('testType') && (
                            <td className="px-3 py-2 whitespace-nowrap">
                              <select value={draft.testType} onChange={(e) => updateDraft(draft._key, 'testType', e.target.value)}
                                className="text-xs border-0 bg-transparent focus:outline-none text-slate-500 cursor-pointer">
                                {TEST_TYPES.map((t) => <option key={t}>{t}</option>)}
                              </select>
                            </td>
                          )}
                          {selectedColumns.includes('testScenario') && (
                            <td className="px-3 py-2 max-w-xs">
                              <input value={draft.testScenario} onChange={(e) => updateDraft(draft._key, 'testScenario', e.target.value)}
                                className="w-full text-xs border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-400 rounded px-1 text-slate-600" />
                            </td>
                          )}
                          {selectedColumns.includes('preconditions') && (
                            <td className="px-3 py-2 max-w-xs">
                              <input value={draft.preconditions} onChange={(e) => updateDraft(draft._key, 'preconditions', e.target.value)}
                                className="w-full text-xs border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-400 rounded px-1 text-slate-500" />
                            </td>
                          )}
                          {selectedColumns.includes('testSteps') && (
                            <td className="px-3 py-2">
                              <button onClick={() => setExpandedRow(isExpanded ? null : draft._key)}
                                className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1 whitespace-nowrap">
                                {draft.testSteps.length} steps {isExpanded ? <ChevronUp size={11}/> : <ChevronDown size={11}/>}
                              </button>
                            </td>
                          )}
                          {selectedColumns.includes('testData') && (
                            <td className="px-3 py-2 max-w-xs">
                              <input value={draft.testData} onChange={(e) => updateDraft(draft._key, 'testData', e.target.value)}
                                className="w-full text-xs border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-400 rounded px-1 text-slate-500" />
                            </td>
                          )}
                          {selectedColumns.includes('expectedResult') && (
                            <td className="px-3 py-2 max-w-xs">
                              <input value={draft.expectedResult} onChange={(e) => updateDraft(draft._key, 'expectedResult', e.target.value)}
                                className="w-full text-xs border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-400 rounded px-1 text-slate-600" />
                            </td>
                          )}
                          {selectedColumns.includes('actualResult') && (
                            <td className="px-3 py-2 max-w-xs">
                              <input value={draft.actualResult} onChange={(e) => updateDraft(draft._key, 'actualResult', e.target.value)}
                                className="w-full text-xs border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-400 rounded px-1 text-slate-400 italic" placeholder="—" />
                            </td>
                          )}
                          {selectedColumns.includes('priority') && (
                            <td className="px-3 py-2 whitespace-nowrap">
                              <select value={draft.priority} onChange={(e) => updateDraft(draft._key, 'priority', e.target.value)}
                                className="text-xs focus:outline-none cursor-pointer rounded px-1 py-0.5"
                                style={{ background: pri?.color, color: pri?.textColor }}>
                                {project.priorityLevels.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                              </select>
                            </td>
                          )}
                          {selectedColumns.includes('status') && (
                            <td className="px-3 py-2 whitespace-nowrap">
                              <select value={draft.status} onChange={(e) => updateDraft(draft._key, 'status', e.target.value as any)}
                                className="text-xs rounded-full px-2 py-1 focus:outline-none cursor-pointer font-medium border"
                                style={{ background: sc.bg, color: sc.text, borderColor: sc.bg }}>
                                {TC_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                              </select>
                            </td>
                          )}
                          {selectedColumns.includes('remarks') && (
                            <td className="px-3 py-2 min-w-40">
                              <input value={draft.remarks} onChange={(e) => updateDraft(draft._key, 'remarks', e.target.value)}
                                placeholder="Add remarks…"
                                className="w-full text-xs border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-400 rounded px-1 text-slate-500 italic" />
                            </td>
                          )}
                          {selectedColumns.includes('linkedBugIds') && (
                            <td className="px-3 py-2 text-xs text-slate-400 whitespace-nowrap">—</td>
                          )}
                          <td className="px-3 py-2">
                            <button onClick={() => removeDraft(draft._key)} className="p-1 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={13}/></button>
                          </td>
                        </tr>
                        {isExpanded && selectedColumns.includes('testSteps') && (
                          <tr className="bg-blue-50/50">
                            <td colSpan={selectedColumns.length + 2} className="px-6 py-3">
                              <div className="space-y-1.5">
                                {draft.testSteps.map((step, si) => (
                                  <div key={step.id} className="flex gap-3 items-start">
                                    <span className="text-xs font-bold text-blue-400 mt-1 w-5">{si + 1}.</span>
                                    <input value={step.action}
                                      onChange={(e) => {
                                        const updated = draft.testSteps.map((s, i) => i === si ? { ...s, action: e.target.value } : s);
                                        updateDraft(draft._key, 'testSteps', updated);
                                      }}
                                      className="flex-1 text-xs bg-white border border-blue-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400" />
                                    <input value={step.expectedOutcome}
                                      onChange={(e) => {
                                        const updated = draft.testSteps.map((s, i) => i === si ? { ...s, expectedOutcome: e.target.value } : s);
                                        updateDraft(draft._key, 'testSteps', updated);
                                      }}
                                      placeholder="Expected outcome…"
                                      className="flex-1 text-xs bg-white border border-blue-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400 text-slate-400" />
                                    <button onClick={() => {
                                      updateDraft(draft._key, 'testSteps', draft.testSteps.filter((_, i) => i !== si));
                                    }} className="text-slate-300 hover:text-red-500 mt-0.5"><Trash2 size={12}/></button>
                                  </div>
                                ))}
                                <button onClick={() => {
                                  const newStep: TestStep = { id: generateId(), stepNumber: draft.testSteps.length + 1, action: '', expectedOutcome: '' };
                                  updateDraft(draft._key, 'testSteps', [...draft.testSteps, newStep]);
                                }} className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 mt-1">
                                  <Plus size={12}/> Add step
                                </button>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}