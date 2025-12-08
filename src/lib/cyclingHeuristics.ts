/**
 * BiomechCoach - Cycling Heuristics
 *
 * Rule-based heuristics for analyzing cycling biomechanics.
 * These provide educational suggestions based on angle measurements.
 *
 * Note: These are guidelines based on general biomechanics principles,
 * not medical advice. Individual bike fit needs vary based on anatomy,
 * flexibility, and riding style.
 */

import {
  AngleStats,
  Suggestion,
  MuscleInsight,
  CyclingThresholds,
  DEFAULT_CYCLING_THRESHOLDS,
} from './poseTypes';

/**
 * Analyze knee flexion at bottom dead center (BDC)
 * and provide saddle height suggestions
 */
export function analyzeKneeFlexionBdc(
  leftKnee: AngleStats | null,
  rightKnee: AngleStats | null,
  thresholds: CyclingThresholds = DEFAULT_CYCLING_THRESHOLDS
): Suggestion[] {
  const suggestions: Suggestion[] = [];

  // Use the average of both sides, or whichever is available
  const leftAvg = leftKnee?.avg;
  const rightAvg = rightKnee?.avg;

  let avgKneeAngle: number | null = null;
  if (leftAvg !== null && leftAvg !== undefined && rightAvg !== null && rightAvg !== undefined) {
    avgKneeAngle = (leftAvg + rightAvg) / 2;
  } else if (leftAvg !== null && leftAvg !== undefined) {
    avgKneeAngle = leftAvg;
  } else if (rightAvg !== null && rightAvg !== undefined) {
    avgKneeAngle = rightAvg;
  }

  if (avgKneeAngle === null) return suggestions;

  // Check for saddle too low (knee too bent)
  if (avgKneeAngle < thresholds.kneeFlexionBdcMin) {
    suggestions.push({
      id: 'saddle-too-low',
      severity: 'warning',
      message: 'Saddle may be too low.',
      detail: `Your knee angle at the bottom of the pedal stroke (${Math.round(avgKneeAngle)}°) is less than the recommended ${thresholds.kneeFlexionBdcMin}°. This can increase knee stress and reduce power output. Consider raising your saddle slightly.`,
      relatedAngles: ['left_knee_flexion', 'right_knee_flexion'],
    });
  }

  // Check for saddle too high (knee too extended)
  else if (avgKneeAngle > thresholds.kneeFlexionBdcMax) {
    suggestions.push({
      id: 'saddle-too-high',
      severity: 'warning',
      message: 'Saddle may be too high.',
      detail: `Your knee angle at the bottom of the pedal stroke (${Math.round(avgKneeAngle)}°) exceeds the recommended ${thresholds.kneeFlexionBdcMax}°. This can cause hip rocking, lower back strain, and reduced efficiency. Consider lowering your saddle slightly.`,
      relatedAngles: ['left_knee_flexion', 'right_knee_flexion'],
    });
  }

  // Within good range
  else if (
    avgKneeAngle >= thresholds.kneeFlexionBdcIdealMin &&
    avgKneeAngle <= thresholds.kneeFlexionBdcIdealMax
  ) {
    suggestions.push({
      id: 'knee-flexion-good',
      severity: 'info',
      message: 'Knee angle at BDC looks good.',
      detail: `Your knee angle (${Math.round(avgKneeAngle)}°) is within the ideal range of ${thresholds.kneeFlexionBdcIdealMin}°-${thresholds.kneeFlexionBdcIdealMax}°.`,
      relatedAngles: ['left_knee_flexion', 'right_knee_flexion'],
    });
  }

  // Check for left/right asymmetry
  if (leftAvg !== null && leftAvg !== undefined && rightAvg !== null && rightAvg !== undefined) {
    const asymmetry = Math.abs(leftAvg - rightAvg);
    if (asymmetry > 10) {
      suggestions.push({
        id: 'knee-asymmetry',
        severity: 'improvement',
        message: 'Noticeable left/right knee angle difference.',
        detail: `There's a ${Math.round(asymmetry)}° difference between your left (${Math.round(leftAvg)}°) and right (${Math.round(rightAvg)}°) knee angles. This could indicate saddle alignment issues, leg length difference, or muscular imbalances.`,
        relatedAngles: ['left_knee_flexion', 'right_knee_flexion'],
      });
    }
  }

  return suggestions;
}

