export type Category = 'HQ' | 'Summer Staff' | 'Camp Director' | 'Other';

export interface RawRow {
  email: string;
  name: string;
  region: string;
  task: string;
  status: string;
  requisitionTitle: string;
  launchDate: string;
  completedDate: string;
}

export interface TaskData {
  task: string;
  taskType: string; // 'New Hire Task' or 'Internal Task'
  status: string;
  launchDate: Date | null;
  completedDate: Date | null;
  completionTimeDays: number | null;
}

export interface Candidate {
  email: string;
  name: string;
  region: string;
  category: Category;
  jobTitle: string;
  tenure: string;
  tasks: TaskData[];
  isFullyComplete: boolean;
  isResignedRescinded: boolean;
}

export interface DashboardStats {
  totalUniqueCandidates: number;
  resignedRescindedCount: number;
  categoryStats: Record<Category, {
    count: number;
    completeCount: number;
  }>;
  taskTypeStats: Record<string, {
    count: number;
    completeCount: number;
  }>;
  regionStats: Record<string, {
    count: number;
    completeCount: number;
  }>;
  taskStats: Record<string, {
    avgCompletionTimeDays: number;
    totalCompleted: number;
    type: string;
  }>;
  tenureStats: Record<string, {
    count: number;
    completeCount: number;
  }>;
  jobTitleStats: Record<string, {
    count: number;
    completeCount: number;
  }>;
  launchTimeline: {
    date: string;
    candidateCount: number;
    avgCompletionDays: number;
  }[];
  taskSequence: {
    taskName: string;
    avgDaysFromLaunch: number;
    totalCompleted: number;
  }[];
}
