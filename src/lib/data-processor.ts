import Papa from 'papaparse';
import { differenceInDays, parse as parseDate, isValid } from 'date-fns';
import { Candidate, Category, DashboardStats, TaskData } from '../types';

const IGNORED_TASK = 'Final Step: Feedback!';

function getCategory(requisitionTitle: string): Category {
  if (!requisitionTitle) return 'Other';
  const title = requisitionTitle.toLowerCase();
  if (title.includes('hq')) return 'HQ';
  // Check for Camp Director first as it's more specific than Summer Staff
  if (title.includes('camp director')) return 'Camp Director';
  if (title.includes('summer staff')) return 'Summer Staff';
  return 'Other';
}

function parseDateString(dateStr: any): Date | null {
  if (!dateStr || typeof dateStr !== 'string' || dateStr.trim() === '') return null;
  
  const trimmed = dateStr.trim();
  // Try common formats
  const formats = ['M/d/yyyy', 'M/d/yyyy h:mm:ss a', 'yyyy-MM-dd', 'MM/dd/yyyy', 'M/d/yy'];
  for (const fmt of formats) {
    try {
      const d = parseDate(trimmed, fmt, new Date());
      if (isValid(d)) return d;
    } catch (e) {
      // Continue to next format
    }
  }
  
  const d = new Date(trimmed);
  return isValid(d) ? d : null;
}

export async function processCSV(file: File): Promise<Candidate[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: false, // Use indices for better reliability with "Col A", "Col T"
      skipEmptyLines: 'greedy',
      complete: (results) => {
        try {
          const allRows = results.data as string[][];
          if (allRows.length === 0) {
            resolve([]);
            return;
          }

          // Check if first row is header and skip it if so
          let startIndex = 0;
          const firstRow = allRows[0].map(c => String(c).toLowerCase());
          if (firstRow.some(c => c.includes('email') || c.includes('task') || c.includes('status') || c.includes('region'))) {
            startIndex = 1;
          }

          const candidatesMap = new Map<string, Candidate>();

          for (let i = startIndex; i < allRows.length; i++) {
            const row = allRows[i];
            
            // Mapping based on column indices (0-based)
            // Col A=0, B=1, E=4, G=6, R=17, T=19, U=20, V=21, Y=24, Z=25, AB=27
            const rawTaskType = row[0] || '';
            const taskNameRaw = row[19] || 'Unknown Task';
            const email = row[6] || '';
            const name = row[1] || 'Unknown';
            const jobTitleRaw = row[4] || '';
            const regionRaw = row[17] || '';
            const status = row[20] || '';
            const requisitionTitle = row[21] || '';
            const launchDateStr = row[24] || '';
            const completedDateStr = row[25] || '';
            const tenureRaw = row[27] || '';

            if (!email || typeof email !== 'string' || email.trim() === '') {
              continue;
            }

            // Normalize Job Title
            let jobTitle = jobTitleRaw.trim();
            // Remove suffixes like ", New", ", Returner", " New", " Returner"
            jobTitle = jobTitle.replace(/,?\s*(New|Returner)$/i, '').trim();

            // Normalize Tenure
            let tenure = 'Alumni';
            if (tenureRaw.toLowerCase().includes('1st year')) {
              tenure = 'First Year';
            }

            // Normalize Task Type to only "New Hire Task" or "Internal Task"
            let taskType = 'Internal Task'; // Default
            const lowerRawType = rawTaskType.toLowerCase();
            if (lowerRawType.includes('new hire')) {
              taskType = 'New Hire Task';
            } else if (lowerRawType.includes('internal')) {
              taskType = 'Internal Task';
            }

            // Consolidate Regions
            let region = regionRaw.trim();
            const lowerRegion = region.toLowerCase();
            if (lowerRegion.includes('socal gx')) {
              region = 'SoCal GX';
            }

            // Consolidate Task Names (Faith's Law Employer)
            let task = taskNameRaw.trim();
            const lowerTask = task.toLowerCase();
            if (lowerTask.includes('faith') && lowerTask.includes('employer')) {
              task = "Faith's Law Authorization - Employer Task";
            }

            const launchDate = parseDateString(launchDateStr);
            const completedDate = parseDateString(completedDateStr);
            let completionTimeDays: number | null = null;

            if (launchDate && completedDate) {
              completionTimeDays = Math.max(0, differenceInDays(completedDate, launchDate));
            }

            const taskData: TaskData = {
              task,
              taskType,
              status,
              launchDate,
              completedDate,
              completionTimeDays
            };

            const cleanEmail = email.trim().toLowerCase();
            const resignedRegions = ['resigned', 'rescinded', 'resgined', 'unknown region'];
            const isResignedRescinded = resignedRegions.includes(region.toLowerCase());

            if (!candidatesMap.has(cleanEmail)) {
              candidatesMap.set(cleanEmail, {
                email: cleanEmail,
                name: name.trim(),
                region: region,
                category: getCategory(requisitionTitle),
                jobTitle,
                tenure,
                tasks: [],
                isFullyComplete: false,
                isResignedRescinded
              });
            }

            const candidate = candidatesMap.get(cleanEmail)!;
            candidate.tasks.push(taskData);
          }

          // Calculate final completion status for each candidate
          const candidates = Array.from(candidatesMap.values());
          candidates.forEach(candidate => {
            const relevantTasks = candidate.tasks.filter(t => t.task !== IGNORED_TASK);
            candidate.isFullyComplete = relevantTasks.length > 0 && relevantTasks.every(t => {
              const s = (t.status || '').toLowerCase();
              return s === 'complete' || s === 'completed';
            });
          });

          console.log(`Successfully processed ${candidates.length} unique candidates`);
          resolve(candidates);
        } catch (err) {
          console.error('Error in CSV processing logic:', err);
          reject(err);
        }
      },
      error: (error) => {
        console.error('PapaParse error:', error);
        reject(error);
      }
    });
  });
}

