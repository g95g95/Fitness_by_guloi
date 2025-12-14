# BiomechCoach - MediaPipe Landmarks Documentation

## Overview

BiomechCoach uses MediaPipe Pose for skeletal tracking. The model detects 33 keypoints (landmarks) representing body joints and features.

## Landmark Index Table

| Index | Name | Description | Used In |
|-------|------|-------------|---------|
| 0 | `nose` | Tip of nose | Face tracking |
| 1 | `left_eye_inner` | Inner corner of left eye | Face tracking |
| 2 | `left_eye` | Center of left eye | Face tracking |
| 3 | `left_eye_outer` | Outer corner of left eye | Face tracking |
| 4 | `right_eye_inner` | Inner corner of right eye | Face tracking |
| 5 | `right_eye` | Center of right eye | Face tracking |
| 6 | `right_eye_outer` | Outer corner of right eye | Face tracking |
| 7 | `left_ear` | Left ear | Face tracking |
| 8 | `right_ear` | Right ear | Face tracking |
| 9 | `mouth_left` | Left corner of mouth | Face tracking |
| 10 | `mouth_right` | Right corner of mouth | Face tracking |
| 11 | `left_shoulder` | Left shoulder | **All modes** |
| 12 | `right_shoulder` | Right shoulder | **All modes** |
| 13 | `left_elbow` | Left elbow | Arm tracking |
| 14 | `right_elbow` | Right elbow | Arm tracking |
| 15 | `left_wrist` | Left wrist | Arm tracking |
| 16 | `right_wrist` | Right wrist | Arm tracking |
| 17 | `left_pinky` | Left pinky finger | Hand tracking |
| 18 | `right_pinky` | Right pinky finger | Hand tracking |
| 19 | `left_index` | Left index finger | Hand tracking |
| 20 | `right_index` | Right index finger | Hand tracking |
| 21 | `left_thumb` | Left thumb | Hand tracking |
| 22 | `right_thumb` | Right thumb | Hand tracking |
| 23 | `left_hip` | Left hip | **All modes** |
| 24 | `right_hip` | Right hip | **All modes** |
| 25 | `left_knee` | Left knee | **All modes** |
| 26 | `right_knee` | Right knee | **All modes** |
| 27 | `left_ankle` | Left ankle | **All modes** |
| 28 | `right_ankle` | Right ankle | **All modes** |
| 29 | `left_heel` | Left heel | **Running, Cycling** |
| 30 | `right_heel` | Right heel | **Running, Cycling** |
| 31 | `left_foot_index` | Left big toe | **Running, Cycling** |
| 32 | `right_foot_index` | Right big toe | **Running, Cycling** |

## Landmarks by Activity Mode

### Cycling Mode

**Primary Landmarks (Side View)**:
```
Angle Calculation          Landmarks Used
─────────────────────────────────────────────
Knee Flexion               hip → knee → ankle
Hip Angle                  shoulder → hip → knee
Ankle Angle                knee → ankle → foot_index
Trunk Angle                shoulder → hip (vs vertical)
```

| Landmark | Index | Usage |
|----------|-------|-------|
| left_shoulder | 11 | Trunk angle, hip angle |
| right_shoulder | 12 | Trunk angle, hip angle |
| left_hip | 23 | All lower body angles |
| right_hip | 24 | All lower body angles |
| left_knee | 25 | Knee flexion |
| right_knee | 26 | Knee flexion |
| left_ankle | 27 | Ankle angle |
| right_ankle | 28 | Ankle angle |
| left_foot_index | 31 | Ankle angle |
| right_foot_index | 32 | Ankle angle |

**Cycle Detection (BDC)**:
- Uses ankle Y position to detect bottom dead center
- Tracks: `left_ankle` or `right_ankle` depending on visible side

---

### Running Mode

**Primary Landmarks (Side View)**:
```
Metric                     Landmarks Used
─────────────────────────────────────────────
Knee at Midstance          hip → knee → ankle
Hip Extension              shoulder → hip → knee
Trunk Lean                 shoulder → hip (vs vertical)
Overstride                 ankle vs hip X position
Gait Phase                 ankle Y positions
```

