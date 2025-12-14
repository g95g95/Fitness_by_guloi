# BiomechCoach - Troubleshooting Guide

## Common Issues and Solutions

### 1. Camera Issues

#### Camera Not Starting

**Symptoms**: Black video feed, "Camera access denied" error

**Solutions**:
1. Check browser permissions for camera access
2. Ensure no other application is using the camera
3. Try a different browser (Chrome recommended)
4. Check HTTPS - MediaPipe requires secure context

**Code Location**: `src/hooks/useCameraStream.ts`

```typescript
// Permission check happens in startCamera()
const stream = await navigator.mediaDevices.getUserMedia({
  video: {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    facingMode: 'user',
  },
});
```

#### Low FPS / Laggy Video

**Symptoms**: Video stutters, analysis delayed

**Solutions**:
1. Reduce video resolution (modify getUserMedia constraints)
2. Ensure good lighting
3. Close other resource-intensive tabs
4. Check CPU usage

---

### 2. Pose Detection Issues

#### Pose Not Detected / Skeleton Not Showing

**Symptoms**: Video shows but no skeleton overlay, angles show N/A

**Solutions**:
1. **Lighting**: Ensure good, even lighting on the subject
2. **Distance**: Stand 2-3 meters from camera, full body visible
3. **Clothing**: Avoid baggy clothes that hide joint positions
4. **Background**: Use contrasting background

**Code Location**: `src/hooks/usePoseEstimation.ts`

```typescript
// Check if pose detection is returning results
const results = await pose.send({ image: video });
// results.poseLandmarks may be undefined if detection fails
```

#### Low Confidence Keypoints

**Symptoms**: Some angles show N/A, skeleton partially drawn

**Debug Steps**:
1. Check keypoint confidence in console:
   ```typescript
   console.log(pose.keypoints.map(k => `${k.name}: ${k.score}`));
   ```
2. Keypoints with score < 0.5 are filtered out
3. Check which specific keypoints are failing

**Code Location**: `src/lib/vectorMath.ts:48-51`

```typescript
// MIN_KEYPOINT_CONFIDENCE = 0.5
export function keypointToPoint(keypoint: Keypoint | undefined): Point | null {
  if (!keypoint || keypoint.score < MIN_KEYPOINT_CONFIDENCE) return null;
  return { x: keypoint.x, y: keypoint.y };
}
```

---

### 3. Angle Calculation Issues

#### Incorrect Angle Values

**Symptoms**: Angles don't match visual observation

**Debug Steps**:
1. Verify keypoint order in angle calculation:
   ```typescript
   // CORRECT: angleBetweenPoints(hip, knee, ankle) = knee angle
   // The middle point (knee) is the vertex
   ```
2. Check coordinate system (Y increases downward)
3. Verify landmarks are correctly indexed

**Code Location**: `src/lib/vectorMath.ts`

```typescript
// Debug angle calculation:
export function angleBetweenPoints(a: Point, b: Point, c: Point): number {
  const ba = { x: a.x - b.x, y: a.y - b.y };
  const bc = { x: c.x - b.x, y: c.y - b.y };
  // ... calculation
  console.log(`Angle at B: ${angle}° (A=${a}, B=${b}, C=${c})`);
}
```

#### Angles Jumping / Unstable

**Symptoms**: Displayed angles fluctuate rapidly

**Solutions**:
1. Add smoothing (moving average):
   ```typescript
   const smoothedAngle = historyRef.current
     .slice(-5)
     .reduce((a, b) => a + b, 0) / 5;
   ```
2. Check for low confidence keypoints causing jumps
3. Increase update interval (currently every 5 frames)

---

### 4. Pattern Detection Issues

#### Patterns Not Being Detected

**Symptoms**: Known biomechanical issues not flagged

**Debug Steps**:
1. Check if thresholds are appropriate:
   ```typescript
   // In poseTypes.ts - DEFAULT_STATIC_THRESHOLDS
   console.log('Current thresholds:', DEFAULT_STATIC_THRESHOLDS);
   ```
2. Log raw metrics before pattern detection:
   ```typescript
   console.log('Raw metrics:', rawMetrics);
   console.log('Sway total:', swayTotal);
   ```
3. Verify the correct analysis hook is being used

**Code Location**: `src/lib/patterns/staticPatterns.ts`

```typescript
// Add debug logging:
export function detectStaticPatterns(...) {
  console.log('Input metrics:', rawMetrics);
  console.log('Frontal metrics:', frontalMetrics);

  // After detection:
  console.log('Detected flags:', flags);
}
```