export function calculateStats(candidates: Candidate[]): DashboardStats {
  const stats: DashboardStats = {
    totalUniqueCandidates: candidates.length,
    resignedRescindedCount: candidates.filter(c => c.isResignedRescinded).length,
    categoryStats: {
      'HQ': { count: 0, completeCount: 0 },
      'Summer Staff': { count: 0, completeCount: 0 },
      'Camp Director': { count: 0, completeCount: 0 },
      'Other': { count: 0, completeCount: 0 }
    },
    taskTypeStats: {
      'New Hire Task': { count: 0, completeCount: 0 },
      'Internal Task': { count: 0, completeCount: 0 }
    },
    regionStats: {},
    taskStats: {},
    tenureStats: {},
    jobTitleStats: {},
    launchTimeline: [],
    taskSequence: []
  };

  const taskCompletionTimes: Record<string, number[]> = {};
  const taskNameToType: Record<string, string> = {};
  
  // For Launch Timeline
  const launchGroups: Record<string, { candidateCount: number; totalCompletionDays: number; completedCount: number }> = {};
  
  // For Task Sequence
  const taskLaunchOffsets: Record<string, number[]> = {};

  candidates.forEach(candidate => {
    if (candidate.isResignedRescinded) {
      if (!stats.regionStats['Resigned/Rescinded']) {
        stats.regionStats['Resigned/Rescinded'] = { count: 0, completeCount: 0 };
      }
      stats.regionStats['Resigned/Rescinded'].count++;
      if (candidate.isFullyComplete) {
        stats.regionStats['Resigned/Rescinded'].completeCount++;
      }
      return;
    }

    // Category stats
    stats.categoryStats[candidate.category].count++;
    if (candidate.isFullyComplete) {
      stats.categoryStats[candidate.category].completeCount++;
    }

    // Tenure stats
    if (!stats.tenureStats[candidate.tenure]) {
      stats.tenureStats[candidate.tenure] = { count: 0, completeCount: 0 };
    }
    stats.tenureStats[candidate.tenure].count++;
    if (candidate.isFullyComplete) {
      stats.tenureStats[candidate.tenure].completeCount++;
    }

    // Job Title stats
    if (!stats.jobTitleStats[candidate.jobTitle]) {
      stats.jobTitleStats[candidate.jobTitle] = { count: 0, completeCount: 0 };
    }
    stats.jobTitleStats[candidate.jobTitle].count++;
    if (candidate.isFullyComplete) {
      stats.jobTitleStats[candidate.jobTitle].completeCount++;
    }

    // Launch Timeline Data Collection
    // Only consider fully complete candidates as requested
    if (candidate.isFullyComplete) {
      const candidateLaunchDate = candidate.tasks.find(t => t.launchDate)?.launchDate;
      if (candidateLaunchDate) {
        const dateKey = candidateLaunchDate.toISOString().split('T')[0];
        if (!launchGroups[dateKey]) {
          launchGroups[dateKey] = { candidateCount: 0, totalCompletionDays: 0, completedCount: 0 };
        }
        launchGroups[dateKey].candidateCount++;
        
        // Calculate avg completion for this candidate (avg of all their completed tasks)
        const completedTasks = candidate.tasks.filter(t => t.completionTimeDays !== null);
        if (completedTasks.length > 0) {
          const avgCandidateTime = completedTasks.reduce((acc, t) => acc + (t.completionTimeDays || 0), 0) / completedTasks.length;
          launchGroups[dateKey].totalCompletionDays += avgCandidateTime;
          launchGroups[dateKey].completedCount++;
        }
      }
    }

    // Task Type stats (New Hire vs Internal)
    candidate.tasks.forEach(task => {
      const type = task.taskType || 'Unknown Type';
      if (!stats.taskTypeStats[type]) {
        stats.taskTypeStats[type] = { count: 0, completeCount: 0 };
      }
      stats.taskTypeStats[type].count++;
      if (task.status.toLowerCase() === 'complete' || task.status.toLowerCase() === 'completed') {
        stats.taskTypeStats[type].completeCount++;
      }
    });

    // Region stats
    if (!stats.regionStats[candidate.region]) {
      stats.regionStats[candidate.region] = { count: 0, completeCount: 0 };
    }
    stats.regionStats[candidate.region].count++;
    if (candidate.isFullyComplete) {
      stats.regionStats[candidate.region].completeCount++;
    }

    // Task stats
    candidate.tasks.forEach(task => {
      if (task.task === IGNORED_TASK) return;
      
      // Group Faith's Law tasks
      let taskName = task.task;
      const lowerTaskName = taskName.toLowerCase();
      if (lowerTaskName.includes("faith's law") && !lowerTaskName.includes("employer")) {
        taskName = "Faith's Law (Combined)";
      }
      // Note: Employer tasks are already consolidated in processCSV
      
      taskNameToType[taskName] = task.taskType;
      
      if (!taskCompletionTimes[taskName]) {
        taskCompletionTimes[taskName] = [];
      }
      
      if (task.completionTimeDays !== null) {
        taskCompletionTimes[taskName].push(task.completionTimeDays);
        
        // For Task Sequence
        if (!taskLaunchOffsets[taskName]) {
          taskLaunchOffsets[taskName] = [];
        }
        taskLaunchOffsets[taskName].push(task.completionTimeDays);
      }
    });
  });

  // Finalize Launch Timeline
  stats.launchTimeline = Object.entries(launchGroups)
    .map(([date, data]) => ({
      date,
      candidateCount: data.candidateCount,
      avgCompletionDays: data.completedCount > 0 ? Math.round((data.totalCompletionDays / data.completedCount) * 10) / 10 : 0
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Finalize Task Sequence
  stats.taskSequence = Object.entries(taskLaunchOffsets)
    .map(([taskName, offsets]) => ({
      taskName,
      avgDaysFromLaunch: offsets.length > 0 ? Math.round((offsets.reduce((a, b) => a + b, 0) / offsets.length) * 10) / 10 : 0,
      totalCompleted: offsets.length
    }))
    .sort((a, b) => a.avgDaysFromLaunch - b.avgDaysFromLaunch);

  // Finalize task stats
  Object.keys(taskCompletionTimes).forEach(taskName => {
    const times = taskCompletionTimes[taskName];
    const total = times.length;
    const avg = total > 0 ? times.reduce((a, b) => a + b, 0) / total : 0;
    
    stats.taskStats[taskName] = {
      avgCompletionTimeDays: Math.round(avg * 10) / 10,
      totalCompleted: total,
      type: taskNameToType[taskName] || 'Unknown Type'
    };
  });

  return stats;
}
