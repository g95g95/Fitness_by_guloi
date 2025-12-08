/**
 * BiomechCoach - Exercise Standard Values
 *
 * Reference angle values and thresholds for each static exercise.
 * Based on biomechanical research and clinical standards.
 */

/**
 * Standard angle values for an exercise
 */
export interface ExerciseStandardAngles {
  leftKnee?: { ideal: number; tolerance: number; min: number; max: number };
  rightKnee?: { ideal: number; tolerance: number; min: number; max: number };
  leftHipAngle?: { ideal: number; tolerance: number; min: number; max: number };
  rightHipAngle?: { ideal: number; tolerance: number; min: number; max: number };
  leftAnkle?: { ideal: number; tolerance: number; min: number; max: number };
  rightAnkle?: { ideal: number; tolerance: number; min: number; max: number };
  trunkLean?: { ideal: number; tolerance: number; min: number; max: number };
}

/**
 * Exercise standard definition
 */
export interface ExerciseStandard {
  exerciseId: string;
  angles: ExerciseStandardAngles;
  swayThreshold: number; // max acceptable CoM sway (normalized)
  asymmetryThreshold: number; // max acceptable angle difference L/R (degrees)
  description: string;
}

/**
 * Standard values for all 20 static exercises
 */
export const EXERCISE_STANDARDS: Record<string, ExerciseStandard> = {
  // ============================================================================
  // SQUAT EXERCISES
  // ============================================================================
  'double-leg-squat-front': {
    exerciseId: 'double-leg-squat-front',
    angles: {
      leftKnee: { ideal: 90, tolerance: 15, min: 70, max: 140 },
      rightKnee: { ideal: 90, tolerance: 15, min: 70, max: 140 },
      leftHipAngle: { ideal: 90, tolerance: 15, min: 70, max: 130 },
      rightHipAngle: { ideal: 90, tolerance: 15, min: 70, max: 130 },
      trunkLean: { ideal: 15, tolerance: 10, min: 0, max: 30 },
    },
    swayThreshold: 0.025,
    asymmetryThreshold: 8,
    description: 'Squat depth with knees at ~90 degrees, minimal forward lean',
  },
  'double-leg-squat-side': {
    exerciseId: 'double-leg-squat-side',
    angles: {
      leftKnee: { ideal: 90, tolerance: 15, min: 70, max: 140 },
      rightKnee: { ideal: 90, tolerance: 15, min: 70, max: 140 },
      leftHipAngle: { ideal: 90, tolerance: 15, min: 70, max: 130 },
      rightHipAngle: { ideal: 90, tolerance: 15, min: 70, max: 130 },
      trunkLean: { ideal: 20, tolerance: 10, min: 5, max: 35 },
    },
    swayThreshold: 0.025,
    asymmetryThreshold: 8,
    description: 'Side view squat for trunk/hip mechanics assessment',
  },
  'single-leg-squat-left': {
    exerciseId: 'single-leg-squat-left',
    angles: {
      leftKnee: { ideal: 100, tolerance: 20, min: 80, max: 150 },
      leftHipAngle: { ideal: 100, tolerance: 20, min: 80, max: 140 },
      trunkLean: { ideal: 10, tolerance: 10, min: 0, max: 25 },
    },
    swayThreshold: 0.035,
    asymmetryThreshold: 10,
    description: 'Single-leg squat assesses unilateral strength and control',
  },
  'single-leg-squat-right': {
    exerciseId: 'single-leg-squat-right',
    angles: {
      rightKnee: { ideal: 100, tolerance: 20, min: 80, max: 150 },
      rightHipAngle: { ideal: 100, tolerance: 20, min: 80, max: 140 },
      trunkLean: { ideal: 10, tolerance: 10, min: 0, max: 25 },
    },
    swayThreshold: 0.035,
    asymmetryThreshold: 10,
    description: 'Single-leg squat assesses unilateral strength and control',
  },

  // ============================================================================
  // BALANCE / SINGLE-LEG STANCE
  // ============================================================================
  'single-leg-stance-left': {
    exerciseId: 'single-leg-stance-left',
    angles: {
      leftKnee: { ideal: 175, tolerance: 5, min: 165, max: 180 },
      leftHipAngle: { ideal: 175, tolerance: 10, min: 160, max: 180 },
      trunkLean: { ideal: 0, tolerance: 5, min: 0, max: 8 },
    },
    swayThreshold: 0.02,
    asymmetryThreshold: 5,
    description: 'Standing straight on left leg, minimal sway',
  },
  'single-leg-stance-right': {
    exerciseId: 'single-leg-stance-right',
    angles: {
      rightKnee: { ideal: 175, tolerance: 5, min: 165, max: 180 },
      rightHipAngle: { ideal: 175, tolerance: 10, min: 160, max: 180 },
      trunkLean: { ideal: 0, tolerance: 5, min: 0, max: 8 },
    },
    swayThreshold: 0.02,
    asymmetryThreshold: 5,
    description: 'Standing straight on right leg, minimal sway',
  },
  'single-leg-stance-knee-90-left': {
    exerciseId: 'single-leg-stance-knee-90-left',
    angles: {
      leftKnee: { ideal: 175, tolerance: 5, min: 165, max: 180 },
      rightKnee: { ideal: 90, tolerance: 10, min: 75, max: 110 },
      leftHipAngle: { ideal: 175, tolerance: 10, min: 160, max: 180 },
      trunkLean: { ideal: 0, tolerance: 5, min: 0, max: 8 },
    },
    swayThreshold: 0.025,
    asymmetryThreshold: 5,
    description: 'Left leg standing, right knee at 90 degrees',
  },
  'single-leg-stance-knee-90-right': {
    exerciseId: 'single-leg-stance-knee-90-right',
    angles: {
      rightKnee: { ideal: 175, tolerance: 5, min: 165, max: 180 },
      leftKnee: { ideal: 90, tolerance: 10, min: 75, max: 110 },
      rightHipAngle: { ideal: 175, tolerance: 10, min: 160, max: 180 },
      trunkLean: { ideal: 0, tolerance: 5, min: 0, max: 8 },
    },
    swayThreshold: 0.025,
    asymmetryThreshold: 5,
    description: 'Right leg standing, left knee at 90 degrees',
  },
  'tandem-stance': {
    exerciseId: 'tandem-stance',
    angles: {
      leftKnee: { ideal: 175, tolerance: 5, min: 165, max: 180 },
      rightKnee: { ideal: 175, tolerance: 5, min: 165, max: 180 },
      trunkLean: { ideal: 0, tolerance: 5, min: 0, max: 8 },
    },
    swayThreshold: 0.02,
    asymmetryThreshold: 5,
    description: 'Heel-to-toe stance, narrow base of support',
  },

  // ============================================================================
  // HEEL RAISE EXERCISES
  // ============================================================================
  'heel-raises-double': {
    exerciseId: 'heel-raises-double',
    angles: {
      leftKnee: { ideal: 175, tolerance: 5, min: 165, max: 180 },
      rightKnee: { ideal: 175, tolerance: 5, min: 165, max: 180 },
      leftAnkle: { ideal: 140, tolerance: 15, min: 120, max: 160 },
      rightAnkle: { ideal: 140, tolerance: 15, min: 120, max: 160 },
      trunkLean: { ideal: 0, tolerance: 5, min: 0, max: 8 },
    },
    swayThreshold: 0.02,
    asymmetryThreshold: 8,
    description: 'Full plantarflexion, knees extended',
  },
  'heel-raises-single-left': {
    exerciseId: 'heel-raises-single-left',
    angles: {
      leftKnee: { ideal: 175, tolerance: 5, min: 165, max: 180 },
      leftAnkle: { ideal: 140, tolerance: 15, min: 120, max: 160 },
      trunkLean: { ideal: 0, tolerance: 8, min: 0, max: 12 },
    },
    swayThreshold: 0.03,
    asymmetryThreshold: 10,
    description: 'Single-leg calf raise, left side',
  },
  'heel-raises-single-right': {
    exerciseId: 'heel-raises-single-right',
    angles: {
      rightKnee: { ideal: 175, tolerance: 5, min: 165, max: 180 },
      rightAnkle: { ideal: 140, tolerance: 15, min: 120, max: 160 },
      trunkLean: { ideal: 0, tolerance: 8, min: 0, max: 12 },
    },
    swayThreshold: 0.03,
    asymmetryThreshold: 10,
    description: 'Single-leg calf raise, right side',
  },
  'toe-raises-double': {
    exerciseId: 'toe-raises-double',
    angles: {
      leftKnee: { ideal: 175, tolerance: 5, min: 165, max: 180 },
      rightKnee: { ideal: 175, tolerance: 5, min: 165, max: 180 },
      leftAnkle: { ideal: 80, tolerance: 15, min: 60, max: 100 },
      rightAnkle: { ideal: 80, tolerance: 15, min: 60, max: 100 },
      trunkLean: { ideal: 0, tolerance: 5, min: 0, max: 8 },
    },
    swayThreshold: 0.02,
    asymmetryThreshold: 8,
    description: 'Full dorsiflexion, heels grounded',
  },

  // ============================================================================
  // STEP-DOWN EXERCISES
  // ============================================================================
  'step-down-left': {
    exerciseId: 'step-down-left',
    angles: {
      leftKnee: { ideal: 110, tolerance: 20, min: 85, max: 140 },
      leftHipAngle: { ideal: 130, tolerance: 20, min: 100, max: 160 },
      trunkLean: { ideal: 10, tolerance: 10, min: 0, max: 25 },
    },
    swayThreshold: 0.03,
    asymmetryThreshold: 10,
    description: 'Controlled step-down, left leg leading',
  },
  'step-down-right': {
    exerciseId: 'step-down-right',
    angles: {
      rightKnee: { ideal: 110, tolerance: 20, min: 85, max: 140 },
      rightHipAngle: { ideal: 130, tolerance: 20, min: 100, max: 160 },
      trunkLean: { ideal: 10, tolerance: 10, min: 0, max: 25 },
    },
    swayThreshold: 0.03,
    asymmetryThreshold: 10,
    description: 'Controlled step-down, right leg leading',
  },

  // ============================================================================
  // LUNGE / SPLIT SQUAT
  // ============================================================================
  'split-squat-left-forward': {
    exerciseId: 'split-squat-left-forward',
    angles: {
      leftKnee: { ideal: 90, tolerance: 15, min: 70, max: 120 },
      rightKnee: { ideal: 90, tolerance: 15, min: 70, max: 120 },
      leftHipAngle: { ideal: 120, tolerance: 20, min: 90, max: 150 },
      trunkLean: { ideal: 5, tolerance: 10, min: 0, max: 20 },
    },
    swayThreshold: 0.025,
    asymmetryThreshold: 10,
    description: 'Split squat position, left leg forward',
  },
  'split-squat-right-forward': {
    exerciseId: 'split-squat-right-forward',
    angles: {
      rightKnee: { ideal: 90, tolerance: 15, min: 70, max: 120 },
      leftKnee: { ideal: 90, tolerance: 15, min: 70, max: 120 },
      rightHipAngle: { ideal: 120, tolerance: 20, min: 90, max: 150 },
      trunkLean: { ideal: 5, tolerance: 10, min: 0, max: 20 },
    },
    swayThreshold: 0.025,
    asymmetryThreshold: 10,
    description: 'Split squat position, right leg forward',
  },

  // ============================================================================
  // HIP HINGE EXERCISES
  // ============================================================================
  'single-leg-rdl-left': {
    exerciseId: 'single-leg-rdl-left',
    angles: {
      leftKnee: { ideal: 165, tolerance: 10, min: 150, max: 180 },
      leftHipAngle: { ideal: 90, tolerance: 20, min: 60, max: 120 },
      trunkLean: { ideal: 45, tolerance: 20, min: 20, max: 80 },
    },
    swayThreshold: 0.035,
    asymmetryThreshold: 10,
    description: 'Single-leg Romanian deadlift, left leg stance',
  },
  'single-leg-rdl-right': {
    exerciseId: 'single-leg-rdl-right',
    angles: {
      rightKnee: { ideal: 165, tolerance: 10, min: 150, max: 180 },
      rightHipAngle: { ideal: 90, tolerance: 20, min: 60, max: 120 },
      trunkLean: { ideal: 45, tolerance: 20, min: 20, max: 80 },
    },
    swayThreshold: 0.035,
    asymmetryThreshold: 10,
    description: 'Single-leg Romanian deadlift, right leg stance',
  },

  // ============================================================================
  // STATIC HOLD
  // ============================================================================
  'wall-sit': {
    exerciseId: 'wall-sit',
    angles: {
      leftKnee: { ideal: 90, tolerance: 10, min: 75, max: 110 },
      rightKnee: { ideal: 90, tolerance: 10, min: 75, max: 110 },
      leftHipAngle: { ideal: 90, tolerance: 10, min: 75, max: 110 },
      rightHipAngle: { ideal: 90, tolerance: 10, min: 75, max: 110 },
      trunkLean: { ideal: 0, tolerance: 5, min: 0, max: 10 },
    },
    swayThreshold: 0.015,
    asymmetryThreshold: 5,
    description: 'Wall sit with 90-degree angles at knees and hips',
  },
};

