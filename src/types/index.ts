export interface Screenshot {
  id: string;
  name: string;
  data: string; // base64
  size: number;
  type: string;
}

export interface StatusChange {
  id: string;
  from: string;
  to: string;
  changedBy: string;
  changedAt: string;
  note?: string;
}

export interface LifecycleStage {
  id: string;
  name: string;
  color: string;
  order: number;
  isDefault?: boolean;
  isFinal?: boolean;
}

export interface SeverityLevel {
  id: string;
  name: string;
  color: string;
  textColor: string;
}

export interface PriorityLevel {
  id: string;
  name: string;
  color: string;
  textColor: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  color: string;
  lifecycleStages: LifecycleStage[];
  severityLevels: SeverityLevel[];
  priorityLevels: PriorityLevel[];
  createdAt: string;
  updatedAt: string;
}

export interface BugEnvironment {
  browser: string;
  os: string;
  deviceType: string;
  screenResolution: string;
  userRole: string;
  accountId: string;
}

export interface AIDetails {
  inputSymptoms: string;
  patientHistory: string;
  expectedDiagnosis: string;
  actualOutput: string;
  confidenceScore: string;
  responseTime: string;
  hallucinationNoted: boolean;
  hallucinationDesc: string;
}

export interface PatientDataDetails {
  dataTypeAffected: string;
  expectedDataState: string;
  actualDataState: string;
  dataLossOccurred: boolean;
  dataCorruption: boolean;
}

export interface Bug {
  id: string;
  projectId: string;
  title: string;
  module: string;
  bugType: string;
  reproducibility: string;
  description: string;
  expectedBehavior: string;
  actualBehavior: string;
  stepsToReproduce: string[];
  environment: BugEnvironment;
  severity: string;
  priority: string;
  status: string;
  reporter: string;
  assignee: string;
  workaround: string;
  additionalNotes: string;
  screenshots: Screenshot[];
  aiDetails?: AIDetails;
  patientDataDetails?: PatientDataDetails;
  statusHistory: StatusChange[];
  createdAt: string;
  updatedAt: string;
}

export interface TestStep {
  id: string;
  stepNumber: number;
  action: string;
  expectedOutcome: string;
}

export interface TestCase {
  id: string;
  projectId: string;
  title: string;
  module: string;
  testType: string;
  testScenario: string;
  preconditions: string;
  testSteps: TestStep[];
  testData: string;
  expectedResult: string;
  actualResult: string;
  priority: string;
  status: 'Not Tested' | 'Pass' | 'Fail' | 'Blocked' | 'In Progress' | 'Skipped';
  remarks: string;
  screenshots: Screenshot[];
  linkedBugIds: string[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TestCaseGeneratorInput {
  featureName: string;
  module: string;
  testType: string;
  featureDescription: string;
  userFlowSteps: string;
  screenshots: Screenshot[];
  selectedColumns: string[];
  count: number;
}

export type BugFormData = Omit<Bug, 'id' | 'projectId' | 'statusHistory' | 'createdAt' | 'updatedAt'>;
export type TestCaseFormData = Omit<TestCase, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>;