/**
 * BiomechCoach - Symmetry Computation Module
 *
 * Computes left/right symmetry metrics for biomechanical analysis.
 * These metrics help identify asymmetries that may contribute to
 * injury risk or performance limitations.
 *
 * Note: These are observational metrics, not medical diagnostics.
 */

import { SymmetryMetrics, AngleStats, FrontalMetrics } from './poseTypes';

/**
 * Compute the asymmetry index (AI) for two values.
 * AI = |L - R| / ((L + R) / 2)
 * Returns a value between 0 (perfect symmetry) and 2 (complete asymmetry)
 *
 * @param left - Left side value
 * @param right - Right side value
 * @returns Asymmetry index or null if invalid inputs
 */
export function computeAsymmetryIndex(
  left: number | null | undefined,
  right: number | null | undefined
): number | null {
  if (left == null || right == null) return null;

  const sum = left + right;
  if (sum === 0) return 0; // Both are zero, perfect symmetry

  const diff = Math.abs(left - right);
  const avg = sum / 2;

  return diff / avg;
}

/**
 * Compute the simple difference between right and left values.
 * Positive values indicate right > left.
 *
 * @param left - Left side value
 * @param right - Right side value
 * @returns Difference (right - left) or null if invalid inputs
 */
export function computeDifference(
  left: number | null | undefined,
  right: number | null | undefined
): number | null {
  if (left == null || right == null) return null;
  return right - left;
}

/**
 * Classify the severity of an asymmetry based on the index.
 *
 * @param ai - Asymmetry index
 * @returns Classification string
 */
export function classifyAsymmetry(
  ai: number | null
): 'symmetric' | 'mild' | 'moderate' | 'significant' | null {
  if (ai == null) return null;

  if (ai < 0.1) return 'symmetric';
  if (ai < 0.2) return 'mild';
  if (ai < 0.3) return 'moderate';
  return 'significant';
}

/**
 * Compute symmetry metrics from angle statistics.
 *
 * @param leftHipExtension - Left hip extension stats
 * @param rightHipExtension - Right hip extension stats
 * @param leftKneeFlexion - Left knee flexion stats
 * @param rightKneeFlexion - Right knee flexion stats
 * @param frontalMetrics - Optional frontal plane metrics
 * @param stanceTimeDiff - Optional stance time difference (from gait analysis)
 * @returns SymmetryMetrics object
 */
export function computeSymmetryMetrics(
  leftHipExtension: AngleStats | null,
  rightHipExtension: AngleStats | null,
  leftKneeFlexion: AngleStats | null,
  rightKneeFlexion: AngleStats | null,
  frontalMetrics?: FrontalMetrics | null,
  stanceTimeDiff?: number | null
): SymmetryMetrics {
  const metrics: SymmetryMetrics = {};

  // Hip extension difference
  const leftHipMax = leftHipExtension?.max;
  const rightHipMax = rightHipExtension?.max;
  metrics.hip_extension_diff = computeDifference(leftHipMax, rightHipMax) ?? undefined;

  // Knee flexion difference
  const leftKneeAvg = leftKneeFlexion?.avg;
  const rightKneeAvg = rightKneeFlexion?.avg;
  metrics.knee_flexion_diff = computeDifference(leftKneeAvg, rightKneeAvg) ?? undefined;

  // Hip drop difference from frontal metrics
  if (frontalMetrics) {
    metrics.hip_drop_diff = computeDifference(
      frontalMetrics.pelvic_drop_peak_left,
      frontalMetrics.pelvic_drop_peak_right
    ) ?? undefined;

    // Valgus difference
    metrics.valgus_diff = computeDifference(
      frontalMetrics.valgus_angle_left,
      frontalMetrics.valgus_angle_right
    ) ?? undefined;
  }

  // Stance time difference if provided
  if (stanceTimeDiff != null) {
    metrics.stance_time_diff = stanceTimeDiff;
  }

  // Compute overall asymmetry index
  // Average the individual asymmetry indices that are available
  const indices: number[] = [];

  const hipAI = computeAsymmetryIndex(leftHipMax, rightHipMax);
  if (hipAI != null) indices.push(hipAI);

  const kneeAI = computeAsymmetryIndex(leftKneeAvg, rightKneeAvg);
  if (kneeAI != null) indices.push(kneeAI);

  if (frontalMetrics) {
    const hipDropAI = computeAsymmetryIndex(
      frontalMetrics.pelvic_drop_peak_left,
      frontalMetrics.pelvic_drop_peak_right
    );
    if (hipDropAI != null) indices.push(hipDropAI);

    const valgusAI = computeAsymmetryIndex(
      frontalMetrics.valgus_angle_left,
      frontalMetrics.valgus_angle_right
    );
    if (valgusAI != null) indices.push(valgusAI);
  }

  if (indices.length > 0) {
    metrics.asymmetry_index = indices.reduce((a, b) => a + b, 0) / indices.length;
  }

  return metrics;
}

