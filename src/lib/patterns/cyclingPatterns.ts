/**
 * BiomechCoach - Cycling Pattern Detector
 *
 * Detects common cycling biomechanical patterns related to bike fit
 * and pedaling mechanics. Works with both side view (sagittal)
 * and front view (frontal) data when available.
 *
 * Note: Pattern detection is based on general bike fit principles.
 * Individual variation is normal and professional bike fitting
 * may be beneficial for optimal setup.
 */

import {
  CyclingPatternFlags,
  AngleStats,
  FrontalMetrics,
  CyclingThresholds,
  FrontalThresholds,
  DEFAULT_CYCLING_THRESHOLDS,
  DEFAULT_FRONTAL_THRESHOLDS,
  Suggestion,
} from '../poseTypes';

/**
 * Configuration for cycling pattern detection
 */
export interface CyclingPatternConfig {
  sagittalThresholds: CyclingThresholds;
  frontalThresholds: FrontalThresholds;
  /** Minimum pedal cycles needed before flagging patterns */
  minCycles: number;
  /** Knee angle threshold for saddle too low (degrees) */
  saddleLowThreshold: number;
  /** Knee angle threshold for saddle too high (degrees) */
  saddleHighThreshold: number;
  /** Trunk angle threshold for excessive lean (degrees) */
  trunkLeanThreshold: number;
}

const DEFAULT_CONFIG: CyclingPatternConfig = {
  sagittalThresholds: DEFAULT_CYCLING_THRESHOLDS,
  frontalThresholds: DEFAULT_FRONTAL_THRESHOLDS,
  minCycles: 5,
  saddleLowThreshold: 140, // Knee angle at BDC < this = saddle too low
  saddleHighThreshold: 155, // Knee angle at BDC > this = saddle too high
  trunkLeanThreshold: 30, // Trunk angle < this = very aggressive
};

/**
 * Detect saddle too low pattern.
 * When saddle is too low, knee flexion at bottom dead center (BDC)
 * is excessive, increasing knee stress.
 *
 * Uses: knee angle at BDC (side view)
 */
export function detectSaddleLow(
  leftKneeStats: AngleStats | null,
  rightKneeStats: AngleStats | null,
  config: CyclingPatternConfig = DEFAULT_CONFIG
): boolean {
  // Get average knee angle at BDC
  const leftAvg = leftKneeStats?.avg;
  const rightAvg = rightKneeStats?.avg;

  let avgAngle: number | null = null;

  if (leftAvg != null && rightAvg != null) {
    avgAngle = (leftAvg + rightAvg) / 2;
  } else if (leftAvg != null) {
    avgAngle = leftAvg;
  } else if (rightAvg != null) {
    avgAngle = rightAvg;
  }

  if (avgAngle === null) return false;

  // Saddle too low if knee is too bent at BDC
  return avgAngle < config.saddleLowThreshold;
}

/**
 * Detect saddle too high pattern.
 * When saddle is too high, knee is too extended at BDC,
 * and hip rocking may occur.
 *
 * Uses: knee angle at BDC (side view)
 */
export function detectSaddleHigh(
  leftKneeStats: AngleStats | null,
  rightKneeStats: AngleStats | null,
  config: CyclingPatternConfig = DEFAULT_CONFIG
): boolean {
  // Get average knee angle at BDC
  const leftAvg = leftKneeStats?.avg;
  const rightAvg = rightKneeStats?.avg;

  let avgAngle: number | null = null;

  if (leftAvg != null && rightAvg != null) {
    avgAngle = (leftAvg + rightAvg) / 2;
  } else if (leftAvg != null) {
    avgAngle = leftAvg;
  } else if (rightAvg != null) {
    avgAngle = rightAvg;
  }

  if (avgAngle === null) return false;

  // Saddle too high if knee is too extended at BDC
  return avgAngle > config.saddleHighThreshold;
}

/**
 * Detect knee tracking instability pattern.
 * Lateral knee movement during the pedal stroke can indicate
 * cleat alignment issues, saddle height problems, or hip weakness.
 *
 * Uses: knee lateral deviation (front view)
 */
export function detectKneeTrackingInstability(
  frontalMetrics: FrontalMetrics | null,
  config: CyclingPatternConfig = DEFAULT_CONFIG
): boolean {
  if (!frontalMetrics) return false;

  const threshold = config.frontalThresholds.kneeLateralDeviationThreshold;

  const leftDeviation = frontalMetrics.knee_lateral_deviation_left;
  const rightDeviation = frontalMetrics.knee_lateral_deviation_right;

  return (
    (leftDeviation != null && leftDeviation > threshold) ||
    (rightDeviation != null && rightDeviation > threshold)
  );
}

/**
 * Detect excessive trunk lean pattern for cycling.
 * Very aggressive positions can strain back and neck.
 *
 * Uses: trunk angle from vertical (side view)
 */
export function detectExcessiveTrunkLeanCycling(
  trunkStats: AngleStats | null,
  config: CyclingPatternConfig = DEFAULT_CONFIG
): boolean {
  if (!trunkStats?.avg) return false;

  // For cycling, very low trunk angle = aggressive position
  return trunkStats.avg < config.trunkLeanThreshold;
}

