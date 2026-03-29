import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { Layout } from './components/layout/Layout';
import { LoginPage } from './pages/LoginPage';
import { Home } from './pages/Home';
import { ProjectDashboard } from './pages/ProjectDashboard';
import { ProjectSettings } from './pages/ProjectSettings';
import { BugsPage } from './pages/BugsPage';
import { NewBugPage } from './pages/NewBugPage';
import { BugDetailPage } from './pages/BugDetailPage';
import { EditBugPage } from './pages/EditBugPage';
import { TestCasesPage } from './pages/TestCasesPage';
import { TestCaseGeneratorPage } from './pages/TestCaseGeneratorPage';
import { TestCaseRecorderPage } from './pages/TestCaseRecorderPage';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            style: { fontSize: '13px', borderRadius: '10px', boxShadow: '0 4px 20px rgba(0,0,0,0.12)' },
            success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
          }}
        />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Home />} />
            <Route element={<Layout />}>
              <Route path="/projects/:projectId" element={<ProjectDashboard />} />
              <Route path="/projects/:projectId/settings" element={<ProjectSettings />} />
              <Route path="/projects/:projectId/bugs" element={<BugsPage />} />
              <Route path="/projects/:projectId/bugs/new" element={<NewBugPage />} />
              <Route path="/projects/:projectId/bugs/:bugId" element={<BugDetailPage />} />
              <Route path="/projects/:projectId/bugs/:bugId/edit" element={<EditBugPage />} />
              <Route path="/projects/:projectId/test-cases" element={<TestCasesPage />} />
              <Route path="/projects/:projectId/test-cases/generate" element={<TestCaseGeneratorPage />} />
              <Route path="/projects/:projectId/test-cases/record" element={<TestCaseRecorderPage />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
