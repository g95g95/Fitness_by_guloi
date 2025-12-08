/**
 * BiomechCoach - Running Heuristics
 *
 * Rule-based heuristics for analyzing running biomechanics.
 * These provide educational suggestions based on angle measurements.
 *
 * Note: These are guidelines based on general biomechanics principles,
 * not medical advice. Running form varies based on speed, terrain,
 * individual anatomy, and running style.
 */

import {
  AngleStats,
  Suggestion,
  MuscleInsight,
  RunningThresholds,
  DEFAULT_RUNNING_THRESHOLDS,
} from './poseTypes';

/**
 * Gait phase data for analysis
 */
export interface GaitPhaseData {
  isLeftStance: boolean;
  isRightStance: boolean;
  leftAnkleHipDistance: number | null; // Normalized horizontal distance
  rightAnkleHipDistance: number | null;
  leftHipYDiff: number | null; // Hip drop indicator
  rightHipYDiff: number | null;
}

/**
 * Analyze for overstriding
 */
export function analyzeOverstriding(
  gaitData: GaitPhaseData,
  kneeAtContact: AngleStats | null,
  thresholds: RunningThresholds = DEFAULT_RUNNING_THRESHOLDS
): Suggestion[] {
  const suggestions: Suggestion[] = [];

  // Check if ankle is too far ahead of hip at contact
  const leftDistance = gaitData.leftAnkleHipDistance;
  const rightDistance = gaitData.rightAnkleHipDistance;

  const avgDistance =
    leftDistance !== null && rightDistance !== null
      ? (leftDistance + rightDistance) / 2
      : leftDistance ?? rightDistance;

  if (avgDistance !== null && avgDistance > thresholds.overstrideDistance) {
    // Also check knee angle - extended knee at contact suggests overstriding
    const kneeAngle = kneeAtContact?.avg;

    if (kneeAngle !== null && kneeAngle !== undefined && kneeAngle > 165) {
      suggestions.push({
        id: 'overstriding',
        severity: 'warning',
        message: 'Possible overstriding detected.',
        detail: `Your foot appears to be landing well ahead of your center of mass with an extended knee (${Math.round(kneeAngle)}°). This creates a braking force with each step. Consider increasing your cadence (steps per minute) and focusing on landing with your foot closer to under your hips.`,
        relatedAngles: ['left_knee_midstance', 'right_knee_midstance'],
      });
    } else {
      suggestions.push({
        id: 'possible-overstriding',
        severity: 'improvement',
        message: 'Foot landing may be slightly ahead.',
        detail: 'Your foot contact appears to be ahead of your hips. A slight increase in cadence may help improve efficiency.',
        relatedAngles: ['left_knee_midstance', 'right_knee_midstance'],
      });
    }
  }

  return suggestions;
}

/**
 * Analyze hip extension at toe-off
 */
export function analyzeHipExtension(
  leftHipExtension: AngleStats | null,
  rightHipExtension: AngleStats | null,
  thresholds: RunningThresholds = DEFAULT_RUNNING_THRESHOLDS
): Suggestion[] {
  const suggestions: Suggestion[] = [];

  const leftMax = leftHipExtension?.max;
  const rightMax = rightHipExtension?.max;

  let maxExtension: number | null = null;
  if (leftMax !== null && leftMax !== undefined && rightMax !== null && rightMax !== undefined) {
    maxExtension = Math.max(leftMax, rightMax);
  } else if (leftMax !== null && leftMax !== undefined) {
    maxExtension = leftMax;
  } else if (rightMax !== null && rightMax !== undefined) {
    maxExtension = rightMax;
  }

  if (maxExtension === null) return suggestions;

  // Limited hip extension (hip angle not opening enough)
  // Note: In our calculation, a larger angle means more extension
  if (maxExtension < thresholds.hipExtensionMin) {
    suggestions.push({
      id: 'limited-hip-extension',
      severity: 'improvement',
      message: 'Limited hip extension at toe-off.',
      detail: `Your hip extension (${Math.round(maxExtension)}°) appears limited. This may indicate tight hip flexors or weak glutes. Consider hip flexor stretches, glute strengthening exercises, and cueing "push the ground behind you" during running.`,
      relatedAngles: ['left_hip_extension', 'right_hip_extension'],
    });
  }

  // Check for asymmetry
  if (leftMax !== null && leftMax !== undefined && rightMax !== null && rightMax !== undefined) {
    const asymmetry = Math.abs(leftMax - rightMax);
    if (asymmetry > 15) {
      suggestions.push({
        id: 'hip-extension-asymmetry',
        severity: 'improvement',
        message: 'Hip extension asymmetry detected.',
        detail: `There's a ${Math.round(asymmetry)}° difference in hip extension between your left (${Math.round(leftMax)}°) and right (${Math.round(rightMax)}°) sides. This could indicate muscular imbalances or movement restrictions.`,
        relatedAngles: ['left_hip_extension', 'right_hip_extension'],
      });
    }
  }

  return suggestions;
}

