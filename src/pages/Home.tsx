import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Bug, TestTube2, Trash2, Calendar, ChevronRight } from 'lucide-react';
import { useProjectStore } from '../store/projectStore';
import { useBugStore } from '../store/bugStore';
import { useTestCaseStore } from '../store/testCaseStore';
import { Modal } from '../components/ui/Modal';
import { formatDate } from '../utils/helpers';
import toast from 'react-hot-toast';

export function Home() {
  const { projects, addProject, deleteProject } = useProjectStore();
  const { getBugsByProject } = useBugStore();
  const { getTestCasesByProject } = useTestCaseStore();
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#2563eb');
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const p = await addProject({ name: name.trim(), description, color });
    toast.success('Project created!');
    setShowCreate(false);
    setName(''); setDescription(''); setColor('#2563eb');
    navigate(`/projects/${p.id}`);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    if (deleting === id) {
      await deleteProject(id);
      toast.success('Project deleted');
      setDeleting(null);
    } else {
      setDeleting(id);
      setTimeout(() => setDeleting(null), 3000);
    }
  };

  const COLORS = ['#2563eb','#7c3aed','#db2777','#ea580c','#16a34a','#0891b2','#374151'];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero */}
      <div className="bg-gradient-to-br from-slate-900 to-blue-900 px-10 py-14 text-white">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center">
            <Bug size={20} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold">QA Buddy</h1>
        </div>
        <p className="text-slate-300 mb-6 max-w-xl">Manage bug reports, test cases, and project lifecycle for your software testing workflows.</p>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-5 py-2.5 bg-blue-500 hover:bg-blue-400 rounded-xl text-white font-medium transition-colors">
          <Plus size={18} /> New Project
        </button>
      </div>

      {/* Projects */}
      <div className="px-10 py-8">
        <h2 className="text-xl font-bold text-slate-800 mb-5">Your Projects ({projects.length})</h2>
        {projects.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Bug size={48} className="mx-auto mb-3 opacity-30" />
            <p>No projects yet. Create one to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {projects.map((p) => {
              const bugs = getBugsByProject(p.id);
              const tcs = getTestCasesByProject(p.id);
              const openBugs = bugs.filter((b) => {
                const stage = p.lifecycleStages.find((s) => s.id === b.status);
                return !stage?.isFinal;
              }).length;
              const passedTCs = tcs.filter((t) => t.status === 'Pass').length;
              return (
                <Link key={p.id} to={`/projects/${p.id}`} className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md hover:border-blue-300 transition-all group">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold" style={{ background: p.color }}>
                        {p.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{p.name}</h3>
                        <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5"><Calendar size={11}/>{formatDate(p.createdAt)}</p>
                      </div>
                    </div>
                    <button onClick={(e) => void handleDelete(p.id, e)} className={`p-1.5 rounded-lg transition-colors ${deleting === p.id ? 'bg-red-500 text-white' : 'text-slate-300 hover:text-red-500 hover:bg-red-50'}`} title={deleting === p.id ? 'Click again to confirm' : 'Delete project'}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                  {p.description && <p className="text-sm text-slate-500 mb-4 line-clamp-2">{p.description}</p>}
                  <div className="flex gap-4 pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-1.5 text-sm">
                      <Bug size={14} className="text-orange-500" />
                      <span className="font-semibold text-slate-700">{bugs.length}</span>
                      <span className="text-slate-400">bugs</span>
                      {openBugs > 0 && <span className="text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full">{openBugs} open</span>}
                    </div>
                    <div className="flex items-center gap-1.5 text-sm">
                      <TestTube2 size={14} className="text-purple-500" />
                      <span className="font-semibold text-slate-700">{tcs.length}</span>
                      <span className="text-slate-400">tests</span>
                      {tcs.length > 0 && <span className="text-xs bg-green-100 text-green-600 px-1.5 py-0.5 rounded-full">{passedTCs} pass</span>}
                    </div>
                    <ChevronRight size={16} className="ml-auto text-slate-300 group-hover:text-blue-400 transition-colors" />
                  </div>
                </Link>
              );
            })}
            <button onClick={() => setShowCreate(true)} className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-5 flex flex-col items-center justify-center gap-2 text-slate-400 hover:border-blue-400 hover:text-blue-500 transition-all min-h-[160px]">
              <Plus size={28} />
              <span className="font-medium">New Project</span>
            </button>
          </div>
        )}
      </div>

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create New Project">
        <form onSubmit={(e) => void handleCreate(e)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Project Name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. DrBuddy v2.0"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Brief description…"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Project Color</label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map((c) => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full transition-all ${color === c ? 'ring-2 ring-offset-2 ring-blue-500 scale-110' : ''}`}
                  style={{ background: c }} />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button>
            <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Create Project</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
