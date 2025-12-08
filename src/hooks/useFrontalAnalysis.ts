/**
 * BiomechCoach - Frontal Analysis Hook
 *
 * Analyzes frontal plane (front view) biomechanics for running and cycling.
 * Computes pelvic drop, knee valgus, and ankle drift metrics.
 *
 * This hook is designed to work alongside the existing side-view analysis
 * hooks and is optional - analysis works with side view only.
 */

import { useState, useCallback, useRef } from 'react';
import {
  PoseFrame,
  FrontalMetrics,
  FrontalThresholds,
  DEFAULT_FRONTAL_THRESHOLDS,
  ActivityMode,
} from '../lib/poseTypes';
import {
  keypointToPoint,
  getKeypointByName,
  angleBetweenPoints,
  rollingAverage,
  findMax,
  Point2D,
} from '../lib/vectorMath';

/**
 * Configuration for frontal analysis
 */
export interface FrontalAnalysisConfig {
  /** Number of frames to keep in rolling buffer */
  bufferSize: number;
  /** Thresholds for frontal metrics */
  thresholds: FrontalThresholds;
}

const DEFAULT_CONFIG: FrontalAnalysisConfig = {
  bufferSize: 100, // ~3.3 seconds at 30fps
  thresholds: DEFAULT_FRONTAL_THRESHOLDS,
};

/**
 * Hook return type
 */
export interface UseFrontalAnalysisReturn {
  /** Process a new pose frame from front view */
  processFrame: (frame: PoseFrame, frameWidth: number, frameHeight: number) => void;
  /** Current frontal metrics */
  currentMetrics: FrontalMetrics;
  /** Aggregated frontal metrics */
  aggregatedMetrics: FrontalMetrics;
  /** Whether front view data is available */
  hasFrontViewData: boolean;
  /** Reset analysis */
  reset: () => void;
  /** Number of frames processed */
  frameCount: number;
}

/**
 * Compute knee valgus angle from frontal view.
 * Valgus = inward deviation of knee from hip-ankle line.
 *
 * @param hip - Hip keypoint position
 * @param knee - Knee keypoint position
 * @param ankle - Ankle keypoint position
 * @returns Valgus angle in degrees (positive = inward/valgus, negative = varus)
 */
function computeValgusAngle(
  hip: Point2D | null,
  knee: Point2D | null,
  ankle: Point2D | null
): number | null {
  if (!hip || !knee || !ankle) return null;

  // In frontal view, valgus is when knee is medial to the hip-ankle line
  // We compute the angle at the knee joint
  const kneeAngle = angleBetweenPoints(hip, knee, ankle);

  if (kneeAngle === null) return null;

  // A perfectly straight leg would be 180 degrees
  // Deviation from 180 indicates valgus (inward) or varus (outward)
  // For simplicity, we compute the horizontal offset as a proxy
  // This is more meaningful in frontal plane

  // Calculate where the knee "should" be on the hip-ankle line
  const idealKneeX = (hip.x + ankle.x) / 2;

  // Deviation from ideal position
  const deviation = knee.x - idealKneeX;

  // Convert to angle approximation (simplified)
  // Use arctangent of deviation relative to vertical distance
  const verticalDist = Math.abs(hip.y - ankle.y);
  if (verticalDist < 10) return null; // Too close together

  const deviationAngle = Math.atan2(Math.abs(deviation), verticalDist / 2) * (180 / Math.PI);

  // Sign: positive for valgus (knee medial to line)
  // In front view, for left leg, medial = to the right (positive X)
  // For right leg, medial = to the left (negative X)
  // We'll need to know which leg this is - for now return absolute value
  return deviationAngle;
}

/**
 * Compute ankle medial drift (proxy for pronation).
 * Measures how much the ankle deviates medially relative to the knee.
 *
 * @param knee - Knee position
 * @param ankle - Ankle position
 * @param frameWidth - Frame width for normalization
 * @returns Normalized medial drift (positive = medial)
 */
function computeAnkleMedialDrift(
  knee: Point2D | null,
  ankle: Point2D | null,
  frameWidth: number
): number | null {
  if (!knee || !ankle || frameWidth <= 0) return null;

  // Horizontal deviation of ankle from directly below knee
  const deviation = Math.abs(ankle.x - knee.x);
  return deviation / frameWidth;
}