/**
 * Analyze hip angle for position and engagement
 */
export function analyzeHipAngle(
  leftHip: AngleStats | null,
  rightHip: AngleStats | null,
  thresholds: CyclingThresholds = DEFAULT_CYCLING_THRESHOLDS
): Suggestion[] {
  const suggestions: Suggestion[] = [];

  const leftAvg = leftHip?.avg;
  const rightAvg = rightHip?.avg;

  let avgHipAngle: number | null = null;
  if (leftAvg !== null && leftAvg !== undefined && rightAvg !== null && rightAvg !== undefined) {
    avgHipAngle = (leftAvg + rightAvg) / 2;
  } else if (leftAvg !== null && leftAvg !== undefined) {
    avgHipAngle = leftAvg;
  } else if (rightAvg !== null && rightAvg !== undefined) {
    avgHipAngle = rightAvg;
  }

  if (avgHipAngle === null) return suggestions;

  // Very closed hip angle (aggressive position)
  if (avgHipAngle < thresholds.hipAngleMin) {
    suggestions.push({
      id: 'hip-very-closed',
      severity: 'improvement',
      message: 'Very closed hip angle detected.',
      detail: `Your hip angle (${Math.round(avgHipAngle)}°) is quite closed. This aggressive position can reduce glute activation and increase quad dominance. Consider a more moderate position if you experience hip flexor tightness or knee pain.`,
      relatedAngles: ['left_hip_angle', 'right_hip_angle'],
    });
  }

  // Very open hip angle (upright position)
  else if (avgHipAngle > thresholds.hipAngleMax) {
    suggestions.push({
      id: 'hip-very-open',
      severity: 'info',
      message: 'Upright riding position.',
      detail: `Your hip angle (${Math.round(avgHipAngle)}°) indicates a relaxed, upright position. This is comfortable but less aerodynamic. Fine for casual riding or rehabilitation.`,
      relatedAngles: ['left_hip_angle', 'right_hip_angle'],
    });
  }

  return suggestions;
}

/**
 * Analyze trunk angle
 */
export function analyzeTrunkAngle(
  trunkAngle: AngleStats | null,
  thresholds: CyclingThresholds = DEFAULT_CYCLING_THRESHOLDS
): Suggestion[] {
  const suggestions: Suggestion[] = [];

  if (!trunkAngle?.avg) return suggestions;

  const angle = trunkAngle.avg;

  if (angle < thresholds.trunkAngleAggressive) {
    suggestions.push({
      id: 'trunk-aggressive',
      severity: 'info',
      message: 'Very aggressive/aerodynamic position.',
      detail: `Your trunk angle (${Math.round(angle)}° from vertical) is quite low. This is aerodynamic but puts more stress on your lower back, neck, and shoulders. Ensure you have the flexibility and core strength for this position.`,
      relatedAngles: ['trunk_angle'],
    });
  } else if (angle > thresholds.trunkAngleUpright) {
    suggestions.push({
      id: 'trunk-upright',
      severity: 'info',
      message: 'Upright riding position.',
      detail: `Your trunk angle (${Math.round(angle)}° from vertical) is quite upright. Comfortable for casual riding but less efficient for speed.`,
      relatedAngles: ['trunk_angle'],
    });
  }

  return suggestions;
}

/**
 * Analyze muscle engagement patterns based on angles
 */