/**
 * Analyze trunk lean
 */
export function analyzeTrunkLean(
  trunkLean: AngleStats | null,
  thresholds: RunningThresholds = DEFAULT_RUNNING_THRESHOLDS
): Suggestion[] {
  const suggestions: Suggestion[] = [];

  if (!trunkLean?.avg) return suggestions;

  const angle = trunkLean.avg;

  if (angle < thresholds.trunkLeanMin) {
    suggestions.push({
      id: 'trunk-too-upright',
      severity: 'improvement',
      message: 'Running position may be too upright.',
      detail: `Your trunk angle (${Math.round(angle)}° from vertical) is nearly vertical. A slight forward lean from the ankles (not the waist) can improve running efficiency.`,
      relatedAngles: ['trunk_lean'],
    });
  } else if (angle > thresholds.trunkLeanMax) {
    suggestions.push({
      id: 'excessive-trunk-lean',
      severity: 'warning',
      message: 'Excessive forward trunk lean.',
      detail: `Your trunk angle (${Math.round(angle)}° from vertical) shows significant forward lean. This may indicate weak core/hip muscles or fatigue. Focus on running "tall" with a slight lean from the ankles, not the waist.`,
      relatedAngles: ['trunk_lean'],
    });
  } else {
    suggestions.push({
      id: 'trunk-lean-good',
      severity: 'info',
      message: 'Good trunk position.',
      detail: `Your trunk lean (${Math.round(angle)}°) is within a good range for efficient running.`,
      relatedAngles: ['trunk_lean'],
    });
  }

  // Check for variability (unstable trunk)
  if (trunkLean.min !== null && trunkLean.max !== null) {
    const variance = trunkLean.max - trunkLean.min;
    if (variance > 15) {
      suggestions.push({
        id: 'trunk-instability',
        severity: 'improvement',
        message: 'Trunk position shows variability.',
        detail: `Your trunk angle varies by ${Math.round(variance)}° during the gait cycle. This may indicate core stability issues. Consider core strengthening exercises.`,
        relatedAngles: ['trunk_lean'],
      });
    }
  }

  return suggestions;
}

/**
 * Analyze for hip drop (pelvic drop)
 */
export function analyzeHipDrop(
  gaitData: GaitPhaseData,
  thresholds: RunningThresholds = DEFAULT_RUNNING_THRESHOLDS
): Suggestion[] {
  const suggestions: Suggestion[] = [];

  // Hip drop is when the non-stance hip drops below the stance hip
  // In 2D side view, we can only approximate this

  const leftDiff = gaitData.leftHipYDiff;
  const rightDiff = gaitData.rightHipYDiff;

  if (leftDiff !== null && leftDiff > thresholds.hipDropThreshold) {
    suggestions.push({
      id: 'hip-drop-left',
      severity: 'improvement',
      message: 'Possible left hip drop.',
      detail: 'Your left hip appears to drop during the right leg stance phase. This often indicates weak gluteus medius on the right side. Hip strengthening exercises may help.',
    });
  }

  if (rightDiff !== null && rightDiff > thresholds.hipDropThreshold) {
    suggestions.push({
      id: 'hip-drop-right',
      severity: 'improvement',
      message: 'Possible right hip drop.',
      detail: 'Your right hip appears to drop during the left leg stance phase. This often indicates weak gluteus medius on the left side. Hip strengthening exercises may help.',
    });
  }

  return suggestions;
}

/**
 * Analyze knee angle at midstance
 */
export function analyzeKneeMidstance(
  leftKnee: AngleStats | null,
  rightKnee: AngleStats | null,
  thresholds: RunningThresholds = DEFAULT_RUNNING_THRESHOLDS
): Suggestion[] {
  const suggestions: Suggestion[] = [];

  const leftAvg = leftKnee?.avg;
  const rightAvg = rightKnee?.avg;

  let avgKnee: number | null = null;
  if (leftAvg !== null && leftAvg !== undefined && rightAvg !== null && rightAvg !== undefined) {
    avgKnee = (leftAvg + rightAvg) / 2;
  } else if (leftAvg !== null && leftAvg !== undefined) {
    avgKnee = leftAvg;
  } else if (rightAvg !== null && rightAvg !== undefined) {
    avgKnee = rightAvg;
  }

  if (avgKnee === null) return suggestions;

  // Too straight at midstance
  if (avgKnee > thresholds.kneeFlexionMidstanceMin) {
    suggestions.push({
      id: 'knee-too-straight',
      severity: 'improvement',
      message: 'Limited knee flexion at midstance.',
      detail: `Your knee angle at midstance (${Math.round(avgKnee)}°) shows limited flexion. Moderate knee flexion helps absorb impact and maintain running efficiency.`,
      relatedAngles: ['left_knee_midstance', 'right_knee_midstance'],
    });
  }

  return suggestions;
}

/**
 * Analyze muscle engagement patterns for running
 */
