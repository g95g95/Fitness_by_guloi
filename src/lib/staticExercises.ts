/**
 * BiomechCoach - Static Exercise Library
 *
 * Contains the 20 predefined static assessment exercises
 * for postural and control testing.
 */

import { StaticExercise } from './poseTypes';

/**
 * Complete library of static assessment exercises
 */
export const STATIC_EXERCISES: StaticExercise[] = [
  // ============================================================================
  // SQUAT EXERCISES
  // ============================================================================
  {
    id: 'double-leg-squat-front',
    name: 'Double-Leg Squat (Front View)',
    description: 'Stand with feet hip-width apart. Perform slow, controlled squats while facing the camera.',
    view: 'front',
    durationSeconds: 20,
    focusJoints: ['hip', 'knee', 'ankle', 'trunk'],
    category: 'squat',
  },
  {
    id: 'double-leg-squat-side',
    name: 'Double-Leg Squat (Side View)',
    description: 'Stand with feet hip-width apart. Perform slow, controlled squats with your side to the camera.',
    view: 'side',
    durationSeconds: 20,
    focusJoints: ['hip', 'knee', 'ankle', 'trunk'],
    category: 'squat',
  },
  {
    id: 'single-leg-squat-left',
    name: 'Single-Leg Squat (Left)',
    description: 'Stand on your left leg and perform small-range single-leg squats. Focus on control.',
    view: 'front',
    durationSeconds: 20,
    focusJoints: ['hip', 'knee', 'ankle', 'trunk'],
    category: 'squat',
  },
  {
    id: 'single-leg-squat-right',
    name: 'Single-Leg Squat (Right)',
    description: 'Stand on your right leg and perform small-range single-leg squats. Focus on control.',
    view: 'front',
    durationSeconds: 20,
    focusJoints: ['hip', 'knee', 'ankle', 'trunk'],
    category: 'squat',
  },

  // ============================================================================
  // BALANCE / SINGLE-LEG STANCE EXERCISES
  // ============================================================================
  {
    id: 'single-leg-stance-left',
    name: 'Single-Leg Stance (Left)',
    description: 'Stand on your left leg with the right leg relaxed. Hold the position for the duration.',
    view: 'front',
    durationSeconds: 20,
    focusJoints: ['hip', 'knee', 'ankle', 'trunk'],
    category: 'balance',
  },
  {
    id: 'single-leg-stance-right',
    name: 'Single-Leg Stance (Right)',
    description: 'Stand on your right leg with the left leg relaxed. Hold the position for the duration.',
    view: 'front',
    durationSeconds: 20,
    focusJoints: ['hip', 'knee', 'ankle', 'trunk'],
    category: 'balance',
  },
  {
    id: 'single-leg-stance-knee-90-left',
    name: 'Single-Leg Stance with 90° Knee (Left Support)',
    description: 'Stand on your left leg with right hip flexed and knee at approximately 90 degrees.',
    view: 'front',
    durationSeconds: 20,
    focusJoints: ['hip', 'knee', 'ankle', 'trunk', 'pelvis'],
    category: 'balance',
  },
  {
    id: 'single-leg-stance-knee-90-right',
    name: 'Single-Leg Stance with 90° Knee (Right Support)',
    description: 'Stand on your right leg with left hip flexed and knee at approximately 90 degrees.',
    view: 'front',
    durationSeconds: 20,
    focusJoints: ['hip', 'knee', 'ankle', 'trunk', 'pelvis'],
    category: 'balance',
  },
  {
    id: 'tandem-stance',
    name: 'Tandem Stance (Heel-to-Toe)',
    description: 'Stand with one foot directly in front of the other, heel touching toe. Maintain balance.',
    view: 'front',
    durationSeconds: 20,
    focusJoints: ['hip', 'ankle', 'trunk'],
    category: 'balance',
  },

  // ============================================================================
  // HEEL RAISE EXERCISES
  // ============================================================================
  {
    id: 'heel-raises-double',
    name: 'Heel Raises (Double-Leg)',
    description: 'Stand on both feet and perform calf raises, lifting heels off the ground repeatedly.',
    view: 'front',
    durationSeconds: 20,
    focusJoints: ['ankle', 'knee'],
    category: 'heel_raise',
  },
  {
    id: 'heel-raises-single-left',
    name: 'Single-Leg Heel Raises (Left)',
    description: 'Stand on your left leg and perform calf raises. Focus on ankle control.',
    view: 'front',
    durationSeconds: 20,
    focusJoints: ['ankle', 'knee', 'hip'],
    category: 'heel_raise',
  },
  {
    id: 'heel-raises-single-right',
    name: 'Single-Leg Heel Raises (Right)',
    description: 'Stand on your right leg and perform calf raises. Focus on ankle control.',
    view: 'front',
    durationSeconds: 20,
    focusJoints: ['ankle', 'knee', 'hip'],
    category: 'heel_raise',
  },
  {
    id: 'toe-raises-double',
    name: 'Toe Raises (Double-Leg Dorsiflexion)',
    description: 'Stand with heels on ground and lift your toes repeatedly. Tests anterior chain activation.',
    view: 'front',
    durationSeconds: 20,
    focusJoints: ['ankle'],
    category: 'heel_raise',
  },

  // ============================================================================
  // STEP-DOWN EXERCISES
  // ============================================================================
  {
    id: 'step-down-left',
    name: 'Step-Down (Left Leading)',
    description: 'Stand on a low step on your left leg. Step down with right leg and return. Focus on knee control.',
    view: 'front',
    durationSeconds: 20,
    focusJoints: ['hip', 'knee', 'ankle'],
    category: 'squat',
  },
  {
    id: 'step-down-right',
    name: 'Step-Down (Right Leading)',
    description: 'Stand on a low step on your right leg. Step down with left leg and return. Focus on knee control.',
    view: 'front',
    durationSeconds: 20,
    focusJoints: ['hip', 'knee', 'ankle'],
    category: 'squat',
  },

  // ============================================================================
  // LUNGE / SPLIT SQUAT EXERCISES
  // ============================================================================
  {
    id: 'split-squat-left-forward',
    name: 'Static Split Squat Hold (Left Forward)',
    description: 'Assume a lunge position with left leg forward. Hold the position steadily.',
    view: 'side',
    durationSeconds: 20,
    focusJoints: ['hip', 'knee', 'ankle', 'trunk'],
    category: 'lunge',
  },
  {
    id: 'split-squat-right-forward',
    name: 'Static Split Squat Hold (Right Forward)',
    description: 'Assume a lunge position with right leg forward. Hold the position steadily.',
    view: 'side',
    durationSeconds: 20,
    focusJoints: ['hip', 'knee', 'ankle', 'trunk'],
    category: 'lunge',
  },

  // ============================================================================
  // HINGE EXERCISES
  // ============================================================================
  {
    id: 'single-leg-rdl-left',
    name: 'Single-Leg RDL (Left)',
    description: 'Stand on your left leg and perform a small hip hinge, extending right leg backward.',
    view: 'side',
    durationSeconds: 20,
    focusJoints: ['hip', 'knee', 'trunk', 'pelvis'],
    category: 'hinge',
  },
  {
    id: 'single-leg-rdl-right',
    name: 'Single-Leg RDL (Right)',
    description: 'Stand on your right leg and perform a small hip hinge, extending left leg backward.',
    view: 'side',
    durationSeconds: 20,
    focusJoints: ['hip', 'knee', 'trunk', 'pelvis'],
    category: 'hinge',
  },

  // ============================================================================
  // STATIC HOLD EXERCISES
  // ============================================================================
  {
    id: 'wall-sit',
    name: 'Wall Sit (Double-Leg)',
    description: 'Lean against a wall with knees at 90 degrees. Hold the position for the duration.',
    view: 'front',
    durationSeconds: 20,
    focusJoints: ['hip', 'knee', 'trunk'],
    category: 'stance',
  },
];

