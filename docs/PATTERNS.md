# BiomechCoach - Pattern Detection Documentation

## Overview

Pattern detection identifies biomechanical issues during movement analysis. Each pattern has:
- **Detection threshold**: When the pattern is flagged
- **Source file**: Where the detection logic lives
- **Related recommendations**: Exercises and interventions

## Pattern Summary Table

### Static Patterns (src/lib/patterns/staticPatterns.ts)

| Pattern | Flag Name | Threshold | Detection Method |
|---------|-----------|-----------|------------------|
| Instability | `static_instability` | CoM sway > 2% | Standard deviation of hip X/Y positions |
| Hip Drop | `static_hip_drop` | Y diff > 3% | L/R hip height difference |
| Knee Valgus | `static_knee_valgus` | > 10° or knee X drift > 3% | Frontal valgus angle or knee X variability |
| Trunk Compensation | `static_trunk_compensation` | > 8° from vertical | Average trunk lean angle |
| Asymmetry | `static_asymmetry` | L/R diff > 5° | Knee angle or shoulder height difference |
| Ankle Pronation | `static_ankle_pronation` | medial drift > 2% | Ankle X position drift |

### Running Patterns (src/lib/patterns/runningPatterns.ts)

| Pattern | Flag Name | Threshold | Detection Method |
|---------|-----------|-----------|------------------|
| Overstride | `overstride` | ankle-hip distance > 15% | Foot contact position relative to CoM |
| Hip Drop | `hip_drop` | pelvic drop > 3% | L/R hip Y difference during stance |
| Knee Valgus | `knee_valgus` | valgus angle > 10° | Frontal knee alignment |
| Limited Hip Extension | `limited_hip_extension` | < 170° at toe-off | Max hip angle during push-off |
| Excessive Trunk Lean | `excessive_trunk_lean` | outside 5-20° range | Average trunk angle from vertical |

### Cycling Patterns (src/lib/patterns/cyclingPatterns.ts)

| Pattern | Flag Name | Threshold | Detection Method |
|---------|-----------|-----------|------------------|
| Saddle Too Low | `saddle_low` | knee angle < 140° at BDC | Min knee flexion at bottom dead center |
| Saddle Too High | `saddle_high` | knee angle > 155° at BDC | Max knee extension at bottom dead center |
| Knee Tracking | `knee_tracking_instability` | lateral movement > threshold | Knee X position variability (frontal) |
| Excessive Trunk Lean | `excessive_trunk_lean` | < 30° from horizontal | Trunk angle during pedaling |

## Detailed Pattern Documentation

### Static Instability (`static_instability`)

**File**: `src/lib/patterns/staticPatterns.ts:86-88`

**Detection Logic**:
```typescript
const swayX = standardDeviation(rawMetrics.comXHistory);
const swayY = standardDeviation(rawMetrics.comYHistory);
const totalSway = Math.sqrt(swayX * swayX + swayY * swayY);

if (totalSway > thresholds.swayThreshold) {  // default: 0.02
  flags.static_instability = true;
}
```

**Recommendations**:
- Exercises: Single-leg stance with eyes closed, BOSU ball balance, Heel-to-toe walking
- Muscles: Ankle stabilizers, Core, Gluteus medius
- Patterns: Reactive postural control, Proprioceptive integration

---

### Static Hip Drop (`static_hip_drop`)

**File**: `src/lib/patterns/staticPatterns.ts:91-111`

**Detection Logic**:
```typescript
// Method 1: Direct hip Y difference
const hipDiffs = leftHipY - rightHipY;
if (avgHipDiff > thresholds.hipDropThreshold) {  // default: 0.03
  flags.static_hip_drop = true;
}

// Method 2: Frontal metrics
if (frontalMetrics.pelvic_drop_peak > thresholds.hipDropThreshold) {
  flags.static_hip_drop = true;
}
```

**Recommendations**:
- Exercises: Side-lying hip abduction, Single-leg bridge, Copenhagen plank
- Muscles: Gluteus medius, Quadratus lumborum
- Patterns: Single-leg pelvic stabilization

---

### Static Knee Valgus (`static_knee_valgus`)

**File**: `src/lib/patterns/staticPatterns.ts:113-135`

**Detection Logic**:
```typescript
// Method 1: Frontal valgus angle
if (Math.abs(frontalMetrics.valgus_angle_left) > thresholds.kneeValgusThreshold) {
  flags.static_knee_valgus = true;  // default: 10°
}

// Method 2: Knee X position drift
const kneeXVariability = standardDeviation(rawMetrics.leftKneeXHistory);
if (kneeXVariability > thresholds.swayThreshold * 1.5) {
  flags.static_knee_valgus = true;
}
```

**Recommendations**:
- Exercises: Clamshells, Monster walks with band, Wall sits with ball between knees
- Muscles: Gluteus medius, VMO (Vastus Medialis Obliquus)
- Patterns: Kinetic chain knee control

---

### Overstride (Running)

**File**: `src/lib/runningHeuristics.ts:35-75`

**Detection Logic**:
```typescript
const ankleHipDistance = gaitData.leftAnkleHipDistance;
if (avgDistance > thresholds.overstrideDistance && kneeAngle > 165) {
  // Foot landing ahead with extended knee = overstriding
  flags.overstride = true;
}
```

**Recommendations**:
- Cues: Increase cadence, land with foot under hips
- Exercises: Metronome running drills, Short-step running
- Prevention: Focus on cadence 170-180 steps/min

---

### Saddle Height (Cycling)

**File**: `src/lib/cyclingHeuristics.ts:24-97`

