/**
 * BiomechCoach - Assessment Hook
 *
 * Manages assessment sessions, generates reports, and handles
 * JSON export/import functionality.
 */

import { useState, useCallback, useRef } from 'react';
import { StaticPatternFlags, StaticMetrics, StaticExercise } from '../lib/poseTypes';
import {
  AssessmentSession,
  AssessmentConfig,
  AssessmentReportMode,
  ExerciseAssessmentResult,
  AsymmetryObservation,
  InstabilityObservation,
  AssessmentPainEntry,
  generateSessionId,
  calculateAssessmentScore,
  getStatusFromScore,
  saveSessionToStorage,
  downloadSessionAsJson,
} from '../lib/assessmentTypes';
import {
  calculateAngleDeviations,
} from '../lib/exerciseStandards';
import {
  generateExerciseRecommendations,
  generateMuscleRecommendations,
  generatePatternRecommendations,
  generateAssessmentSummary,
  aggregateRecommendations,
} from '../lib/assessmentRecommendations';
import { predictProbablePains } from '../lib/painPrediction';
import { StaticAngles } from './useStaticAnalysis';

/**
 * Assessment hook return type
 */
export interface UseAssessmentReturn {
  /** Current session */
  currentSession: AssessmentSession | null;
  /** Assessment results by exercise ID */
  exerciseResults: Map<string, ExerciseAssessmentResult>;
  /** Report mode preference */
  reportMode: AssessmentReportMode;
  /** Set report mode */
  setReportMode: (mode: AssessmentReportMode) => void;
  /** Assessment config */
  config: AssessmentConfig;
  /** Update config */
  updateConfig: (config: Partial<AssessmentConfig>) => void;
  /** Start a new session */
  startSession: (mode: 'single' | 'full') => void;
  /** End current session */
  endSession: () => AssessmentSession | null;
  /** Record exercise result */
  recordExerciseResult: (
    exercise: StaticExercise,
    angles: StaticAngles,
    patternFlags: StaticPatternFlags,
    staticMetrics: StaticMetrics | null,
    durationSeconds: number,
    pain?: AssessmentPainEntry
  ) => ExerciseAssessmentResult;
  /** Get result for specific exercise */
  getExerciseResult: (exerciseId: string) => ExerciseAssessmentResult | undefined;
  /** Clear results for exercise */
  clearExerciseResult: (exerciseId: string) => void;
  /** Download session as JSON */
  downloadSession: (filename?: string) => void;
  /** Import session from JSON */
  importSession: (jsonString: string) => boolean;
  /** Has unsaved results */
  hasUnsavedResults: boolean;
}

const DEFAULT_CONFIG: AssessmentConfig = {
  duration: 20,
  detectionDelay: 5,
};

/**
 * Assessment hook
 */