| Landmark | Index | Usage |
|----------|-------|-------|
| left_shoulder | 11 | Trunk lean, hip angle |
| right_shoulder | 12 | Trunk lean, hip angle |
| left_hip | 23 | CoM proxy, hip extension |
| right_hip | 24 | CoM proxy, hip extension |
| left_knee | 25 | Knee flexion at midstance |
| right_knee | 26 | Knee flexion at midstance |
| left_ankle | 27 | Overstride detection, gait phase |
| right_ankle | 28 | Overstride detection, gait phase |
| left_heel | 29 | Foot strike detection |
| right_heel | 30 | Foot strike detection |

**Frontal View Additions**:
| Landmark | Index | Usage |
|----------|-------|-------|
| left_hip | 23 | Hip drop (Y diff) |
| right_hip | 24 | Hip drop (Y diff) |
| left_knee | 25 | Knee valgus angle |
| right_knee | 26 | Knee valgus angle |
| left_ankle | 27 | Pronation detection |
| right_ankle | 28 | Pronation detection |

---

### Static Mode

**Primary Landmarks**:

| Landmark | Index | Usage |
|----------|-------|-------|
| left_shoulder | 11 | Trunk lean, asymmetry |
| right_shoulder | 12 | Trunk lean, asymmetry |
| left_hip | 23 | CoM proxy, hip drop |
| right_hip | 24 | CoM proxy, hip drop |
| left_knee | 25 | Knee angle, valgus |
| right_knee | 26 | Knee angle, valgus |
| left_ankle | 27 | Ankle position, pronation |
| right_ankle | 28 | Ankle position, pronation |

**CoM (Center of Mass) Proxy**:
```typescript
// Mid-hip point used as CoM proxy
const comX = (left_hip.x + right_hip.x) / 2;
const comY = (left_hip.y + right_hip.y) / 2;
```

**Sway Detection**:
- X history → horizontal sway
- Y history → vertical sway
- Total sway = √(swayX² + swayY²)

---

## Coordinate System

```
┌─────────────────────────────────────────────────┐
│  (0, 0)                                         │
│    ┌───────────────────────────────────────┐    │
│    │                                       │    │
│    │   MediaPipe Returns:                  │    │
│    │   - X: 0.0 (left) → 1.0 (right)      │    │
│    │   - Y: 0.0 (top) → 1.0 (bottom)      │    │
│    │   - Z: depth (not used)              │    │
│    │                                       │    │
│    │   BiomechCoach Converts to:          │    │
│    │   - X: 0 → videoWidth (pixels)       │    │
│    │   - Y: 0 → videoHeight (pixels)      │    │
│    │                                       │    │
│    └───────────────────────────────────────┘    │
│                              (videoWidth, videoHeight)
└─────────────────────────────────────────────────┘
```

### Coordinate Conversion

```typescript
// In usePoseEstimation.ts
const keypoints: Keypoint[] = results.poseLandmarks.map((landmark, index) => ({
  name: MEDIAPIPE_KEYPOINT_NAMES[index],
  x: landmark.x * videoWidth,    // Convert to pixels
  y: landmark.y * videoHeight,   // Convert to pixels
  score: landmark.visibility ?? 0.5,
}));
```

---

## Confidence Scores

### Visibility Score

MediaPipe returns a `visibility` score (0-1) for each landmark:
- **1.0**: Fully visible
- **0.5**: Partially visible
- **0.0**: Not visible (occluded)

### Minimum Threshold

```typescript
// In poseTypes.ts
export const MIN_KEYPOINT_CONFIDENCE = 0.5;

// Usage in vectorMath.ts
export function keypointToPoint(keypoint: Keypoint | undefined): Point | null {
  if (!keypoint || keypoint.score < MIN_KEYPOINT_CONFIDENCE) return null;
  return { x: keypoint.x, y: keypoint.y };
}
```

### Valid Pose Check

```typescript
// Pose is valid if at least 10 keypoints have confidence >= 0.5
const validKeypoints = keypoints.filter(kp => kp.score >= MIN_KEYPOINT_CONFIDENCE);
const isValid = validKeypoints.length >= 10;
```

