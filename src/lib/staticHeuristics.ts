/**
 * BiomechCoach - Static Analysis Heuristics
 *
 * Generates suggestions and muscle insights for static assessment exercises.
 * These are exercise-specific and general postural feedback items.
 */

import {
  Suggestion,
  MuscleInsight,
  StaticMetrics,
  StaticExercise,
  AngleStats,
} from './poseTypes';

/**
 * Generate suggestions based on static metrics and exercise type
 */
export function generateStaticSuggestions(
  metrics: StaticMetrics,
  exercise?: StaticExercise,
  _angleStats?: Record<string, AngleStats>
): Suggestion[] {
  const suggestions: Suggestion[] = [];

  // General stability suggestions
  if (metrics.comSway.swayTotal > 0.015) {
    const severity = metrics.comSway.swayTotal > 0.025 ? 'warning' : 'improvement';
    suggestions.push({
      id: 'static_sway_general',
      severity,
      message: 'Consider focusing on balance control',
      detail: `Your center of mass shows ${severity === 'warning' ? 'significant' : 'moderate'} movement during this exercise. Try engaging your core and focusing on a fixed point ahead.`,
    });
  }

  // Asymmetry suggestions
  if (metrics.asymmetry.kneeAngleDiff && Math.abs(metrics.asymmetry.kneeAngleDiff) > 5) {
    suggestions.push({
      id: 'static_knee_asymmetry',
      severity: 'improvement',
      message: 'Knee angle asymmetry noted',
      detail: `There's a ${Math.abs(metrics.asymmetry.kneeAngleDiff).toFixed(1)}° difference between left and right knee angles. Consider single-leg exercises to address this imbalance.`,
    });
  }

  if (metrics.asymmetry.hipHeightDiff && Math.abs(metrics.asymmetry.hipHeightDiff) > 0.02) {
    suggestions.push({
      id: 'static_hip_height_asymmetry',
      severity: 'improvement',
      message: 'Hip height difference observed',
      detail: 'Your hips are not level during this exercise. This could indicate muscle imbalances or leg length differences.',
    });
  }

  // Variability suggestions
  const highVariabilityAngles: string[] = [];
  for (const [angleName, variability] of Object.entries(metrics.angleVariability)) {
    if (variability > 8) {
      highVariabilityAngles.push(angleName.replace('_', ' '));
    }
  }
  if (highVariabilityAngles.length > 0) {
    suggestions.push({
      id: 'static_high_variability',
      severity: 'improvement',
      message: 'Movement variability detected',
      detail: `High variability observed in: ${highVariabilityAngles.join(', ')}. Try to maintain more consistent positions throughout the exercise.`,
    });
  }

  // Exercise-specific suggestions
  if (exercise) {
    suggestions.push(...getExerciseSpecificSuggestions(exercise, metrics, _angleStats));
  }

  return suggestions;
}

/**
 * Get exercise-specific suggestions
 */
