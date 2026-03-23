import type { TestCaseFormData, TestStep } from '../types';

interface GeneratorInput {
  featureName: string;
  module: string;
  testType: string;
  featureDescription: string;
  userFlowSteps: string;
  count: number;
  priority: string;
}

const makeId = () => `ts-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

function parseFlowSteps(raw: string): string[] {
  return raw
    .split('\n')
    .map((l) => l.replace(/^\d+[.)]\s*/, '').trim())
    .filter(Boolean);
}

function buildTestSteps(actions: string[]): TestStep[] {
  return actions.map((action, i) => ({
    id: makeId(),
    stepNumber: i + 1,
    action,
    expectedOutcome: `Step ${i + 1} completes successfully`,
  }));
}

const SCENARIOS = {
  functional: [
    { tag: 'Happy Path', prefix: 'Verify that', suffix: 'with valid inputs works correctly' },
    { tag: 'Negative', prefix: 'Verify that', suffix: 'with invalid inputs shows proper error' },
    { tag: 'Boundary', prefix: 'Verify boundary values for', suffix: '' },
    { tag: 'UI Validation', prefix: 'Verify UI elements and labels for', suffix: '' },
    { tag: 'Navigation', prefix: 'Verify navigation and routing for', suffix: '' },
    { tag: 'Data Persistence', prefix: 'Verify data is saved and retrieved correctly for', suffix: '' },
    { tag: 'Empty State', prefix: 'Verify empty state handling for', suffix: '' },
    { tag: 'Loading State', prefix: 'Verify loading/spinner behavior for', suffix: '' },
  ],
  regression: [
    { tag: 'Regression - Core Flow', prefix: 'Verify core functionality still works for', suffix: '' },
    { tag: 'Regression - Edge Case', prefix: 'Verify edge case handling for', suffix: '' },
    { tag: 'Regression - Integration', prefix: 'Verify integration between modules for', suffix: '' },
  ],
  smoke: [
    { tag: 'Smoke - Launch', prefix: 'Verify the page loads without errors for', suffix: '' },
    { tag: 'Smoke - Basic Flow', prefix: 'Verify basic happy path works for', suffix: '' },
    { tag: 'Smoke - Navigation', prefix: 'Verify main navigation works for', suffix: '' },
  ],
  sanity: [
    { tag: 'Sanity - Quick Check', prefix: 'Quick sanity check for', suffix: '' },
    { tag: 'Sanity - Critical Path', prefix: 'Verify critical path for', suffix: '' },
  ],
  integration: [
    { tag: 'Integration - API', prefix: 'Verify API integration for', suffix: '' },
    { tag: 'Integration - Data Flow', prefix: 'Verify data flow between components for', suffix: '' },
    { tag: 'Integration - Module Link', prefix: 'Verify module linkage for', suffix: '' },
  ],
};

export function generateTestCases(input: GeneratorInput): TestCaseFormData[] {
  const { featureName, module, testType, featureDescription, userFlowSteps, count, priority } = input;
  const flowSteps = parseFlowSteps(userFlowSteps);
  const key = testType.toLowerCase() as keyof typeof SCENARIOS;
  const templates = SCENARIOS[key] || SCENARIOS.functional;
  const results: TestCaseFormData[] = [];

  for (let i = 0; i < count; i++) {
    const tpl = templates[i % templates.length];
    const scenario = `${tpl.prefix} ${featureName}${tpl.suffix ? ' - ' + tpl.suffix : ''}`;

    let steps: TestStep[];
    if (tpl.tag.includes('Negative')) {
      steps = buildTestSteps([
        `Navigate to the ${featureName} feature`,
        `Enter invalid or empty data in required fields`,
        `Attempt to submit / proceed`,
        `Observe error messages or validation feedback`,
      ]);
    } else if (tpl.tag.includes('Boundary')) {
      steps = buildTestSteps([
        `Navigate to the ${featureName} feature`,
        `Enter minimum boundary value`,
        `Verify system accepts minimum value`,
        `Enter maximum boundary value`,
        `Verify system accepts maximum value`,
        `Enter value just outside boundary`,
        `Verify system rejects out-of-boundary value`,
      ]);
    } else if (flowSteps.length > 0) {
      steps = buildTestSteps(flowSteps);
    } else {
      steps = buildTestSteps([
        `Open the ${module} module`,
        `Navigate to ${featureName}`,
        `Perform the required action`,
        `Verify the expected result`,
      ]);
    }

    results.push({
      title: `[${tpl.tag}] ${featureName} - Scenario ${i + 1}`,
      module,
      testType,
      testScenario: scenario,
      preconditions: `User is logged in. ${featureDescription ? featureDescription.slice(0, 100) : ''}`,
      testSteps: steps,
      testData: `Valid/Invalid test data relevant to ${featureName}`,
      expectedResult: tpl.tag.includes('Negative')
        ? `Appropriate error message is displayed and action is blocked`
        : `${featureName} performs as expected per the functional requirements`,
      actualResult: '',
      priority,
      status: 'Not Tested',
      remarks: '',
      screenshots: [],
      linkedBugIds: [],
      tags: [tpl.tag, testType, module],
    });
  }
  return results;
}