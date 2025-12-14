# BiomechCoach - Coding Conventions

## Naming Conventions

### Files

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `CaptureView.tsx`, `AnglePanel.tsx` |
| Hooks | camelCase with `use` prefix | `usePoseEstimation.ts`, `useCyclingAnalysis.ts` |
| Utilities | camelCase | `vectorMath.ts`, `symmetry.ts` |
| Type definitions | camelCase | `poseTypes.ts`, `assessmentTypes.ts` |
| Pattern files | camelCase with suffix | `cyclingPatterns.ts`, `runningHeuristics.ts` |

### Variables and Functions

```typescript
// Functions: camelCase, verb prefixes
function computeAngles()        // compute* - calculations
function detectPatterns()       // detect* - pattern detection
function generate*()            // generate* - create output
function analyze*()             // analyze* - analysis functions
function get*()                 // get* - retrieve data
function validate*()            // validate* - validation

// State variables: camelCase
const [currentPose, setCurrentPose] = useState()
const [isRecording, setIsRecording] = useState()

// Refs: camelCase with Ref suffix
const videoRef = useRef()
const frameCountRef = useRef()

// Constants: UPPER_SNAKE_CASE
const MIN_KEYPOINT_CONFIDENCE = 0.5
const DEFAULT_CYCLING_THRESHOLDS = {}
const STATIC_EXERCISES = []
```

### Types and Interfaces

```typescript
// Interfaces: PascalCase
interface PoseFrame { ... }
interface AngleStats { ... }
interface ExerciseStandard { ... }

// Type aliases: PascalCase
type GaitPhase = 'left_stance' | 'right_stance' | 'flight';

// Pattern flag types: PascalCase with descriptive name
interface StaticPatternFlags {
  static_instability?: boolean;    // prefix for mode
  static_hip_drop?: boolean;
}

interface RunningPatternFlags {
  overstride?: boolean;            // no prefix for running
  hip_drop?: boolean;
}
```

### Pattern Flags

```typescript
// Static patterns: always use static_ prefix
static_instability
static_hip_drop
static_knee_valgus
static_trunk_compensation
static_asymmetry
static_ankle_pronation

// Running patterns: no prefix
overstride
hip_drop
knee_valgus
limited_hip_extension
excessive_trunk_lean

// Cycling patterns: no prefix
saddle_low
saddle_high
knee_tracking_instability
```

## Angle Conventions

### Measurement Units

```typescript
// ALL angles are in DEGREES (0-180)
// Never use radians in this codebase

// Example from vectorMath.ts:
const radians = Math.atan2(...);
return radians * (180 / Math.PI); // Always convert to degrees
```

### Angle Interpretations

```typescript
// KNEE FLEXION: Interior angle at knee
// 180° = fully extended (straight leg)
// 90°  = deeply flexed

// HIP ANGLE: Shoulder-Hip-Knee angle
// 180° = fully extended (standing straight)
// 90°  = hip flexed 90°

// TRUNK LEAN: Angle from vertical
// 0°   = perfectly upright
// 45°  = leaning forward at 45°

// ANKLE ANGLE: Knee-Ankle-Toe angle
// 90°  = neutral position
// 140° = plantarflexion (heel raise)
// 80°  = dorsiflexion
```

### Flexion vs Extension

```typescript
// The codebase uses ANATOMICAL conventions:
// - Flexion decreases the angle at a joint
// - Extension increases the angle at a joint

// For knee:
// - Flexion = bending the knee (angle decreases from 180°)
// - Extension = straightening the knee (angle increases toward 180°)

// Variable naming reflects measurement, not movement:
// knee_flexion_at_midstance - the knee's flexion angle at midstance
// hip_extension - the hip angle during extension phase
```

## Hook Structure Pattern

```typescript
// Standard hook structure
export function useActivityAnalysis() {
  // =========================================================================
  // STATE
  // =========================================================================
  const [currentPose, setCurrentPose] = useState<PoseFrame | null>(null);
  const [patternFlags, setPatternFlags] = useState<PatternFlags>({});
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  // =========================================================================
  // REFS (for frame-to-frame tracking without re-renders)
  // =========================================================================
  const frameCountRef = useRef(0);
  const historyRef = useRef<number[]>([]);

  // =========================================================================
  // CALLBACKS
  // =========================================================================
  const processFrame = useCallback((pose: PoseFrame) => {
    frameCountRef.current++;

    // Update every 5 frames to reduce computation
    if (frameCountRef.current % 5 === 0) {
      // ... analysis logic
    }
  }, [dependencies]);

  const reset = useCallback(() => {
    frameCountRef.current = 0;
    historyRef.current = [];
    setPatternFlags({});
    setSuggestions([]);
  }, []);

  // =========================================================================
  // RETURN
  // =========================================================================
  return {
    processFrame,
    reset,
    patternFlags,
    suggestions,
    // ... other exports
  };
}
```

