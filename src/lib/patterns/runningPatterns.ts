/**
 * BiomechCoach - Running Pattern Detector
 *
 * Detects common running biomechanical patterns that may indicate
 * inefficiencies or injury risk. Works with both side view (sagittal)
 * and front view (frontal) data when available.
 *
 * Note: Pattern detection is based on general biomechanics principles.
 * Individual variation is normal and patterns should be interpreted
 * in context of running style, speed, and individual anatomy.
 */

import {
  RunningPatternFlags,
  AngleStats,
  FrontalMetrics,
  RunningThresholds,
  FrontalThresholds,
  DEFAULT_RUNNING_THRESHOLDS,
  DEFAULT_FRONTAL_THRESHOLDS,
  Suggestion,
} from '../poseTypes';
import { GaitPhaseData } from '../runningHeuristics';

/**
 * Configuration for running pattern detection
 */
export interface RunningPatternConfig {
  sagittalThresholds: RunningThresholds;
  frontalThresholds: FrontalThresholds;
  /** Minimum samples needed before flagging patterns */
  minSamples: number;
  /** Overstriding distance threshold (normalized) */
  overstrideThreshold: number;
  /** Hip extension threshold (degrees) */
  hipExtensionThreshold: number;
}

const DEFAULT_CONFIG: RunningPatternConfig = {
  sagittalThresholds: DEFAULT_RUNNING_THRESHOLDS,
  frontalThresholds: DEFAULT_FRONTAL_THRESHOLDS,
  minSamples: 10,
  overstrideThreshold: 0.15, // 15% of frame width
  hipExtensionThreshold: 170, // degrees (max hip angle for limited extension)
};

/**
 * Detect overstriding pattern.
 * Overstriding occurs when the foot lands significantly ahead of the center of mass
 * with an extended knee, creating a braking force.
 *
 * Uses: ankle-hip horizontal distance + knee angle at contact (side view)
 */
export function detectOverstride(
  gaitData: GaitPhaseData,
  kneeAngleAtContact: number | null,
  config: RunningPatternConfig = DEFAULT_CONFIG
): boolean {
  // Check ankle-hip distance at contact
  const leftDistance = gaitData.leftAnkleHipDistance;
  const rightDistance = gaitData.rightAnkleHipDistance;

  // Use the larger distance (worse case)
  const maxDistance = Math.max(
    leftDistance ?? 0,
    rightDistance ?? 0
  );

  // Flag if distance exceeds threshold AND knee is relatively extended
  if (maxDistance > config.overstrideThreshold) {
    // Additional check: knee should be relatively extended (>160°)
    if (kneeAngleAtContact === null || kneeAngleAtContact > 160) {
      return true;
    }
  }

  return false;
}

/**
 * Detect limited hip extension pattern.
 * Limited hip extension at toe-off reduces propulsion and may indicate
 * tight hip flexors or weak glutes.
 *
 * Uses: maximum hip angle during gait cycle (side view)
 */
export function detectLimitedHipExtension(
  leftHipStats: AngleStats | null,
  rightHipStats: AngleStats | null,
  config: RunningPatternConfig = DEFAULT_CONFIG
): boolean {
  const leftMax = leftHipStats?.max;
  const rightMax = rightHipStats?.max;

  // Check if either side shows limited extension
  // Use average if both available, otherwise check available side
  if (leftMax != null && rightMax != null) {
    const avgMax = (leftMax + rightMax) / 2;
    return avgMax < config.hipExtensionThreshold;
  }

  if (leftMax != null) {
    return leftMax < config.hipExtensionThreshold;
  }

  if (rightMax != null) {
    return rightMax < config.hipExtensionThreshold;
  }

  return false;
}

/**
 * Detect hip drop pattern (from side view approximation).
 * Hip drop occurs when the pelvis tilts during single-leg stance,
 * indicating weak hip abductors.
 *
 * Uses: Y-difference between hips during stance (side view - limited accuracy)
 */
export function detectHipDropSideView(
  gaitData: GaitPhaseData,
  config: RunningPatternConfig = DEFAULT_CONFIG
): boolean {
  const threshold = config.sagittalThresholds.hipDropThreshold;

  // Check if either hip shows significant drop
  const leftDrop = gaitData.leftHipYDiff;
  const rightDrop = gaitData.rightHipYDiff;

  return (
    (leftDrop != null && leftDrop > threshold) ||
    (rightDrop != null && rightDrop > threshold)
  );
}