/**
 * Compute pelvic drop (hip drop).
 * Measures Y-difference between left and right hips.
 *
 * @param leftHip - Left hip position
 * @param rightHip - Right hip position
 * @param frameHeight - Frame height for normalization
 * @returns Normalized hip drop (positive = left lower, negative = right lower)
 */
function computePelvicDrop(
  leftHip: Point2D | null,
  rightHip: Point2D | null,
  frameHeight: number
): number | null {
  if (!leftHip || !rightHip || frameHeight <= 0) return null;

  // In screen coordinates, higher Y = lower in frame
  // If left hip Y > right hip Y, left hip is lower (dropped)
  const diff = leftHip.y - rightHip.y;
  return diff / frameHeight;
}

/**
 * Compute knee lateral deviation for cycling.
 * Tracks horizontal movement of knee during pedal stroke.
 *
 * @param kneeX - Current knee X position
 * @param kneeXHistory - Recent knee X positions
 * @param frameWidth - Frame width for normalization
 * @returns Normalized lateral deviation (range of movement)
 */
function computeKneeLateralDeviation(
  kneeXHistory: number[],
  frameWidth: number
): number | null {
  if (kneeXHistory.length < 10 || frameWidth <= 0) return null;

  const minX = Math.min(...kneeXHistory);
  const maxX = Math.max(...kneeXHistory);
  const range = maxX - minX;

  return range / frameWidth;
}

/**
 * Custom hook for frontal plane analysis
 */