function getExerciseSpecificSuggestions(
  exercise: StaticExercise,
  metrics: StaticMetrics,
  _angleStats?: Record<string, AngleStats>
): Suggestion[] {
  const suggestions: Suggestion[] = [];

  switch (exercise.category) {
    case 'squat':
      if (metrics.patternFlags.static_knee_valgus) {
        suggestions.push({
          id: 'squat_knee_cue',
          severity: 'info',
          message: 'Knee tracking cue',
          detail: 'Try to keep your knees tracking over your toes. Imagine pushing your knees slightly outward as you squat.',
        });
      }
      if (metrics.patternFlags.static_trunk_compensation) {
        suggestions.push({
          id: 'squat_trunk_cue',
          severity: 'info',
          message: 'Trunk position cue',
          detail: 'Focus on keeping your chest up and core engaged. A slight forward lean is normal, but excessive lean may indicate hip mobility limitations.',
        });
      }
      break;

    case 'balance':
      if (metrics.comSway.swayTotal > 0.01) {
        suggestions.push({
          id: 'balance_cue',
          severity: 'info',
          message: 'Balance enhancement tip',
          detail: 'Focus your gaze on a fixed point at eye level. Engage your core and imagine rooting your standing foot into the ground.',
        });
      }
      if (metrics.patternFlags.static_hip_drop) {
        suggestions.push({
          id: 'balance_hip_cue',
          severity: 'info',
          message: 'Pelvis control cue',
          detail: 'Try to keep your hips level during single-leg stance. Engage your gluteus medius on the standing leg side.',
        });
      }
      break;

    case 'lunge':
      if (metrics.patternFlags.static_knee_valgus) {
        suggestions.push({
          id: 'lunge_knee_cue',
          severity: 'info',
          message: 'Front knee alignment',
          detail: 'Ensure your front knee stays aligned over your ankle. Avoid letting it cave inward.',
        });
      }
      break;

    case 'heel_raise':
      if (metrics.comSway.swayX > 0.015) {
        suggestions.push({
          id: 'heel_raise_lateral_sway',
          severity: 'info',
          message: 'Ankle stability note',
          detail: 'You show some lateral sway during heel raises. Focus on keeping your weight centered and ankle stable.',
        });
      }
      break;

    case 'hinge':
      if (metrics.patternFlags.static_trunk_compensation) {
        suggestions.push({
          id: 'hinge_trunk_cue',
          severity: 'info',
          message: 'Hip hinge pattern',
          detail: 'Focus on hinging from your hips while keeping your spine neutral. Imagine pushing your hips back rather than bending forward.',
        });
      }
      break;

    case 'stance':
      if (metrics.patternFlags.static_asymmetry) {
        suggestions.push({
          id: 'stance_symmetry_cue',
          severity: 'info',
          message: 'Weight distribution',
          detail: 'Try to distribute your weight evenly between both legs. Check that both sides are contributing equally.',
        });
      }
      break;
  }

  return suggestions;
}

/**
 * Generate muscle insights for static exercises
 */
