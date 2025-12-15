/**
 * BiomechCoach - Static Analysis Hook
 *
 * Real-time analysis of static assessment exercises.
 * Computes stability metrics, detects compensatory patterns,
 * and generates feedback for postural/control tests.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  PoseFrame,
  AngleStats,
  Suggestion,
  MuscleInsight,
  StaticThresholds,
  DEFAULT_STATIC_THRESHOLDS,
  StaticPatternFlags,
  StaticMetrics,
  FrontalMetrics,
  StaticAnalysisSummary,
  StaticExercise,
  ViewType,
} from '../lib/poseTypes';
import {
  angleBetweenPoints,
  angleFromVertical,
  keypointToPoint,
  getKeypointByName,
} from '../lib/vectorMath';
import {
  StaticRawMetrics,
  createEmptyRawMetrics,
  computeStaticMetrics,
  generateStaticPatternSuggestions,
  mean,
} from '../lib/patterns/staticPatterns';
import {
  generateStaticSuggestions,
  generateStaticMuscleInsights,
  getStaticAnalysisSummary,
} from '../lib/staticHeuristics';

/**
 * Configuration for static analysis
 */
export interface StaticAnalysisConfig {
  /** Thresholds for pattern detection */
  thresholds: StaticThresholds;
  /** Update interval in frames (how often to recalculate stats) */
  updateInterval: number;
}

const DEFAULT_CONFIG: StaticAnalysisConfig = {
  thresholds: DEFAULT_STATIC_THRESHOLDS,
  updateInterval: 5,
};

/**
 * Real-time angle values for static analysis
 */
export interface StaticAngles {
  leftKnee: number | null;
  rightKnee: number | null;
  leftHipAngle: number | null;
  rightHipAngle: number | null;
  leftAnkle: number | null;
  rightAnkle: number | null;
  trunkLean: number | null;
}

/**
 * Recording state for static session
 */
export interface RecordingState {
  isRecording: boolean;
  startTime: number | null;
  elapsedSeconds: number;
  targetDuration: number;
  frames: PoseFrame[];
}

/**
 * Accumulated angles during recording for averaging
 */
export interface AccumulatedAngles {
  leftKnee: number[];
  rightKnee: number[];
  leftHipAngle: number[];
  rightHipAngle: number[];
  leftAnkle: number[];
  rightAnkle: number[];
  trunkLean: number[];
}

/**
 * Hook return type
 */
export interface UseStaticAnalysisReturn {
  /** Process a new pose frame */
  processFrame: (frame: PoseFrame, frameWidth: number, frameHeight: number) => void;
  /** Current real-time angles */
  currentAngles: StaticAngles;
  /** Aggregated angle statistics */
  angleStats: Record<string, AngleStats>;
  /** Current suggestions */
  suggestions: Suggestion[];
  /** Muscle insights */
  muscleInsights: MuscleInsight[];
  /** Reset all analysis data */
  reset: () => void;
  /** Get full analysis summary */
  getSummary: () => StaticAnalysisSummary;
  /** Analysis duration in ms */
  duration: number;
  /** Detected pattern flags */
  patternFlags: StaticPatternFlags;
  /** Computed static metrics */
  staticMetrics: StaticMetrics | null;
  /** Set current exercise */
  setExercise: (exercise: StaticExercise | null) => void;
  /** Current exercise */
  currentExercise: StaticExercise | null;
  /** Update frontal metrics from front view analysis */
  setFrontalMetrics: (metrics: FrontalMetrics | null) => void;
  /** Recording state */
  recording: RecordingState;
  /** Start recording session */
  startRecording: (durationSeconds?: number) => void;
  /** Stop recording session */
  stopRecording: () => void;
  /** Analysis summary text */
  summaryText: string;
  /** Averaged angles from recording (available after recording stops) */
  averagedAngles: StaticAngles;
}

/**
 * Custom hook for static assessment analysis
 */
