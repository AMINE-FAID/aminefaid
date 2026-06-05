export interface LessonPlannerParams {
  subject: string;
  topic: string;
  grade: string;
  duration: string;
  focus: string;
}

export interface CurriculumPlannerParams {
  course: string;
  term: string;
  grade: string;
  weeks: string;
  objectives: string;
}

export interface AssessmentParams {
  testType: string;
  topic: string;
  grade: string;
  difficulty: string;
  numQuestions: string;
}

export interface PerformanceReportParams {
  classGroup: string;
  numStudents: string;
  reportType: string;
  rawNotes: string;
}

export interface AdminCopilotParams {
  documentType: string;
  recipient: string;
  tone: string;
  bulletPoints: string;
}

export type ActiveTool = 'lesson_planner' | 'curriculum_planner' | 'assessment_generator' | 'performance_report' | 'admin_copilot' | 'diagram_generator';

export interface DiagramGeneratorParams {
  subject: string;
  topic: string;
  style: string;
  language: string;
}

export interface SavedItem {
  id: string;
  title: string;
  tool: ActiveTool;
  content: string;
  timestamp: string;
  imageUrl?: string;
  tags?: string[];
}
