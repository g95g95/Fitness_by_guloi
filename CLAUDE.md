# BiomechCoach - Project Documentation

## Overview

BiomechCoach is a real-time biomechanical analysis application for cycling, running, and static postural assessments. It uses MediaPipe Pose for skeletal tracking and provides feedback on form, asymmetries, and potential injury risks.

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: TailwindCSS
- **Pose Estimation**: MediaPipe Pose
- **Routing**: React Router DOM

## Project Structure

```
src/
├── components/           # React UI components
│   ├── AnglePanel.tsx           # Displays real-time angle measurements
│   ├── AssessmentConfigModal.tsx # Modal for assessment configuration
│   ├── AssessmentSummaryPanel.tsx # Shows assessment results with recommendations
│   ├── CameraFeed.tsx           # Webcam feed component (mirrored for static mode)
│   ├── CaptureView.tsx          # Main view for cycling/running modes
│   ├── ExerciseList.tsx         # List of static exercises to select
│   ├── ModeSelector.tsx         # Landing page - mode selection (cycling/running/static)
│   ├── PainInputModal.tsx       # Modal for logging pain data
│   ├── PatternBadges.tsx        # Shows detected biomechanical pattern flags
│   ├── PoseOverlayCanvas.tsx    # Draws skeleton overlay on video
│   ├── PositionValidationOverlay.tsx # Visual feedback for starting position validation
│   ├── RecordingTimer.tsx       # Timer display during recording
│   ├── RunningCaptureView.tsx   # Main view for running assessments (timed recording)
│   ├── StaticCaptureView.tsx    # Main view for static assessments (Static & Live-Time modes)
│   └── SummaryPanel.tsx         # Session summary display
│
├── hooks/                # Custom React hooks
│   ├── useAssessment.ts         # Assessment session management and scoring
│   ├── useCameraStream.ts       # Webcam access and stream management
│   ├── useCyclingAnalysis.ts    # Cycling-specific angle analysis
│   ├── useFrontalAnalysis.ts    # Frontal plane metrics (hip drop, valgus)
│   ├── usePainLogging.ts        # Pain entry management
│   ├── usePoseEstimation.ts     # MediaPipe pose detection
│   ├── useRunningAnalysis.ts    # Running-specific gait analysis
│   └── useStaticAnalysis.ts     # Static posture analysis
│
├── lib/                  # Core logic and utilities
│   ├── assessmentRecommendations.ts # Generates exercise/muscle recommendations
│   ├── assessmentTypes.ts       # TypeScript types for assessment reports
│   ├── cyclingHeuristics.ts     # Cycling biomechanics rules
│   ├── exerciseStandards.ts     # Ideal angle ranges + starting positions (±5° tolerance)
│   ├── painPrediction.ts        # Predicts probable pains from patterns
│   ├── poseTypes.ts             # Core pose/angle type definitions
│   ├── runningHeuristics.ts     # Running biomechanics rules
│   ├── staticExercises.ts       # Library of 20 static assessment exercises
│   ├── staticHeuristics.ts      # Static posture analysis rules
│   ├── symmetry.ts              # Left/right symmetry calculations
│   ├── vectorMath.ts            # Angle calculation utilities
│   └── patterns/                # Pattern detection modules
│       ├── cyclingPatterns.ts   # Cycling pattern flags
│       ├── runningPatterns.ts   # Running pattern flags
│       └── staticPatterns.ts    # Static pattern flags
│
├── App.tsx               # Main app with routing
└── main.tsx              # Entry point
```

## Activity Modes

### 1. Cycling Mode (`/cycling`)
- Side view analysis
- Tracks: knee flexion, hip angle, trunk angle, ankle angle
- Detects: saddle height issues, knee tracking instability
- Ideal for bike fitting feedback

### 2. Running Mode (`/running`)
- **Timed recording assessment** with configurable duration (10-30s) and countdown delay
- Side view analysis (run back and forth during recording)
- Tracks: knee flexion at midstance, hip extension, trunk lean
- Detects: overstride, hip drop, knee valgus, limited hip extension, excessive trunk lean
- Stride count and cadence (steps per minute) calculation
- Post-recording assessment report with score, patterns, and recommendations
- Export to JSON/PDF

### 3. Static Mode (`/static`)
- 20 predefined postural assessment exercises
- Categories: Balance, Squat, Lunge, Heel Raise, Hinge, Static Holds
- Measures: sway, angle deviations, asymmetries
- Generates per-exercise scores and recommendations
- **Two assessment modes via tabs**:
  - **Static Assessment**: Traditional timed recording with configurable duration and countdown
  - **Live-Time Assessment**: Auto-starts when position is correct, auto-stops when position is lost for 2+ seconds
- **Position validation**: Recording starts only when user is in correct starting position (±5° tolerance)
- **Visual feedback**: Real-time indicators showing which angles are correct (green) or incorrect (red)
- **Mirrored video**: Camera feed is mirrored for natural "mirror" experience

## Static Exercises (20 total)

| Category | Exercises |
|----------|-----------|
| Squat | Double-Leg Squat (Front/Side), Single-Leg Squat (L/R), Step-Down (L/R) |
| Balance | Single-Leg Stance (L/R), Single-Leg Stance with 90° Knee (L/R), Tandem Stance |
| Heel Raise | Double-Leg Heel Raises, Single-Leg Heel Raises (L/R), Toe Raises |
| Lunge | Static Split Squat Hold (L/R) |
| Hinge | Single-Leg RDL (L/R) |
| Static Holds | Wall Sit |

## Key Data Types