---

## Skeleton Connections

Used for drawing the skeleton overlay:

```typescript
export const SKELETON_CONNECTIONS: Array<[KeypointName, KeypointName]> = [
  // Face
  ['nose', 'left_eye'],
  ['nose', 'right_eye'],
  ['left_eye', 'left_ear'],
  ['right_eye', 'right_ear'],

  // Torso
  ['left_shoulder', 'right_shoulder'],
  ['left_shoulder', 'left_hip'],
  ['right_shoulder', 'right_hip'],
  ['left_hip', 'right_hip'],

  // Left arm
  ['left_shoulder', 'left_elbow'],
  ['left_elbow', 'left_wrist'],

  // Right arm
  ['right_shoulder', 'right_elbow'],
  ['right_elbow', 'right_wrist'],

  // Left leg
  ['left_hip', 'left_knee'],
  ['left_knee', 'left_ankle'],
  ['left_ankle', 'left_heel'],
  ['left_ankle', 'left_foot_index'],
  ['left_heel', 'left_foot_index'],

  // Right leg
  ['right_hip', 'right_knee'],
  ['right_knee', 'right_ankle'],
  ['right_ankle', 'right_heel'],
  ['right_ankle', 'right_foot_index'],
  ['right_heel', 'right_foot_index'],
];
```

---

## Angle Calculations

### Knee Flexion

```typescript
// Interior angle at knee (hip → knee → ankle)
const kneeAngle = angleBetweenPoints(
  keypointToPoint(hip),
  keypointToPoint(knee),
  keypointToPoint(ankle)
);
// 180° = straight leg, 90° = deeply bent
```

### Hip Angle

```typescript
// Interior angle at hip (shoulder → hip → knee)
const hipAngle = angleBetweenPoints(
  keypointToPoint(shoulder),
  keypointToPoint(hip),
  keypointToPoint(knee)
);
// 180° = standing straight, <90° = deep hip flexion
```

### Trunk Lean

```typescript
// Angle from vertical (uses shoulder-hip line)
const trunkAngle = angleFromVertical(
  keypointToPoint(shoulder),
  keypointToPoint(hip)
);
// 0° = upright, 45° = leaning forward 45°
```

### Ankle Angle

```typescript
// Interior angle at ankle (knee → ankle → foot)
const ankleAngle = angleBetweenPoints(
  keypointToPoint(knee),
  keypointToPoint(ankle),
  keypointToPoint(foot_index)
);
// 90° = neutral, >90° = plantarflexion, <90° = dorsiflexion
```

---

## Getting Keypoints in Code

### By Index

```typescript
import { KEYPOINT_INDICES } from '../lib/poseTypes';

// Get left knee (index 25)
const leftKnee = pose.keypoints[KEYPOINT_INDICES.left_knee];
```

### By Name (Recommended)

```typescript
import { getKeypoint } from '../hooks/usePoseEstimation';

// Returns null if not found or low confidence
const leftKnee = getKeypoint(pose, 'left_knee');
```

### With Validation

```typescript
import { keypointToPoint } from '../lib/vectorMath';

// Returns Point or null if invalid
const leftKneePoint = keypointToPoint(getKeypoint(pose, 'left_knee'));
if (leftKneePoint) {
  // Use leftKneePoint.x and leftKneePoint.y
}
```

---

## MediaPipe Configuration

```typescript
// In usePoseEstimation.ts
const DEFAULT_CONFIG = {
  modelComplexity: 1,           // 0=lite, 1=full, 2=heavy
  minDetectionConfidence: 0.5,  // Min confidence to start tracking
  minTrackingConfidence: 0.5,   // Min confidence to continue tracking
  enableSegmentation: false,     // Body mask (not used)
  smoothSegmentation: false,
};
```

### Model Complexity

- **0 (Lite)**: Faster, less accurate. Good for low-power devices.
- **1 (Full)**: Balanced. Default for BiomechCoach.
- **2 (Heavy)**: Most accurate, slower. For high-quality analysis.
