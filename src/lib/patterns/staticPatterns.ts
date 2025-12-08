/**
 * BiomechCoach - Static Pattern Detection
 *
 * Detects biomechanical patterns during static assessment exercises.
 * Unlike running/cycling, static tests focus on:
 * - Stability (sway, wobble)
 * - Symmetry (L/R differences)
 * - Compensations (trunk lean, hip drop, valgus)
 */

import {
  StaticPatternFlags,
  StaticThresholds,
  DEFAULT_STATIC_THRESHOLDS,
  StaticMetrics,
  Suggestion,
  FrontalMetrics,
} from '../poseTypes';

/**
 * Raw metrics computed from pose frames during static analysis
 */
export interface StaticRawMetrics {
  /** Center of mass proxy (mid-hip) X positions over time */
  comXHistory: number[];
  /** Center of mass proxy (mid-hip) Y positions over time */
  comYHistory: number[];
  /** Left hip Y positions */
  leftHipYHistory: number[];
  /** Right hip Y positions */
  rightHipYHistory: number[];
  /** Left knee angle history */
  leftKneeAngleHistory: number[];
  /** Right knee angle history */
  rightKneeAngleHistory: number[];
  /** Trunk lean angle history (from vertical) */
  trunkLeanHistory: number[];
  /** Left ankle X positions (for medial drift) */
  leftAnkleXHistory: number[];
  /** Right ankle X positions */
  rightAnkleXHistory: number[];
  /** Left knee X positions (for valgus) */
  leftKneeXHistory: number[];
  /** Right knee X positions */
  rightKneeXHistory: number[];
  /** Left shoulder Y positions */
  leftShoulderYHistory: number[];
  /** Right shoulder Y positions */
  rightShoulderYHistory: number[];
}

/**
 * Calculate standard deviation of an array of numbers
 */
export function standardDeviation(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
  const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(avgSquaredDiff);
}

/**
 * Calculate mean of an array of numbers
 */
export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * Detect static patterns from raw metrics
 */