/**
 * Generate a text summary of symmetry findings.
 *
 * @param metrics - Symmetry metrics
 * @returns Array of summary strings
 */
export function generateSymmetrySummary(metrics: SymmetryMetrics): string[] {
  const summaries: string[] = [];

  // Overall asymmetry
  if (metrics.asymmetry_index != null) {
    const classification = classifyAsymmetry(metrics.asymmetry_index);
    if (classification === 'moderate' || classification === 'significant') {
      summaries.push(
        `Overall ${classification} asymmetry detected (index: ${(metrics.asymmetry_index * 100).toFixed(1)}%).`
      );
    }
  }

  // Hip extension asymmetry
  if (metrics.hip_extension_diff != null && Math.abs(metrics.hip_extension_diff) > 10) {
    const side = metrics.hip_extension_diff > 0 ? 'right' : 'left';
    summaries.push(
      `Hip extension is ${Math.abs(metrics.hip_extension_diff).toFixed(1)}° greater on the ${side} side.`
    );
  }

  // Knee flexion asymmetry
  if (metrics.knee_flexion_diff != null && Math.abs(metrics.knee_flexion_diff) > 8) {
    const side = metrics.knee_flexion_diff > 0 ? 'right' : 'left';
    summaries.push(
      `Knee flexion is ${Math.abs(metrics.knee_flexion_diff).toFixed(1)}° greater on the ${side} side.`
    );
  }

  // Hip drop asymmetry
  if (metrics.hip_drop_diff != null && Math.abs(metrics.hip_drop_diff) > 0.02) {
    const side = metrics.hip_drop_diff > 0 ? 'right' : 'left';
    summaries.push(
      `Greater hip drop observed on the ${side} side during contralateral stance.`
    );
  }

  // Valgus asymmetry
  if (metrics.valgus_diff != null && Math.abs(metrics.valgus_diff) > 5) {
    const side = metrics.valgus_diff > 0 ? 'right' : 'left';
    summaries.push(
      `Knee valgus is more pronounced on the ${side} side (${Math.abs(metrics.valgus_diff).toFixed(1)}° difference).`
    );
  }

  // Stance time asymmetry
  if (metrics.stance_time_diff != null && Math.abs(metrics.stance_time_diff) > 30) {
    const side = metrics.stance_time_diff > 0 ? 'right' : 'left';
    summaries.push(
      `Stance time is ${Math.abs(metrics.stance_time_diff).toFixed(0)}ms longer on the ${side} side.`
    );
  }

  // If no significant asymmetries found
  if (summaries.length === 0) {
    summaries.push('Left/right symmetry appears balanced within normal ranges.');
  }

  return summaries;
}

/**
 * Check if symmetry metrics indicate significant asymmetry.
 *
 * @param metrics - Symmetry metrics
 * @returns True if significant asymmetry is detected
 */
export function hasSignificantAsymmetry(metrics: SymmetryMetrics): boolean {
  // Check overall index
  if (metrics.asymmetry_index != null && metrics.asymmetry_index > 0.25) {
    return true;
  }

  // Check individual metrics
  if (metrics.hip_extension_diff != null && Math.abs(metrics.hip_extension_diff) > 15) {
    return true;
  }

  if (metrics.knee_flexion_diff != null && Math.abs(metrics.knee_flexion_diff) > 12) {
    return true;
  }

  if (metrics.hip_drop_diff != null && Math.abs(metrics.hip_drop_diff) > 0.03) {
    return true;
  }

  if (metrics.valgus_diff != null && Math.abs(metrics.valgus_diff) > 8) {
    return true;
  }

  return false;
}
