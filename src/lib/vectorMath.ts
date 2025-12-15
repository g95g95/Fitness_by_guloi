/**
 * BiomechCoach - Vector Math Utilities
 *
 * Utility functions for computing angles from keypoint coordinates.
 * All angle calculations use 2D coordinates from pose estimation.
 */

import { Keypoint, MIN_KEYPOINT_CONFIDENCE } from './poseTypes';

/**
 * Represents a 2D point
 */
export interface Point2D {
  x: number;
  y: number;
}

/**
 * Represents a 2D vector
 */
export interface Vector2D {
  x: number;
  y: number;
}

/**
 * Converts degrees to radians
 */
export function degreesToRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Converts radians to degrees
 */
export function radiansToDegrees(radians: number): number {
  return radians * (180 / Math.PI);
}

/**
 * Creates a vector from point A to point B
 */
export function createVector(from: Point2D, to: Point2D): Vector2D {
  return {
    x: to.x - from.x,
    y: to.y - from.y,
  };
}

/**
 * Calculates the magnitude (length) of a vector
 */
export function vectorMagnitude(v: Vector2D): number {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

/**
 * Calculates the dot product of two vectors
 */
export function dotProduct(v1: Vector2D, v2: Vector2D): number {
  return v1.x * v2.x + v1.y * v2.y;
}

/**
 * Calculates the cross product (z-component) of two 2D vectors
 * Useful for determining orientation (clockwise/counter-clockwise)
 */
export function crossProduct(v1: Vector2D, v2: Vector2D): number {
  return v1.x * v2.y - v1.y * v2.x;
}

/**
 * Normalizes a vector to unit length
 */
export function normalizeVector(v: Vector2D): Vector2D {
  const mag = vectorMagnitude(v);
  if (mag === 0) return { x: 0, y: 0 };
  return {
    x: v.x / mag,
    y: v.y / mag,
  };
}

/**
 * Calculates the angle at point B formed by points A, B, C.
 * Returns the angle in degrees (0-180).
 *
 * Example: To get knee angle, pass hip as A, knee as B, ankle as C.
 *
 * @param a - First point (e.g., hip)
 * @param b - Middle point where angle is measured (e.g., knee)
 * @param c - Third point (e.g., ankle)
 * @returns Angle in degrees at point B, or null if calculation fails
 */
export function angleBetweenPoints(
  a: Point2D | null,
  b: Point2D | null,
  c: Point2D | null
): number | null {
  if (!a || !b || !c) return null;

  // Create vectors from B to A and from B to C
  const vectorBA = createVector(b, a);
  const vectorBC = createVector(b, c);

  // Calculate magnitudes
  const magBA = vectorMagnitude(vectorBA);
  const magBC = vectorMagnitude(vectorBC);

  // Avoid division by zero
  if (magBA === 0 || magBC === 0) return null;

  // Calculate angle using dot product formula: cos(θ) = (BA · BC) / (|BA| * |BC|)
  const dot = dotProduct(vectorBA, vectorBC);
  const cosAngle = dot / (magBA * magBC);

  // Clamp to avoid numerical errors outside [-1, 1]
  const clampedCos = Math.max(-1, Math.min(1, cosAngle));

  // Return angle in degrees
  return radiansToDegrees(Math.acos(clampedCos));
}

/**
 * Calculates the angle of a line segment relative to the vertical axis.
 * Used for trunk angle calculations.
 *
 * @param top - Upper point (e.g., shoulder)
 * @param bottom - Lower point (e.g., hip)
 * @returns Angle in degrees from vertical (0 = perfectly upright)
 */
export function angleFromVertical(
  top: Point2D | null,
  bottom: Point2D | null
): number | null {
  if (!top || !bottom) return null;

  // Vector from bottom to top
  const v = createVector(bottom, top);
  const mag = vectorMagnitude(v);

  if (mag === 0) return null;

  // Vertical unit vector (pointing up in screen coordinates where y increases downward)
  // Since y increases downward, "up" is negative y direction
  const vertical: Vector2D = { x: 0, y: -1 };

  // Calculate angle between the line and vertical
  const dot = dotProduct(v, vertical);
  const cosAngle = dot / mag; // vertical is unit vector

  // Clamp and convert
  const clampedCos = Math.max(-1, Math.min(1, cosAngle));
  return radiansToDegrees(Math.acos(clampedCos));
}

/**
 * Calculates the horizontal distance between two points as a fraction
 * of the total width. Useful for detecting overstriding.
 *
 * @param p1 - First point
 * @param p2 - Second point
 * @param frameWidth - Total frame width for normalization
 * @returns Normalized horizontal distance (0-1)
 */
export function normalizedHorizontalDistance(
  p1: Point2D | null,
  p2: Point2D | null,
  frameWidth: number
): number | null {
  if (!p1 || !p2 || frameWidth <= 0) return null;
  return Math.abs(p1.x - p2.x) / frameWidth;
}

/**
 * Calculates the vertical distance between two points as a fraction
 * of the total height. Useful for hip drop detection.
 *
 * @param p1 - First point
 * @param p2 - Second point
 * @param frameHeight - Total frame height for normalization
 * @returns Normalized vertical distance (0-1)
 */
export function normalizedVerticalDistance(
  p1: Point2D | null,
  p2: Point2D | null,
  frameHeight: number
): number | null {
  if (!p1 || !p2 || frameHeight <= 0) return null;
  return Math.abs(p1.y - p2.y) / frameHeight;
}

/**
 * Extracts a Point2D from a Keypoint if it has sufficient confidence.
 *
 * @param keypoint - The keypoint to extract
 * @param minConfidence - Minimum confidence threshold
 * @returns Point2D or null if confidence is too low
 */
export function keypointToPoint(
  keypoint: Keypoint | undefined,
  minConfidence: number = MIN_KEYPOINT_CONFIDENCE
): Point2D | null {
  if (!keypoint || keypoint.score < minConfidence) {
    return null;
  }
  return { x: keypoint.x, y: keypoint.y };
}

/**
 * Gets a keypoint by name from an array of keypoints.
 *
 * @param keypoints - Array of keypoints
 * @param name - Name of the keypoint to find
 * @returns The keypoint or undefined if not found
 */
export function getKeypointByName(
  keypoints: Keypoint[],
  name: string
): Keypoint | undefined {
  return keypoints.find((kp) => kp.name === name);
}

/**
 * Calculates the midpoint between two points.
 *
 * @param p1 - First point
 * @param p2 - Second point
 * @returns Midpoint or null if either point is null
 */
export function midpoint(p1: Point2D | null, p2: Point2D | null): Point2D | null {
  if (!p1 || !p2) return null;
  return {
    x: (p1.x + p2.x) / 2,
    y: (p1.y + p2.y) / 2,
  };
}

/**
 * Calculates the Euclidean distance between two points.
 *
 * @param p1 - First point
 * @param p2 - Second point
 * @returns Distance or null if either point is null
 */
export function distance(p1: Point2D | null, p2: Point2D | null): number | null {
  if (!p1 || !p2) return null;
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Computes a rolling average of an array of numbers.
 * Filters out null values.
 *
 * @param values - Array of numbers (may contain nulls)
 * @returns Average or null if no valid values
 */
export function rollingAverage(values: (number | null)[]): number | null {
  const validValues = values.filter((v): v is number => v !== null);
  if (validValues.length === 0) return null;
  return validValues.reduce((a, b) => a + b, 0) / validValues.length;
}

/**
 * Finds the minimum value in an array, ignoring nulls.
 *
 * @param values - Array of numbers (may contain nulls)
 * @returns Minimum value or null if no valid values
 */
export function findMin(values: (number | null)[]): number | null {
  const validValues = values.filter((v): v is number => v !== null);
  if (validValues.length === 0) return null;
  return Math.min(...validValues);
}

/**
 * Finds the maximum value in an array, ignoring nulls.
 *
 * @param values - Array of numbers (may contain nulls)
 * @returns Maximum value or null if no valid values
 */
export function findMax(values: (number | null)[]): number | null {
  const validValues = values.filter((v): v is number => v !== null);
  if (validValues.length === 0) return null;
  return Math.max(...validValues);
}

/**
 * Smooths a series of values using exponential moving average.
 * Useful for reducing noise in angle measurements.
 *
 * @param currentValue - Current measurement
 * @param previousSmoothed - Previous smoothed value
 * @param alpha - Smoothing factor (0-1, higher = more responsive)
 * @returns Smoothed value
 */
export function exponentialSmooth(
  currentValue: number | null,
  previousSmoothed: number | null,
  alpha: number = 0.3
): number | null {
  if (currentValue === null) return previousSmoothed;
  if (previousSmoothed === null) return currentValue;
  return alpha * currentValue + (1 - alpha) * previousSmoothed;
}

/**
 * Detects a local minimum in a time series.
 * Useful for detecting bottom dead center in cycling.
 *
 * @param values - Recent values (most recent last)
 * @param threshold - How much below neighbors to count as minimum
 * @returns Index of local minimum, or -1 if none found
 */
export function detectLocalMinimum(
  values: (number | null)[],
  threshold: number = 5
): number {
  if (values.length < 3) return -1;

  // Look at the middle region of the array
  for (let i = 1; i < values.length - 1; i++) {
    const prev = values[i - 1];
    const curr = values[i];
    const next = values[i + 1];

    if (prev === null || curr === null || next === null) continue;

    if (curr < prev - threshold && curr < next - threshold) {
      return i;
    }
  }
  return -1;
}

/**
 * Detects a local maximum in a time series.
 * Useful for detecting top dead center in cycling.
 *
 * @param values - Recent values (most recent last)
 * @param threshold - How much above neighbors to count as maximum
 * @returns Index of local maximum, or -1 if none found
 */
export function detectLocalMaximum(
  values: (number | null)[],
  threshold: number = 5
): number {
  if (values.length < 3) return -1;

  for (let i = 1; i < values.length - 1; i++) {
    const prev = values[i - 1];
    const curr = values[i];
    const next = values[i + 1];

    if (prev === null || curr === null || next === null) continue;

    if (curr > prev + threshold && curr > next + threshold) {
      return i;
    }
  }
  return -1;
}

/**
 * Calculates the KOPS (Knee Over Pedal Spindle) angle.
 * Measures the tibial angle from vertical (knee to ankle line).
 *
 * @param knee - Knee point
 * @param ankle - Ankle point
 * @returns Signed angle in degrees:
 *   - Positive = knee is forward of ankle (saddle too far forward)
 *   - Negative = knee is behind ankle (saddle too far back)
 *   - Zero = knee directly over ankle (ideal KOPS)
 */
export function calculateKopsAngle(
  knee: Point2D | null,
  ankle: Point2D | null
): number | null {
  if (!knee || !ankle) return null;

  // Calculate horizontal difference (positive = knee forward)
  const dx = knee.x - ankle.x;
  // Calculate vertical difference (always positive since knee is above ankle)
  const dy = ankle.y - knee.y;

  if (dy <= 0) return null; // Invalid - knee should be above ankle

  // Calculate angle: atan2 gives us signed angle
  // tan(angle) = horizontal / vertical
  const angleRad = Math.atan2(dx, dy);

  return radiansToDegrees(angleRad);
}
