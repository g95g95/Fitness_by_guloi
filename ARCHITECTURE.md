# BiomechCoach - Architecture Documentation

## Overview

BiomechCoach is a real-time biomechanical analysis application built with React + TypeScript. It uses MediaPipe Pose for skeletal tracking and provides feedback on form, asymmetries, and potential injury risks for cycling, running, and static postural assessments.

## Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DATA FLOW                                       │
└─────────────────────────────────────────────────────────────────────────────┘

  ┌──────────────┐     ┌─────────────────┐     ┌──────────────────┐
  │   Camera     │────▶│  MediaPipe Pose │────▶│   PoseFrame      │
  │  (Webcam)    │     │   (CDN loaded)  │     │   (33 keypoints) │
  └──────────────┘     └─────────────────┘     └────────┬─────────┘
         │                                              │
         ▼                                              ▼
  ┌──────────────┐                           ┌──────────────────┐
  │useCameraStream│                          │usePoseEstimation │
  │              │                           │                  │
  │ - videoRef   │                           │ - processFrame() │
  │ - startCamera│                           │ - currentPose    │
  │ - dimensions │                           │ - fps            │
  └──────────────┘                           └────────┬─────────┘
                                                      │
                                                      ▼
                              ┌────────────────────────────────────────┐
                              │           Analysis Hooks               │
                              │                                        │
                              │  ┌─────────────────┐  ┌──────────────┐│
                              │  │useCyclingAnalysis│ │useRunningAnaly││
                              │  │                 │  │sis           ││
                              │  │ - computeAngles │  │- detectGait  ││
                              │  │ - detectBDC     │  │- strideCount ││
                              │  │ - cycleCount    │  │- cadence     ││
                              │  └─────────────────┘  └──────────────┘│
                              │                                        │
                              │  ┌─────────────────┐  ┌──────────────┐│
                              │  │useStaticAnalysis│  │useFrontalAnaly││
                              │  │                 │  │sis           ││
                              │  │ - swayMetrics   │  │- hipDrop     ││
                              │  │ - asymmetry     │  │- kneeValgus  ││
                              │  └─────────────────┘  └──────────────┘│
                              └────────────────────────────────────────┘
                                                      │
                                                      ▼
                              ┌────────────────────────────────────────┐
                              │         Pattern Detection              │
                              │                                        │
                              │  src/lib/patterns/                     │
                              │  ├── cyclingPatterns.ts                │
                              │  ├── runningPatterns.ts                │
                              │  └── staticPatterns.ts                 │
                              └────────────────────────────────────────┘
                                                      │
                                                      ▼
                              ┌────────────────────────────────────────┐
                              │       Output & Recommendations         │
                              │                                        │
                              │  - Suggestions (Suggestion[])          │
                              │  - MuscleInsights (MuscleInsight[])    │
                              │  - PatternFlags                        │
                              │  - SymmetryMetrics                     │
                              │  - PredictedPains                      │
                              └────────────────────────────────────────┘
                                                      │
                                                      ▼
                              ┌────────────────────────────────────────┐
                              │              UI Components             │
                              │                                        │
                              │  ├── AnglePanel        (real-time)     │
                              │  ├── PatternBadges     (flags display) │
                              │  ├── SummaryPanel      (results)       │
                              │  └── AssessmentSummaryPanel (detailed) │
                              └────────────────────────────────────────┘
```

## Core Module Dependencies

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          MODULE DEPENDENCIES                                 │
└─────────────────────────────────────────────────────────────────────────────┘

                         ┌──────────────────┐
                         │   poseTypes.ts   │◀──────────────────────────────┐
                         │                  │                               │
                         │ - Keypoint       │                               │
                         │ - PoseFrame      │                               │
                         │ - AngleStats     │                               │
                         │ - PatternFlags   │                               │
                         │ - Thresholds     │                               │
                         └────────┬─────────┘                               │
                                  │                                         │
              ┌───────────────────┼───────────────────┐                     │
              ▼                   ▼                   ▼                     │
    ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐            │
    │  vectorMath.ts  │ │  symmetry.ts    │ │*Heuristics.ts   │            │
    │                 │ │                 │ │                 │            │
    │- angleBetween   │ │- computeSymmetry│ │- generate       │            │
    │  Points()       │ │  Metrics()      │ │  Suggestions()  │            │
    │- angleFrom      │ │- hasSignificant │ │- analyze*()     │            │
    │  Vertical()     │ │  Asymmetry()    │ │                 │            │
    │- keypointToPoint│ └─────────────────┘ └─────────────────┘            │
    └────────┬────────┘                                                     │
             │                                                              │
             └──────────────────────────────────────────────────────────────┘
                     (imports poseTypes for Keypoint, MIN_KEYPOINT_CONFIDENCE)
```

## Routing Structure

```
Route                        Component                    Purpose
─────────────────────────────────────────────────────────────────────
/                           ModeSelector                  Landing page - choose mode
/cycling                    CyclingModeSelector           Static vs Dynamic analysis
/cycling/dynamic            CyclingCaptureView            4-test workflow
/cycling/static             CyclingStaticCaptureView      2-step saddle height
/running                    RunningCaptureView            Timed recording assessment
/static                     StaticCaptureView             20 postural exercises
```

## Analysis Pipeline by Mode

