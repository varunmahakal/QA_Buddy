import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Bug, Search, ChevronUp, ChevronDown, Eye } from 'lucide-react';
import { useProjectStore } from '../store/projectStore';
import { useBugStore } from '../store/bugStore';
import { Header } from '../components/layout/Header';
import { Badge } from '../components/ui/Badge';
import { exportBugsToExcel } from '../utils/exportExcel';
import { formatDate } from '../utils/helpers';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

type SortField = 'id' | 'title' | 'severity' | 'priority' | 'status' | 'createdAt';
type SortDir = 'asc' | 'desc';

export function BugsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { getProject } = useProjectStore();
  const { getBugsByProject, updateBugStatus } = useBugStore();
  const { user } = useAuth();
  const project = getProject(projectId!);
  const allBugs = getBugsByProject(projectId!);

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterModule, setFilterModule] = useState('');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);
  const PER_PAGE = 25;

  if (!project) return <div className="p-10 text-slate-500">Project not found.</div>;

  const modules = [...new Set(allBugs.map((b) => b.module).filter(Boolean))];

  const filtered = useMemo(() => {
    let list = allBugs;
    if (search) list = list.filter((b) => b.title.toLowerCase().includes(search.toLowerCase()) || b.id.toLowerCase().includes(search.toLowerCase()) || b.description.toLowerCase().includes(search.toLowerCase()));
    if (filterStatus) list = list.filter((b) => b.status === filterStatus);
    if (filterSeverity) list = list.filter((b) => b.severity === filterSeverity);
    if (filterPriority) list = list.filter((b) => b.priority === filterPriority);
    if (filterModule) list = list.filter((b) => b.module === filterModule);
    list = [...list].sort((a, b) => {
      let av: string = '', bv: string = '';
      if (sortField === 'id') { av = a.id; bv = b.id; }
      else if (sortField === 'title') { av = a.title; bv = b.title; }
      else if (sortField === 'createdAt') { av = a.createdAt; bv = b.createdAt; }
      else if (sortField === 'severity') {
        av = String(project.severityLevels.findIndex(s => s.id === a.severity));
        bv = String(project.severityLevels.findIndex(s => s.id === b.severity));
      }
      else if (sortField === 'status') { av = a.status; bv = b.status; }
      const res = av.localeCompare(bv);
      return sortDir === 'asc' ? res : -res;
    });
    return list;
  }, [allBugs, search, filterStatus, filterSeverity, filterPriority, filterModule, sortField, sortDir, project]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const pageBugs = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const sort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const SortIcon = ({ field }: { field: SortField }) => (
    sortField === field
      ? (sortDir === 'asc' ? <ChevronUp size={12}/> : <ChevronDown size={12}/>)
      : <ChevronDown size={12} className="opacity-30"/>
  );

  const handleExport = async () => {
    await exportBugsToExcel(filtered, project);
    toast.success(`Exported ${filtered.length} bugs to Excel`);
  };

  const statusCounts = project.lifecycleStages.map((s) => ({
    stage: s,
    count: allBugs.filter((b) => b.status === s.id).length,
  }));

  return (
    <div className="flex-1">
      <Header actionLabel="Report Bug" actionTo={`/projects/${projectId}/bugs/new`} onExport={handleExport} />
      <div className="p-6 space-y-4">
        {/* Status summary pills */}
        <div className="flex flex-wrap gap-2">
          <button onClick={() => { setFilterStatus(''); setPage(1); }}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${!filterStatus ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>
            All ({allBugs.length})
          </button>
          {statusCounts.map(({ stage, count }) => (
            <button key={stage.id} onClick={() => { setFilterStatus(stage.id); setPage(1); }}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${filterStatus === stage.id ? 'text-white' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
              style={filterStatus === stage.id ? { background: stage.color, borderColor: stage.color } : {}}>
              {stage.name} ({count})
            </button>
          ))}
        </div>

        {/* Filters bar */}
        <div className="bg-white rounded-xl border border-slate-200 p-3 flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-48">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search bugs\u2026" className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <select value={filterSeverity} onChange={(e) => { setFilterSeverity(e.target.value); setPage(1); }}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-600">
            <option value="">All Severities</option>
            {project.severityLevels.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select value={filterPriority} onChange={(e) => { setFilterPriority(e.target.value); setPage(1); }}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-600">
            <option value="">All Priorities</option>
            {project.priorityLevels.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          {modules.length > 0 && (
            <select value={filterModule} onChange={(e) => { setFilterModule(e.target.value); setPage(1); }}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-600">
              <option value="">All Modules</option>
              {modules.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          )}
          {(search || filterStatus || filterSeverity || filterPriority || filterModule) && (
            <button onClick={() => { setSearch(''); setFilterStatus(''); setFilterSeverity(''); setFilterPriority(''); setFilterModule(''); setPage(1); }}
              className="text-sm text-red-500 hover:text-red-700 px-2 py-1.5 rounded-lg hover:bg-red-50 transition-colors">
              Clear filters
            </button>
          )}
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {[
                    { label: 'Bug ID', field: 'id' as SortField },
                    { label: 'Title', field: 'title' as SortField },
                    { label: 'Module', field: null },
                    { label: 'Severity', field: 'severity' as SortField },
                    { label: 'Priority', field: 'priority' as SortField },
                    { label: 'Status', field: 'status' as SortField },
                    { label: 'Reporter', field: null },
                    { label: 'Created', field: 'createdAt' as SortField },
                    { label: '', field: null },
                  ].map(({ label, field }) => (
                    <th key={label} onClick={() => field && sort(field)}
                      className={`text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap ${field ? 'cursor-pointer hover:text-slate-800 select-none' : ''}`}>
                      <span className="flex items-center gap-1">{label}{field && <SortIcon field={field}/>}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pageBugs.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-12 text-slate-400">
                    <Bug size={36} className="mx-auto mb-2 opacity-30"/><p>No bugs found</p>
                  </td></tr>
                ) : pageBugs.map((bug) => {
                  const sev = project.severityLevels.find((s) => s.id === bug.severity);
                  const pri = project.priorityLevels.find((p) => p.id === bug.priority);
                  const stage = project.lifecycleStages.find((s) => s.id === bug.status);
                  return (
                    <tr key={bug.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-4 py-3 font-mono text-xs text-slate-500 whitespace-nowrap">{bug.id}</td>
                      <td className="px-4 py-3 max-w-xs">
                        <Link to={`/projects/${projectId}/bugs/${bug.id}`} className="font-medium text-slate-800 hover:text-blue-600 line-clamp-1">{bug.title}</Link>
                        {bug.bugType && <span className="text-xs text-slate-400">{bug.bugType}</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{bug.module}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{sev && <Badge label={sev.name} color={sev.color} textColor={sev.textColor} size="sm"/>}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{pri && <Badge label={pri.name} color={pri.color} textColor={pri.textColor} size="sm"/>}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <select value={bug.status}
                          onChange={(e) => { void updateBugStatus(bug.id, e.target.value, user?.email ?? 'QA Tester'); toast.success('Status updated'); }}
                          className="text-xs border rounded-full px-2 py-1 focus:outline-none cursor-pointer"
                          style={{ background: stage?.color + '22', color: stage?.color, borderColor: stage?.color + '44' }}>
                          {project.lifecycleStages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap text-xs">{bug.reporter}</td>
                      <td className="px-4 py-3 text-slate-400 whitespace-nowrap text-xs">{formatDate(bug.createdAt)}</td>
                      <td className="px-4 py-3">
                        <Link to={`/projects/${projectId}/bugs/${bug.id}`} className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors inline-flex">
                          <Eye size={15}/>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
              <span className="text-sm text-slate-500">Showing {((page-1)*PER_PAGE)+1}\u2013{Math.min(page*PER_PAGE, filtered.length)} of {filtered.length}</span>
              <div className="flex gap-1">
                {Array.from({length: totalPages}, (_, i) => i + 1).map((p) => (
                  <button key={p} onClick={() => setPage(p)}
                    className={`w-8 h-8 text-sm rounded-lg transition-colors ${p === page ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