### AssessmentSession
Complete session data exported as JSON:
- `sessionId`: Unique identifier
- `exercises[]`: Array of exercise results
- `globalRecommendations`: Aggregated recommendations
- `sessionSummary`: Overall statistics

### ExerciseAssessmentResult
Per-exercise data:
- `measuredAngles`: Knee, hip, ankle, trunk angles
- `angleDeviations`: Comparison to ideal values
- `patternFlags`: Detected issues (instability, valgus, etc.)
- `asymmetries`: Left/right differences
- `score`: 0-100 assessment score
- `recommendations`: Exercises, muscles, patterns to work on
- `probablePains`: Predicted injury risks

### Pattern Flags
- **Static**: instability, hip_drop, knee_valgus, trunk_compensation, asymmetry, ankle_pronation
- **Running**: overstride, hip_drop, knee_valgus, pronation, limited_hip_extension
- **Cycling**: saddle_low, saddle_high, knee_tracking_instability

## Export Features

- **JSON Export**: Full assessment data via `downloadSessionAsJson()`
- **PDF Export**: Assessment report via `downloadSessionAsPdf()`
- **LocalStorage**: Auto-saves last 10 sessions

## Configuration Options

### Assessment Duration
- 10s (Quick), 15s (Standard), 20s (Full - recommended), 30s (Extended)

### Detection Delay
- 3s (Quick), 5s (Standard - recommended), 10s (Extended)

---

## Best Practices

1. First think through the problem, read the codebase for relevant files, and write a plan to `tasks/todo.md`.
2. The plan should have a list of todo items that you can check off as you complete them.
3. Before you begin working, check in with me and I will verify the plan.
4. Then, begin working on the todo items, marking them as complete as you go.
5. Please every step of the way just give me a high level explanation of what changes you made.
6. Make every task and code change you do as simple as possible. We want to avoid making any massive or complex changes. Every change should impact as little code as possible. Everything is about simplicity.
7. Finally, add a review section to the `tasks/todo.md` file with a summary of the changes you made and any other relevant information.
8. DO NOT BE LAZY. NEVER BE LAZY. IF THERE IS A BUG FIND THE ROOT CAUSE AND FIX IT. NO TEMPORARY FIXES. YOU ARE A SENIOR DEVELOPER. NEVER BE LAZY.
9. MAKE ALL FIXES AND CODE CHANGES AS SIMPLE AS HUMANLY POSSIBLE. THEY SHOULD ONLY IMPACT NECESSARY CODE RELEVANT TO THE TASK AND NOTHING ELSE. IT SHOULD IMPACT AS LITTLE CODE AS POSSIBLE. YOUR GOAL IS TO NOT INTRODUCE ANY BUGS. IT'S ALL ABOUT SIMPLICITY.
10. **ALWAYS UPDATE CLAUDE.md** after making significant changes to the project structure, adding new files, or modifying key functionality.

---

## Documentation Files

| File | Description |
|------|-------------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Data flow diagrams, module dependencies, analysis pipelines |
| [CONVENTIONS.md](./CONVENTIONS.md) | Naming conventions, code patterns, import order |
| [docs/PATTERNS.md](./docs/PATTERNS.md) | Pattern detection thresholds, recommendations mapping |
| [docs/EXERCISES.md](./docs/EXERCISES.md) | Exercise catalog, ideal angles, starting positions |
| [docs/LANDMARKS.md](./docs/LANDMARKS.md) | MediaPipe landmark indices and usage by mode |
| [docs/TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md) | Common issues and debugging guide |
| [tasks/todo.md](./tasks/todo.md) | Task tracking template |

---

## Quick Reference

### NPM Commands

```bash
# Development
npm run dev          # Start dev server (Vite)

# Build
npm run build        # Production build
npm run preview      # Preview production build

# Linting
npm run lint         # Run ESLint
```

### Key Files to Know

| Purpose | File |
|---------|------|
| All TypeScript types | `src/lib/poseTypes.ts` |
| Angle calculations | `src/lib/vectorMath.ts` |
| Exercise definitions | `src/lib/staticExercises.ts` |
| Ideal angles & tolerances | `src/lib/exerciseStandards.ts` |
| Pattern detection | `src/lib/patterns/*.ts` |
| Pose estimation hook | `src/hooks/usePoseEstimation.ts` |

### Critical Constants

```typescript
// src/lib/poseTypes.ts
MIN_KEYPOINT_CONFIDENCE = 0.5   // Keypoint filter threshold

// src/lib/exerciseStandards.ts
Starting position tolerance = ±5°  // Default for all exercises

// src/lib/poseTypes.ts - DEFAULT_STATIC_THRESHOLDS
swayThreshold: 0.02              // 2% of frame = instability
hipDropThreshold: 0.03           // 3% = hip drop detected
kneeValgusThreshold: 10          // 10° = valgus detected
asymmetryThreshold: 5            // 5° L/R difference
```

---

## Recommended Workflow

1. **New Feature/Bug Fix**:
   ```
   1. Create task plan in tasks/todo.md
   2. Read relevant files (check docs/ for guidance)
   3. Implement changes (minimal, simple)
   4. Test manually
   5. Update tasks/todo.md with review
   6. Update CLAUDE.md if structure changed
   ```

2. **Adding New Pattern**:
   - See [docs/PATTERNS.md](./docs/PATTERNS.md) for checklist

3. **Adding New Exercise**:
   - See [docs/EXERCISES.md](./docs/EXERCISES.md) for checklist

4. **Debugging**:
   - See [docs/TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md)
