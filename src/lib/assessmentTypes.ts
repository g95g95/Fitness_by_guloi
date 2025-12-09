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

/**
 * Format date for PDF display
 */
function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Get status label in Italian
 */
function getStatusLabel(status: ExerciseAssessmentResult['status']): string {
  const labels = {
    excellent: 'Eccellente',
    good: 'Buono',
    fair: 'Discreto',
    needs_work: 'Da migliorare',
  };
  return labels[status];
}

/**
 * Generate HTML content for PDF
 */
function generatePdfHtml(session: AssessmentSession): string {
  const exercisesHtml = session.exercises
    .map(
      (ex) => `
      <div class="exercise">
        <h3>${ex.exerciseName}</h3>
        <div class="score-row">
          <span class="score">${ex.score}/100</span>
          <span class="status status-${ex.status}">${getStatusLabel(ex.status)}</span>
        </div>
        <p class="summary">${ex.summary}</p>

        ${
          ex.angleDeviations.length > 0
            ? `
          <div class="section">
            <h4>Angoli Misurati</h4>
            <table>
              <tr><th>Angolo</th><th>Misurato</th><th>Ideale</th><th>Deviazione</th></tr>
              ${ex.angleDeviations
                .map(
                  (d) => `
                <tr>
                  <td>${d.angleName}</td>
                  <td>${d.measured.toFixed(1)}°</td>
                  <td>${d.ideal}°</td>
                  <td>${d.deviation > 0 ? '+' : ''}${d.deviation.toFixed(1)}°</td>
                </tr>
              `
                )
                .join('')}
            </table>
          </div>
        `
            : ''
        }

        ${
          ex.asymmetries.length > 0
            ? `
          <div class="section">
            <h4>Asimmetrie</h4>
            <ul>
              ${ex.asymmetries.map((a) => `<li>${a.description} (Diff: ${a.difference.toFixed(1)})</li>`).join('')}
            </ul>
          </div>
        `
            : ''
        }

        ${
          ex.recommendations.exercises.length > 0
            ? `
          <div class="section">
            <h4>Esercizi Consigliati</h4>
            <ul>
              ${ex.recommendations.exercises.map((r) => `<li><strong>${r.exercise}</strong>: ${r.reason}</li>`).join('')}
            </ul>
          </div>
        `
            : ''
        }

        ${
          ex.recommendations.muscles.length > 0
            ? `
          <div class="section">
            <h4>Muscoli da Rafforzare</h4>
            <ul>
              ${ex.recommendations.muscles.map((r) => `<li><strong>${r.muscle}</strong>: ${r.reason}</li>`).join('')}
            </ul>
          </div>
        `
            : ''
        }

        ${
          ex.probablePains && ex.probablePains.length > 0
            ? `
          <div class="section warning">
            <h4>Dolori Probabili</h4>
            <ul>
              ${ex.probablePains.map((p) => `<li><strong>${p.location}</strong> (${p.probability}): ${p.reason}</li>`).join('')}
            </ul>
          </div>
        `
            : ''
        }
      </div>
    `
    )
    .join('<hr>');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>BiomechCoach - Report Assessment</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 12px;
          line-height: 1.5;
          color: #333;
          padding: 20px;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 2px solid #6366f1;
        }
        .header h1 { color: #6366f1; font-size: 24px; margin-bottom: 5px; }
        .header .date { color: #666; }
        .summary-box {
          background: #f3f4f6;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 20px;
        }
        .summary-box h2 { font-size: 16px; margin-bottom: 10px; }
        .summary-stats { display: flex; gap: 20px; flex-wrap: wrap; }
        .stat { text-align: center; }
        .stat-value { font-size: 24px; font-weight: bold; color: #6366f1; }
        .stat-label { font-size: 11px; color: #666; }
        .exercise {
          margin-bottom: 25px;
          page-break-inside: avoid;
        }
        .exercise h3 {
          font-size: 14px;
          color: #1f2937;
          margin-bottom: 8px;
          padding-bottom: 5px;
          border-bottom: 1px solid #e5e7eb;
        }
        .score-row { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
        .score { font-size: 18px; font-weight: bold; }
        .status {
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 500;
        }
        .status-excellent { background: #d1fae5; color: #059669; }
        .status-good { background: #dbeafe; color: #2563eb; }
        .status-fair { background: #fef3c7; color: #d97706; }
        .status-needs_work { background: #fee2e2; color: #dc2626; }
        .summary { color: #4b5563; margin-bottom: 10px; }
        .section { margin: 10px 0; }
        .section h4 { font-size: 12px; color: #6366f1; margin-bottom: 5px; }
        .section.warning h4 { color: #dc2626; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; }
        th, td { padding: 5px 8px; text-align: left; border-bottom: 1px solid #e5e7eb; }
        th { background: #f9fafb; font-weight: 600; }
        ul { padding-left: 20px; }
        li { margin-bottom: 3px; }
        hr { border: none; border-top: 1px solid #e5e7eb; margin: 20px 0; }
        .footer {
          margin-top: 30px;
          padding-top: 15px;
          border-top: 1px solid #e5e7eb;
          text-align: center;
          font-size: 10px;
          color: #9ca3af;
        }
        @media print {
          body { padding: 0; }
          .exercise { page-break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>BiomechCoach Assessment Report</h1>
        <div class="date">${formatDate(session.startTimestamp)}</div>
      </div>

      <div class="summary-box">
        <h2>Riepilogo Sessione</h2>
        <div class="summary-stats">
          <div class="stat">
            <div class="stat-value">${session.sessionSummary.exercisesCompleted}</div>
            <div class="stat-label">Esercizi</div>
          </div>
          <div class="stat">
            <div class="stat-value">${session.sessionSummary.averageScore.toFixed(0)}</div>
            <div class="stat-label">Punteggio Medio</div>
          </div>
        </div>
        ${
          session.sessionSummary.commonIssues.length > 0
            ? `
          <div style="margin-top: 10px;">
            <strong>Problemi comuni:</strong> ${session.sessionSummary.commonIssues.join(', ')}
          </div>
        `
            : ''
        }
        ${
          session.sessionSummary.areasForImprovement.length > 0
            ? `
          <div style="margin-top: 5px;">
            <strong>Aree di miglioramento:</strong> ${session.sessionSummary.areasForImprovement.join(', ')}
          </div>
        `
            : ''
        }
      </div>

      <h2 style="margin-bottom: 15px;">Dettaglio Esercizi</h2>
      ${exercisesHtml}

      <div class="footer">
        <p>Report generato da BiomechCoach - ${new Date().toISOString()}</p>
        <p>Questo report non sostituisce una valutazione medica professionale.</p>
      </div>
    </body>
    </html>
  `;
}

/**
 * Download session as PDF file
 */
export function downloadSessionAsPdf(session: AssessmentSession): void {
  const html = generatePdfHtml(session);
  const printWindow = window.open('', '_blank');

  if (!printWindow) {
    alert('Impossibile aprire la finestra di stampa. Controlla il blocco popup del browser.');
    return;
  }

  printWindow.document.write(html);
  printWindow.document.close();

  // Wait for content to load, then trigger print
  printWindow.onload = () => {
    printWindow.print();
  };

  // Fallback: trigger print after a short delay
  setTimeout(() => {
    printWindow.print();
  }, 500);
}

export default AssessmentSession;