export function analyzeMuscleEngagement(
  kneeAngle: number | null,
  hipAngle: number | null,
  trunkAngle: number | null
): MuscleInsight[] {
  const insights: MuscleInsight[] = [];

  // Quadriceps engagement
  if (kneeAngle !== null) {
    if (kneeAngle < 140) {
      insights.push({
        muscleGroup: 'Quadriceps',
        engagement: 'high',
        note: 'Deep knee flexion increases quadriceps demand. Consider saddle adjustment if experiencing quad fatigue.',
      });
    } else if (kneeAngle > 150) {
      insights.push({
        muscleGroup: 'Quadriceps',
        engagement: 'moderate',
        note: 'Extended knee position reduces quad load but may limit power transfer.',
      });
    } else {
      insights.push({
        muscleGroup: 'Quadriceps',
        engagement: 'moderate',
        note: 'Knee angle allows efficient quadriceps activation.',
      });
    }
  }

  // Gluteal engagement
  if (hipAngle !== null) {
    if (hipAngle > 100) {
      insights.push({
        muscleGroup: 'Glutes',
        engagement: 'high',
        note: 'Open hip angle promotes gluteal engagement. Good for power and reduced quad dominance.',
      });
    } else if (hipAngle < 80) {
      insights.push({
        muscleGroup: 'Glutes',
        engagement: 'low',
        note: 'Closed hip angle may limit glute activation. Consider mobility work or position adjustment.',
      });
    } else {
      insights.push({
        muscleGroup: 'Glutes',
        engagement: 'moderate',
        note: 'Hip angle allows reasonable gluteal contribution.',
      });
    }
  }

  // Hamstring involvement
  if (kneeAngle !== null && hipAngle !== null) {
    if (hipAngle > 90 && kneeAngle > 145) {
      insights.push({
        muscleGroup: 'Hamstrings',
        engagement: 'moderate',
        note: 'Position allows hamstring contribution during the pull phase.',
      });
    } else {
      insights.push({
        muscleGroup: 'Hamstrings',
        engagement: 'low',
        note: 'Current position may limit hamstring engagement in pedal stroke.',
      });
    }
  }

  // Core engagement
  if (trunkAngle !== null) {
    if (trunkAngle < 40) {
      insights.push({
        muscleGroup: 'Core (Abs & Lower Back)',
        engagement: 'high',
        note: 'Aggressive position requires strong core stabilization. Ensure adequate core strength.',
      });
    } else if (trunkAngle > 60) {
      insights.push({
        muscleGroup: 'Core (Abs & Lower Back)',
        engagement: 'low',
        note: 'Upright position reduces core demand.',
      });
    } else {
      insights.push({
        muscleGroup: 'Core (Abs & Lower Back)',
        engagement: 'moderate',
        note: 'Moderate forward lean requires consistent core engagement.',
      });
    }
  }

  return insights;
}

/**
 * Generate all cycling suggestions based on angle statistics
 */
export function generateCyclingSuggestions(
  angles: Record<string, AngleStats>,
  thresholds: CyclingThresholds = DEFAULT_CYCLING_THRESHOLDS
): Suggestion[] {
  const suggestions: Suggestion[] = [];

  // Analyze knee flexion at BDC
  suggestions.push(
    ...analyzeKneeFlexionBdc(
      angles['left_knee_flexion'] || null,
      angles['right_knee_flexion'] || null,
      thresholds
    )
  );

  // Analyze hip angles
  suggestions.push(
    ...analyzeHipAngle(
      angles['left_hip_angle'] || null,
      angles['right_hip_angle'] || null,
      thresholds
    )
  );

  // Analyze trunk angle
  suggestions.push(...analyzeTrunkAngle(angles['trunk_angle'] || null, thresholds));

  // Remove duplicates (by id)
  const uniqueSuggestions = suggestions.filter(
    (suggestion, index, self) => index === self.findIndex((s) => s.id === suggestion.id)
  );

  return uniqueSuggestions;
}

/**
 * Generate muscle insights for cycling
 */
export function generateCyclingMuscleInsights(
  angles: Record<string, AngleStats>
): MuscleInsight[] {
  const leftKnee = angles['left_knee_flexion']?.avg;
  const rightKnee = angles['right_knee_flexion']?.avg;
  const leftHip = angles['left_hip_angle']?.avg;
  const rightHip = angles['right_hip_angle']?.avg;
  const trunk = angles['trunk_angle']?.avg;

  // Average left/right
  const kneeAvg =
    leftKnee !== null && leftKnee !== undefined && rightKnee !== null && rightKnee !== undefined
      ? (leftKnee + rightKnee) / 2
      : (leftKnee ?? rightKnee ?? null);

  const hipAvg =
    leftHip !== null && leftHip !== undefined && rightHip !== null && rightHip !== undefined
      ? (leftHip + rightHip) / 2
      : (leftHip ?? rightHip ?? null);

  return analyzeMuscleEngagement(kneeAvg ?? null, hipAvg ?? null, trunk ?? null);
}
