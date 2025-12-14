# BiomechCoach - Exercise Documentation

## Overview

BiomechCoach includes 20 predefined static assessment exercises organized into 6 categories. Each exercise has defined ideal angles, starting positions, and assessment standards.

## Exercise Data Structure

### StaticExercise (src/lib/staticExercises.ts)

```typescript
interface StaticExercise {
  id: string;                     // Unique identifier (kebab-case)
  name: string;                   // Display name
  description: string;            // User instructions
  view: 'front' | 'side' | 'either';  // Camera position
  durationSeconds: number;        // Recording duration (default: 20)
  focusJoints: string[];          // Joints being assessed
  category: 'balance' | 'squat' | 'lunge' | 'heel_raise' | 'hinge' | 'stance';
}
```

### ExerciseStandard (src/lib/exerciseStandards.ts)

```typescript
interface ExerciseStandard {
  exerciseId: string;
  angles: {
    leftKnee?: { ideal: number; tolerance: number; min: number; max: number };
    rightKnee?: { ideal: number; tolerance: number; min: number; max: number };
    leftHipAngle?: { ideal: number; tolerance: number; min: number; max: number };
    rightHipAngle?: { ideal: number; tolerance: number; min: number; max: number };
    leftAnkle?: { ideal: number; tolerance: number; min: number; max: number };
    rightAnkle?: { ideal: number; tolerance: number; min: number; max: number };
    trunkLean?: { ideal: number; tolerance: number; min: number; max: number };
  };
  swayThreshold: number;          // Max acceptable CoM sway (normalized)
  asymmetryThreshold: number;     // Max acceptable L/R difference (degrees)
  description: string;
}
```

### ExerciseStartingPosition (src/lib/exerciseStandards.ts)

```typescript
interface ExerciseStartingPosition {
  exerciseId: string;
  angles: {
    leftKnee?: { ideal: number; tolerance: number };  // tolerance default: 5°
    rightKnee?: { ideal: number; tolerance: number };
    // ... other angles
  };
  description: string;  // Italian description for user
}
```

---

## Exercise Catalog by Category

### 1. Squat (6 exercises)

| ID | Name | View | Focus Joints |
|----|------|------|--------------|
| `double-leg-squat-front` | Double-Leg Squat (Front View) | front | hip, knee, ankle, trunk |
| `double-leg-squat-side` | Double-Leg Squat (Side View) | side | hip, knee, ankle, trunk |
| `single-leg-squat-left` | Single-Leg Squat (Left) | front | hip, knee, ankle, trunk |
| `single-leg-squat-right` | Single-Leg Squat (Right) | front | hip, knee, ankle, trunk |
| `step-down-left` | Step-Down (Left Leading) | front | hip, knee, ankle |
| `step-down-right` | Step-Down (Right Leading) | front | hip, knee, ankle |

**Ideal Angles (double-leg-squat-front)**:
- Knee: 90° ± 15° (range: 70-140°)
- Hip: 90° ± 15° (range: 70-130°)
- Trunk Lean: 15° ± 10° (range: 0-30°)
- Sway Threshold: 0.025
- Asymmetry Threshold: 8°

### 2. Balance (5 exercises)

| ID | Name | View | Focus Joints |
|----|------|------|--------------|
| `single-leg-stance-left` | Single-Leg Stance (Left) | front | hip, knee, ankle, trunk |
| `single-leg-stance-right` | Single-Leg Stance (Right) | front | hip, knee, ankle, trunk |
| `single-leg-stance-knee-90-left` | Single-Leg Stance with 90° Knee (Left Support) | front | hip, knee, ankle, trunk, pelvis |
| `single-leg-stance-knee-90-right` | Single-Leg Stance with 90° Knee (Right Support) | front | hip, knee, ankle, trunk, pelvis |
| `tandem-stance` | Tandem Stance (Heel-to-Toe) | front | hip, ankle, trunk |