/**
 * Get standard values for an exercise
 */
export function getExerciseStandard(exerciseId: string): ExerciseStandard | undefined {
  return EXERCISE_STANDARDS[exerciseId];
}

/**
 * Calculate deviation from ideal angle
 */
export interface AngleDeviation {
  angleName: string;
  measured: number;
  ideal: number;
  deviation: number;
  withinTolerance: boolean;
  withinRange: boolean;
  status: 'optimal' | 'acceptable' | 'needs_improvement' | 'out_of_range';
}

/**
 * Calculate angle deviations from standard
 */
export function calculateAngleDeviations(
  exerciseId: string,
  measuredAngles: Record<string, number | null>
): AngleDeviation[] {
  const standard = getExerciseStandard(exerciseId);
  if (!standard) return [];

  const deviations: AngleDeviation[] = [];

  const angleMapping: Record<string, keyof ExerciseStandardAngles> = {
    leftKnee: 'leftKnee',
    rightKnee: 'rightKnee',
    leftHipAngle: 'leftHipAngle',
    rightHipAngle: 'rightHipAngle',
    leftAnkle: 'leftAnkle',
    rightAnkle: 'rightAnkle',
    trunkLean: 'trunkLean',
  };

  for (const [key, standardKey] of Object.entries(angleMapping)) {
    const standardValue = standard.angles[standardKey];
    const measured = measuredAngles[key];

    if (standardValue && measured !== null && measured !== undefined) {
      const deviation = measured - standardValue.ideal;
      const absDeviation = Math.abs(deviation);
      const withinTolerance = absDeviation <= standardValue.tolerance;
      const withinRange = measured >= standardValue.min && measured <= standardValue.max;

      let status: AngleDeviation['status'];
      if (absDeviation <= standardValue.tolerance / 2) {
        status = 'optimal';
      } else if (withinTolerance) {
        status = 'acceptable';
      } else if (withinRange) {
        status = 'needs_improvement';
      } else {
        status = 'out_of_range';
      }

      deviations.push({
        angleName: key,
        measured,
        ideal: standardValue.ideal,
        deviation,
        withinTolerance,
        withinRange,
        status,
      });
    }
  }

  return deviations;
}

/**
 * Recommended exercises based on detected issues
 */
export interface ExerciseRecommendation {
  exercise: string;
  reason: string;
  targetArea: string;
  priority: 'high' | 'medium' | 'low';
}

/**
 * Muscle to strengthen based on detected weaknesses
 */
export interface MuscleRecommendation {
  muscle: string;
  reason: string;
  exercises: string[];
  priority: 'high' | 'medium' | 'low';
}

/**
 * Neuromotor pattern to work on
 */
export interface PatternRecommendation {
  pattern: string;
  description: string;
  drills: string[];
  priority: 'high' | 'medium' | 'low';
}

export default EXERCISE_STANDARDS;