/**
 * Detect hip drop pattern from frontal metrics.
 * More accurate than side view detection.
 *
 * Uses: pelvic drop measurements (front view)
 */
export function detectHipDropFrontal(
  frontalMetrics: FrontalMetrics | null,
  config: RunningPatternConfig = DEFAULT_CONFIG
): boolean {
  if (!frontalMetrics) return false;

  const threshold = config.frontalThresholds.pelvicDropThreshold;

  // Check peak drop on either side
  const leftPeak = frontalMetrics.pelvic_drop_peak_left;
  const rightPeak = frontalMetrics.pelvic_drop_peak_right;
  const mean = frontalMetrics.pelvic_drop_mean;

  // Flag if peak or mean exceeds threshold
  return (
    (leftPeak != null && leftPeak > threshold) ||
    (rightPeak != null && rightPeak > threshold) ||
    (mean != null && mean > threshold)
  );
}

/**
 * Detect knee valgus pattern.
 * Knee valgus (inward collapse) during stance can increase ACL strain
 * and patellofemoral stress.
 *
 * Uses: valgus angle measurements (front view)
 */
export function detectKneeValgus(
  frontalMetrics: FrontalMetrics | null,
  config: RunningPatternConfig = DEFAULT_CONFIG
): boolean {
  if (!frontalMetrics) return false;

  const threshold = config.frontalThresholds.kneeValgusThreshold;

  // Check average or peak valgus angles
  const leftAvg = frontalMetrics.valgus_angle_left;
  const rightAvg = frontalMetrics.valgus_angle_right;
  const leftPeak = frontalMetrics.valgus_peak_left;
  const rightPeak = frontalMetrics.valgus_peak_right;

  // Use peak if available, otherwise average
  const leftValue = leftPeak ?? leftAvg;
  const rightValue = rightPeak ?? rightAvg;

  return (
    (leftValue != null && leftValue > threshold) ||
    (rightValue != null && rightValue > threshold)
  );
}

/**
 * Detect excessive pronation pattern.
 * Proxied by ankle medial drift during stance phase.
 *
 * Uses: ankle medial drift measurements (front view)
 */
export function detectPronation(
  frontalMetrics: FrontalMetrics | null,
  config: RunningPatternConfig = DEFAULT_CONFIG
): boolean {
  if (!frontalMetrics) return false;

  const threshold = config.frontalThresholds.ankleMedialDriftThreshold;

  const leftDrift = frontalMetrics.ankle_medial_drift_left;
  const rightDrift = frontalMetrics.ankle_medial_drift_right;

  return (
    (leftDrift != null && leftDrift > threshold) ||
    (rightDrift != null && rightDrift > threshold)
  );
}

/**
 * Detect excessive trunk lean pattern.
 * Too much or too little forward lean can indicate form issues.
 *
 * Uses: trunk angle from vertical (side view)
 */
export function detectExcessiveTrunkLean(
  trunkStats: AngleStats | null,
  config: RunningPatternConfig = DEFAULT_CONFIG
): boolean {
  if (!trunkStats?.avg) return false;

  const angle = trunkStats.avg;
  const minLean = config.sagittalThresholds.trunkLeanMin;
  const maxLean = config.sagittalThresholds.trunkLeanMax;

  // Flag if too upright or too much lean
  return angle < minLean || angle > maxLean;
}

/**
 * Detect all running patterns and return pattern flags.
 * This is the main entry point for pattern detection.
 *
 * @param angleStats - Angle statistics from analysis
 * @param gaitData - Gait phase data
 * @param frontalMetrics - Optional frontal plane metrics
 * @param config - Pattern detection configuration
 * @returns RunningPatternFlags object with detected patterns
 */