**Ideal Angles (single-leg-stance-left)**:
- Left Knee: 175° ± 5° (range: 165-180°)
- Left Hip: 175° ± 10° (range: 160-180°)
- Trunk Lean: 0° ± 5° (range: 0-8°)
- Sway Threshold: 0.02
- Asymmetry Threshold: 5°

### 3. Heel Raise (4 exercises)

| ID | Name | View | Focus Joints |
|----|------|------|--------------|
| `heel-raises-double` | Heel Raises (Double-Leg) | front | ankle, knee |
| `heel-raises-single-left` | Single-Leg Heel Raises (Left) | front | ankle, knee, hip |
| `heel-raises-single-right` | Single-Leg Heel Raises (Right) | front | ankle, knee, hip |
| `toe-raises-double` | Toe Raises (Double-Leg Dorsiflexion) | front | ankle |

**Ideal Angles (heel-raises-double)**:
- Knee: 175° ± 5° (range: 165-180°)
- Ankle: 140° ± 15° (range: 120-160°) - plantarflexion
- Trunk Lean: 0° ± 5° (range: 0-8°)
- Sway Threshold: 0.02
- Asymmetry Threshold: 8°

### 4. Lunge (2 exercises)

| ID | Name | View | Focus Joints |
|----|------|------|--------------|
| `split-squat-left-forward` | Static Split Squat Hold (Left Forward) | side | hip, knee, ankle, trunk |
| `split-squat-right-forward` | Static Split Squat Hold (Right Forward) | side | hip, knee, ankle, trunk |

**Ideal Angles (split-squat-left-forward)**:
- Left Knee: 90° ± 15° (range: 70-120°)
- Right Knee: 90° ± 15° (range: 70-120°)
- Left Hip: 120° ± 20° (range: 90-150°)
- Trunk Lean: 5° ± 10° (range: 0-20°)
- Sway Threshold: 0.025
- Asymmetry Threshold: 10°

### 5. Hinge (2 exercises)

| ID | Name | View | Focus Joints |
|----|------|------|--------------|
| `single-leg-rdl-left` | Single-Leg RDL (Left) | side | hip, knee, trunk, pelvis |
| `single-leg-rdl-right` | Single-Leg RDL (Right) | side | hip, knee, trunk, pelvis |

**Ideal Angles (single-leg-rdl-left)**:
- Left Knee: 165° ± 10° (range: 150-180°)
- Left Hip: 90° ± 20° (range: 60-120°)
- Trunk Lean: 45° ± 20° (range: 20-80°)
- Sway Threshold: 0.035
- Asymmetry Threshold: 10°

### 6. Static Holds (1 exercise)

| ID | Name | View | Focus Joints |
|----|------|------|--------------|
| `wall-sit` | Wall Sit (Double-Leg) | front | hip, knee, trunk |

**Ideal Angles (wall-sit)**:
- Knee: 90° ± 10° (range: 75-110°)
- Hip: 90° ± 10° (range: 75-110°)
- Trunk Lean: 0° ± 5° (range: 0-10°)
- Sway Threshold: 0.015
- Asymmetry Threshold: 5°

---

## Starting Position Validation

Each exercise has a defined starting position that must be achieved before recording begins. The system uses **±5° tolerance** by default.

### Example: Single-Leg Squat Starting Position

```typescript
'single-leg-squat-left': {
  exerciseId: 'single-leg-squat-left',
  angles: {
    leftKnee: { ideal: 175, tolerance: 5 },   // Standing straight
    leftHipAngle: { ideal: 175, tolerance: 5 },
    trunkLean: { ideal: 0, tolerance: 5 },
  },
  description: 'Stai in piedi sulla gamba sinistra, gamba dritta',
}
```

### Validation Function

```typescript
function validateStartingPosition(
  exerciseId: string,
  measuredAngles: Record<string, number | null>
): StartingPositionValidation {
  // Returns:
  // - isValid: boolean (all angles within tolerance)
  // - angleResults: per-angle validation details
}
```

---

## Adding a New Exercise

### Checklist

