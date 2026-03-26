import { Outlet, useParams } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useProjectData } from '../../hooks/useProjectData';

export function Layout() {
  const { projectId } = useParams<{ projectId: string }>();
  useProjectData(projectId ?? '');

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 ml-60 flex flex-col min-h-screen">
        <Outlet />
      </div>
    </div>
  );
}
