/**
 * BiomechCoach - Cycling Analysis Hook
 *
 * Real-time analysis of cycling biomechanics.
 * Computes key angles, detects pedal cycles, and aggregates metrics.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  PoseFrame,
  AngleStats,
  AngleName,
  Suggestion,
  MuscleInsight,
  CyclingThresholds,
  DEFAULT_CYCLING_THRESHOLDS,
  CyclingPatternFlags,
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
  detectLocalMinimum,
  calculateKopsAngle,
} from '../lib/vectorMath';
import {
  generateCyclingSuggestions,
  generateCyclingMuscleInsights,
} from '../lib/cyclingHeuristics';
import {
  detectCyclingPatterns,
  generateCyclingPatternSuggestions,
} from '../lib/patterns/cyclingPatterns';
import { computeSymmetryMetrics } from '../lib/symmetry';

/**
 * Configuration for cycling analysis
 */
export interface CyclingAnalysisConfig {
  /** Number of frames to keep in rolling buffer */
  bufferSize: number;
  /** Minimum frames between cycle detections */
  minCycleFrames: number;
  /** Threshold for detecting ankle minimum (BDC) */
  bdcThreshold: number;
  /** Angle thresholds */
  thresholds: CyclingThresholds;
}

const DEFAULT_CONFIG: CyclingAnalysisConfig = {
  bufferSize: 150, // ~5 seconds at 30fps
  minCycleFrames: 20, // ~0.67 seconds between cycles
  bdcThreshold: 10,
  thresholds: DEFAULT_CYCLING_THRESHOLDS,
};

/**
 * Real-time angle values
 */
export interface CyclingAngles {
  leftKneeFlexion: number | null;
  rightKneeFlexion: number | null;
  leftHipAngle: number | null;
  rightHipAngle: number | null;
  leftAnkleAngle: number | null;
  rightAnkleAngle: number | null;
  trunkAngle: number | null;
  /** KOPS angle - tibial angle from vertical (positive = knee forward) */
  kopsAngle: number | null;
}

/**
 * Hook return type
 */
export interface UseCyclingAnalysisReturn {
  /** Process a new pose frame */
  processFrame: (frame: PoseFrame) => void;
  /** Current real-time angles */
  currentAngles: CyclingAngles;
  /** Aggregated angle statistics */
  angleStats: Record<string, AngleStats>;
  /** Current suggestions */
  suggestions: Suggestion[];
  /** Muscle insights */
  muscleInsights: MuscleInsight[];
  /** Number of detected pedal cycles */
  cycleCount: number;
  /** Reset all analysis data */
  reset: () => void;
  /** Get full analysis summary */
  getSummary: () => ExtendedAnalysisSummary;
  /** Analysis duration in ms */
  duration: number;
  /** Detected pattern flags */
  patternFlags: CyclingPatternFlags;
  /** Symmetry metrics */
  symmetryMetrics: SymmetryMetrics;
  /** Update frontal metrics from front view analysis */
  setFrontalMetrics: (metrics: FrontalMetrics | null) => void;
}

/**
 * Custom hook for cycling biomechanics analysis
 */
