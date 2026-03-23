import React from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { ChevronRight, Plus, Download } from 'lucide-react';
import { useProjectStore } from '../../store/projectStore';

interface HeaderProps {
  onExport?: () => void;
  exportLabel?: string;
  actionLabel?: string;
  actionTo?: string;
  onAction?: () => void;
}

export function Header({ onExport, exportLabel = 'Export Excel', actionLabel, actionTo, onAction }: HeaderProps) {
  const { projectId } = useParams<{ projectId: string }>();
  const location = useLocation();
  const { getProject } = useProjectStore();
  const project = projectId ? getProject(projectId) : undefined;

  const segments = location.pathname.split('/').filter(Boolean);
  const buildCrumbs = () => {
    const crumbs: { label: string; to: string }[] = [{ label: 'Projects', to: '/' }];
    if (project) crumbs.push({ label: project.name, to: `/projects/${projectId}` });
    if (segments.includes('bugs')) crumbs.push({ label: 'Bugs', to: `/projects/${projectId}/bugs` });
    if (segments.includes('test-cases') && !segments.includes('generate'))
      crumbs.push({ label: 'Test Cases', to: `/projects/${projectId}/test-cases` });
    if (segments.includes('generate'))
      crumbs.push({ label: 'TC Generator', to: `/projects/${projectId}/test-cases/generate` });
    if (segments.includes('settings'))
      crumbs.push({ label: 'Settings', to: `/projects/${projectId}/settings` });
    return crumbs;
  };
  const crumbs = buildCrumbs();

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center gap-1.5 text-sm">
        {crumbs.map((c, i) => (
          <React.Fragment key={c.to}>
            {i > 0 && <ChevronRight size={14} className="text-slate-300" />}
            {i === crumbs.length - 1
              ? <span className="font-semibold text-slate-800">{c.label}</span>
              : <Link to={c.to} className="text-slate-500 hover:text-blue-600 transition-colors">{c.label}</Link>
            }
          </React.Fragment>
        ))}
      </div>
      <div className="flex items-center gap-2">
        {onExport && (
          <button onClick={onExport} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-700 transition-colors">
            <Download size={14} />{exportLabel}
          </button>
        )}
        {actionLabel && (actionTo
          ? <Link to={actionTo} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <Plus size={14} />{actionLabel}
            </Link>
          : <button onClick={onAction} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <Plus size={14} />{actionLabel}
            </button>
        )}
      </div>
    </header>
  );
}