**Detection Logic**:
```typescript
// At Bottom Dead Center (BDC):
if (avgKneeAngle < thresholds.kneeFlexionBdcMin) {  // default: 140°
  // Saddle too low
}
if (avgKneeAngle > thresholds.kneeFlexionBdcMax) {  // default: 155°
  // Saddle too high
}

// Ideal range: 145-150°
```

**Recommendations**:
- Saddle too low: Raise saddle, check for knee stress
- Saddle too high: Lower saddle, check for hip rocking

---

## Pattern → Recommendation Mapping

### From Pattern to Exercises

| Pattern | Priority Exercises |
|---------|-------------------|
| `static_knee_valgus` | Clamshells, Monster walks, Wall sits with ball |
| `static_hip_drop` | Side-lying hip abduction, Single-leg bridge, Copenhagen plank |
| `static_trunk_compensation` | Dead bug, Pallof press, Bird dog |
| `static_instability` | Single-leg stance (eyes closed), BOSU balance, Heel-to-toe walking |
| `static_ankle_pronation` | Towel scrunches, Slow heel raises, Unstable surface balance |

### From Pattern to Muscles

| Pattern | Target Muscles |
|---------|---------------|
| `static_knee_valgus` | Gluteus medius, VMO |
| `static_hip_drop` | Gluteus medius, Quadratus lumborum |
| `static_trunk_compensation` | Transverse abdominis, Obliques |
| `static_instability` | Ankle stabilizers, Intrinsic foot muscles |
| `static_ankle_pronation` | Tibialis posterior, Peroneals |

### From Pattern to Pain Predictions

| Pattern | Probable Pain Locations |
|---------|------------------------|
| `static_knee_valgus` | Anterior knee (patellofemoral), Medial knee |
| `static_hip_drop` | Lateral hip (trochanteric bursitis), Lower back, IT band |
| `static_trunk_compensation` | Lower back, Hip flexors |
| `static_instability` | Lateral ankle, Plantar fascia |
| `static_ankle_pronation` | Arch/plantar fascia, Shin splints, Medial knee |

---

## Adding a New Pattern

### Checklist

1. **Define the pattern flag** in `src/lib/poseTypes.ts`:
   ```typescript
   interface StaticPatternFlags {
     // ... existing flags
     static_new_pattern?: boolean;
   }
   ```

2. **Add detection threshold** in `src/lib/poseTypes.ts`:
   ```typescript
   interface StaticThresholds {
     // ... existing thresholds
     newPatternThreshold: number;
   }

   const DEFAULT_STATIC_THRESHOLDS = {
     // ...
     newPatternThreshold: 0.05,
   };
   ```

3. **Implement detection logic** in `src/lib/patterns/staticPatterns.ts`:
   ```typescript
   // In detectStaticPatterns():
   if (someCondition > thresholds.newPatternThreshold) {
     flags.static_new_pattern = true;
   }
   ```

4. **Add suggestion mapping** in `src/lib/patterns/staticPatterns.ts`:
   ```typescript
   export const STATIC_PATTERN_SUGGESTIONS = {
     // ...
     static_new_pattern: {
       message: 'Pattern name detected',
       detail: 'Explanation and implications...',
     },
   };
   ```

5. **Add recommendations** in `src/lib/assessmentRecommendations.ts`:
   ```typescript
   if (patternFlags.static_new_pattern) {
     recommendations.push({
       exercise: 'Recommended exercise',
       reason: 'Why this helps',
       targetArea: 'Target muscle group',
       priority: 'high',
     });
   }
   ```

6. **Add pain prediction** in `src/lib/painPrediction.ts`:
   ```typescript
   if (patternFlags.static_new_pattern) {
     predictions.push({
       location: 'Pain location',
       probability: 'high',
       reason: 'Biomechanical explanation',
       relatedPatterns: ['New pattern'],
       preventionTips: ['Tip 1', 'Tip 2'],
     });
   }
   ```

7. **Update documentation**:
   - Add to this file (docs/PATTERNS.md)
   - Update CLAUDE.md if significant

---

## Threshold Configuration

All thresholds are defined in `src/lib/poseTypes.ts`:

```typescript
// Static thresholds
export const DEFAULT_STATIC_THRESHOLDS: StaticThresholds = {
  swayThreshold: 0.02,           // 2% of frame
  hipDropThreshold: 0.03,        // 3% difference
  kneeValgusThreshold: 10,       // 10 degrees
  trunkCompensationThreshold: 8, // 8 degrees
  asymmetryThreshold: 5,         // 5 degrees
};

// Running thresholds
export const DEFAULT_RUNNING_THRESHOLDS: RunningThresholds = {
  overstrideDistance: 0.15,      // 15% of frame width
  hipDropThreshold: 0.03,        // 3% drop
  kneeValgusThreshold: 10,       // 10 degrees
  hipExtensionMin: 170,          // minimum degrees
  trunkLeanMin: 5,               // minimum degrees
  trunkLeanMax: 20,              // maximum degrees
  kneeFlexionMidstanceMin: 170,  // too straight threshold
};

// Cycling thresholds
export const DEFAULT_CYCLING_THRESHOLDS: CyclingThresholds = {
  kneeFlexionBdcMin: 140,        // saddle too low
  kneeFlexionBdcMax: 155,        // saddle too high
  kneeFlexionBdcIdealMin: 145,   // ideal range start
  kneeFlexionBdcIdealMax: 150,   // ideal range end
  hipAngleMin: 70,               // very closed hip
  hipAngleMax: 110,              // very open hip
  trunkAngleAggressive: 30,      // aggressive position
  trunkAngleUpright: 70,         // upright position
};
```
