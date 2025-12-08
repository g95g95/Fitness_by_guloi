/**
 * BiomechCoach - Assessment Types and Interfaces
 *
 * Defines the complete JSON structure for assessment reports,
 * including angle deviations, asymmetries, recommendations, etc.
 */

import { StaticPatternFlags, PainLocation } from './poseTypes';
import { AngleDeviation, ExerciseRecommendation, MuscleRecommendation, PatternRecommendation } from './exerciseStandards';
import { PredictedPain } from './painPrediction';

/**
 * Assessment configuration
 */
export interface AssessmentConfig {
  /** Duration in seconds */
  duration: number;
  /** Delay before starting (for camera to detect position) */
  detectionDelay: number;
}

/**
 * Pain entry for assessment
 */
export interface AssessmentPainEntry {
  intensity: number; // 0-10
  location: PainLocation;
  notes?: string;
}

/**
 * Instability observation during assessment
 */
export interface InstabilityObservation {
  type: 'sway' | 'wobble' | 'compensation' | 'loss_of_balance';
  severity: 'mild' | 'moderate' | 'severe';
  timestamp?: number;
  description: string;
}

/**
 * Asymmetry detected during assessment
 */
export interface AsymmetryObservation {
  type: 'knee_angle' | 'hip_height' | 'shoulder_height' | 'ankle_position' | 'trunk_lean';
  leftValue: number;
  rightValue: number;
  difference: number;
  significance: 'minor' | 'moderate' | 'significant';
  description: string;
}

/**
 * Single exercise assessment result
 */
export interface ExerciseAssessmentResult {
  /** Exercise ID */
  exerciseId: string;
  /** Exercise name */
  exerciseName: string;
  /** Exercise category */
  category: string;
  /** Timestamp when assessment was performed */
  timestamp: number;
  /** Duration of the assessment in seconds */
  durationSeconds: number;

  /** Measured angle values (mean during assessment) */
  measuredAngles: {
    leftKnee: number | null;
    rightKnee: number | null;
    leftHipAngle: number | null;
    rightHipAngle: number | null;
    leftAnkle: number | null;
    rightAnkle: number | null;
    trunkLean: number | null;
  };

  /** Angle deviations from standard values */
  angleDeviations: AngleDeviation[];

  /** Detected pattern flags */
  patternFlags: StaticPatternFlags;

  /** Static metrics (sway, variability, etc.) */
  staticMetrics: {
    totalSway: number;
    swayX: number;
    swayY: number;
    angleVariability: Record<string, number>;
  };

  /** Asymmetries detected */
  asymmetries: AsymmetryObservation[];

  /** Instabilities observed */
  instabilities: InstabilityObservation[];

  /** Pain reported */
  pain?: AssessmentPainEntry;

  /** Overall score (0-100) */
  score: number;

  /** Status based on score */
  status: 'excellent' | 'good' | 'fair' | 'needs_work';

  /** Exercise-specific recommendations */
  recommendations: {
    exercises: ExerciseRecommendation[];
    muscles: MuscleRecommendation[];
    patterns: PatternRecommendation[];
  };

  /** Predicted probable pains based on detected patterns */
  probablePains: PredictedPain[];

  /** Summary text */
  summary: string;
}

/**
 * Complete assessment session (all exercises or single)
 */
export interface AssessmentSession {
  /** Unique session ID */
  sessionId: string;
  /** Session start timestamp */
  startTimestamp: number;
  /** Session end timestamp */
  endTimestamp?: number;
  /** Session mode: single exercise or all 20 */
  mode: 'single' | 'full';
  /** App version */
  version: string;

  /** Individual exercise results */
  exercises: ExerciseAssessmentResult[];

  /** Global recommendations (aggregated from all exercises) */
  globalRecommendations: {
    /** Top exercises to practice */
    priorityExercises: ExerciseRecommendation[];
    /** Key muscles to strengthen */
    musclesFocus: MuscleRecommendation[];
    /** Neuromotor patterns to develop */
    patternsFocus: PatternRecommendation[];
  };

  /** Overall session summary */
  sessionSummary: {
    /** Total exercises completed */
    exercisesCompleted: number;
    /** Average score across exercises */
    averageScore: number;
    /** Most common issues detected */
    commonIssues: string[];
    /** Areas of strength */
    strengths: string[];
    /** Primary areas for improvement */
    areasForImprovement: string[];
  };

