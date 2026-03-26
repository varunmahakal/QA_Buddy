import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, Trash2, Check } from 'lucide-react';
import { useProjectStore } from '../store/projectStore';
import { Header } from '../components/layout/Header';
import type { LifecycleStage, SeverityLevel, PriorityLevel } from '../types';
import { generateId } from '../utils/helpers';
import toast from 'react-hot-toast';

const COLOR_OPTIONS = ['#3b82f6','#f59e0b','#8b5cf6','#ef4444','#10b981','#6b7280','#ec4899','#14b8a6','#f97316','#6366f1'];

export function ProjectSettings() {
  const { projectId } = useParams<{ projectId: string }>();
  const { getProject, updateProject, updateLifecycleStages, updateSeverityLevels, updatePriorityLevels } = useProjectStore();
  const project = getProject(projectId!);
  if (!project) return <div className="p-10 text-slate-500">Project not found.</div>;

  const [projectName, setProjectName] = useState(project.name);
  const [projectDesc, setProjectDesc] = useState(project.description);
  const [projectColor, setProjectColor] = useState(project.color);

  const [stages, setStages] = useState<LifecycleStage[]>(project.lifecycleStages);
  const [newStageName, setNewStageName] = useState('');
  const [newStageColor, setNewStageColor] = useState('#3b82f6');

  const [severities, setSeverities] = useState<SeverityLevel[]>(project.severityLevels);
  const [newSevName, setNewSevName] = useState('');
  const [newSevColor, setNewSevColor] = useState('#fef2f2');
  const [newSevText, setNewSevText] = useState('#dc2626');

  const [priorities, setPriorities] = useState<PriorityLevel[]>(project.priorityLevels);
  const [newPriName, setNewPriName] = useState('');
  const [newPriColor, setNewPriColor] = useState('#eff6ff');
  const [newPriText, setNewPriText] = useState('#2563eb');

  const saveProject = async () => {
    await updateProject(projectId!, { name: projectName, description: projectDesc, color: projectColor });
    toast.success('Project info saved!');
  };

  const addStage = async () => {
    if (!newStageName.trim()) return;
    const stage: LifecycleStage = { id: generateId(), name: newStageName.trim(), color: newStageColor, order: stages.length };
    const updated = [...stages, stage];
    setStages(updated);
    await updateLifecycleStages(projectId!, updated);
    setNewStageName('');
    toast.success('Stage added');
  };

  const removeStage = async (id: string) => {
    const updated = stages.filter((s) => s.id !== id);
    setStages(updated);
    await updateLifecycleStages(projectId!, updated);
  };

  const toggleDefault = async (id: string) => {
    const updated = stages.map((s) => ({ ...s, isDefault: s.id === id }));
    setStages(updated);
    await updateLifecycleStages(projectId!, updated);
  };

  const toggleFinal = async (id: string) => {
    const updated = stages.map((s) => ({ ...s, isFinal: s.id === id ? !s.isFinal : s.isFinal }));
    setStages(updated);
    await updateLifecycleStages(projectId!, updated);
  };

  const addSeverity = async () => {
    if (!newSevName.trim()) return;
    const sev: SeverityLevel = { id: generateId(), name: newSevName.trim(), color: newSevColor, textColor: newSevText };
    const updated = [...severities, sev];
    setSeverities(updated);
    await updateSeverityLevels(projectId!, updated);
    setNewSevName('');
    toast.success('Severity added');
  };

  const removeSeverity = async (id: string) => {
    const updated = severities.filter((s) => s.id !== id);
    setSeverities(updated);
    await updateSeverityLevels(projectId!, updated);
  };

  const addPriority = async () => {
    if (!newPriName.trim()) return;
    const pri: PriorityLevel = { id: generateId(), name: newPriName.trim(), color: newPriColor, textColor: newPriText };
    const updated = [...priorities, pri];
    setPriorities(updated);
    await updatePriorityLevels(projectId!, updated);
    setNewPriName('');
    toast.success('Priority added');
  };

  const removePriority = async (id: string) => {
    const updated = priorities.filter((p) => p.id !== id);
    setPriorities(updated);
    await updatePriorityLevels(projectId!, updated);
  };

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <h3 className="text-base font-bold text-slate-800 mb-5">{title}</h3>
      {children}
    </div>
  );

  return (
    <div className="flex-1">
      <Header />
      <div className="p-6 space-y-6 max-w-3xl">
        {/* Project Info */}
        <Section title="Project Information">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Project Name</label>
              <input value={projectName} onChange={(e) => setProjectName(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <textarea value={projectDesc} onChange={(e) => setProjectDesc(e.target.value)} rows={2}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Project Color</label>
              <div className="flex gap-2 flex-wrap">
                {COLOR_OPTIONS.map((c) => (
                  <button key={c} type="button" onClick={() => setProjectColor(c)}
                    className={`w-7 h-7 rounded-full transition-all flex items-center justify-center ${projectColor === c ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : ''}`}
                    style={{ background: c }}>
                    {projectColor === c && <Check size={12} className="text-white" />}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={() => void saveProject()} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">Save Changes</button>
          </div>
        </Section>
        {/* Bug Lifecycle */}
        <Section title="Bug Lifecycle Stages">
          <div className="space-y-2 mb-4">
            {stages.map((stage) => (
              <div key={stage.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: stage.color }} />
                <span className="flex-1 text-sm font-medium text-slate-700">{stage.name}</span>
                {stage.isDefault && <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">Default</span>}
                {stage.isFinal && <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full">Final</span>}
                <button onClick={() => toggleDefault(stage.id)} title="Set as default" className="text-xs text-slate-400 hover:text-blue-600 px-2 py-1 rounded hover:bg-blue-50 transition-colors">Default</button>
                <button onClick={() => toggleFinal(stage.id)} title="Toggle final" className="text-xs text-slate-400 hover:text-green-600 px-2 py-1 rounded hover:bg-green-50 transition-colors">Final</button>
                <button onClick={() => removeStage(stage.id)} className="p-1 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={14}/></button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={newStageName} onChange={(e) => setNewStageName(e.target.value)} placeholder="New stage name..."
              className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyDown={(e) => e.key === 'Enter' && addStage()} />
            <div className="flex gap-1.5">
              {COLOR_OPTIONS.slice(0, 5).map((c) => (
                <button key={c} type="button" onClick={() => setNewStageColor(c)}
                  className={`w-8 h-8 rounded-full transition-all ${newStageColor === c ? 'ring-2 ring-offset-1 ring-slate-400' : ''}`}
                  style={{ background: c }} />
              ))}
            </div>
            <button onClick={addStage} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 flex items-center gap-1"><Plus size={14}/>Add</button>
          </div>
        </Section>
        {/* Severity */}
        <Section title="Severity Levels">
          <div className="space-y-2 mb-4">
            {severities.map((sev) => (
              <div key={sev.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: sev.color }}>
                <span className="flex-1 text-sm font-semibold" style={{ color: sev.textColor }}>{sev.name}</span>
                <button onClick={() => removeSeverity(sev.id)} className="p-1 text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={14}/></button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={newSevName} onChange={(e) => setNewSevName(e.target.value)} placeholder="Severity name..."
              className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyDown={(e) => e.key === 'Enter' && addSeverity()} />
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span>BG:</span>
              <input type="color" value={newSevColor} onChange={(e) => setNewSevColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0" />
              <span>Text:</span>
              <input type="color" value={newSevText} onChange={(e) => setNewSevText(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0" />
            </div>
            <button onClick={addSeverity} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 flex items-center gap-1"><Plus size={14}/>Add</button>
          </div>
        </Section>
        {/* Priority */}
        <Section title="Priority Levels">
          <div className="space-y-2 mb-4">
            {priorities.map((pri) => (
              <div key={pri.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: pri.color }}>
                <span className="flex-1 text-sm font-semibold" style={{ color: pri.textColor }}>{pri.name}</span>
                <button onClick={() => removePriority(pri.id)} className="p-1 text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={14}/></button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={newPriName} onChange={(e) => setNewPriName(e.target.value)} placeholder="Priority name..."
              className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyDown={(e) => e.key === 'Enter' && addPriority()} />
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span>BG:</span>
              <input type="color" value={newPriColor} onChange={(e) => setNewPriColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0" />
              <span>Text:</span>
              <input type="color" value={newPriText} onChange={(e) => setNewPriText(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0" />
            </div>
            <button onClick={addPriority} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 flex items-center gap-1"><Plus size={14}/>Add</button>
          </div>
        </Section>
      </div>
    </div>
  );
}
