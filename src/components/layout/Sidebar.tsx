import { NavLink, useParams } from 'react-router-dom';
import { Bug, TestTube2, Settings, LayoutDashboard, Home, Wand2, LogOut, Video } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export function Sidebar() {
  const { projectId } = useParams<{ projectId: string }>();
  const { user, signOut } = useAuth();

  return (
    <aside className="w-60 bg-slate-900 min-h-screen flex flex-col fixed left-0 top-0 z-10">
      {/* Logo */}
      <div className="p-5 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
            <Bug size={18} className="text-white" />
          </div>
          <div>
            <div className="text-white font-bold text-sm leading-tight">QA Buddy</div>
            <div className="text-slate-400 text-xs">Testing Suite</div>
          </div>
        </div>
      </div>

      {/* Global Nav */}
      <nav className="p-3 space-y-0.5">
        <NavLink to="/" end className={({ isActive }) =>
          `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
            isActive ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}>
          <Home size={16} /><span>All Projects</span>
        </NavLink>
      </nav>

      {/* Project-specific nav */}
      {projectId && (
        <>
          <div className="px-4 pt-4 pb-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Project</span>
          </div>
          <nav className="p-3 space-y-0.5 flex-1">
            {[
              { to: `/projects/${projectId}`, icon: <LayoutDashboard size={16}/>, label: 'Dashboard', end: true },
              { to: `/projects/${projectId}/bugs`, icon: <Bug size={16}/>, label: 'Bugs', end: false },
              { to: `/projects/${projectId}/test-cases`, icon: <TestTube2 size={16}/>, label: 'Test Cases', end: false },
              { to: `/projects/${projectId}/test-cases/generate`, icon: <Wand2 size={16}/>, label: 'TC Generator', end: false },
              { to: `/projects/${projectId}/test-cases/record`, icon: <Video size={16}/>, label: 'Test Recorder', end: false },
              { to: `/projects/${projectId}/settings`, icon: <Settings size={16}/>, label: 'Settings', end: false },
            ].map(({ to, icon, label, end }) => (
              <NavLink key={to} to={to} end={end} className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}>
                {icon}<span>{label}</span>
              </NavLink>
            ))}
          </nav>
        </>
      )}

      {!projectId && <div className="flex-1" />}

      {/* User + Sign Out */}
      <div className="p-4 border-t border-slate-700 space-y-2">
        {user && (
          <p className="text-xs text-slate-400 truncate px-1" title={user.email}>{user.email}</p>
        )}
        <button
          onClick={() => void signOut()}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <LogOut size={15} />
          <span>Sign Out</span>
        </button>
        <p className="text-xs text-slate-600 text-center pt-1">QA Buddy v1.0</p>
      </div>
    </aside>
  );
}