  /** Notes from user */
  userNotes?: string;
}

/**
 * Assessment report mode options
 */
export type AssessmentReportMode = 'per_exercise' | 'end_of_session';

/**
 * Duration options for assessment
 */
export const ASSESSMENT_DURATIONS = [
  { value: 10, label: '10 secondi', description: 'Quick assessment' },
  { value: 15, label: '15 secondi', description: 'Standard assessment' },
  { value: 20, label: '20 secondi', description: 'Full assessment (recommended)' },
  { value: 30, label: '30 secondi', description: 'Extended assessment' },
];

/**
 * Detection delay options
 */
export const DETECTION_DELAYS = [
  { value: 3, label: '3 secondi', description: 'Quick start' },
  { value: 5, label: '5 secondi', description: 'Standard (recommended)' },
  { value: 10, label: '10 secondi', description: 'Extended preparation' },
];

/**
 * Generate unique session ID
 */
export function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Calculate overall score from deviations and metrics
 */
export function calculateAssessmentScore(
  angleDeviations: AngleDeviation[],
  staticMetrics: { totalSway: number; angleVariability: Record<string, number> },
  patternFlags: StaticPatternFlags,
  asymmetries: AsymmetryObservation[]
): number {
  let score = 100;

  // Deduct for angle deviations
  for (const deviation of angleDeviations) {
    if (deviation.status === 'out_of_range') {
      score -= 10;
    } else if (deviation.status === 'needs_improvement') {
      score -= 5;
    } else if (deviation.status === 'acceptable') {
      score -= 2;
    }
  }

  // Deduct for high sway
  if (staticMetrics.totalSway > 0.03) {
    score -= 15;
  } else if (staticMetrics.totalSway > 0.02) {
    score -= 8;
  } else if (staticMetrics.totalSway > 0.015) {
    score -= 3;
  }

  // Deduct for pattern flags
  const flagCount = Object.values(patternFlags).filter(Boolean).length;
  score -= flagCount * 5;

  // Deduct for asymmetries
  for (const asym of asymmetries) {
    if (asym.significance === 'significant') {
      score -= 8;
    } else if (asym.significance === 'moderate') {
      score -= 4;
    } else {
      score -= 1;
    }
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Get status from score
 */
export function getStatusFromScore(score: number): ExerciseAssessmentResult['status'] {
  if (score >= 85) return 'excellent';
  if (score >= 70) return 'good';
  if (score >= 50) return 'fair';
  return 'needs_work';
}

/**
 * Format assessment result for JSON export
 */
export function formatAssessmentForExport(session: AssessmentSession): string {
  return JSON.stringify(session, null, 2);
}

/**
 * Parse imported assessment session
 */
export function parseImportedSession(jsonString: string): AssessmentSession | null {
  try {
    const parsed = JSON.parse(jsonString);
    // Validate required fields
    if (
      parsed.sessionId &&
      parsed.startTimestamp &&
      parsed.exercises &&
      Array.isArray(parsed.exercises)
    ) {
      return parsed as AssessmentSession;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * LocalStorage key for assessment sessions
 */
export const ASSESSMENT_STORAGE_KEY = 'biomechcoach_assessment_sessions';

/**
 * Save session to localStorage
 */
export function saveSessionToStorage(session: AssessmentSession): void {
  try {
    const existing = localStorage.getItem(ASSESSMENT_STORAGE_KEY);
    const sessions: AssessmentSession[] = existing ? JSON.parse(existing) : [];

    // Keep only last 10 sessions
    const updated = [session, ...sessions.filter(s => s.sessionId !== session.sessionId)].slice(0, 10);
    localStorage.setItem(ASSESSMENT_STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to save assessment session:', error);
  }
}

/**
 * Load sessions from localStorage
 */
export function loadSessionsFromStorage(): AssessmentSession[] {
  try {
    const stored = localStorage.getItem(ASSESSMENT_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Download session as JSON file
 */
export function downloadSessionAsJson(session: AssessmentSession, filename?: string): void {
  const json = formatAssessmentForExport(session);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `biomech_assessment_${new Date(session.startTimestamp).toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default AssessmentSession;