export function useStaticAnalysis(
  config: Partial<StaticAnalysisConfig> = {}
): UseStaticAnalysisReturn {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  // State for current angles
  const [currentAngles, setCurrentAngles] = useState<StaticAngles>({
    leftKnee: null,
    rightKnee: null,
    leftHipAngle: null,
    rightHipAngle: null,
    leftAnkle: null,
    rightAnkle: null,
    trunkLean: null,
  });

  // State for aggregated data
  const [angleStats, setAngleStats] = useState<Record<string, AngleStats>>({});
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [muscleInsights, setMuscleInsights] = useState<MuscleInsight[]>([]);
  const [duration, setDuration] = useState<number>(0);
  const [patternFlags, setPatternFlags] = useState<StaticPatternFlags>({});
  const [staticMetrics, setStaticMetrics] = useState<StaticMetrics | null>(null);
  const [currentExercise, setCurrentExercise] = useState<StaticExercise | null>(null);
  const [frontalMetrics, setFrontalMetricsState] = useState<FrontalMetrics | null>(null);
  const [summaryText, setSummaryText] = useState<string>('');

  // Recording state
  const [recording, setRecording] = useState<RecordingState>({
    isRecording: false,
    startTime: null,
    elapsedSeconds: 0,
    targetDuration: 20,
    frames: [],
  });

  // Accumulated angles during recording
  const accumulatedAnglesRef = useRef<AccumulatedAngles>({
    leftKnee: [],
    rightKnee: [],
    leftHipAngle: [],
    rightHipAngle: [],
    leftAnkle: [],
    rightAnkle: [],
    trunkLean: [],
  });

  // Averaged angles (calculated after recording stops)
  const [averagedAngles, setAveragedAngles] = useState<StaticAngles>({
    leftKnee: null,
    rightKnee: null,
    leftHipAngle: null,
    rightHipAngle: null,
    leftAnkle: null,
    rightAnkle: null,
    trunkLean: null,
  });

  // Refs for internal data
  const rawMetricsRef = useRef<StaticRawMetrics>(createEmptyRawMetrics());
  const frameCountRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const recordingFramesRef = useRef<PoseFrame[]>([]);

  /**
   * Compute angles from a pose frame
   */
  const computeAngles = useCallback((frame: PoseFrame): StaticAngles => {
    const kp = frame.keypoints;

    // Get keypoints
    const leftShoulder = keypointToPoint(getKeypointByName(kp, 'left_shoulder'));
    const rightShoulder = keypointToPoint(getKeypointByName(kp, 'right_shoulder'));
    const leftHip = keypointToPoint(getKeypointByName(kp, 'left_hip'));
    const rightHip = keypointToPoint(getKeypointByName(kp, 'right_hip'));
    const leftKnee = keypointToPoint(getKeypointByName(kp, 'left_knee'));
    const rightKnee = keypointToPoint(getKeypointByName(kp, 'right_knee'));
    const leftAnkle = keypointToPoint(getKeypointByName(kp, 'left_ankle'));
    const rightAnkle = keypointToPoint(getKeypointByName(kp, 'right_ankle'));
    const leftFoot = keypointToPoint(getKeypointByName(kp, 'left_foot_index'));
    const rightFoot = keypointToPoint(getKeypointByName(kp, 'right_foot_index'));

    // Compute knee angles (hip-knee-ankle)
    const leftKneeAngle = angleBetweenPoints(leftHip, leftKnee, leftAnkle);
    const rightKneeAngle = angleBetweenPoints(rightHip, rightKnee, rightAnkle);

    // Compute hip angles (shoulder-hip-knee)
    const leftHipAngle = angleBetweenPoints(leftShoulder, leftHip, leftKnee);
    const rightHipAngle = angleBetweenPoints(rightShoulder, rightHip, rightKnee);

    // Compute ankle angles
    const leftAnkleAngle = angleBetweenPoints(leftKnee, leftAnkle, leftFoot);
    const rightAnkleAngle = angleBetweenPoints(rightKnee, rightAnkle, rightFoot);

    // Compute trunk lean from vertical
    const shoulderMid =
      leftShoulder && rightShoulder
        ? { x: (leftShoulder.x + rightShoulder.x) / 2, y: (leftShoulder.y + rightShoulder.y) / 2 }
        : leftShoulder || rightShoulder;
    const hipMid =
      leftHip && rightHip
        ? { x: (leftHip.x + rightHip.x) / 2, y: (leftHip.y + rightHip.y) / 2 }
        : leftHip || rightHip;
    const trunkLean = angleFromVertical(shoulderMid, hipMid);

    return {
      leftKnee: leftKneeAngle,
      rightKnee: rightKneeAngle,
      leftHipAngle,
      rightHipAngle,
      leftAnkle: leftAnkleAngle,
      rightAnkle: rightAnkleAngle,
      trunkLean,
    };
  }, []);

  /**
   * Update raw metrics from pose frame
   */
  const updateRawMetrics = useCallback((frame: PoseFrame, frameWidth: number, frameHeight: number) => {
    const kp = frame.keypoints;
    const raw = rawMetricsRef.current;

    // Get keypoints
    const leftHip = keypointToPoint(getKeypointByName(kp, 'left_hip'));
    const rightHip = keypointToPoint(getKeypointByName(kp, 'right_hip'));
    const leftKnee = keypointToPoint(getKeypointByName(kp, 'left_knee'));
    const rightKnee = keypointToPoint(getKeypointByName(kp, 'right_knee'));
    const leftAnkle = keypointToPoint(getKeypointByName(kp, 'left_ankle'));
    const rightAnkle = keypointToPoint(getKeypointByName(kp, 'right_ankle'));
    const leftShoulder = keypointToPoint(getKeypointByName(kp, 'left_shoulder'));
    const rightShoulder = keypointToPoint(getKeypointByName(kp, 'right_shoulder'));

    // Update CoM proxy (mid-hip)
    if (leftHip && rightHip) {
      const comX = (leftHip.x + rightHip.x) / 2 / frameWidth;
      const comY = (leftHip.y + rightHip.y) / 2 / frameHeight;
      raw.comXHistory.push(comX);
      raw.comYHistory.push(comY);
    }

    // Update hip Y positions (normalized)
    if (leftHip) {
      raw.leftHipYHistory.push(leftHip.y / frameHeight);
    }
    if (rightHip) {
      raw.rightHipYHistory.push(rightHip.y / frameHeight);
    }

    // Update shoulder Y positions
    if (leftShoulder) {
      raw.leftShoulderYHistory.push(leftShoulder.y / frameHeight);
    }
    if (rightShoulder) {
      raw.rightShoulderYHistory.push(rightShoulder.y / frameHeight);
    }

    // Update knee positions
    if (leftKnee) {
      raw.leftKneeXHistory.push(leftKnee.x / frameWidth);
    }
    if (rightKnee) {
      raw.rightKneeXHistory.push(rightKnee.x / frameWidth);
    }

    // Update ankle positions
    if (leftAnkle) {
      raw.leftAnkleXHistory.push(leftAnkle.x / frameWidth);
    }
    if (rightAnkle) {
      raw.rightAnkleXHistory.push(rightAnkle.x / frameWidth);
    }

    // Update angle histories from current angles
    const angles = computeAngles(frame);
    if (angles.leftKnee !== null) {
      raw.leftKneeAngleHistory.push(angles.leftKnee);
    }
    if (angles.rightKnee !== null) {
      raw.rightKneeAngleHistory.push(angles.rightKnee);
    }
    if (angles.trunkLean !== null) {
      raw.trunkLeanHistory.push(angles.trunkLean);
    }
  }, [computeAngles]);

  /**
   * Update angle statistics
   */
  const updateStats = useCallback(() => {
    const raw = rawMetricsRef.current;
    const newStats: Record<string, AngleStats> = {};

    // Left knee stats
    if (raw.leftKneeAngleHistory.length > 0) {
      newStats['left_knee'] = {
        name: 'left_knee_flexion',
        current: raw.leftKneeAngleHistory[raw.leftKneeAngleHistory.length - 1],
        avg: mean(raw.leftKneeAngleHistory),
        min: Math.min(...raw.leftKneeAngleHistory),
        max: Math.max(...raw.leftKneeAngleHistory),
        samples: raw.leftKneeAngleHistory.length,
      };
    }

    // Right knee stats
    if (raw.rightKneeAngleHistory.length > 0) {
      newStats['right_knee'] = {
        name: 'right_knee_flexion',
        current: raw.rightKneeAngleHistory[raw.rightKneeAngleHistory.length - 1],
        avg: mean(raw.rightKneeAngleHistory),
        min: Math.min(...raw.rightKneeAngleHistory),
        max: Math.max(...raw.rightKneeAngleHistory),
        samples: raw.rightKneeAngleHistory.length,
      };
    }

    // Trunk lean stats
    if (raw.trunkLeanHistory.length > 0) {
      newStats['trunk_lean'] = {
        name: 'trunk_lean',
        current: raw.trunkLeanHistory[raw.trunkLeanHistory.length - 1],
        avg: mean(raw.trunkLeanHistory),
        min: Math.min(...raw.trunkLeanHistory),
        max: Math.max(...raw.trunkLeanHistory),
        samples: raw.trunkLeanHistory.length,
      };
    }

    setAngleStats(newStats);
    return newStats;
  }, []);

  /**
   * Process a new pose frame
   */
  const processFrame = useCallback(
    (frame: PoseFrame, frameWidth: number, frameHeight: number) => {
      if (!frame.isValid) return;

      // Initialize start time
      if (startTimeRef.current === 0) {
        startTimeRef.current = frame.timestamp;
      }

      // Update duration
      setDuration(frame.timestamp - startTimeRef.current);

      frameCountRef.current++;

      // Compute and set current angles
      const angles = computeAngles(frame);
      setCurrentAngles(angles);

      // Update raw metrics
      updateRawMetrics(frame, frameWidth, frameHeight);

      // If recording, store frame and accumulate angles
      if (recording.isRecording) {
        recordingFramesRef.current.push(frame);

        // Accumulate angles for averaging
        if (angles.leftKnee !== null) accumulatedAnglesRef.current.leftKnee.push(angles.leftKnee);
        if (angles.rightKnee !== null) accumulatedAnglesRef.current.rightKnee.push(angles.rightKnee);
        if (angles.leftHipAngle !== null) accumulatedAnglesRef.current.leftHipAngle.push(angles.leftHipAngle);
        if (angles.rightHipAngle !== null) accumulatedAnglesRef.current.rightHipAngle.push(angles.rightHipAngle);
        if (angles.leftAnkle !== null) accumulatedAnglesRef.current.leftAnkle.push(angles.leftAnkle);
        if (angles.rightAnkle !== null) accumulatedAnglesRef.current.rightAnkle.push(angles.rightAnkle);
        if (angles.trunkLean !== null) accumulatedAnglesRef.current.trunkLean.push(angles.trunkLean);

        // Update elapsed time using performance.now() for consistency
        if (recording.startTime) {
          const now = performance.now();
          const elapsed = (now - recording.startTime) / 1000;
          setRecording((prev) => ({
            ...prev,
            elapsedSeconds: elapsed,
            frames: recordingFramesRef.current,
          }));

          // Auto-stop when duration reached
          if (elapsed >= recording.targetDuration) {
            stopRecording();
          }
        }
      }

      // Update stats periodically - ONLY during recording
      if (recording.isRecording && frameCountRef.current % finalConfig.updateInterval === 0) {
        const stats = updateStats();

        // Compute static metrics
        const metrics = computeStaticMetrics(
          rawMetricsRef.current,
          frontalMetrics,
          finalConfig.thresholds
        );
        setStaticMetrics(metrics);
        setPatternFlags(metrics.patternFlags);

        // Generate suggestions
        const baseSuggestions = generateStaticSuggestions(metrics, currentExercise || undefined, stats);
        const patternSuggestions = generateStaticPatternSuggestions(metrics.patternFlags);

        // Merge suggestions
        const allSuggestions = [...baseSuggestions];
        for (const ps of patternSuggestions) {
          if (!allSuggestions.some((s) => s.id === ps.id)) {
            allSuggestions.push(ps);
          }
        }
        setSuggestions(allSuggestions);

        // Generate muscle insights
        setMuscleInsights(generateStaticMuscleInsights(metrics, currentExercise || undefined));

        // Update summary text
        setSummaryText(getStaticAnalysisSummary(metrics, currentExercise || undefined));
      }
    },
    [
      computeAngles,
      updateRawMetrics,
      updateStats,
      finalConfig,
      currentExercise,
      frontalMetrics,
      recording.isRecording,
      recording.startTime,
      recording.targetDuration,
    ]
  );

  /**
   * Start recording session
   */
  const startRecording = useCallback((durationSeconds: number = 20) => {
    recordingFramesRef.current = [];
    setRecording({
      isRecording: true,
      startTime: performance.now(),
      elapsedSeconds: 0,
      targetDuration: durationSeconds,
      frames: [],
    });
  }, []);

  /**
   * Stop recording session and calculate averaged angles
   */
  const stopRecording = useCallback(() => {
    // Calculate averaged angles from accumulated data
    const acc = accumulatedAnglesRef.current;
    const avgAngles: StaticAngles = {
      leftKnee: acc.leftKnee.length > 0 ? mean(acc.leftKnee) : null,
      rightKnee: acc.rightKnee.length > 0 ? mean(acc.rightKnee) : null,
      leftHipAngle: acc.leftHipAngle.length > 0 ? mean(acc.leftHipAngle) : null,
      rightHipAngle: acc.rightHipAngle.length > 0 ? mean(acc.rightHipAngle) : null,
      leftAnkle: acc.leftAnkle.length > 0 ? mean(acc.leftAnkle) : null,
      rightAnkle: acc.rightAnkle.length > 0 ? mean(acc.rightAnkle) : null,
      trunkLean: acc.trunkLean.length > 0 ? mean(acc.trunkLean) : null,
    };
    setAveragedAngles(avgAngles);

    setRecording((prev) => ({
      ...prev,
      isRecording: false,
      frames: recordingFramesRef.current,
    }));
  }, []);

  /**
   * Reset all analysis data
   */
  const reset = useCallback(() => {
    rawMetricsRef.current = createEmptyRawMetrics();
    frameCountRef.current = 0;
    startTimeRef.current = 0;
    recordingFramesRef.current = [];
    accumulatedAnglesRef.current = {
      leftKnee: [],
      rightKnee: [],
      leftHipAngle: [],
      rightHipAngle: [],
      leftAnkle: [],
      rightAnkle: [],
      trunkLean: [],
    };

    setCurrentAngles({
      leftKnee: null,
      rightKnee: null,
      leftHipAngle: null,
      rightHipAngle: null,
      leftAnkle: null,
      rightAnkle: null,
      trunkLean: null,
    });
    setAveragedAngles({
      leftKnee: null,
      rightKnee: null,
      leftHipAngle: null,
      rightHipAngle: null,
      leftAnkle: null,
      rightAnkle: null,
      trunkLean: null,
    });
    setAngleStats({});
    setSuggestions([]);
    setMuscleInsights([]);
    setDuration(0);
    setPatternFlags({});
    setStaticMetrics(null);
    setFrontalMetricsState(null);
    setSummaryText('');
    setRecording({
      isRecording: false,
      startTime: null,
      elapsedSeconds: 0,
      targetDuration: 20,
      frames: [],
    });
  }, []);

  /**
   * Set current exercise
   */
  const setExercise = useCallback((exercise: StaticExercise | null) => {
    setCurrentExercise(exercise);
    // Reset analysis when exercise changes
    reset();
  }, [reset]);

  /**
   * Set frontal metrics from external frontal analysis
   */
  const setFrontalMetrics = useCallback((metrics: FrontalMetrics | null) => {
    setFrontalMetricsState(metrics);
  }, []);

  /**
   * Get full analysis summary
   */
  const getSummary = useCallback((): StaticAnalysisSummary => {
    const viewsUsed: ViewType[] = ['side'];
    if (frontalMetrics) {
      viewsUsed.push('front');
    }

    return {
      mode: 'static',
      duration,
      angles: angleStats,
      suggestions,
      muscleInsights,
      static_exercise: currentExercise
        ? { id: currentExercise.id, name: currentExercise.name }
        : undefined,
      static_metrics: staticMetrics || undefined,
      pattern_flags: patternFlags,
      symmetry: staticMetrics?.asymmetry
        ? {
            knee_flexion_diff: staticMetrics.asymmetry.kneeAngleDiff,
            hip_drop_diff: staticMetrics.asymmetry.hipHeightDiff,
          }
        : undefined,
      frontal_metrics: frontalMetrics || undefined,
      views_used: viewsUsed,
    };
  }, [
    duration,
    angleStats,
    suggestions,
    muscleInsights,
    currentExercise,
    staticMetrics,
    patternFlags,
    frontalMetrics,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      reset();
    };
  }, [reset]);

  return {
    processFrame,
    currentAngles,
    angleStats,
    suggestions,
    muscleInsights,
    reset,
    getSummary,
    duration,
    patternFlags,
    staticMetrics,
    setExercise,
    currentExercise,
    setFrontalMetrics,
    recording,
    startRecording,
    stopRecording,
    summaryText,
    averagedAngles,
  };
}

export default useStaticAnalysis;
