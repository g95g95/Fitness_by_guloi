# Task: Add KOPS Angle to Cycling Static Assessment

## Objective

Add a KOPS (Knee Over Pedal Spindle) angle measurement to the cycling static analysis workflow. This measures the tibial angle relative to vertical at the 3 o'clock pedal position to assess saddle setback.

---

## Background

**KOPS** = Knee Over Pedal Spindle
- At 3 o'clock (pedal horizontal forward), measures if the knee is in front of, over, or behind the pedal axis
- Measured as tibial angle from vertical (knee → ankle line vs vertical)
- Positive angle = knee forward of pedal (setback too small / saddle too far forward)
- Negative angle = knee behind pedal (setback too large / saddle too far back)

**Reference ranges:**
| Condition | Angle | Interpretation |
|-----------|-------|----------------|
| Neutral (KOPS) | 0° ± 2° | Ideal - knee over pedal |
| Slightly forward | +3° to +5° | Acceptable for some styles |
| Too forward | > +5° | Saddle too far forward |
| Slightly back | -3° to -5° | Acceptable for TT/triathlon |
| Too far back | < -5° | Saddle too far back |

---

## Todo

- [x] Add `kopsAngle` to `CyclingStaticMeasurement` interface in `poseTypes.ts`
- [x] Add KOPS thresholds to `CyclingStaticThresholds` in `poseTypes.ts`
- [x] Create `calculateKopsAngle()` function in `vectorMath.ts` (tibial angle from vertical)
- [x] Update `useCyclingAnalysis.ts` to compute KOPS angle
- [x] Update `useCyclingStaticAnalysis.ts` to compute KOPS angle
- [x] Add KOPS display to `CyclingStaticCaptureView.tsx` (the actual static cycling UI!)
- [x] Add KOPS display with tooltip in `AnglePanel.tsx` (dynamic cycling)

---

## Files Modified

| File | Changes |
|------|---------|
| `src/lib/poseTypes.ts` | Added `kopsAngle` to `CyclingStaticMeasurement` interface; Added KOPS thresholds to `CyclingStaticThresholds` |
| `src/lib/vectorMath.ts` | Added `calculateKopsAngle()` function - calculates signed tibial angle from vertical |
| `src/hooks/useCyclingAnalysis.ts` | Added `kopsAngle` to `CyclingAngles` interface; Compute KOPS in `computeAngles()` |
| `src/hooks/useCyclingStaticAnalysis.ts` | Added `kopsAngle` to `CyclingStaticAngles`; Compute and average KOPS in measurements |
| `src/components/CaptureView.tsx` | Pass `kopsAngle` to overlay |
| `src/components/AnglePanel.tsx` | Added tooltip support to `AngleCard`; Display KOPS with hover tooltip and signed formatting |
| `src/components/CyclingStaticCaptureView.tsx` | **Main changes**: Added KOPS in real-time angles panel, measurements panel, results view, and reference info |

---

## Review

### Summary of Changes

1. **New `calculateKopsAngle()` function** in vectorMath.ts:
   - Takes knee and ankle points
   - Returns signed angle (positive = knee forward, negative = knee back)
   - Uses `atan2` for proper signed angle calculation

2. **Type updates** in poseTypes.ts:
   - Added `kopsAngle: number | null` to `CyclingStaticMeasurement`
   - Added KOPS thresholds: `kopsAngleIdealMin: -2`, `kopsAngleIdealMax: 2`, `kopsAngleWarningForward: 5`, `kopsAngleWarningBack: -5`

3. **Hook updates**:
   - Both `useCyclingAnalysis.ts` and `useCyclingStaticAnalysis.ts` now compute KOPS angle
   - Static analysis hook averages KOPS over measurement frames

4. **UI display in CyclingStaticCaptureView.tsx** (Static Cycling Analysis):
   - **Real-time angles panel**: Shows KOPS with tooltip and color coding
   - **Measurements panel**: Shows KOPS for each recorded measurement (heel/clipped)
   - **Results view**: Shows KOPS in both measurement cards
   - **Reference info**: Added "KOPS (ore 3): 0° ± 2° (ginocchio sopra pedale)"
   - Color coding: Green (±2°), Yellow (±5°), Red (>5°)
   - Signed display: `+3°` or `-2°` for clarity

5. **UI display in AnglePanel.tsx** (Dynamic Cycling):
   - KOPS card with tooltip explaining what it measures
   - Info icon (ⓘ) indicates tooltip availability

### Testing

- Build completed successfully with no TypeScript errors
- No changes to external APIs
