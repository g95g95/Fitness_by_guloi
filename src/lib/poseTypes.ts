/**
 * BiomechCoach - Pose Types and Interfaces
 *
 * This file contains all TypeScript types for pose estimation,
 * angle measurements, and analysis summaries.
 */

/**
 * Represents a single keypoint detected by pose estimation.
 * Each keypoint has a name, 2D coordinates, and a confidence score.
 */
export interface Keypoint {
  name: KeypointName;
  x: number;       // x-coordinate in pixels (relative to video dimensions)
  y: number;       // y-coordinate in pixels (relative to video dimensions)
  score: number;   // confidence score between 0 and 1
}

/**
 * Normalized keypoint with coordinates between 0-1 (relative to frame dimensions)
 */
export interface NormalizedKeypoint extends Keypoint {
  normalizedX: number; // 0-1 range
  normalizedY: number; // 0-1 range
}

/**
 * Standard keypoint names supported by MediaPipe Pose
 */
export type KeypointName =
  | 'nose'
  | 'left_eye_inner'
  | 'left_eye'
  | 'left_eye_outer'
  | 'right_eye_inner'
  | 'right_eye'
  | 'right_eye_outer'
  | 'left_ear'
  | 'right_ear'
  | 'mouth_left'
  | 'mouth_right'
  | 'left_shoulder'
  | 'right_shoulder'
  | 'left_elbow'
  | 'right_elbow'
  | 'left_wrist'
  | 'right_wrist'
  | 'left_pinky'
  | 'right_pinky'
  | 'left_index'
  | 'right_index'
  | 'left_thumb'
  | 'right_thumb'
  | 'left_hip'
  | 'right_hip'
  | 'left_knee'
  | 'right_knee'
  | 'left_ankle'
  | 'right_ankle'
  | 'left_heel'
  | 'right_heel'
  | 'left_foot_index'
  | 'right_foot_index';

/**
 * A single frame of pose data with timestamp
 */
export interface PoseFrame {
  timestamp: number;         // milliseconds since capture start
  keypoints: Keypoint[];     // all detected keypoints for this frame
  isValid: boolean;          // whether the pose detection was successful
}

/**
 * Represents a computed angle measurement
 */
export interface AngleMeasurement {
  name: AngleName;           // identifier for the angle type
  value: number | null;      // angle in degrees, null if not computable
  timestamp: number;         // when this measurement was taken
  confidence: number;        // average confidence of keypoints used
}

/**
 * Names for angles we compute in the application
 */
export type AngleName =
  // Cycling angles
  | 'left_knee_flexion'
  | 'right_knee_flexion'
  | 'left_hip_angle'
  | 'right_hip_angle'
  | 'left_ankle_angle'
  | 'right_ankle_angle'
  | 'trunk_angle'
  // Running angles
  | 'left_knee_midstance'
  | 'right_knee_midstance'
  | 'left_hip_extension'
  | 'right_hip_extension'
  | 'trunk_lean';

/**
 * Statistics for a series of angle measurements
 */
export interface AngleStats {
  name: AngleName;
  current: number | null;    // most recent value
  avg: number | null;        // average over the window
  min: number | null;        // minimum value seen
  max: number | null;        // maximum value seen
  samples: number;           // number of valid samples
}

/**
 * Activity modes supported by BiomechCoach
 */
export type ActivityMode = 'cycling' | 'running';

/**
 * Suggestion severity levels
 */
export type SuggestionSeverity = 'info' | 'warning' | 'improvement';

/**
 * A coaching suggestion/tip
 */
export interface Suggestion {
  id: string;
  severity: SuggestionSeverity;
  message: string;
  detail?: string;           // optional detailed explanation
  relatedAngles?: AngleName[];
}

/**
 * Analysis summary for a capture session
 */
export interface AnalysisSummary {
  mode: ActivityMode;
  duration: number;          // total analysis duration in ms
  angles: Record<string, AngleStats>;
  suggestions: Suggestion[];
  muscleInsights: MuscleInsight[];
  cycleCount?: number;       // number of pedal/gait cycles detected
}

/**
 * Muscle involvement insight (educational, not prescriptive)
 */
export interface MuscleInsight {
  muscleGroup: string;
  engagement: 'low' | 'moderate' | 'high';
  note: string;
}

/**
 * Configuration thresholds for cycling analysis
 * These values are configurable and based on biomechanics research
 */
export interface CyclingThresholds {
  kneeFlexionBdcMin: number;       // minimum knee angle at bottom dead center (too bent)
  kneeFlexionBdcMax: number;       // maximum knee angle at BDC (too extended)
  kneeFlexionBdcIdealMin: number;  // ideal range min
  kneeFlexionBdcIdealMax: number;  // ideal range max
  hipAngleMin: number;             // minimum hip angle (very aggressive)
  hipAngleMax: number;             // maximum hip angle (very upright)
  trunkAngleAggressive: number;    // trunk angle considered aggressive
  trunkAngleUpright: number;       // trunk angle considered upright
}

/**
 * Configuration thresholds for running analysis
 */
export interface RunningThresholds {
  overstrideDistance: number;      // ankle-hip horizontal distance threshold
  kneeFlexionMidstanceMin: number; // minimum knee flexion at midstance
  hipExtensionMin: number;         // minimum hip extension at toe-off
  trunkLeanMin: number;            // minimum forward lean
  trunkLeanMax: number;            // maximum forward lean
  hipDropThreshold: number;        // y-difference for hip drop detection
}

/**
 * Default cycling thresholds (degrees)
 */
export const DEFAULT_CYCLING_THRESHOLDS: CyclingThresholds = {
  kneeFlexionBdcMin: 135,
  kneeFlexionBdcMax: 155,
  kneeFlexionBdcIdealMin: 140,
  kneeFlexionBdcIdealMax: 150,
  hipAngleMin: 80,
  hipAngleMax: 120,
  trunkAngleAggressive: 30,
  trunkAngleUpright: 70,
};

/**
 * Default running thresholds
 */
export const DEFAULT_RUNNING_THRESHOLDS: RunningThresholds = {
  overstrideDistance: 0.15,        // 15% of frame width
  kneeFlexionMidstanceMin: 160,
  hipExtensionMin: 170,
  trunkLeanMin: 5,
  trunkLeanMax: 20,
  hipDropThreshold: 0.03,          // 3% of frame height
};

/**
 * Skeleton connections for drawing
 * Each connection is a pair of keypoint names
 */
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

/**
 * Keypoint indices as per MediaPipe Pose model
 */
export const KEYPOINT_INDICES: Record<KeypointName, number> = {
  nose: 0,
  left_eye_inner: 1,
  left_eye: 2,
  left_eye_outer: 3,
  right_eye_inner: 4,
  right_eye: 5,
  right_eye_outer: 6,
  left_ear: 7,
  right_ear: 8,
  mouth_left: 9,
  mouth_right: 10,
  left_shoulder: 11,
  right_shoulder: 12,
  left_elbow: 13,
  right_elbow: 14,
  left_wrist: 15,
  right_wrist: 16,
  left_pinky: 17,
  right_pinky: 18,
  left_index: 19,
  right_index: 20,
  left_thumb: 21,
  right_thumb: 22,
  left_hip: 23,
  right_hip: 24,
  left_knee: 25,
  right_knee: 26,
  left_ankle: 27,
  right_ankle: 28,
  left_heel: 29,
  right_heel: 30,
  left_foot_index: 31,
  right_foot_index: 32,
};

/**
 * Minimum confidence threshold for considering a keypoint valid
 */
export const MIN_KEYPOINT_CONFIDENCE = 0.5;