export function detectStaticPatterns(
  rawMetrics: StaticRawMetrics,
  frontalMetrics?: FrontalMetrics | null,
  thresholds: StaticThresholds = DEFAULT_STATIC_THRESHOLDS
): StaticPatternFlags {
  const flags: StaticPatternFlags = {};

  // 1. Instability detection (CoM sway)
  const swayX = standardDeviation(rawMetrics.comXHistory);
  const swayY = standardDeviation(rawMetrics.comYHistory);
  const totalSway = Math.sqrt(swayX * swayX + swayY * swayY);

  if (totalSway > thresholds.swayThreshold) {
    flags.static_instability = true;
  }

  // 2. Hip drop detection (pelvic drop)
  if (rawMetrics.leftHipYHistory.length > 0 && rawMetrics.rightHipYHistory.length > 0) {
    const hipDiffs: number[] = [];
    const minLen = Math.min(rawMetrics.leftHipYHistory.length, rawMetrics.rightHipYHistory.length);
    for (let i = 0; i < minLen; i++) {
      hipDiffs.push(Math.abs(rawMetrics.leftHipYHistory[i] - rawMetrics.rightHipYHistory[i]));
    }
    const avgHipDiff = mean(hipDiffs);
    if (avgHipDiff > thresholds.hipDropThreshold) {
      flags.static_hip_drop = true;
    }
  }

  // Also check frontal metrics for hip drop
  if (frontalMetrics) {
    if (
      (frontalMetrics.pelvic_drop_peak_left && frontalMetrics.pelvic_drop_peak_left > thresholds.hipDropThreshold) ||
      (frontalMetrics.pelvic_drop_peak_right && frontalMetrics.pelvic_drop_peak_right > thresholds.hipDropThreshold)
    ) {
      flags.static_hip_drop = true;
    }
  }

  // 3. Knee valgus detection
  if (frontalMetrics) {
    if (
      (frontalMetrics.valgus_angle_left && Math.abs(frontalMetrics.valgus_angle_left) > thresholds.kneeValgusThreshold) ||
      (frontalMetrics.valgus_angle_right && Math.abs(frontalMetrics.valgus_angle_right) > thresholds.kneeValgusThreshold)
    ) {
      flags.static_knee_valgus = true;
    }
  }

  // Alternative valgus detection from knee X position drift
  if (rawMetrics.leftKneeXHistory.length > 5) {
    const kneeXVariability = standardDeviation(rawMetrics.leftKneeXHistory);
    if (kneeXVariability > thresholds.swayThreshold * 1.5) {
      flags.static_knee_valgus = true;
    }
  }
  if (rawMetrics.rightKneeXHistory.length > 5) {
    const kneeXVariability = standardDeviation(rawMetrics.rightKneeXHistory);
    if (kneeXVariability > thresholds.swayThreshold * 1.5) {
      flags.static_knee_valgus = true;
    }
  }

  // 4. Trunk compensation detection
  if (rawMetrics.trunkLeanHistory.length > 0) {
    const avgTrunkLean = mean(rawMetrics.trunkLeanHistory);
    if (Math.abs(avgTrunkLean) > thresholds.trunkCompensationThreshold) {
      flags.static_trunk_compensation = true;
    }
  }

  // 5. Asymmetry detection (L/R differences)
  // Check knee angle asymmetry
  if (rawMetrics.leftKneeAngleHistory.length > 5 && rawMetrics.rightKneeAngleHistory.length > 5) {
    const avgLeftKnee = mean(rawMetrics.leftKneeAngleHistory);
    const avgRightKnee = mean(rawMetrics.rightKneeAngleHistory);
    if (Math.abs(avgLeftKnee - avgRightKnee) > thresholds.asymmetryThreshold) {
      flags.static_asymmetry = true;
    }
  }

  // Check shoulder height asymmetry
  if (rawMetrics.leftShoulderYHistory.length > 5 && rawMetrics.rightShoulderYHistory.length > 5) {
    const shoulderDiffs: number[] = [];
    const minLen = Math.min(rawMetrics.leftShoulderYHistory.length, rawMetrics.rightShoulderYHistory.length);
    for (let i = 0; i < minLen; i++) {
      shoulderDiffs.push(rawMetrics.leftShoulderYHistory[i] - rawMetrics.rightShoulderYHistory[i]);
    }
    const avgShoulderDiff = mean(shoulderDiffs);
    if (Math.abs(avgShoulderDiff) > thresholds.hipDropThreshold) {
      flags.static_asymmetry = true;
    }
  }

  // 6. Ankle pronation detection (medial drift)
  if (frontalMetrics) {
    if (
      (frontalMetrics.ankle_medial_drift_left && Math.abs(frontalMetrics.ankle_medial_drift_left) > 0.02) ||
      (frontalMetrics.ankle_medial_drift_right && Math.abs(frontalMetrics.ankle_medial_drift_right) > 0.02)
    ) {
      flags.static_ankle_pronation = true;
    }
  }

  return flags;
}

/**
 * Compute static metrics from raw data
 */
export function computeStaticMetrics(
  rawMetrics: StaticRawMetrics,
  frontalMetrics?: FrontalMetrics | null,
  thresholds: StaticThresholds = DEFAULT_STATIC_THRESHOLDS
): StaticMetrics {
  // Compute mean angles
  const meanAngles: Record<string, number> = {};
  if (rawMetrics.leftKneeAngleHistory.length > 0) {
    meanAngles['left_knee'] = mean(rawMetrics.leftKneeAngleHistory);
  }
  if (rawMetrics.rightKneeAngleHistory.length > 0) {
    meanAngles['right_knee'] = mean(rawMetrics.rightKneeAngleHistory);
  }
  if (rawMetrics.trunkLeanHistory.length > 0) {
    meanAngles['trunk_lean'] = mean(rawMetrics.trunkLeanHistory);
  }

  // Compute angle variability
  const angleVariability: Record<string, number> = {};
  if (rawMetrics.leftKneeAngleHistory.length > 0) {
    angleVariability['left_knee'] = standardDeviation(rawMetrics.leftKneeAngleHistory);
  }
  if (rawMetrics.rightKneeAngleHistory.length > 0) {
    angleVariability['right_knee'] = standardDeviation(rawMetrics.rightKneeAngleHistory);
  }
  if (rawMetrics.trunkLeanHistory.length > 0) {
    angleVariability['trunk_lean'] = standardDeviation(rawMetrics.trunkLeanHistory);
  }

  // Compute CoM sway
  const swayX = standardDeviation(rawMetrics.comXHistory);
  const swayY = standardDeviation(rawMetrics.comYHistory);
  const swayTotal = Math.sqrt(swayX * swayX + swayY * swayY);

  // Compute asymmetry metrics
  const asymmetry: StaticMetrics['asymmetry'] = {};

  if (rawMetrics.leftKneeAngleHistory.length > 0 && rawMetrics.rightKneeAngleHistory.length > 0) {
    asymmetry.kneeAngleDiff = mean(rawMetrics.leftKneeAngleHistory) - mean(rawMetrics.rightKneeAngleHistory);
  }

  if (rawMetrics.leftHipYHistory.length > 0 && rawMetrics.rightHipYHistory.length > 0) {
    const hipDiffs: number[] = [];
    const minLen = Math.min(rawMetrics.leftHipYHistory.length, rawMetrics.rightHipYHistory.length);
    for (let i = 0; i < minLen; i++) {
      hipDiffs.push(rawMetrics.leftHipYHistory[i] - rawMetrics.rightHipYHistory[i]);
    }
    asymmetry.hipHeightDiff = mean(hipDiffs);
  }

  if (rawMetrics.leftShoulderYHistory.length > 0 && rawMetrics.rightShoulderYHistory.length > 0) {
    const shoulderDiffs: number[] = [];
    const minLen = Math.min(rawMetrics.leftShoulderYHistory.length, rawMetrics.rightShoulderYHistory.length);
    for (let i = 0; i < minLen; i++) {
      shoulderDiffs.push(rawMetrics.leftShoulderYHistory[i] - rawMetrics.rightShoulderYHistory[i]);
    }
    asymmetry.shoulderHeightDiff = mean(shoulderDiffs);
  }

  // Get pattern flags
  const patternFlags = detectStaticPatterns(rawMetrics, frontalMetrics, thresholds);

  return {
    meanAngles,
    angleVariability,
    comSway: {
      swayX,
      swayY,
      swayTotal,
    },
    asymmetry,
    patternFlags,
  };
}