/**
 * Get exercise by ID
 */
export function getExerciseById(id: string): StaticExercise | undefined {
  return STATIC_EXERCISES.find((ex) => ex.id === id);
}

/**
 * Get exercises by category
 */
export function getExercisesByCategory(category: StaticExercise['category']): StaticExercise[] {
  return STATIC_EXERCISES.filter((ex) => ex.category === category);
}

/**
 * Get exercises by view type
 */
export function getExercisesByView(view: StaticExercise['view']): StaticExercise[] {
  return STATIC_EXERCISES.filter((ex) => ex.view === view || ex.view === 'either');
}

/**
 * Get a short instruction based on exercise category and view
 */
export function getExerciseInstructions(exercise: StaticExercise): string {
  const viewInstruction = exercise.view === 'front'
    ? 'Position yourself facing the camera.'
    : exercise.view === 'side'
      ? 'Position yourself with your side to the camera.'
      : 'Position yourself facing or sideways to the camera.';

  return `${viewInstruction} ${exercise.description}`;
}

/**
 * Category labels for UI display
 */
export const CATEGORY_LABELS: Record<StaticExercise['category'], string> = {
  balance: 'Balance & Stability',
  squat: 'Squat & Step-Down',
  lunge: 'Lunge & Split Squat',
  heel_raise: 'Heel & Toe Raises',
  hinge: 'Hip Hinge',
  stance: 'Static Holds',
};

/**
 * View labels for UI display
 */
export const VIEW_LABELS: Record<StaticExercise['view'], string> = {
  front: 'Front View',
  side: 'Side View',
  either: 'Any View',
};

export default STATIC_EXERCISES;