export function useCyclingAnalysis(
  config: Partial<CyclingAnalysisConfig> = {}
): UseCyclingAnalysisReturn {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  // State for current angles
  const [currentAngles, setCurrentAngles] = useState<CyclingAngles>({
    leftKneeFlexion: null,
    rightKneeFlexion: null,
    leftHipAngle: null,
    rightHipAngle: null,
    leftAnkleAngle: null,
    rightAnkleAngle: null,
    trunkAngle: null,
    kopsAngle: null,
  });

  // State for aggregated stats
  const [angleStats, setAngleStats] = useState<Record<string, AngleStats>>({});
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [muscleInsights, setMuscleInsights] = useState<MuscleInsight[]>([]);
  const [cycleCount, setCycleCount] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);

  // New state for pattern detection and symmetry
  const [patternFlags, setPatternFlags] = useState<CyclingPatternFlags>({});
  const [symmetryMetrics, setSymmetryMetrics] = useState<SymmetryMetrics>({});
  const [frontalMetrics, setFrontalMetricsState] = useState<FrontalMetrics | null>(null);

  // Refs for internal buffers
  const angleBuffersRef = useRef<Record<string, (number | null)[]>>({
    left_knee_flexion: [],
    right_knee_flexion: [],
    left_hip_angle: [],
    right_hip_angle: [],
    left_ankle_angle: [],
    right_ankle_angle: [],
    trunk_angle: [],
  });

  // Buffer for ankle Y positions (for BDC detection)
  const leftAnkleYBufferRef = useRef<number[]>([]);
  const rightAnkleYBufferRef = useRef<number[]>([]);
  const lastCycleFrameRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  // BDC (bottom dead center) angle buffers
  const bdcAnglesRef = useRef<{
    leftKnee: number[];
    rightKnee: number[];
  }>({ leftKnee: [], rightKnee: [] });

  /**
   * Compute angles from a pose frame
   */
  const computeAngles = useCallback((frame: PoseFrame): CyclingAngles => {
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

    // Compute knee flexion angles (hip-knee-ankle angle)
    const leftKneeFlexion = angleBetweenPoints(leftHip, leftKnee, leftAnkle);
    const rightKneeFlexion = angleBetweenPoints(rightHip, rightKnee, rightAnkle);

    // Compute hip angles (shoulder-hip-knee angle)
    const leftHipAngle = angleBetweenPoints(leftShoulder, leftHip, leftKnee);
    const rightHipAngle = angleBetweenPoints(rightShoulder, rightHip, rightKnee);

    // Compute ankle angles (knee-ankle-foot angle)
    const leftAnkleAngle = angleBetweenPoints(leftKnee, leftAnkle, leftFoot);
    const rightAnkleAngle = angleBetweenPoints(rightKnee, rightAnkle, rightFoot);

    // Compute trunk angle from vertical
    // Use midpoint of shoulders and hips for more stability
    const shoulderMid =
      leftShoulder && rightShoulder
        ? { x: (leftShoulder.x + rightShoulder.x) / 2, y: (leftShoulder.y + rightShoulder.y) / 2 }
        : leftShoulder || rightShoulder;
    const hipMid =
      leftHip && rightHip
        ? { x: (leftHip.x + rightHip.x) / 2, y: (leftHip.y + rightHip.y) / 2 }
        : leftHip || rightHip;
    const trunkAngle = angleFromVertical(shoulderMid, hipMid);

    // Compute KOPS angle (use whichever leg is visible/valid)
    // Positive = knee forward, Negative = knee back
    const leftKops = calculateKopsAngle(leftKnee, leftAnkle);
    const rightKops = calculateKopsAngle(rightKnee, rightAnkle);
    const kopsAngle = leftKops ?? rightKops;

    return {
      leftKneeFlexion,
      rightKneeFlexion,
      leftHipAngle,
      rightHipAngle,
      leftAnkleAngle,
      rightAnkleAngle,
      trunkAngle,
      kopsAngle,
    };
  }, []);

  /**
   * Detect bottom dead center (BDC) using ankle Y position
   */
  const detectBdc = useCallback((ankleYBuffer: number[], threshold: number): boolean => {
    if (ankleYBuffer.length < 5) return false;

    // Look for local maximum in Y (since Y increases downward, max Y = lowest point)
    const recentValues = ankleYBuffer.slice(-15);
    const maxIdx = detectLocalMinimum(
      recentValues.map((v) => -v), // Invert to find maximum
      threshold
    );

    return maxIdx !== -1 && maxIdx >= recentValues.length - 3;
  }, []);

  /**
   * Update angle statistics
   */
  const updateStats = useCallback(() => {
    const buffers = angleBuffersRef.current;
    const newStats: Record<string, AngleStats> = {};

    const angleNames: AngleName[] = [
      'left_knee_flexion',
      'right_knee_flexion',
      'left_hip_angle',
      'right_hip_angle',
      'left_ankle_angle',
      'right_ankle_angle',
      'trunk_angle',
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

    // For knee angles at BDC, use the specific BDC measurements
    const bdcAngles = bdcAnglesRef.current;
    if (bdcAngles.leftKnee.length > 0) {
      newStats['left_knee_flexion'] = {
        ...newStats['left_knee_flexion'],
        avg: rollingAverage(bdcAngles.leftKnee),
        min: findMin(bdcAngles.leftKnee),
        max: findMax(bdcAngles.leftKnee),
      };
    }
    if (bdcAngles.rightKnee.length > 0) {
      newStats['right_knee_flexion'] = {
        ...newStats['right_knee_flexion'],
        avg: rollingAverage(bdcAngles.rightKnee),
        min: findMin(bdcAngles.rightKnee),
        max: findMax(bdcAngles.rightKnee),
      };
    }

    setAngleStats(newStats);
    return newStats;
  }, []);

  /**
   * Process a new pose frame
   */
  const processFrame = useCallback(
    (frame: PoseFrame) => {
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

      // Update buffers
      const buffers = angleBuffersRef.current;
      buffers.left_knee_flexion.push(angles.leftKneeFlexion);
      buffers.right_knee_flexion.push(angles.rightKneeFlexion);
      buffers.left_hip_angle.push(angles.leftHipAngle);
      buffers.right_hip_angle.push(angles.rightHipAngle);
      buffers.left_ankle_angle.push(angles.leftAnkleAngle);
      buffers.right_ankle_angle.push(angles.rightAnkleAngle);
      buffers.trunk_angle.push(angles.trunkAngle);

      // Trim buffers to max size
      for (const key of Object.keys(buffers)) {
        if (buffers[key].length > finalConfig.bufferSize) {
          buffers[key].shift();
        }
      }

      // Track ankle Y positions for BDC detection
      const leftAnkle = keypointToPoint(getKeypointByName(frame.keypoints, 'left_ankle'));
      const rightAnkle = keypointToPoint(getKeypointByName(frame.keypoints, 'right_ankle'));

      if (leftAnkle) {
        leftAnkleYBufferRef.current.push(leftAnkle.y);
        if (leftAnkleYBufferRef.current.length > 30) {
          leftAnkleYBufferRef.current.shift();
        }
      }

      if (rightAnkle) {
        rightAnkleYBufferRef.current.push(rightAnkle.y);
        if (rightAnkleYBufferRef.current.length > 30) {
          rightAnkleYBufferRef.current.shift();
        }
      }

      // Detect BDC and record angles
      const framesSinceLastCycle = frameCountRef.current - lastCycleFrameRef.current;

      if (framesSinceLastCycle >= finalConfig.minCycleFrames) {
        // Check left leg BDC
        if (detectBdc(leftAnkleYBufferRef.current, finalConfig.bdcThreshold)) {
          if (angles.leftKneeFlexion !== null) {
            bdcAnglesRef.current.leftKnee.push(angles.leftKneeFlexion);
            // Keep last 10 BDC measurements
            if (bdcAnglesRef.current.leftKnee.length > 10) {
              bdcAnglesRef.current.leftKnee.shift();
            }
          }
          setCycleCount((c) => c + 1);
          lastCycleFrameRef.current = frameCountRef.current;
        }

        // Check right leg BDC
        if (detectBdc(rightAnkleYBufferRef.current, finalConfig.bdcThreshold)) {
          if (angles.rightKneeFlexion !== null) {
            bdcAnglesRef.current.rightKnee.push(angles.rightKneeFlexion);
            if (bdcAnglesRef.current.rightKnee.length > 10) {
              bdcAnglesRef.current.rightKnee.shift();
            }
          }
        }
      }

      // Update stats periodically (every 5 frames to reduce computation)
      if (frameCountRef.current % 5 === 0) {
        const stats = updateStats();

        // Generate basic suggestions
        const baseSuggestions = generateCyclingSuggestions(stats, finalConfig.thresholds);

        // Detect patterns and generate pattern-based suggestions
        const patterns = detectCyclingPatterns(stats, frontalMetrics);
        setPatternFlags(patterns);

        const patternSuggestions = generateCyclingPatternSuggestions(patterns);

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
          stats['left_hip_angle'] || null,
          stats['right_hip_angle'] || null,
          stats['left_knee_flexion'] || null,
          stats['right_knee_flexion'] || null,
          frontalMetrics
        );
        setSymmetryMetrics(symmetry);

        setMuscleInsights(generateCyclingMuscleInsights(stats));
      }
    },
    [computeAngles, detectBdc, updateStats, finalConfig, frontalMetrics]
  );

  /**
   * Reset all analysis data
   */
  const reset = useCallback(() => {
    // Reset buffers
    angleBuffersRef.current = {
      left_knee_flexion: [],
      right_knee_flexion: [],
      left_hip_angle: [],
      right_hip_angle: [],
      left_ankle_angle: [],
      right_ankle_angle: [],
      trunk_angle: [],
    };
    leftAnkleYBufferRef.current = [];
    rightAnkleYBufferRef.current = [];
    bdcAnglesRef.current = { leftKnee: [], rightKnee: [] };
    lastCycleFrameRef.current = 0;
    frameCountRef.current = 0;
    startTimeRef.current = 0;

    // Reset state
    setCurrentAngles({
      leftKneeFlexion: null,
      rightKneeFlexion: null,
      leftHipAngle: null,
      rightHipAngle: null,
      leftAnkleAngle: null,
      rightAnkleAngle: null,
      trunkAngle: null,
      kopsAngle: null,
    });
    setAngleStats({});
    setSuggestions([]);
    setMuscleInsights([]);
    setCycleCount(0);
    setDuration(0);
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
      mode: 'cycling',
      duration,
      angles: angleStats,
      suggestions,
      muscleInsights,
      cycleCount,
      pattern_flags: patternFlags,
      symmetry: symmetryMetrics,
      frontal_metrics: frontalMetrics || undefined,
      views_used: viewsUsed,
    };
  }, [duration, angleStats, suggestions, muscleInsights, cycleCount, patternFlags, symmetryMetrics, frontalMetrics]);

  /**
   * Set frontal metrics from external frontal analysis
   */
  const setFrontalMetrics = useCallback((metrics: FrontalMetrics | null) => {
    setFrontalMetricsState(metrics);
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
    cycleCount,
    reset,
    getSummary,
    duration,
    patternFlags,
    symmetryMetrics,
    setFrontalMetrics,
  };
}

export default useCyclingAnalysis;