#### False Positive Patterns

**Symptoms**: Patterns flagged when not present

**Solutions**:
1. Increase threshold values
2. Check if enough frames have been collected:
   ```typescript
   // Some patterns need minimum history length
   if (rawMetrics.comXHistory.length < 10) return {};
   ```
3. Add temporal consistency check

---

### 5. Assessment Issues

#### Score Seems Incorrect

**Symptoms**: High/low score doesn't match observed performance

**Debug Steps**:
1. Check individual angle deviations:
   ```typescript
   import { calculateAngleDeviations } from './exerciseStandards';
   const deviations = calculateAngleDeviations(exerciseId, measuredAngles);
   console.log('Deviations:', deviations);
   ```
2. Verify exercise standard is loaded:
   ```typescript
   import { getExerciseStandard } from './exerciseStandards';
   console.log('Standard:', getExerciseStandard(exerciseId));
   ```

**Code Location**: `src/hooks/useAssessment.ts`

#### Starting Position Never Validates

**Symptoms**: Green checkmarks never appear, recording doesn't start

**Debug Steps**:
1. Check current measured angles:
   ```typescript
   console.log('Measured angles:', measuredAngles);
   ```
2. Compare to starting position requirements:
   ```typescript
   import { getExerciseStartingPosition } from './exerciseStandards';
   console.log('Required:', getExerciseStartingPosition(exerciseId));
   ```
3. Verify tolerance (default ±5°):
   ```typescript
   // If angle is 178° and ideal is 175°, it should pass (diff = 3°)
   ```

**Code Location**: `src/lib/exerciseStandards.ts:687-737`

---

### 6. UI/Rendering Issues

#### Skeleton Overlay Misaligned

**Symptoms**: Skeleton doesn't match person's position

**Solutions**:
1. Check video dimensions match canvas:
   ```typescript
   console.log('Video:', videoRef.current.videoWidth, videoRef.current.videoHeight);
   console.log('Canvas:', canvasRef.current.width, canvasRef.current.height);
   ```
2. Verify coordinate scaling
3. Check for CSS transforms affecting canvas

**Code Location**: `src/components/PoseOverlayCanvas.tsx`

#### Mirrored Video Issues

**Symptoms**: Skeleton inverted, left/right swapped

**Notes**:
- Static mode uses mirrored video (natural "mirror" experience)
- Cycling/Running use non-mirrored video
- Check `scaleX(-1)` CSS transform

---

### 7. Export Issues

#### JSON Export Empty or Incomplete

**Debug Steps**:
1. Check session data before export:
   ```typescript
   console.log('Session to export:', session);
   ```
2. Verify all exercises have results
3. Check for circular references (JSON.stringify fails)

#### PDF Export Fails

**Solutions**:
1. Check browser PDF support
2. Verify all required data is present
3. Check for special characters in text

---

## Debugging Tools

### Console Logging Pattern

```typescript
// Add to any analysis hook:
useEffect(() => {
  if (process.env.NODE_ENV === 'development') {
    console.group('Analysis Debug');
    console.log('Current pose:', currentPose);
    console.log('Pattern flags:', patternFlags);
    console.log('Suggestions:', suggestions);
    console.groupEnd();
  }
}, [currentPose, patternFlags, suggestions]);
```

### Visual Debug Mode

```typescript
// Add to PoseOverlayCanvas.tsx
const DEBUG_MODE = true;

// Draw confidence values on canvas
if (DEBUG_MODE) {
  keypoints.forEach((kp, i) => {
    ctx.fillText(`${i}: ${kp.score.toFixed(2)}`, kp.x, kp.y - 10);
  });
}
```

### Performance Profiling

```typescript
// Measure frame processing time
const startTime = performance.now();
processFrame(pose);
const endTime = performance.now();
console.log(`Frame processed in ${endTime - startTime}ms`);
```

---

## Known Limitations

1. **Side View Only**: Cycling and running analysis works best from side view
2. **Single Person**: Only one person should be in frame
3. **Full Body Required**: All major joints must be visible
4. **Static Camera**: Camera should not move during recording
5. **Lighting Sensitivity**: Low light reduces detection accuracy
6. **Loose Clothing**: Can hide joint positions
7. **Fast Movements**: May cause motion blur and detection failure

---

## Getting Help

1. Check browser console for error messages
2. Review relevant source files mentioned in this guide
3. Add debug logging to isolate the issue
4. Check MediaPipe documentation for pose detection issues
5. File issues with clear reproduction steps