/**
 * Suggestions mapping for static patterns
 */
export const STATIC_PATTERN_SUGGESTIONS: Record<keyof StaticPatternFlags, { message: string; detail: string }> = {
  static_instability: {
    message: 'Balance instability detected',
    detail: 'You show increased sway during this exercise, suggesting reduced balance or control in this position. Consider exercises to improve proprioception and core stability.',
  },
  static_hip_drop: {
    message: 'Pelvic drop detected',
    detail: 'During single-leg stance, your pelvis drops on the unsupported side; this pattern is often linked to limited hip stability or gluteus medius weakness.',
  },
  static_knee_valgus: {
    message: 'Knee valgus pattern observed',
    detail: 'Your knee tends to move inward relative to your foot in this exercise; this pattern may increase load on the knee and is often related to hip strength or ankle mobility.',
  },
  static_trunk_compensation: {
    message: 'Trunk compensation detected',
    detail: 'You compensate with trunk lean instead of keeping the torso near neutral in this position. This may indicate core weakness or hip mobility limitations.',
  },
  static_asymmetry: {
    message: 'Left/right asymmetry observed',
    detail: 'Left and right sides behave differently in this exercise (range or stability), indicating asymmetry that may benefit from targeted single-leg work.',
  },
  static_ankle_pronation: {
    message: 'Ankle pronation detected',
    detail: 'Your ankle appears to roll inward during this exercise. This may affect lower limb alignment and could be addressed with ankle mobility or strengthening work.',
  },
};

/**
 * Generate suggestions from pattern flags
 */
export function generateStaticPatternSuggestions(flags: StaticPatternFlags): Suggestion[] {
  const suggestions: Suggestion[] = [];

  for (const [key, value] of Object.entries(flags)) {
    if (value === true) {
      const patternKey = key as keyof StaticPatternFlags;
      const info = STATIC_PATTERN_SUGGESTIONS[patternKey];
      if (info) {
        suggestions.push({
          id: `static_pattern_${patternKey}`,
          severity: 'improvement',
          message: info.message,
          detail: info.detail,
        });
      }
    }
  }

  return suggestions;
}

/**
 * Create empty raw metrics object
 */
export function createEmptyRawMetrics(): StaticRawMetrics {
  return {
    comXHistory: [],
    comYHistory: [],
    leftHipYHistory: [],
    rightHipYHistory: [],
    leftKneeAngleHistory: [],
    rightKneeAngleHistory: [],
    trunkLeanHistory: [],
    leftAnkleXHistory: [],
    rightAnkleXHistory: [],
    leftKneeXHistory: [],
    rightKneeXHistory: [],
    leftShoulderYHistory: [],
    rightShoulderYHistory: [],
  };
}

export default detectStaticPatterns;
