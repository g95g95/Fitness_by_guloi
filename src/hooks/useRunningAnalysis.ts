/**
 * BiomechCoach - Running Analysis Hook
 *
 * Real-time analysis of running biomechanics.
 * Computes key angles, detects gait phases, and aggregates metrics.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  PoseFrame,
  AngleStats,
  AngleName,
  Suggestion,
  MuscleInsight,
  RunningThresholds,
  DEFAULT_RUNNING_THRESHOLDS,
  RunningPatternFlags,
  SymmetryMetrics,
  FrontalMetrics,
  ExtendedAnalysisSummary,
  ViewType,
} from '../lib/poseTypes';
import {
  angleBetweenPoints,
  angleFromVertical,
  keypointToPoint,
  getKeypointByName,
  rollingAverage,
  findMin,
  findMax,
  normalizedHorizontalDistance,
  normalizedVerticalDistance,
  Point2D,
} from '../lib/vectorMath';
import {
  GaitPhaseData,
  generateRunningSuggestions,
  generateRunningMuscleInsights,
} from '../lib/runningHeuristics';
import {
  detectRunningPatterns,
  generatePatternSuggestions,
} from '../lib/patterns/runningPatterns';
import { computeSymmetryMetrics } from '../lib/symmetry';

/**
 * Configuration for running analysis
 */
export interface RunningAnalysisConfig {
  /** Number of frames to keep in rolling buffer */
  bufferSize: number;
  /** Minimum frames between stride detections */
  minStrideFrames: number;
  /** Thresholds for gait analysis */
  thresholds: RunningThresholds;
}

const DEFAULT_CONFIG: RunningAnalysisConfig = {
  bufferSize: 150, // ~5 seconds at 30fps
  minStrideFrames: 15, // ~0.5 seconds between strides
  thresholds: DEFAULT_RUNNING_THRESHOLDS,
};

/**
 * Real-time angle values for running
 */
export interface RunningAngles {
  leftKnee: number | null;
  rightKnee: number | null;
  leftHipAngle: number | null;
  rightHipAngle: number | null;
  leftAnkle: number | null;
  rightAnkle: number | null;
  trunkLean: number | null;
}

/**
 * Hook return type
 */
export interface UseRunningAnalysisReturn {
  /** Process a new pose frame */
  processFrame: (frame: PoseFrame, frameWidth: number, frameHeight: number) => void;
  /** Current real-time angles */
  currentAngles: RunningAngles;
  /** Aggregated angle statistics */
  angleStats: Record<string, AngleStats>;
  /** Current suggestions */
  suggestions: Suggestion[];
  /** Muscle insights */
  muscleInsights: MuscleInsight[];
  /** Number of detected gait cycles (strides) */
  strideCount: number;
  /** Estimated cadence (steps per minute) */
  cadence: number;
  /** Reset all analysis data */
  reset: () => void;
  /** Get full analysis summary */
  getSummary: () => ExtendedAnalysisSummary;
  /** Analysis duration in ms */
  duration: number;
  /** Current gait phase */
  gaitPhase: 'left_stance' | 'right_stance' | 'flight' | 'unknown';
  /** Detected pattern flags */
  patternFlags: RunningPatternFlags;
  /** Symmetry metrics */
  symmetryMetrics: SymmetryMetrics;
  /** Update frontal metrics from front view analysis */
  setFrontalMetrics: (metrics: FrontalMetrics | null) => void;
  /** Get gait data for external use */
  getGaitData: () => GaitPhaseData;
}

/**
 * Gait phase detection state
 */
interface GaitState {
  leftAnkleYHistory: number[];
  rightAnkleYHistory: number[];
  lastLeftContactFrame: number;
  lastRightContactFrame: number;
  strideTimestamps: number[];
}

/**
 * Custom hook for running biomechanics analysis
 */