1. **Add exercise definition** in `src/lib/staticExercises.ts`:
   ```typescript
   {
     id: 'new-exercise-id',
     name: 'New Exercise Name',
     description: 'Instructions for the user...',
     view: 'front',  // or 'side' or 'either'
     durationSeconds: 20,
     focusJoints: ['hip', 'knee', 'ankle'],
     category: 'squat',  // or balance, lunge, etc.
   }
   ```

2. **Add exercise standard** in `src/lib/exerciseStandards.ts`:
   ```typescript
   'new-exercise-id': {
     exerciseId: 'new-exercise-id',
     angles: {
       leftKnee: { ideal: 90, tolerance: 15, min: 70, max: 120 },
       // ... other relevant angles
     },
     swayThreshold: 0.025,
     asymmetryThreshold: 8,
     description: 'Description of ideal form',
   }
   ```

3. **Add starting position** in `src/lib/exerciseStandards.ts`:
   ```typescript
   'new-exercise-id': {
     exerciseId: 'new-exercise-id',
     angles: {
       leftKnee: { ideal: 175, tolerance: 5 },
       // ... angles for starting position
     },
     description: 'Descrizione posizione iniziale (Italian)',
   }
   ```

4. **Add category-specific suggestions** in `src/lib/staticHeuristics.ts`:
   ```typescript
   case 'your_category':
     if (metrics.patternFlags.some_pattern) {
       suggestions.push({
         id: 'new_exercise_cue',
         severity: 'info',
         message: 'Cue title',
         detail: 'Detailed instruction...',
       });
     }
     break;
   ```

5. **Update category label** (if new category) in `src/lib/staticExercises.ts`:
   ```typescript
   export const CATEGORY_LABELS = {
     // ...
     new_category: 'New Category Label',
   };
   ```

---

## Angle Scoring System

### Deviation Status

```typescript
type DeviationStatus = 'optimal' | 'acceptable' | 'needs_improvement' | 'out_of_range';

// Calculation:
const absDeviation = Math.abs(measured - ideal);

if (absDeviation <= tolerance / 2) {
  status = 'optimal';           // e.g., within 7.5° for 15° tolerance
} else if (absDeviation <= tolerance) {
  status = 'acceptable';        // e.g., within 15° for 15° tolerance
} else if (measured >= min && measured <= max) {
  status = 'needs_improvement'; // Within range but outside tolerance
} else {
  status = 'out_of_range';      // Outside min-max range
}
```

### Example Calculation

For `double-leg-squat-front` with knee ideal=90°, tolerance=15°, min=70°, max=140°:

| Measured | Deviation | Status |
|----------|-----------|--------|
| 90° | 0° | optimal |
| 95° | 5° | optimal (< 7.5°) |
| 100° | 10° | acceptable (< 15°) |
| 115° | 25° | needs_improvement (in range) |
| 150° | 60° | out_of_range (> 140°) |

---

## Helper Functions

### Get Exercise by ID

```typescript
import { getExerciseById } from './staticExercises';
const exercise = getExerciseById('single-leg-squat-left');
```

### Get Exercises by Category

```typescript
import { getExercisesByCategory } from './staticExercises';
const squatExercises = getExercisesByCategory('squat');
```

### Get Exercise Standard

```typescript
import { getExerciseStandard } from './exerciseStandards';
const standard = getExerciseStandard('single-leg-squat-left');
```

### Calculate Deviations

```typescript
import { calculateAngleDeviations } from './exerciseStandards';
const deviations = calculateAngleDeviations('single-leg-squat-left', {
  leftKnee: 105,
  leftHipAngle: 100,
  trunkLean: 8,
});
```

### Validate Starting Position

```typescript
import { validateStartingPosition } from './exerciseStandards';
const validation = validateStartingPosition('single-leg-squat-left', {
  leftKnee: 173,
  leftHipAngle: 176,
  trunkLean: 2,
});
// validation.isValid === true (all within ±5° tolerance)
```
