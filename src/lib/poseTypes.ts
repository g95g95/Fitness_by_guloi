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
export type ActivityMode = 'cycling' | 'running' | 'static';

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

/**
 * View type for camera/analysis
 */
export type ViewType = 'side' | 'front';

/**
 * Extended angle names including frontal plane metrics
 */
export type FrontalAngleName =
  | 'pelvic_drop_left'
  | 'pelvic_drop_right'
  | 'valgus_angle_left'
  | 'valgus_angle_right'
  | 'ankle_medial_drift_left'
  | 'ankle_medial_drift_right'
  | 'knee_lateral_deviation_left'
  | 'knee_lateral_deviation_right';

/**
 * Pattern flags for detected biomechanical issues (running)
 */
export interface RunningPatternFlags {
  overstride?: boolean;
  hip_drop?: boolean;
  knee_valgus?: boolean;
  pronation?: boolean;
  limited_hip_extension?: boolean;
  excessive_trunk_lean?: boolean;
}

/**
 * Pattern flags for detected biomechanical issues (cycling)
 */
export interface CyclingPatternFlags {
  saddle_low?: boolean;
  saddle_high?: boolean;
  knee_tracking_instability?: boolean;
  excessive_trunk_lean?: boolean;
}

/**
 * Combined pattern flags (union of running and cycling)
 */
export interface PatternFlags extends RunningPatternFlags, CyclingPatternFlags {}

/**
 * Symmetry metrics for left/right comparison
 */
export interface SymmetryMetrics {
  /** Hip drop difference (right - left), in normalized units */
  hip_drop_diff?: number;
  /** Knee valgus difference (right - left), in degrees */
  valgus_diff?: number;
  /** Stance time difference (right - left), in ms */
  stance_time_diff?: number;
  /** Hip extension difference (right - left), in degrees */
  hip_extension_diff?: number;
  /** Knee flexion difference (right - left), in degrees */
  knee_flexion_diff?: number;
  /** Asymmetry index (0-1, higher = more asymmetric) */
  asymmetry_index?: number;
}

/**
 * Frontal plane metrics computed from front view
 */
export interface FrontalMetrics {
  /** Peak pelvic drop on left stance (normalized Y difference) */
  pelvic_drop_peak_left?: number;
  /** Peak pelvic drop on right stance */
  pelvic_drop_peak_right?: number;
  /** Mean pelvic drop */
  pelvic_drop_mean?: number;
  /** Left knee valgus angle (degrees, positive = inward) */
  valgus_angle_left?: number;
  /** Right knee valgus angle */
  valgus_angle_right?: number;
  /** Peak valgus angles */
  valgus_peak_left?: number;
  valgus_peak_right?: number;
  /** Ankle medial drift - horizontal deviation during stance */
  ankle_medial_drift_left?: number;
  ankle_medial_drift_right?: number;
  /** Knee lateral deviation for cycling */
  knee_lateral_deviation_left?: number;
  knee_lateral_deviation_right?: number;
}

/**
 * Pain location options
 */
export type PainLocation =
  | 'front_knee'
  | 'outer_knee'
  | 'inner_knee'
  | 'back_knee'
  | 'hip_front'
  | 'hip_side'
  | 'lower_back'
  | 'ankle'
  | 'shin'
  | 'calf'
  | 'foot'
  | 'other';

/**
 * Pain entry for a single session
 */
export interface PainEntry {
  /** Unique identifier for the entry */
  id: string;
  /** Timestamp when pain was logged */
  timestamp: number;
  /** Pain intensity (0-10) */
  intensity: number;
  /** Location of pain */
  location: PainLocation;
  /** Optional notes */
  notes?: string;
  /** Associated session metrics snapshot */
  sessionMetrics?: {
    patternFlags?: PatternFlags;
    symmetry?: SymmetryMetrics;
    frontalMetrics?: FrontalMetrics;
  };
}

/**
 * Pain correlation result
 */
export interface PainCorrelation {
  /** Pattern flag that correlates with high pain */
  pattern: keyof PatternFlags;
  /** How often this pattern appears in high-pain sessions vs low-pain */
  highPainOccurrence: number;
  lowPainOccurrence: number;
  /** Correlation strength indicator */
  correlationStrength: 'weak' | 'moderate' | 'strong';
}

/**
 * Extended analysis summary with new fields
 */
export interface ExtendedAnalysisSummary extends AnalysisSummary {
  /** Pattern flags detected during analysis */
  pattern_flags?: PatternFlags;
  /** Symmetry metrics */
  symmetry?: SymmetryMetrics;
  /** Frontal plane metrics (if front view was used) */
  frontal_metrics?: FrontalMetrics;
  /** View types used in this analysis */
  views_used?: ViewType[];
}

/**
 * Thresholds for frontal plane analysis
 */
export interface FrontalThresholds {
  /** Pelvic drop threshold (normalized, e.g., 0.03 = 3% of frame height) */
  pelvicDropThreshold: number;
  /** Knee valgus threshold (degrees) */
  kneeValgusThreshold: number;
  /** Ankle medial drift threshold (normalized) */
  ankleMedialDriftThreshold: number;
  /** Knee lateral deviation threshold for cycling (normalized) */
  kneeLateralDeviationThreshold: number;
}