export function useRunningAnalysis(
  config: Partial<RunningAnalysisConfig> = {}
): UseRunningAnalysisReturn {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  // State for current angles
  const [currentAngles, setCurrentAngles] = useState<RunningAngles>({
    leftKnee: null,
    rightKnee: null,
    leftHipAngle: null,
    rightHipAngle: null,
    leftAnkle: null,
    rightAnkle: null,
    trunkLean: null,
  });

  // State for aggregated stats
  const [angleStats, setAngleStats] = useState<Record<string, AngleStats>>({});
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [muscleInsights, setMuscleInsights] = useState<MuscleInsight[]>([]);
  const [strideCount, setStrideCount] = useState<number>(0);
  const [cadence, setCadence] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [gaitPhase, setGaitPhase] = useState<'left_stance' | 'right_stance' | 'flight' | 'unknown'>('unknown');

  // New state for pattern detection and symmetry
  const [patternFlags, setPatternFlags] = useState<RunningPatternFlags>({});
  const [symmetryMetrics, setSymmetryMetrics] = useState<SymmetryMetrics>({});
  const [frontalMetrics, setFrontalMetricsState] = useState<FrontalMetrics | null>(null);

  // Refs for internal buffers
  const angleBuffersRef = useRef<Record<string, (number | null)[]>>({
    left_knee_midstance: [],
    right_knee_midstance: [],
    left_hip_extension: [],
    right_hip_extension: [],
    left_ankle_angle: [],
    right_ankle_angle: [],
    trunk_lean: [],
  });

  // Gait state tracking
  const gaitStateRef = useRef<GaitState>({
    leftAnkleYHistory: [],
    rightAnkleYHistory: [],
    lastLeftContactFrame: 0,
    lastRightContactFrame: 0,
    strideTimestamps: [],
  });

  // Gait data for heuristics
  const gaitDataRef = useRef<GaitPhaseData>({
    isLeftStance: false,
    isRightStance: false,
    leftAnkleHipDistance: null,
    rightAnkleHipDistance: null,
    leftHipYDiff: null,
    rightHipYDiff: null,
  });

  const frameCountRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  /**
   * Compute angles from a pose frame
   */
  const computeAngles = useCallback((frame: PoseFrame): RunningAngles => {
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
   * Detect gait phase based on ankle vertical position
   * Returns 'stance' when foot is at lowest point, 'swing' otherwise
   */
  const detectGaitPhase = useCallback(
    (
      leftAnkle: Point2D | null,
      rightAnkle: Point2D | null,
      leftHip: Point2D | null,
      rightHip: Point2D | null,
      frameWidth: number,
      frameHeight: number,
      timestamp: number
    ) => {
      const gaitState = gaitStateRef.current;

      // Track ankle Y positions
      if (leftAnkle) {
        gaitState.leftAnkleYHistory.push(leftAnkle.y);
        if (gaitState.leftAnkleYHistory.length > 20) {
          gaitState.leftAnkleYHistory.shift();
        }
      }

      if (rightAnkle) {
        gaitState.rightAnkleYHistory.push(rightAnkle.y);
        if (gaitState.rightAnkleYHistory.length > 20) {
          gaitState.rightAnkleYHistory.shift();
        }
      }

      // Detect stance phase (foot at lowest position)
      // In screen coordinates, highest Y = lowest position
      const leftHistory = gaitState.leftAnkleYHistory;
      const rightHistory = gaitState.rightAnkleYHistory;

      let isLeftStance = false;
      let isRightStance = false;

      // Left foot stance detection
      if (leftHistory.length >= 5) {
        const recent = leftHistory.slice(-5);
        const current = recent[recent.length - 1];
        const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
        const isAtLow = current >= avg * 0.98; // Within 2% of average (at low point)

        if (isAtLow && frameCountRef.current - gaitState.lastLeftContactFrame > finalConfig.minStrideFrames) {
          isLeftStance = true;
          gaitState.lastLeftContactFrame = frameCountRef.current;
          gaitState.strideTimestamps.push(timestamp);

          // Keep only recent timestamps for cadence calculation
          if (gaitState.strideTimestamps.length > 20) {
            gaitState.strideTimestamps.shift();
          }

          setStrideCount((c) => c + 1);
        }
      }

      // Right foot stance detection
      if (rightHistory.length >= 5) {
        const recent = rightHistory.slice(-5);
        const current = recent[recent.length - 1];
        const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
        const isAtLow = current >= avg * 0.98;

        if (isAtLow && frameCountRef.current - gaitState.lastRightContactFrame > finalConfig.minStrideFrames) {
          isRightStance = true;
          gaitState.lastRightContactFrame = frameCountRef.current;
          gaitState.strideTimestamps.push(timestamp);

          if (gaitState.strideTimestamps.length > 20) {
            gaitState.strideTimestamps.shift();
          }

          setStrideCount((c) => c + 1);
        }
      }

      // Update gait data for heuristics
      gaitDataRef.current.isLeftStance = isLeftStance;
      gaitDataRef.current.isRightStance = isRightStance;

      // Calculate ankle-hip horizontal distance (for overstriding detection)
      if (leftAnkle && leftHip) {
        gaitDataRef.current.leftAnkleHipDistance = normalizedHorizontalDistance(
          leftAnkle,
          leftHip,
          frameWidth
        );
      }
      if (rightAnkle && rightHip) {
        gaitDataRef.current.rightAnkleHipDistance = normalizedHorizontalDistance(
          rightAnkle,
          rightHip,
          frameWidth
        );
      }

      // Calculate hip drop (Y difference between hips)
      if (leftHip && rightHip) {
        gaitDataRef.current.leftHipYDiff = normalizedVerticalDistance(leftHip, rightHip, frameHeight);
        gaitDataRef.current.rightHipYDiff = normalizedVerticalDistance(rightHip, leftHip, frameHeight);
      }

      // Calculate cadence from stride timestamps
      const timestamps = gaitState.strideTimestamps;
      if (timestamps.length >= 4) {
        const timeSpan = timestamps[timestamps.length - 1] - timestamps[0];
        const steps = timestamps.length - 1;
        const stepsPerMs = steps / timeSpan;
        const stepsPerMinute = stepsPerMs * 60000;
        setCadence(Math.round(stepsPerMinute));
      }

      // Set gait phase state
      if (isLeftStance) {
        setGaitPhase('left_stance');
      } else if (isRightStance) {
        setGaitPhase('right_stance');
      } else {
        setGaitPhase('unknown');
      }
    },
    [finalConfig.minStrideFrames]
  );

  /**
   * Update angle statistics
   */
  const updateStats = useCallback(() => {
    const buffers = angleBuffersRef.current;
    const newStats: Record<string, AngleStats> = {};

    const angleNames: AngleName[] = [
      'left_knee_midstance',
      'right_knee_midstance',
      'left_hip_extension',
      'right_hip_extension',
      'trunk_lean',
    ];

    for (const name of angleNames) {
      const buffer = buffers[name] || [];
      const validValues = buffer.filter((v): v is number => v !== null);

      newStats[name] = {
        name,
        current: buffer.length > 0 ? buffer[buffer.length - 1] : null,
        avg: rollingAverage(buffer),
        min: findMin(buffer),
        max: findMax(buffer),
        samples: validValues.length,
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

      // Compute current angles
      const angles = computeAngles(frame);
      setCurrentAngles(angles);

      // Get keypoints for gait analysis
      const leftAnkle = keypointToPoint(getKeypointByName(frame.keypoints, 'left_ankle'));
      const rightAnkle = keypointToPoint(getKeypointByName(frame.keypoints, 'right_ankle'));
      const leftHip = keypointToPoint(getKeypointByName(frame.keypoints, 'left_hip'));
      const rightHip = keypointToPoint(getKeypointByName(frame.keypoints, 'right_hip'));

      // Detect gait phase
      detectGaitPhase(leftAnkle, rightAnkle, leftHip, rightHip, frameWidth, frameHeight, frame.timestamp);

      // Update buffers based on gait phase
      const buffers = angleBuffersRef.current;

      // Record knee angle at midstance
      if (gaitDataRef.current.isLeftStance && angles.leftKnee !== null) {
        buffers.left_knee_midstance.push(angles.leftKnee);
      }
      if (gaitDataRef.current.isRightStance && angles.rightKnee !== null) {
        buffers.right_knee_midstance.push(angles.rightKnee);
      }

      // Record hip extension (track max extension over time)
      if (angles.leftHipAngle !== null) {
        buffers.left_hip_extension.push(angles.leftHipAngle);
      }
      if (angles.rightHipAngle !== null) {
        buffers.right_hip_extension.push(angles.rightHipAngle);
      }

      // Always record trunk lean
      if (angles.trunkLean !== null) {
        buffers.trunk_lean.push(angles.trunkLean);
      }

      // Trim buffers
      for (const key of Object.keys(buffers)) {
        if (buffers[key].length > finalConfig.bufferSize) {
          buffers[key].shift();
        }
      }

      // Update stats periodically
      if (frameCountRef.current % 5 === 0) {
        const stats = updateStats();

        // Generate basic suggestions
        const baseSuggestions = generateRunningSuggestions(stats, gaitDataRef.current, finalConfig.thresholds);

        // Detect patterns and generate pattern-based suggestions
        const patterns = detectRunningPatterns(stats, gaitDataRef.current, frontalMetrics);
        setPatternFlags(patterns);

        const patternSuggestions = generatePatternSuggestions(patterns);

        // Merge suggestions (avoid duplicates by ID)
        const allSuggestions = [...baseSuggestions];
        for (const ps of patternSuggestions) {
          if (!allSuggestions.some((s) => s.id === ps.id)) {
            allSuggestions.push(ps);
          }
        }
        setSuggestions(allSuggestions);

        // Compute symmetry metrics
        const symmetry = computeSymmetryMetrics(
          stats['left_hip_extension'] || null,
          stats['right_hip_extension'] || null,
          stats['left_knee_midstance'] || null,
          stats['right_knee_midstance'] || null,
          frontalMetrics
        );
        setSymmetryMetrics(symmetry);

        setMuscleInsights(generateRunningMuscleInsights(stats));
      }
    },
    [computeAngles, detectGaitPhase, updateStats, finalConfig, frontalMetrics]
  );

  /**
   * Reset all analysis data
   */
  const reset = useCallback(() => {
    // Reset buffers
    angleBuffersRef.current = {
      left_knee_midstance: [],
      right_knee_midstance: [],
      left_hip_extension: [],
      right_hip_extension: [],
      left_ankle_angle: [],
      right_ankle_angle: [],
      trunk_lean: [],
    };

    gaitStateRef.current = {
      leftAnkleYHistory: [],
      rightAnkleYHistory: [],
      lastLeftContactFrame: 0,
      lastRightContactFrame: 0,
      strideTimestamps: [],
    };

    gaitDataRef.current = {
      isLeftStance: false,
      isRightStance: false,
      leftAnkleHipDistance: null,
      rightAnkleHipDistance: null,
      leftHipYDiff: null,
      rightHipYDiff: null,
    };

    frameCountRef.current = 0;
    startTimeRef.current = 0;

    // Reset state
    setCurrentAngles({
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
    setStrideCount(0);
    setCadence(0);
    setDuration(0);
    setGaitPhase('unknown');
    setPatternFlags({});
    setSymmetryMetrics({});
    setFrontalMetricsState(null);
  }, []);

  /**
   * Get full analysis summary (extended)
   */
  const getSummary = useCallback((): ExtendedAnalysisSummary => {
    const viewsUsed: ViewType[] = ['side'];
    if (frontalMetrics) {
      viewsUsed.push('front');
    }

    return {
      mode: 'running',
      duration,
      angles: angleStats,
      suggestions,
      muscleInsights,
      cycleCount: strideCount,
      pattern_flags: patternFlags,
      symmetry: symmetryMetrics,
      frontal_metrics: frontalMetrics || undefined,
      views_used: viewsUsed,
    };
  }, [duration, angleStats, suggestions, muscleInsights, strideCount, patternFlags, symmetryMetrics, frontalMetrics]);

  /**
   * Set frontal metrics from external frontal analysis
   */
  const setFrontalMetrics = useCallback((metrics: FrontalMetrics | null) => {
    setFrontalMetricsState(metrics);
  }, []);

  /**
   * Get current gait data for external use
   */
  const getGaitData = useCallback((): GaitPhaseData => {
    return { ...gaitDataRef.current };
  }, []);

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
    strideCount,
    cadence,
    reset,
    getSummary,
    duration,
    gaitPhase,
    patternFlags,
    symmetryMetrics,
    setFrontalMetrics,
    getGaitData,
  };
}

export default useRunningAnalysis;
