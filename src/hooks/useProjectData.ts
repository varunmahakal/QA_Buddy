import { useEffect } from 'react';
import { useBugStore } from '../store/bugStore';
import { useTestCaseStore } from '../store/testCaseStore';

/**
 * Triggers lazy loading of bugs and test cases for a project
 * when a project page is mounted. Skips if already loaded.
 */
export function useProjectData(projectId: string) {
  const loadBugsForProject      = useBugStore((s) => s.loadBugsForProject);
  const loadTestCasesForProject = useTestCaseStore((s) => s.loadTestCasesForProject);

  useEffect(() => {
    if (!projectId) return;
    void loadBugsForProject(projectId);
    void loadTestCasesForProject(projectId);
  }, [projectId, loadBugsForProject, loadTestCasesForProject]);
}