export function analyzeRunningMuscles(
  kneeAngle: number | null,
  hipExtension: number | null,
  trunkLean: number | null
): MuscleInsight[] {
  const insights: MuscleInsight[] = [];

  // Quadriceps
  if (kneeAngle !== null) {
    if (kneeAngle < 150) {
      insights.push({
        muscleGroup: 'Quadriceps',
        engagement: 'high',
        note: 'Significant knee flexion increases quad demand for shock absorption. Ensure adequate strength to prevent overload.',
      });
    } else {
      insights.push({
        muscleGroup: 'Quadriceps',
        engagement: 'moderate',
        note: 'Moderate quadriceps load during the stance phase.',
      });
    }
  }

  // Glutes
  if (hipExtension !== null) {
    if (hipExtension > 175) {
      insights.push({
        muscleGroup: 'Glutes',
        engagement: 'high',
        note: 'Good hip extension indicates active gluteal contribution to propulsion.',
      });
    } else if (hipExtension < 165) {
      insights.push({
        muscleGroup: 'Glutes',
        engagement: 'low',
        note: 'Limited hip extension may indicate underactive glutes. Focus on glute activation drills.',
      });
    } else {
      insights.push({
        muscleGroup: 'Glutes',
        engagement: 'moderate',
        note: 'Moderate gluteal engagement. Could be improved with hip extension focus.',
      });
    }
  }

  // Calves
  insights.push({
    muscleGroup: 'Calves (Gastrocnemius & Soleus)',
    engagement: 'high',
    note: 'Calf muscles are highly active during push-off in running. Regular calf strengthening and stretching is important.',
  });

  // Hip flexors
  if (hipExtension !== null && hipExtension > 170) {
    insights.push({
      muscleGroup: 'Hip Flexors',
      engagement: 'moderate',
      note: 'Hip flexors must work to bring the leg forward after good hip extension. Maintain hip flexor mobility.',
    });
  } else {
    insights.push({
      muscleGroup: 'Hip Flexors',
      engagement: 'high',
      note: 'Limited hip extension may cause hip flexors to work harder. Consider mobility work.',
    });
  }

  // Core
  if (trunkLean !== null) {
    if (trunkLean > 15) {
      insights.push({
        muscleGroup: 'Core (Abs & Lower Back)',
        engagement: 'high',
        note: 'Forward lean requires strong core engagement to maintain posture. Focus on core stability.',
      });
    } else {
      insights.push({
        muscleGroup: 'Core (Abs & Lower Back)',
        engagement: 'moderate',
        note: 'Core muscles provide stability during running. Regular core work supports good form.',
      });
    }
  }

  return insights;
}

/**
 * Generate all running suggestions based on angle statistics and gait data
 */
export function generateRunningSuggestions(
  angles: Record<string, AngleStats>,
  gaitData: GaitPhaseData,
  thresholds: RunningThresholds = DEFAULT_RUNNING_THRESHOLDS
): Suggestion[] {
  const suggestions: Suggestion[] = [];

  // Analyze overstriding
  suggestions.push(
    ...analyzeOverstriding(gaitData, angles['left_knee_midstance'] || angles['right_knee_midstance'] || null, thresholds)
  );

  // Analyze hip extension
  suggestions.push(
    ...analyzeHipExtension(
      angles['left_hip_extension'] || null,
      angles['right_hip_extension'] || null,
      thresholds
    )
  );

  // Analyze trunk lean
  suggestions.push(...analyzeTrunkLean(angles['trunk_lean'] || null, thresholds));

  // Analyze hip drop
  suggestions.push(...analyzeHipDrop(gaitData, thresholds));

  // Analyze knee at midstance
  suggestions.push(
    ...analyzeKneeMidstance(
      angles['left_knee_midstance'] || null,
      angles['right_knee_midstance'] || null,
      thresholds
    )
  );

  // Remove duplicates
  const uniqueSuggestions = suggestions.filter(
    (suggestion, index, self) => index === self.findIndex((s) => s.id === suggestion.id)
  );

  return uniqueSuggestions;
}

/**
 * Generate muscle insights for running
 */
export function generateRunningMuscleInsights(
  angles: Record<string, AngleStats>
): MuscleInsight[] {
  const leftKnee = angles['left_knee_midstance']?.avg;
  const rightKnee = angles['right_knee_midstance']?.avg;
  const leftHip = angles['left_hip_extension']?.max;
  const rightHip = angles['right_hip_extension']?.max;
  const trunk = angles['trunk_lean']?.avg;

  const kneeAvg =
    leftKnee !== null && leftKnee !== undefined && rightKnee !== null && rightKnee !== undefined
      ? (leftKnee + rightKnee) / 2
      : (leftKnee ?? rightKnee ?? null);

  const hipMax =
    leftHip !== null && leftHip !== undefined && rightHip !== null && rightHip !== undefined
      ? Math.max(leftHip, rightHip)
      : (leftHip ?? rightHip ?? null);

  return analyzeRunningMuscles(kneeAvg ?? null, hipMax ?? null, trunk ?? null);
}
