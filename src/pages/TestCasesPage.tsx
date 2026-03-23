import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { TestTube2, Search, Trash2, Link2 } from 'lucide-react';
import { useProjectStore } from '../store/projectStore';
import { useTestCaseStore } from '../store/testCaseStore';
import { useBugStore } from '../store/bugStore';
import { Header } from '../components/layout/Header';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { exportTestCasesToExcel } from '../utils/exportExcel';
import toast from 'react-hot-toast';

const TC_STATUSES = ['Not Tested','Pass','Fail','Blocked','In Progress','Skipped'];
const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  'Not Tested': { bg: '#f1f5f9', text: '#64748b' },
  'Pass':       { bg: '#f0fdf4', text: '#16a34a' },
  'Fail':       { bg: '#fef2f2', text: '#dc2626' },
  'Blocked':    { bg: '#fff7ed', text: '#ea580c' },
  'In Progress':{ bg: '#eff6ff', text: '#2563eb' },
  'Skipped':    { bg: '#faf5ff', text: '#7c3aed' },
};

export function TestCasesPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { getProject } = useProjectStore();
  const { getTestCasesByProject, updateTestCase, deleteTestCase } = useTestCaseStore();
  const { getBugsByProject } = useBugStore();
  const project = getProject(projectId!);
  const allTCs = getTestCasesByProject(projectId!);
  const allBugs = getBugsByProject(projectId!);

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterModule, setFilterModule] = useState('');
  const [filterType, setFilterType] = useState('');
  const [editingRemarks, setEditingRemarks] = useState<string | null>(null);
  const [remarksValue, setRemarksValue] = useState('');
  const [linkBugTC, setLinkBugTC] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const PER_PAGE = 25;

  if (!project) return <div className="p-10 text-slate-500">Project not found.</div>;

  const modules = [...new Set(allTCs.map((t) => t.module).filter(Boolean))];
  const types = [...new Set(allTCs.map((t) => t.testType).filter(Boolean))];

  const filtered = useMemo(() => {
    let list = allTCs;
    if (search) list = list.filter((t) => t.title.toLowerCase().includes(search.toLowerCase()) || t.id.toLowerCase().includes(search.toLowerCase()));
    if (filterStatus) list = list.filter((t) => t.status === filterStatus);
    if (filterModule) list = list.filter((t) => t.module === filterModule);
    if (filterType) list = list.filter((t) => t.testType === filterType);
    return list;
  }, [allTCs, search, filterStatus, filterModule, filterType]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const pageTCs = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const handleStatusChange = (id: string, status: string) => {
    updateTestCase(id, { status: status as any });
    toast.success('Status updated');
  };

  const saveRemarks = (id: string) => {
    updateTestCase(id, { remarks: remarksValue });
    setEditingRemarks(null);
    toast.success('Remarks saved');
  };
  const handleDelete = (id: string) => {
    if (confirmDelete === id) {
      deleteTestCase(id);
      setConfirmDelete(null);
      toast.success('Test case deleted');
    } else {
      setConfirmDelete(id);
      setTimeout(() => setConfirmDelete(null), 3000);
    }
  };

  const handleExport = async () => {
    await exportTestCasesToExcel(filtered, project);
    toast.success('Exported to Excel');
  };


  return (
    <div className="flex-1">
      <Header
        actionLabel="Generate Test Cases"
        actionTo={`/projects/${projectId}/test-cases/generate`}
        onExport={handleExport}
      />
      <div className="p-6 space-y-4">
        {/* Summary pills */}
        <div className="flex flex-wrap gap-2">
          {TC_STATUSES.map((s) => {
            const c = STATUS_COLORS[s];
            const count = allTCs.filter((t) => t.status === s).length;
            return (
              <button key={s} onClick={() => { setFilterStatus(filterStatus === s ? '' : s); setPage(1); }}
                className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all border"
                style={filterStatus === s ? { background: c.text, color: '#fff', borderColor: c.text } : { background: c.bg, color: c.text, borderColor: c.bg }}>
                {s} ({count})
              </button>
            );
          })}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-slate-200 p-3 flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-48">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search test cases…"
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          {modules.length > 0 && (
            <select value={filterModule} onChange={(e) => { setFilterModule(e.target.value); setPage(1); }}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">All Modules</option>
              {modules.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          )}
          {types.length > 0 && (
            <select value={filterType} onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">All Types</option>
              {types.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          )}
          {(search || filterStatus || filterModule || filterType) && (
            <button onClick={() => { setSearch(''); setFilterStatus(''); setFilterModule(''); setFilterType(''); setPage(1); }}
              className="text-sm text-red-500 hover:text-red-700 px-2 py-1.5 rounded-lg hover:bg-red-50">Clear</button>
          )}
          <span className="text-sm text-slate-400 ml-auto">{filtered.length} test cases</span>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['TC ID','Title','Module','Test Type','Priority','Status','Remarks','Linked Bugs','Actions'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pageTCs.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-14 text-slate-400">
                    <TestTube2 size={36} className="mx-auto mb-2 opacity-30"/>
                    <p>No test cases found</p>
                    <p className="text-xs mt-1">Use the AI generator to create test cases</p>
                  </td></tr>
                ) : pageTCs.map((tc) => {
                  const sc = STATUS_COLORS[tc.status] || STATUS_COLORS['Not Tested'];
                  const pri = project.priorityLevels.find((p) => p.id === tc.priority);
                  const linkedBugs = allBugs.filter((b) => tc.linkedBugIds?.includes(b.id));
                  return (
                    <tr key={tc.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-slate-400 whitespace-nowrap">{tc.id}</td>
                      <td className="px-4 py-3 max-w-xs">
                        <div className="font-medium text-slate-800 line-clamp-1">{tc.title}</div>
                        {tc.testScenario && <div className="text-xs text-slate-400 line-clamp-1 mt-0.5">{tc.testScenario}</div>}
                      </td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap text-xs">{tc.module}</td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap text-xs">{tc.testType}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {pri && <Badge label={pri.name} color={pri.color} textColor={pri.textColor} size="sm"/>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <select value={tc.status} onChange={(e) => handleStatusChange(tc.id, e.target.value)}
                          className="text-xs border rounded-full px-2 py-1 focus:outline-none cursor-pointer font-medium"
                          style={{ background: sc.bg, color: sc.text, borderColor: sc.bg }}>
                          {TC_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-3 min-w-48 max-w-xs">
                        {editingRemarks === tc.id ? (
                          <div className="flex gap-1">
                            <input autoFocus value={remarksValue} onChange={(e) => setRemarksValue(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter') saveRemarks(tc.id); if (e.key === 'Escape') setEditingRemarks(null); }}
                              className="flex-1 text-xs border border-blue-400 rounded px-2 py-1 focus:outline-none" />
                            <button onClick={() => saveRemarks(tc.id)} className="text-xs bg-blue-600 text-white px-2 py-1 rounded">Save</button>
                          </div>
                        ) : (
                          <button onClick={() => { setEditingRemarks(tc.id); setRemarksValue(tc.remarks || ''); }}
                            className="text-xs text-slate-500 hover:text-blue-600 w-full text-left italic">
                            {tc.remarks || <span className="text-slate-300">Click to add remarks…</span>}
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {linkedBugs.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {linkedBugs.map((b) => <span key={b.id} className="text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded font-mono">{b.id}</span>)}
                          </div>
                        ) : (
                          <button onClick={() => setLinkBugTC(tc.id)} className="text-xs text-slate-400 hover:text-blue-500 flex items-center gap-1">
                            <Link2 size={11}/>Link bug
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => handleDelete(tc.id)}
                          className={`p-1.5 rounded transition-colors ${confirmDelete === tc.id ? 'bg-red-500 text-white' : 'text-slate-300 hover:text-red-500'}`}>
                          <Trash2 size={13}/>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
              <span className="text-sm text-slate-500">Showing {((page-1)*PER_PAGE)+1}–{Math.min(page*PER_PAGE, filtered.length)} of {filtered.length}</span>
              <div className="flex gap-1">
                {Array.from({length: totalPages}, (_, i) => i + 1).map((p) => (
                  <button key={p} onClick={() => setPage(p)}
                    className={`w-8 h-8 text-sm rounded-lg transition-colors ${p === page ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>{p}</button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Link Bug Modal */}
        <Modal isOpen={!!linkBugTC} onClose={() => setLinkBugTC(null)} title="Link Bug to Test Case" size="md">
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {allBugs.map((b) => {
              const tc = allTCs.find((t) => t.id === linkBugTC);
              const isLinked = tc?.linkedBugIds?.includes(b.id);
              return (
                <button key={b.id} onClick={() => {
                  if (linkBugTC) {
                    const tc = allTCs.find((t) => t.id === linkBugTC);
                    const current = tc?.linkedBugIds || [];
                    const updated = isLinked ? current.filter((id) => id !== b.id) : [...current, b.id];
                    updateTestCase(linkBugTC, { linkedBugIds: updated });
                  }
                }}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg text-left border transition-colors ${isLinked ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                  <span className="font-mono text-xs text-slate-400 w-24">{b.id}</span>
                  <span className="text-sm text-slate-700 flex-1">{b.title}</span>
                  {isLinked && <span className="text-xs text-blue-600 font-medium">Linked</span>}
                </button>
              );
            })}
            {allBugs.length === 0 && <p className="text-sm text-slate-400 text-center py-4">No bugs reported in this project</p>}
          </div>
          <div className="flex justify-end mt-4">
            <button onClick={() => setLinkBugTC(null)} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Done</button>
          </div>
        </Modal>
      </div>
    </div>
  );
}