export function detectRunningPatterns(
  angleStats: Record<string, AngleStats>,
  gaitData: GaitPhaseData,
  frontalMetrics: FrontalMetrics | null = null,
  config: RunningPatternConfig = DEFAULT_CONFIG
): RunningPatternFlags {
  const flags: RunningPatternFlags = {};

  // Get relevant stats
  const leftKnee = angleStats['left_knee_midstance'];
  const rightKnee = angleStats['right_knee_midstance'];
  const leftHip = angleStats['left_hip_extension'];
  const rightHip = angleStats['right_hip_extension'];
  const trunk = angleStats['trunk_lean'];

  // Get knee angle at contact (use average of available)
  const kneeAtContact = leftKnee?.avg ?? rightKnee?.avg ?? null;

  // Check if we have enough samples for reliable detection
  const hasSufficientSamples =
    (leftKnee?.samples ?? 0) >= config.minSamples ||
    (rightKnee?.samples ?? 0) >= config.minSamples;

  // Sagittal plane patterns (side view)
  if (hasSufficientSamples) {
    flags.overstride = detectOverstride(gaitData, kneeAtContact, config);
    flags.limited_hip_extension = detectLimitedHipExtension(leftHip, rightHip, config);
    flags.excessive_trunk_lean = detectExcessiveTrunkLean(trunk, config);

    // Hip drop from side view (less accurate)
    if (!frontalMetrics) {
      flags.hip_drop = detectHipDropSideView(gaitData, config);
    }
  }

  // Frontal plane patterns (front view)
  if (frontalMetrics) {
    flags.hip_drop = detectHipDropFrontal(frontalMetrics, config);
    flags.knee_valgus = detectKneeValgus(frontalMetrics, config);
    flags.pronation = detectPronation(frontalMetrics, config);
  }

  return flags;
}

/**
 * Map running pattern flags to suggestion messages.
 * These are non-medical observations about detected patterns.
 */
export const RUNNING_PATTERN_SUGGESTIONS: Record<keyof RunningPatternFlags, {
  message: string;
  detail: string;
}> = {
  overstride: {
    message: 'Overstriding detected',
    detail: 'Your foot appears to land well ahead of your center of mass. This creates a braking force with each step. Consider increasing your cadence and focusing on landing with your foot closer to under your hips.',
  },
  hip_drop: {
    message: 'Hip drop detected',
    detail: 'Increased pelvic drop on one side during stance phase. This pattern can indicate reduced hip stability and may benefit from hip strengthening exercises.',
  },
  knee_valgus: {
    message: 'Knee valgus pattern observed',
    detail: 'Your knee tends to drift inward relative to your foot during stance. This frontal-plane pattern may increase knee loading. Strengthening exercises for hip abductors may help.',
  },
  pronation: {
    message: 'Possible excessive pronation',
    detail: 'Your ankle shows medial drift during stance phase, which may indicate excessive pronation. This is common and may or may not be problematic depending on the degree.',
  },
  limited_hip_extension: {
    message: 'Limited hip extension',
    detail: 'Your hip extension at toe-off appears limited. This may indicate tight hip flexors or reduced gluteal activation. Hip mobility work and glute strengthening may help improve propulsion.',
  },
  excessive_trunk_lean: {
    message: 'Trunk position could be optimized',
    detail: 'Your trunk angle is outside the typical range for efficient running. Focus on running "tall" with a slight forward lean from the ankles, not the waist.',
  },
};

/**
 * Generate suggestions from detected running patterns.
 *
 * @param flags - Detected pattern flags
 * @returns Array of suggestions
 */
export function generatePatternSuggestions(flags: RunningPatternFlags): Suggestion[] {
  const suggestions: Suggestion[] = [];

  const patternKeys = Object.keys(flags) as (keyof RunningPatternFlags)[];

  for (const key of patternKeys) {
    if (flags[key] === true) {
      const suggestionData = RUNNING_PATTERN_SUGGESTIONS[key];
      if (suggestionData) {
        suggestions.push({
          id: `pattern-${key}`,
          severity: 'improvement',
          message: suggestionData.message,
          detail: suggestionData.detail,
        });
      }
    }
  }

  return suggestions;
}

/**
 * Get a summary of detected patterns.
 *
 * @param flags - Detected pattern flags
 * @returns Array of pattern names that are flagged
 */
export function getActivePatterns(flags: RunningPatternFlags): string[] {
  const active: string[] = [];
  const patternKeys = Object.keys(flags) as (keyof RunningPatternFlags)[];

  for (const key of patternKeys) {
    if (flags[key] === true) {
      // Convert key to human-readable format
      const readable = key
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      active.push(readable);
    }
  }

  return active;
}