export function useFrontalAnalysis(
  mode: ActivityMode,
  config: Partial<FrontalAnalysisConfig> = {}
): UseFrontalAnalysisReturn {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  // Current frame metrics
  const [currentMetrics, setCurrentMetrics] = useState<FrontalMetrics>({});

  // Aggregated metrics
  const [aggregatedMetrics, setAggregatedMetrics] = useState<FrontalMetrics>({});

  // State tracking
  const [hasFrontViewData, setHasFrontViewData] = useState(false);
  const [frameCount, setFrameCount] = useState(0);

  // Buffers for rolling calculations
  const buffersRef = useRef<{
    pelvicDrop: (number | null)[];
    leftValgus: (number | null)[];
    rightValgus: (number | null)[];
    leftAnkleDrift: (number | null)[];
    rightAnkleDrift: (number | null)[];
    leftKneeX: number[];
    rightKneeX: number[];
  }>({
    pelvicDrop: [],
    leftValgus: [],
    rightValgus: [],
    leftAnkleDrift: [],
    rightAnkleDrift: [],
    leftKneeX: [],
    rightKneeX: [],
  });

  /**
   * Process a single frame from front view
   */
  const processFrame = useCallback(
    (frame: PoseFrame, frameWidth: number, frameHeight: number) => {
      if (!frame.isValid) return;

      setFrameCount((c) => c + 1);
      setHasFrontViewData(true);

      const kp = frame.keypoints;

      // Get keypoints
      const leftHip = keypointToPoint(getKeypointByName(kp, 'left_hip'));
      const rightHip = keypointToPoint(getKeypointByName(kp, 'right_hip'));
      const leftKnee = keypointToPoint(getKeypointByName(kp, 'left_knee'));
      const rightKnee = keypointToPoint(getKeypointByName(kp, 'right_knee'));
      const leftAnkle = keypointToPoint(getKeypointByName(kp, 'left_ankle'));
      const rightAnkle = keypointToPoint(getKeypointByName(kp, 'right_ankle'));

      const buffers = buffersRef.current;

      // Compute current metrics
      const pelvicDrop = computePelvicDrop(leftHip, rightHip, frameHeight);
      const leftValgus = computeValgusAngle(leftHip, leftKnee, leftAnkle);
      const rightValgus = computeValgusAngle(rightHip, rightKnee, rightAnkle);
      const leftAnkleDrift = computeAnkleMedialDrift(leftKnee, leftAnkle, frameWidth);
      const rightAnkleDrift = computeAnkleMedialDrift(rightKnee, rightAnkle, frameWidth);

      // Track knee X positions for cycling lateral deviation
      if (leftKnee) buffers.leftKneeX.push(leftKnee.x);
      if (rightKnee) buffers.rightKneeX.push(rightKnee.x);

      // Update buffers
      buffers.pelvicDrop.push(pelvicDrop);
      buffers.leftValgus.push(leftValgus);
      buffers.rightValgus.push(rightValgus);
      buffers.leftAnkleDrift.push(leftAnkleDrift);
      buffers.rightAnkleDrift.push(rightAnkleDrift);

      // Trim buffers
      const maxSize = finalConfig.bufferSize;
      if (buffers.pelvicDrop.length > maxSize) buffers.pelvicDrop.shift();
      if (buffers.leftValgus.length > maxSize) buffers.leftValgus.shift();
      if (buffers.rightValgus.length > maxSize) buffers.rightValgus.shift();
      if (buffers.leftAnkleDrift.length > maxSize) buffers.leftAnkleDrift.shift();
      if (buffers.rightAnkleDrift.length > maxSize) buffers.rightAnkleDrift.shift();
      if (buffers.leftKneeX.length > maxSize) buffers.leftKneeX.shift();
      if (buffers.rightKneeX.length > maxSize) buffers.rightKneeX.shift();

      // Set current metrics
      const current: FrontalMetrics = {
        pelvic_drop_mean: pelvicDrop ?? undefined,
        valgus_angle_left: leftValgus ?? undefined,
        valgus_angle_right: rightValgus ?? undefined,
        ankle_medial_drift_left: leftAnkleDrift ?? undefined,
        ankle_medial_drift_right: rightAnkleDrift ?? undefined,
      };
      setCurrentMetrics(current);

      // Update aggregated metrics periodically
      if (frameCount % 5 === 0) {
        // Calculate peaks
        const leftPelvicDropPeak = findMax(
          buffers.pelvicDrop.filter((v): v is number => v !== null && v > 0)
        );
        const rightPelvicDropPeak = findMax(
          buffers.pelvicDrop.filter((v): v is number => v !== null && v < 0).map(Math.abs)
        );

        const aggregated: FrontalMetrics = {
          pelvic_drop_peak_left: leftPelvicDropPeak ?? undefined,
          pelvic_drop_peak_right: rightPelvicDropPeak ?? undefined,
          pelvic_drop_mean: rollingAverage(buffers.pelvicDrop.map((v) => (v !== null ? Math.abs(v) : null))) ?? undefined,
          valgus_angle_left: rollingAverage(buffers.leftValgus) ?? undefined,
          valgus_angle_right: rollingAverage(buffers.rightValgus) ?? undefined,
          valgus_peak_left: findMax(buffers.leftValgus) ?? undefined,
          valgus_peak_right: findMax(buffers.rightValgus) ?? undefined,
          ankle_medial_drift_left: rollingAverage(buffers.leftAnkleDrift) ?? undefined,
          ankle_medial_drift_right: rollingAverage(buffers.rightAnkleDrift) ?? undefined,
        };

        // Add cycling-specific metrics
        if (mode === 'cycling') {
          aggregated.knee_lateral_deviation_left =
            computeKneeLateralDeviation(buffers.leftKneeX, frameWidth) ?? undefined;
          aggregated.knee_lateral_deviation_right =
            computeKneeLateralDeviation(buffers.rightKneeX, frameWidth) ?? undefined;
        }

        setAggregatedMetrics(aggregated);
      }
    },
    [mode, finalConfig.bufferSize, frameCount]
  );

  /**
   * Reset all frontal analysis data
   */
  const reset = useCallback(() => {
    buffersRef.current = {
      pelvicDrop: [],
      leftValgus: [],
      rightValgus: [],
      leftAnkleDrift: [],
      rightAnkleDrift: [],
      leftKneeX: [],
      rightKneeX: [],
    };
    setCurrentMetrics({});
    setAggregatedMetrics({});
    setHasFrontViewData(false);
    setFrameCount(0);
  }, []);

  return {
    processFrame,
    currentMetrics,
    aggregatedMetrics,
    hasFrontViewData,
    reset,
    frameCount,
  };
}

export default useFrontalAnalysis;