/**
 * Default frontal plane thresholds
 */
export const DEFAULT_FRONTAL_THRESHOLDS: FrontalThresholds = {
  pelvicDropThreshold: 0.03,       // 3% of frame height
  kneeValgusThreshold: 10,         // 10 degrees
  ankleMedialDriftThreshold: 0.02, // 2% of frame width
  kneeLateralDeviationThreshold: 0.03, // 3% of frame width
};

// ============================================================================
// STATIC MODE TYPES
// ============================================================================

/**
 * Static exercise definition
 */
export interface StaticExercise {
  /** Unique identifier for the exercise */
  id: string;
  /** Display name */
  name: string;
  /** Short description for the exercise */
  description: string;
  /** Preferred camera view */
  view: 'front' | 'side' | 'either';
  /** Default duration in seconds */
  durationSeconds: number;
  /** Joint areas to focus on during analysis */
  focusJoints: string[];
  /** Category for grouping exercises */
  category: 'balance' | 'squat' | 'lunge' | 'heel_raise' | 'hinge' | 'stance';
}

/**
 * Static session data structure
 */
export interface StaticSession {
  /** ID of the exercise being performed */
  exerciseId: string;
  /** Mode identifier */
  mode: 'static';
  /** Camera view used */
  view: 'front' | 'side' | 'either';
  /** Session start timestamp */
  startTimestamp: number;
  /** Duration in seconds */
  durationSeconds: number;
  /** Captured pose frames */
  frames: PoseFrame[];
}

/**
 * Pattern flags for static assessment
 */
export interface StaticPatternFlags {
  /** Excessive sway/wobble during stance */
  static_instability?: boolean;
  /** Pelvis drops on unsupported side during single-leg stance */
  static_hip_drop?: boolean;
  /** Knee collapses inward during squat/lunge/stance */
  static_knee_valgus?: boolean;
  /** Trunk leans to compensate for weakness/imbalance */
  static_trunk_compensation?: boolean;
  /** Left/right differences in position or range */
  static_asymmetry?: boolean;
  /** Ankle rolls inward (pronation) */
  static_ankle_pronation?: boolean;
}

/**
 * Static analysis metrics
 */
export interface StaticMetrics {
  /** Mean angle values during the session */
  meanAngles: Record<string, number>;
  /** Standard deviation of angles (variability/wobble) */
  angleVariability: Record<string, number>;
  /** Center of mass proxy sway (using mid-hip point) */
  comSway: {
    swayX: number;    // horizontal sway (std dev)
    swayY: number;    // vertical sway (std dev)
    swayTotal: number; // total sway magnitude
  };
  /** Left/right asymmetry metrics */
  asymmetry: {
    kneeAngleDiff?: number;
    hipHeightDiff?: number;
    shoulderHeightDiff?: number;
    anklePositionDiff?: number;
  };
  /** Detected pattern flags */
  patternFlags: StaticPatternFlags;
}

/**
 * Static analysis thresholds
 */
export interface StaticThresholds {
  /** CoM sway threshold for instability flag (normalized) */
  swayThreshold: number;
  /** Hip drop threshold (normalized Y difference) */
  hipDropThreshold: number;
  /** Knee valgus threshold (degrees) */
  kneeValgusThreshold: number;
  /** Trunk lean threshold for compensation flag (degrees) */
  trunkCompensationThreshold: number;
  /** Angle difference threshold for asymmetry flag (degrees) */
  asymmetryThreshold: number;
  /** Angle variability threshold (degrees std dev) */
  variabilityThreshold: number;
}

/**
 * Default static analysis thresholds
 */
export const DEFAULT_STATIC_THRESHOLDS: StaticThresholds = {
  swayThreshold: 0.02,           // 2% of frame dimension
  hipDropThreshold: 0.03,        // 3% of frame height
  kneeValgusThreshold: 10,       // 10 degrees
  trunkCompensationThreshold: 8, // 8 degrees from vertical
  asymmetryThreshold: 5,         // 5 degrees difference
  variabilityThreshold: 5,       // 5 degrees standard deviation
};

/**
 * Extended analysis summary with static mode support
 */
export interface StaticAnalysisSummary extends AnalysisSummary {
  /** Exercise info for static mode */
  static_exercise?: {
    id: string;
    name: string;
  };
  /** Static-specific metrics */
  static_metrics?: StaticMetrics;
  /** Pattern flags (including static flags) */
  pattern_flags?: PatternFlags & StaticPatternFlags;
  /** Symmetry metrics */
  symmetry?: SymmetryMetrics;
  /** Frontal plane metrics */
  frontal_metrics?: FrontalMetrics;
  /** View types used */
  views_used?: ViewType[];
}

/**
 * Updated PainEntry to support static mode
 */
export interface StaticPainEntry extends PainEntry {
  /** Exercise ID for static mode sessions */
  exerciseId?: string;
}