/**
 * Detect hip rocking pattern.
 * Hip rocking (alternating hip tilt) often accompanies a too-high saddle.
 * Can be detected through hip Y-position variance.
 *
 * Uses: hip vertical position variance during pedaling
 */
export function detectHipRocking(
  hipAngleVariance: number | null,
  threshold: number = 5
): boolean {
  if (hipAngleVariance === null) return false;
  return hipAngleVariance > threshold;
}

/**
 * Detect all cycling patterns and return pattern flags.
 * This is the main entry point for pattern detection.
 *
 * @param angleStats - Angle statistics from analysis
 * @param frontalMetrics - Optional frontal plane metrics
 * @param config - Pattern detection configuration
 * @returns CyclingPatternFlags object with detected patterns
 */
export function detectCyclingPatterns(
  angleStats: Record<string, AngleStats>,
  frontalMetrics: FrontalMetrics | null = null,
  config: CyclingPatternConfig = DEFAULT_CONFIG
): CyclingPatternFlags {
  const flags: CyclingPatternFlags = {};

  // Get relevant stats
  const leftKnee = angleStats['left_knee_flexion'];
  const rightKnee = angleStats['right_knee_flexion'];
  const trunk = angleStats['trunk_angle'];

  // Check if we have enough data
  const hasSufficientData =
    (leftKnee?.samples ?? 0) >= config.minCycles ||
    (rightKnee?.samples ?? 0) >= config.minCycles;

  // Sagittal plane patterns (side view)
  if (hasSufficientData) {
    flags.saddle_low = detectSaddleLow(leftKnee, rightKnee, config);
    flags.saddle_high = detectSaddleHigh(leftKnee, rightKnee, config);
    flags.excessive_trunk_lean = detectExcessiveTrunkLeanCycling(trunk, config);
  }

  // Frontal plane patterns (front view)
  if (frontalMetrics) {
    flags.knee_tracking_instability = detectKneeTrackingInstability(
      frontalMetrics,
      config
    );
  }

  return flags;
}

/**
 * Map cycling pattern flags to suggestion messages.
 * These are non-medical observations about detected patterns.
 */
export const CYCLING_PATTERN_SUGGESTIONS: Record<keyof CyclingPatternFlags, {
  message: string;
  detail: string;
}> = {
  saddle_low: {
    message: 'Saddle height may be too low',
    detail: 'Your knee angle at the bottom of the pedal stroke suggests the saddle may be slightly low, which increases knee flexion and can lead to increased knee stress. Consider raising the saddle slightly.',
  },
  saddle_high: {
    message: 'Saddle height may be too high',
    detail: 'Your knee angle at the bottom of the pedal stroke suggests the saddle may be slightly high. This can cause hip rocking, lower back strain, and reduced pedaling efficiency. Consider lowering the saddle slightly.',
  },
  knee_tracking_instability: {
    message: 'Knee tracking shows lateral movement',
    detail: 'Your knee path shows lateral deviation during the pedal stroke. This can be caused by cleat alignment, saddle height, or hip/core weakness. Check cleat position and consider hip strengthening exercises.',
  },
  excessive_trunk_lean: {
    message: 'Very aggressive riding position',
    detail: 'Your trunk position is quite aggressive/aerodynamic. While this can improve speed, ensure you have adequate flexibility and core strength to maintain this position comfortably.',
  },
};

/**
 * Generate suggestions from detected cycling patterns.
 *
 * @param flags - Detected pattern flags
 * @returns Array of suggestions
 */
export function generateCyclingPatternSuggestions(flags: CyclingPatternFlags): Suggestion[] {
  const suggestions: Suggestion[] = [];

  const patternKeys = Object.keys(flags) as (keyof CyclingPatternFlags)[];

  for (const key of patternKeys) {
    if (flags[key] === true) {
      const suggestionData = CYCLING_PATTERN_SUGGESTIONS[key];
      if (suggestionData) {
        suggestions.push({
          id: `pattern-${key}`,
          severity: key === 'saddle_low' || key === 'saddle_high' ? 'warning' : 'improvement',
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
export function getActiveCyclingPatterns(flags: CyclingPatternFlags): string[] {
  const active: string[] = [];
  const patternKeys = Object.keys(flags) as (keyof CyclingPatternFlags)[];

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

/**
 * Get bike fit recommendations based on detected patterns.
 *
 * @param flags - Detected pattern flags
 * @returns Array of actionable recommendations
 */
export function getBikeFitRecommendations(flags: CyclingPatternFlags): string[] {
  const recommendations: string[] = [];

  if (flags.saddle_low) {
    recommendations.push(
      'Try raising your saddle by 5-10mm increments until knee angle at BDC reaches 140-150 degrees.'
    );
  }

  if (flags.saddle_high) {
    recommendations.push(
      'Try lowering your saddle by 5-10mm increments until knee angle at BDC is between 140-150 degrees.'
    );
  }

  if (flags.knee_tracking_instability) {
    recommendations.push(
      'Check cleat alignment - your cleats may need adjustment for Q-factor or rotation.'
    );
    recommendations.push(
      'Consider hip and glute strengthening exercises to improve lateral stability.'
    );
  }

  if (flags.excessive_trunk_lean) {
    recommendations.push(
      'If experiencing discomfort, consider raising your handlebars or using a shorter stem.'
    );
  }

  return recommendations;
}
