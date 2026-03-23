import { useParams, Link } from 'react-router-dom';
import { Bug, TestTube2, CheckCircle, AlertCircle, Plus, ArrowRight } from 'lucide-react';
import { useProjectStore } from '../store/projectStore';
import { useBugStore } from '../store/bugStore';
import { useTestCaseStore } from '../store/testCaseStore';
import { Header } from '../components/layout/Header';
import { StatCard } from '../components/ui/StatCard';
import { Badge } from '../components/ui/Badge';

export function ProjectDashboard() {
  const { projectId } = useParams<{ projectId: string }>();
  const { getProject } = useProjectStore();
  const { getBugsByProject } = useBugStore();
  const { getTestCasesByProject } = useTestCaseStore();

  const project = getProject(projectId!);
  if (!project) return <div className="p-10 text-slate-500">Project not found.</div>;

  const bugs = getBugsByProject(projectId!);
  const tcs = getTestCasesByProject(projectId!);

  const bugsByStatus = project.lifecycleStages.map((stage) => ({
    stage,
    count: bugs.filter((b) => b.status === stage.id).length,
  }));
  const bugsBySeverity = project.severityLevels.map((sev) => ({
    sev,
    count: bugs.filter((b) => b.severity === sev.id).length,
  }));

  const passedTCs = tcs.filter((t) => t.status === 'Pass').length;
  const failedTCs = tcs.filter((t) => t.status === 'Fail').length;
  const notTestedTCs = tcs.filter((t) => t.status === 'Not Tested').length;
  const passRate = tcs.length > 0 ? Math.round((passedTCs / tcs.length) * 100) : 0;

  const openBugs = bugs.filter((b) => !project.lifecycleStages.find((s) => s.id === b.status)?.isFinal);
  const recentBugs = [...bugs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);

  return (
    <div className="flex-1">
      <Header actionLabel="Report Bug" actionTo={`/projects/${projectId}/bugs/new`} />
      <div className="p-6 space-y-6">
        {/* Project Header */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-bold shadow-lg" style={{ background: project.color }}>
            {project.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{project.name}</h1>
            {project.description && <p className="text-slate-500 text-sm">{project.description}</p>}
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Bugs" value={bugs.length} icon={<Bug size={22}/>} color="#3b82f6" />
          <StatCard label="Open Bugs" value={openBugs.length} icon={<AlertCircle size={22}/>} color="#f59e0b" sub="Need attention" />
          <StatCard label="Test Cases" value={tcs.length} icon={<TestTube2 size={22}/>} color="#8b5cf6" />
          <StatCard label="Pass Rate" value={`${passRate}%`} icon={<CheckCircle size={22}/>} color="#10b981" sub={`${passedTCs}/${tcs.length} passed`} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800">Bugs by Status</h3>
              <Link to={`/projects/${projectId}/bugs`} className="text-sm text-blue-600 hover:underline flex items-center gap-1">View all <ArrowRight size={13}/></Link>
            </div>
            <div className="space-y-2">
              {bugsByStatus.map(({ stage, count }) => (
                <div key={stage.id} className="flex items-center gap-3">
                  <Badge label={stage.name} color={stage.color + "22"} textColor={stage.color} />
                  <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: bugs.length ? `${(count / bugs.length) * 100}%` : "0%", background: stage.color }} />
                  </div>
                  <span className="text-sm font-semibold text-slate-700 w-6 text-right">{count}</span>
                </div>
              ))}
              {bugs.length === 0 && <p className="text-sm text-slate-400 text-center py-4">No bugs reported yet</p>}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800">Bugs by Severity</h3>
            </div>
            <div className="space-y-2">
              {bugsBySeverity.map(({ sev, count }) => (
                <div key={sev.id} className="flex items-center gap-3">
                  <Badge label={sev.name} color={sev.color} textColor={sev.textColor} />
                  <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: bugs.length ? `${(count / bugs.length) * 100}%` : "0%", background: sev.textColor }} />
                  </div>
                  <span className="text-sm font-semibold text-slate-700 w-6 text-right">{count}</span>
                </div>
              ))}
              {bugs.length === 0 && <p className="text-sm text-slate-400 text-center py-4">No bugs reported yet</p>}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800">Test Execution</h3>
              <Link to={`/projects/${projectId}/test-cases`} className="text-sm text-blue-600 hover:underline flex items-center gap-1">View all <ArrowRight size={13}/></Link>
            </div>
            {tcs.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">No test cases yet</p>
            ) : (
              <div className="space-y-3">
                {[
                  { label: 'Pass', count: passedTCs, color: '#10b981' },
                  { label: 'Fail', count: failedTCs, color: '#ef4444' },
                  { label: 'Not Tested', count: notTestedTCs, color: '#94a3b8' },
                  { label: 'Blocked', count: tcs.filter(t => t.status === 'Blocked').length, color: '#f59e0b' },
                ].map(({ label, count, color }) => (
                  <div key={label} className="flex items-center gap-3">
                    <span className="text-sm text-slate-600 w-24">{label}</span>
                    <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${(count / tcs.length) * 100}%`, background: color }} />
                    </div>
                    <span className="text-sm font-semibold text-slate-700 w-6 text-right">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800">Recent Bugs</h3>
              <Link to={`/projects/${projectId}/bugs/new`} className="text-sm text-blue-600 hover:underline flex items-center gap-1"><Plus size={13}/>Report Bug</Link>
            </div>
            {recentBugs.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">No bugs reported yet</p>
            ) : (
              <div className="space-y-2">
                {recentBugs.map((bug) => {
                  const stage = project.lifecycleStages.find((s) => s.id === bug.status);
                  const sev = project.severityLevels.find((s) => s.id === bug.severity);
                  return (
                    <Link key={bug.id} to={`/projects/${projectId}/bugs/${bug.id}`}
                      className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition-colors group">
                      <span className="text-xs font-mono text-slate-400 w-24 flex-shrink-0">{bug.id}</span>
                      <span className="flex-1 text-sm text-slate-700 truncate group-hover:text-blue-600">{bug.title}</span>
                      {sev && <Badge label={sev.name} color={sev.color} textColor={sev.textColor} size="sm" />}
                      {stage && <Badge label={stage.name} color={stage.color + '22'} textColor={stage.color} size="sm" />}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