export function generateStaticMuscleInsights(
  metrics: StaticMetrics,
  exercise?: StaticExercise
): MuscleInsight[] {
  const insights: MuscleInsight[] = [];

  // Base insights on exercise category
  const category = exercise?.category || 'balance';

  switch (category) {
    case 'squat':
      insights.push({
        muscleGroup: 'Quadriceps',
        engagement: getEngagementLevel(metrics.meanAngles['left_knee'] || metrics.meanAngles['right_knee'], 130, 160, true),
        note: 'Primary movers during the squat descent and ascent.',
      });
      insights.push({
        muscleGroup: 'Glutes',
        engagement: metrics.patternFlags.static_hip_drop ? 'low' : 'moderate',
        note: 'Provide hip stability and extension during squatting.',
      });
      insights.push({
        muscleGroup: 'Core',
        engagement: metrics.patternFlags.static_trunk_compensation ? 'low' : 'moderate',
        note: 'Stabilizes the trunk throughout the movement.',
      });
      break;

    case 'balance':
      insights.push({
        muscleGroup: 'Gluteus Medius',
        engagement: metrics.patternFlags.static_hip_drop ? 'low' : 'high',
        note: 'Key stabilizer for single-leg balance and pelvic control.',
      });
      insights.push({
        muscleGroup: 'Ankle Stabilizers',
        engagement: metrics.comSway.swayTotal > 0.02 ? 'low' : 'high',
        note: 'Peroneals and tibialis control ankle position during stance.',
      });
      insights.push({
        muscleGroup: 'Core',
        engagement: metrics.patternFlags.static_trunk_compensation ? 'low' : 'moderate',
        note: 'Maintains trunk stability during balance challenges.',
      });
      break;

    case 'lunge':
      insights.push({
        muscleGroup: 'Quadriceps (Front Leg)',
        engagement: 'high',
        note: 'Controls knee flexion in the lunge position.',
      });
      insights.push({
        muscleGroup: 'Hip Flexors (Back Leg)',
        engagement: 'moderate',
        note: 'Lengthened position while maintaining hip stability.',
      });
      insights.push({
        muscleGroup: 'Glutes',
        engagement: metrics.patternFlags.static_hip_drop ? 'low' : 'moderate',
        note: 'Provide hip stability in the split stance position.',
      });
      break;

    case 'heel_raise':
      insights.push({
        muscleGroup: 'Gastrocnemius',
        engagement: 'high',
        note: 'Primary calf muscle for heel raise movement.',
      });
      insights.push({
        muscleGroup: 'Soleus',
        engagement: 'high',
        note: 'Deep calf muscle active throughout heel raises.',
      });
      insights.push({
        muscleGroup: 'Ankle Stabilizers',
        engagement: metrics.comSway.swayX > 0.015 ? 'low' : 'moderate',
        note: 'Control lateral ankle stability during raises.',
      });
      break;

    case 'hinge':
      insights.push({
        muscleGroup: 'Hamstrings',
        engagement: 'high',
        note: 'Primary hip extensors during the hinge pattern.',
      });
      insights.push({
        muscleGroup: 'Glutes',
        engagement: 'high',
        note: 'Work with hamstrings to control hip hinge.',
      });
      insights.push({
        muscleGroup: 'Erector Spinae',
        engagement: metrics.patternFlags.static_trunk_compensation ? 'high' : 'moderate',
        note: 'Maintains spinal position during the hinge.',
      });
      break;

    case 'stance':
      insights.push({
        muscleGroup: 'Quadriceps',
        engagement: getEngagementLevel(metrics.meanAngles['left_knee'] || metrics.meanAngles['right_knee'], 90, 120, true),
        note: 'Maintain knee flexion in wall sit position.',
      });
      insights.push({
        muscleGroup: 'Core',
        engagement: 'moderate',
        note: 'Stabilizes trunk against the wall.',
      });
      insights.push({
        muscleGroup: 'Hip Adductors',
        engagement: metrics.patternFlags.static_asymmetry ? 'low' : 'moderate',
        note: 'Help maintain symmetric lower limb position.',
      });
      break;
  }

  return insights;
}

/**
 * Helper to determine engagement level based on angle
 */
function getEngagementLevel(
  angle: number | undefined,
  lowThreshold: number,
  highThreshold: number,
  inverted: boolean = false
): 'low' | 'moderate' | 'high' {
  if (angle === undefined) return 'moderate';

  if (inverted) {
    // Lower angle = higher engagement (e.g., squat depth)
    if (angle < lowThreshold) return 'high';
    if (angle > highThreshold) return 'low';
    return 'moderate';
  } else {
    // Higher angle = higher engagement
    if (angle > highThreshold) return 'high';
    if (angle < lowThreshold) return 'low';
    return 'moderate';
  }
}

/**
 * Get a summary statement for the static analysis
 */
export function getStaticAnalysisSummary(
  metrics: StaticMetrics,
  exercise?: StaticExercise
): string {
  const issues: string[] = [];

  if (metrics.patternFlags.static_instability) {
    issues.push('balance instability');
  }
  if (metrics.patternFlags.static_hip_drop) {
    issues.push('pelvic drop');
  }
  if (metrics.patternFlags.static_knee_valgus) {
    issues.push('knee valgus');
  }
  if (metrics.patternFlags.static_trunk_compensation) {
    issues.push('trunk compensation');
  }
  if (metrics.patternFlags.static_asymmetry) {
    issues.push('left/right asymmetry');
  }

  if (issues.length === 0) {
    return `Good control demonstrated during ${exercise?.name || 'this exercise'}. No significant compensatory patterns detected.`;
  }

  return `During ${exercise?.name || 'this exercise'}, the following patterns were observed: ${issues.join(', ')}. See suggestions below for improvement tips.`;
}

export default generateStaticSuggestions;