### Cycling Mode
```
PoseFrame → useCyclingAnalysis → cyclingPatterns.ts → cyclingHeuristics.ts
                 │
                 ├── computeAngles()
                 │   ├── knee flexion (hip-knee-ankle)
                 │   ├── hip angle (shoulder-hip-knee)
                 │   ├── ankle angle (knee-ankle-foot)
                 │   └── trunk angle (angleFromVertical)
                 │
                 ├── detectBdc() - Bottom Dead Center detection
                 │   └── tracks ankle Y position for cycle counting
                 │
                 └── Pattern Detection
                     ├── saddle_low (knee angle < 140° at BDC)
                     ├── saddle_high (knee angle > 155° at BDC)
                     ├── knee_tracking_instability (frontal view)
                     └── excessive_trunk_lean (< 30° from vertical)
```

### Running Mode
```
PoseFrame → useRunningAnalysis → runningPatterns.ts → runningHeuristics.ts
                 │
                 ├── computeAngles()
                 │   ├── knee angle at midstance
                 │   ├── hip extension at toe-off
                 │   └── trunk lean
                 │
                 ├── detectGaitPhase()
                 │   ├── left_stance / right_stance / flight
                 │   ├── stride counting
                 │   └── cadence calculation (steps/min)
                 │
                 └── Pattern Detection
                     ├── overstride (ankle-hip distance > 15%)
                     ├── hip_drop (pelvic tilt > 3%)
                     ├── knee_valgus (> 10° from frontal)
                     ├── limited_hip_extension (< 170°)
                     └── excessive_trunk_lean (outside 5-20°)
```

### Static Mode
```
PoseFrame → useStaticAnalysis → staticPatterns.ts → staticHeuristics.ts
                 │
                 ├── computeAngles() + updateRawMetrics()
                 │   ├── CoM sway (mid-hip X/Y position)
                 │   ├── hip height asymmetry
                 │   └── angle variability (std dev)
                 │
                 ├── Position Validation
                 │   └── EXERCISE_STARTING_POSITIONS (±5° tolerance)
                 │
                 └── Pattern Detection
                     ├── static_instability (sway > 2%)
                     ├── static_hip_drop (Y diff > 3%)
                     ├── static_knee_valgus
                     ├── static_trunk_compensation (> 8°)
                     ├── static_asymmetry (L/R diff > 5°)
                     └── static_ankle_pronation
```

## Critical Rules - DO NOT VIOLATE

### 1. vectorMath.ts - Angle Calculation Rules

```typescript
// CRITICAL: angleBetweenPoints calculates the INTERIOR angle at point B
// Points: A → B → C  (B is the vertex)
// Returns: 0-180 degrees

// Example: Knee angle = angleBetweenPoints(hip, knee, ankle)
//          This gives the INSIDE angle at the knee

// WARNING: Do NOT swap point order - results will be incorrect
```

### 2. Coordinate System

```
┌────────────────────────────────────┐
│  (0,0)                             │
│    ┌─────────────────────────┐     │
│    │         VIDEO           │     │
│    │                         │     │
│    │    Y increases ↓        │     │
│    │    X increases →        │     │
│    │                         │     │
│    │                         │     │
│    └─────────────────────────┘     │
│                        (width, height)
└────────────────────────────────────┘

- MediaPipe returns NORMALIZED coordinates (0-1)
- usePoseEstimation converts to PIXEL coordinates (0-width/height)
- vectorMath functions work with PIXEL coordinates
- Normalized distances use frameWidth/frameHeight for conversion
```

### 3. Confidence Threshold

```typescript
// MIN_KEYPOINT_CONFIDENCE = 0.5
// Always check keypoint.score >= 0.5 before using
// keypointToPoint() handles this automatically
```

### 4. Pattern Flag Naming Convention

```typescript
// Mode-specific prefixes:
// - Running: overstride, hip_drop, knee_valgus (no prefix)
// - Cycling: saddle_low, saddle_high (no prefix)
// - Static:  static_instability, static_hip_drop (prefix: static_)
```

## File Responsibilities

| File | Responsibility |
|------|----------------|
| `poseTypes.ts` | All TypeScript types, interfaces, constants, thresholds |
| `vectorMath.ts` | Pure math functions for angle calculations |
| `symmetry.ts` | Left/right symmetry computations |
| `*Heuristics.ts` | Rule-based analysis and suggestion generation |
| `patterns/*.ts` | Pattern detection logic per mode |
| `staticExercises.ts` | Exercise definitions (20 exercises) |
| `exerciseStandards.ts` | Ideal angles and starting positions |
| `assessmentRecommendations.ts` | Exercise/muscle/pattern recommendations |
| `painPrediction.ts` | Predicts probable pain from patterns |
| `assessmentTypes.ts` | Assessment session and report types |

## Hook Lifecycle

```typescript
// Standard hook lifecycle:
1. initialize() / setExercise()  - Setup
2. processFrame(pose)            - Per-frame analysis (called ~30fps)
3. getSummary()                  - Get final results
4. reset()                       - Cleanup for new session

// State updates happen every 5 frames to reduce computation
if (frameCountRef.current % 5 === 0) {
  updateStats();
  detectPatterns();
  generateSuggestions();
}
```

## Export System

```typescript
// JSON Export: Full session data
downloadSessionAsJson(session: AssessmentSession)

// PDF Export: Formatted report
downloadSessionAsPdf(session: AssessmentSession)

// LocalStorage: Auto-saves last 10 sessions
// Key: 'biomechcoach_sessions'
```