export function useAssessment(): UseAssessmentReturn {
  const [currentSession, setCurrentSession] = useState<AssessmentSession | null>(null);
  const [exerciseResults, setExerciseResults] = useState<Map<string, ExerciseAssessmentResult>>(new Map());
  const [reportMode, setReportMode] = useState<AssessmentReportMode>('per_exercise');
  const [config, setConfig] = useState<AssessmentConfig>(DEFAULT_CONFIG);
  const [hasUnsavedResults, setHasUnsavedResults] = useState(false);

  const sessionRef = useRef<AssessmentSession | null>(null);

  /**
   * Update assessment config
   */
  const updateConfig = useCallback((newConfig: Partial<AssessmentConfig>) => {
    setConfig(prev => ({ ...prev, ...newConfig }));
  }, []);

  /**
   * Start a new assessment session
   */
  const startSession = useCallback((mode: 'single' | 'full') => {
    const session: AssessmentSession = {
      sessionId: generateSessionId(),
      startTimestamp: Date.now(),
      mode,
      version: '1.0.0',
      exercises: [],
      globalRecommendations: {
        priorityExercises: [],
        musclesFocus: [],
        patternsFocus: [],
      },
      sessionSummary: {
        exercisesCompleted: 0,
        averageScore: 0,
        commonIssues: [],
        strengths: [],
        areasForImprovement: [],
      },
    };
    setCurrentSession(session);
    sessionRef.current = session;
    setExerciseResults(new Map());
    setHasUnsavedResults(false);
  }, []);

  /**
   * Generate asymmetry observations from metrics
   */
  const generateAsymmetries = useCallback((
    angles: StaticAngles,
    staticMetrics: StaticMetrics | null
  ): AsymmetryObservation[] => {
    const asymmetries: AsymmetryObservation[] = [];

    // Knee angle asymmetry
    if (angles.leftKnee !== null && angles.rightKnee !== null) {
      const diff = Math.abs(angles.leftKnee - angles.rightKnee);
      if (diff > 3) {
        asymmetries.push({
          type: 'knee_angle',
          leftValue: angles.leftKnee,
          rightValue: angles.rightKnee,
          difference: diff,
          significance: diff > 10 ? 'significant' : diff > 6 ? 'moderate' : 'minor',
          description: `Differenza di ${diff.toFixed(1)}° tra ginocchio sinistro e destro`,
        });
      }
    }

    // Hip height asymmetry
    if (staticMetrics?.asymmetry.hipHeightDiff) {
      const diff = Math.abs(staticMetrics.asymmetry.hipHeightDiff);
      if (diff > 0.01) {
        asymmetries.push({
          type: 'hip_height',
          leftValue: 0, // Normalized value
          rightValue: staticMetrics.asymmetry.hipHeightDiff || 0,
          difference: diff * 100, // Convert to percentage
          significance: diff > 0.04 ? 'significant' : diff > 0.02 ? 'moderate' : 'minor',
          description: `Dislivello del bacino del ${(diff * 100).toFixed(1)}%`,
        });
      }
    }

    // Shoulder height asymmetry
    if (staticMetrics?.asymmetry.shoulderHeightDiff) {
      const diff = Math.abs(staticMetrics.asymmetry.shoulderHeightDiff);
      if (diff > 0.01) {
        asymmetries.push({
          type: 'shoulder_height',
          leftValue: 0,
          rightValue: staticMetrics.asymmetry.shoulderHeightDiff || 0,
          difference: diff * 100,
          significance: diff > 0.04 ? 'significant' : diff > 0.02 ? 'moderate' : 'minor',
          description: `Dislivello delle spalle del ${(diff * 100).toFixed(1)}%`,
        });
      }
    }

    // Hip angle asymmetry
    if (angles.leftHipAngle !== null && angles.rightHipAngle !== null) {
      const diff = Math.abs(angles.leftHipAngle - angles.rightHipAngle);
      if (diff > 5) {
        asymmetries.push({
          type: 'hip_height', // Reuse type for hip angle
          leftValue: angles.leftHipAngle,
          rightValue: angles.rightHipAngle,
          difference: diff,
          significance: diff > 12 ? 'significant' : diff > 8 ? 'moderate' : 'minor',
          description: `Differenza di ${diff.toFixed(1)}° tra angolo anca sinistra e destra`,
        });
      }
    }

    return asymmetries;
  }, []);

  /**
   * Generate instability observations from metrics
   */
  const generateInstabilities = useCallback((
    patternFlags: StaticPatternFlags,
    staticMetrics: StaticMetrics | null
  ): InstabilityObservation[] => {
    const instabilities: InstabilityObservation[] = [];

    if (staticMetrics) {
      // Total sway
      if (staticMetrics.comSway.swayTotal > 0.01) {
        const severity = staticMetrics.comSway.swayTotal > 0.035
          ? 'severe'
          : staticMetrics.comSway.swayTotal > 0.02
            ? 'moderate'
            : 'mild';
        instabilities.push({
          type: 'sway',
          severity,
          description: `Oscillazione del centro di massa: ${(staticMetrics.comSway.swayTotal * 100).toFixed(1)}%`,
        });
      }

      // High variability
      const highVariability = Object.values(staticMetrics.angleVariability).some(v => v > 8);
      if (highVariability) {
        instabilities.push({
          type: 'wobble',
          severity: 'moderate',
          description: 'Alta variabilità negli angoli articolari durante il mantenimento della posizione',
        });
      }
    }

    // Pattern-based instabilities
    if (patternFlags.static_instability) {
      instabilities.push({
        type: 'compensation',
        severity: 'moderate',
        description: 'Pattern di instabilità posturale rilevato',
      });
    }

    if (patternFlags.static_trunk_compensation) {
      instabilities.push({
        type: 'compensation',
        severity: 'mild',
        description: 'Compensazione del tronco per mantenere l\'equilibrio',
      });
    }

    return instabilities;
  }, []);

  /**
   * Record an exercise assessment result
   */
  const recordExerciseResult = useCallback((
    exercise: StaticExercise,
    angles: StaticAngles,
    patternFlags: StaticPatternFlags,
    staticMetrics: StaticMetrics | null,
    durationSeconds: number,
    pain?: AssessmentPainEntry
  ): ExerciseAssessmentResult => {
    // Convert angles to record format
    const measuredAngles = {
      leftKnee: angles.leftKnee,
      rightKnee: angles.rightKnee,
      leftHipAngle: angles.leftHipAngle,
      rightHipAngle: angles.rightHipAngle,
      leftAnkle: angles.leftAnkle,
      rightAnkle: angles.rightAnkle,
      trunkLean: angles.trunkLean,
    };

    // Calculate deviations from standard
    const angleRecord: Record<string, number | null> = {};
    if (angles.leftKnee !== null) angleRecord.leftKnee = angles.leftKnee;
    if (angles.rightKnee !== null) angleRecord.rightKnee = angles.rightKnee;
    if (angles.leftHipAngle !== null) angleRecord.leftHipAngle = angles.leftHipAngle;
    if (angles.rightHipAngle !== null) angleRecord.rightHipAngle = angles.rightHipAngle;
    if (angles.leftAnkle !== null) angleRecord.leftAnkle = angles.leftAnkle;
    if (angles.rightAnkle !== null) angleRecord.rightAnkle = angles.rightAnkle;
    if (angles.trunkLean !== null) angleRecord.trunkLean = angles.trunkLean;

    const angleDeviations = calculateAngleDeviations(exercise.id, angleRecord);

    // Generate observations
    const asymmetries = generateAsymmetries(angles, staticMetrics);
    const instabilities = generateInstabilities(patternFlags, staticMetrics);

    // Static metrics summary
    const metricsSum = {
      totalSway: staticMetrics?.comSway.swayTotal || 0,
      swayX: staticMetrics?.comSway.swayX || 0,
      swayY: staticMetrics?.comSway.swayY || 0,
      angleVariability: staticMetrics?.angleVariability || {},
    };

    // Calculate score
    const score = calculateAssessmentScore(angleDeviations, metricsSum, patternFlags, asymmetries);
    const status = getStatusFromScore(score);

    // Generate recommendations
    const exerciseRecs = generateExerciseRecommendations(
      exercise.id,
      patternFlags,
      asymmetries,
      instabilities,
      angleDeviations
    );
    const muscleRecs = generateMuscleRecommendations(patternFlags, asymmetries, exercise.category);
    const patternRecs = generatePatternRecommendations(patternFlags, instabilities, exercise.category);

    // Generate summary
    const summary = generateAssessmentSummary(
      exercise.name,
      score,
      patternFlags,
      asymmetries,
      instabilities
    );

    // Predict probable pains
    const probablePains = predictProbablePains(
      patternFlags,
      asymmetries,
      instabilities,
      angleDeviations,
      exercise.category
    );

    const result: ExerciseAssessmentResult = {
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      category: exercise.category,
      timestamp: Date.now(),
      durationSeconds,
      measuredAngles,
      angleDeviations,
      patternFlags,
      staticMetrics: metricsSum,
      asymmetries,
      instabilities,
      pain,
      score,
      status,
      recommendations: {
        exercises: exerciseRecs,
        muscles: muscleRecs,
        patterns: patternRecs,
      },
      probablePains,
      summary,
    };

    // Update state
    setExerciseResults(prev => {
      const newMap = new Map(prev);
      newMap.set(exercise.id, result);
      return newMap;
    });

    // Update session
    if (sessionRef.current) {
      const existingIndex = sessionRef.current.exercises.findIndex(
        e => e.exerciseId === exercise.id
      );
      if (existingIndex >= 0) {
        sessionRef.current.exercises[existingIndex] = result;
      } else {
        sessionRef.current.exercises.push(result);
      }
      setCurrentSession({ ...sessionRef.current });
    }

    setHasUnsavedResults(true);
    return result;
  }, [generateAsymmetries, generateInstabilities]);

  /**
   * Get result for a specific exercise
   */
  const getExerciseResult = useCallback((exerciseId: string): ExerciseAssessmentResult | undefined => {
    return exerciseResults.get(exerciseId);
  }, [exerciseResults]);

  /**
   * Clear result for an exercise
   */
  const clearExerciseResult = useCallback((exerciseId: string) => {
    setExerciseResults(prev => {
      const newMap = new Map(prev);
      newMap.delete(exerciseId);
      return newMap;
    });

    if (sessionRef.current) {
      sessionRef.current.exercises = sessionRef.current.exercises.filter(
        e => e.exerciseId !== exerciseId
      );
      setCurrentSession({ ...sessionRef.current });
    }
  }, []);

  /**
   * End the current session and generate final summary
   */
  const endSession = useCallback((): AssessmentSession | null => {
    if (!sessionRef.current) return null;

    const session = sessionRef.current;
    session.endTimestamp = Date.now();

    // Calculate global recommendations
    const allExerciseRecs = session.exercises.map(e => e.recommendations.exercises);
    const allMuscleRecs = session.exercises.map(e => e.recommendations.muscles);
    const allPatternRecs = session.exercises.map(e => e.recommendations.patterns);

    session.globalRecommendations = aggregateRecommendations(
      allExerciseRecs,
      allMuscleRecs,
      allPatternRecs
    );

    // Calculate session summary
    const scores = session.exercises.map(e => e.score);
    const averageScore = scores.length > 0
      ? scores.reduce((a, b) => a + b, 0) / scores.length
      : 0;

    // Find common issues
    const issueCount = new Map<string, number>();
    for (const ex of session.exercises) {
      for (const [flag, value] of Object.entries(ex.patternFlags)) {
        if (value) {
          issueCount.set(flag, (issueCount.get(flag) || 0) + 1);
        }
      }
    }
    const commonIssues = Array.from(issueCount.entries())
      .filter(([_, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .map(([issue]) => issue.replace('static_', '').replace(/_/g, ' '));

    // Find strengths (exercises with score >= 85)
    const strengths = session.exercises
      .filter(e => e.score >= 85)
      .map(e => e.exerciseName);

    // Find areas for improvement (exercises with score < 70)
    const areasForImprovement = session.exercises
      .filter(e => e.score < 70)
      .map(e => e.exerciseName);

    session.sessionSummary = {
      exercisesCompleted: session.exercises.length,
      averageScore: Math.round(averageScore),
      commonIssues,
      strengths,
      areasForImprovement,
    };

    // Save to storage
    saveSessionToStorage(session);
    setCurrentSession({ ...session });
    setHasUnsavedResults(false);

    return session;
  }, []);

  /**
   * Download session as JSON
   */
  const downloadSession = useCallback((filename?: string) => {
    if (!sessionRef.current) return;

    // Ensure session is finalized
    if (!sessionRef.current.endTimestamp) {
      endSession();
    }

    downloadSessionAsJson(sessionRef.current, filename);
  }, [endSession]);

  /**
   * Import session from JSON string
   */
  const importSession = useCallback((jsonString: string): boolean => {
    try {
      const parsed = JSON.parse(jsonString) as AssessmentSession;

      // Validate structure
      if (!parsed.sessionId || !parsed.exercises || !Array.isArray(parsed.exercises)) {
        return false;
      }

      // Set as current session
      setCurrentSession(parsed);
      sessionRef.current = parsed;

      // Populate exercise results map
      const resultsMap = new Map<string, ExerciseAssessmentResult>();
      for (const ex of parsed.exercises) {
        resultsMap.set(ex.exerciseId, ex);
      }
      setExerciseResults(resultsMap);
      setHasUnsavedResults(false);

      return true;
    } catch {
      return false;
    }
  }, []);

  return {
    currentSession,
    exerciseResults,
    reportMode,
    setReportMode,
    config,
    updateConfig,
    startSession,
    endSession,
    recordExerciseResult,
    getExerciseResult,
    clearExerciseResult,
    downloadSession,
    importSession,
    hasUnsavedResults,
  };
}

export default useAssessment;