## State Management Patterns

### Local State vs Refs

```typescript
// Use STATE for:
// - UI-driving data (renders component)
// - Final analysis results
// - User-facing metrics

// Use REFS for:
// - Frame counters
// - History arrays (updated frequently)
// - Intermediate calculations
// - Values that don't need to trigger re-renders

// Example:
const [displayAngle, setDisplayAngle] = useState(0);     // STATE: shown in UI
const angleHistoryRef = useRef<number[]>([]);            // REF: internal tracking
```

### Update Frequency

```typescript
// Raw pose data: 30fps (every frame)
// State updates: every 5 frames (~6Hz)
// Pattern detection: every 5 frames
// Suggestions: every 10 frames (~3Hz)

// Pattern to throttle updates:
if (frameCountRef.current % 5 === 0) {
  updateStats();
}
if (frameCountRef.current % 10 === 0) {
  generateSuggestions();
}
```

## Import Order Convention

```typescript
// 1. React and React hooks
import { useState, useCallback, useRef } from 'react';

// 2. Third-party libraries
import { Pose, Results } from '@mediapipe/pose';

// 3. Internal types
import { PoseFrame, Keypoint, AngleStats } from '../lib/poseTypes';

// 4. Internal utilities
import { angleBetweenPoints, keypointToPoint } from '../lib/vectorMath';

// 5. Internal hooks (if in a component)
import { useCameraStream } from '../hooks/useCameraStream';

// 6. Internal components (if in a component)
import { AnglePanel } from './AnglePanel';

// 7. Styles/CSS (if any)
```

## Comment Style

```typescript
// File headers: JSDoc style
/**
 * BiomechCoach - Module Name
 *
 * Description of the module's purpose.
 */

// Section dividers (in large files)
// ============================================================================
// SECTION NAME
// ============================================================================

// Function documentation
/**
 * Brief description of function.
 *
 * @param paramName - Description of parameter
 * @returns Description of return value
 */

// Inline comments: explain WHY, not WHAT
// BAD: Increment frame count
frameCount++;

// GOOD: Track frames to throttle updates to every 5th frame
frameCount++;
```

## Error Handling

```typescript
// Pattern: Guard clauses with early returns
function processKeypoint(keypoint: Keypoint | undefined): Point | null {
  // Guard: Check existence
  if (!keypoint) return null;

  // Guard: Check confidence
  if (keypoint.score < MIN_KEYPOINT_CONFIDENCE) return null;

  // Main logic
  return { x: keypoint.x, y: keypoint.y };
}

// Pattern: Nullish coalescing for defaults
const threshold = config?.threshold ?? DEFAULT_THRESHOLD;

// Pattern: Optional chaining for nested access
const leftKnee = pose.keypoints?.[25]?.score;
```

## Type Safety Patterns

```typescript
// Use strict null checks
interface Result {
  value: number | null;  // Explicitly nullable
}

// Type guards for pattern flags
function hasPattern(flags: PatternFlags, key: keyof PatternFlags): boolean {
  return flags[key] === true;
}

// Discriminated unions for states
type AnalysisState =
  | { status: 'idle' }
  | { status: 'recording'; elapsed: number }
  | { status: 'complete'; results: AnalysisResults };
```

## Component Patterns

```typescript
// Props interface naming: ComponentNameProps
interface AnglePanelProps {
  angles: Record<string, number>;
  showDetails?: boolean;
}

// Component structure
export function AnglePanel({ angles, showDetails = false }: AnglePanelProps) {
  // 1. Hooks
  const [expanded, setExpanded] = useState(false);

  // 2. Derived values
  const sortedAngles = useMemo(() =>
    Object.entries(angles).sort(), [angles]
  );

  // 3. Handlers
  const handleToggle = useCallback(() => {
    setExpanded(prev => !prev);
  }, []);

  // 4. Render
  return (
    <div className="angle-panel">
      {/* ... */}
    </div>
  );
}
```

## Testing Patterns (if tests exist)

```typescript
// Test file naming: *.test.ts or *.spec.ts
// Test structure:
describe('moduleName', () => {
  describe('functionName', () => {
    it('should handle normal case', () => { ... });
    it('should handle edge case', () => { ... });
    it('should handle null input', () => { ... });
  });
});
```
