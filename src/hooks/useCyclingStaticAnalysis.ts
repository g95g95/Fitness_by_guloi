/**
 * BiomechCoach - Cycling Static Analysis Hook
 *
 * Real-time analysis for static cycling saddle height assessment.
 * Measures knee angle at 6 o'clock position with:
 * 1. Heel on pedal (should be ~180° = full extension)
 * 2. Clipped in (should be 145-155°)
 */

import { useState, useCallback, useRef } from 'react';
import {
  PoseFrame,
  CyclingStaticStep,
  CyclingStaticMeasurement,
  CyclingStaticResult,
  CyclingStaticAnalysis,
  CyclingStaticThresholds,
  DEFAULT_CYCLING_STATIC_THRESHOLDS,
} from '../lib/poseTypes';
import {
  angleBetweenPoints,
  angleFromVertical,
  keypointToPoint,
  getKeypointByName,
} from '../lib/vectorMath';

/**
 * Real-time angle values for static analysis
 */
export interface CyclingStaticAngles {
  kneeAngle: number | null;
  hipAngle: number | null;
  ankleAngle: number | null;
  trunkAngle: number | null;
  confidence: number;
}

/**
 * Status of the static analysis
 */
export type CyclingStaticStatus =
  | 'idle'
  | 'waiting_for_position'
  | 'countdown'
  | 'measuring'
  | 'completed';

/**
 * Hook configuration
 */
export interface CyclingStaticConfig {
  /** Countdown duration in seconds before measurement */
  countdownSeconds: number;
  /** Number of frames to average for measurement */
  measurementFrames: number;
  /** Thresholds for analysis */
  thresholds: CyclingStaticThresholds;
}

const DEFAULT_CONFIG: CyclingStaticConfig = {
  countdownSeconds: 5,
  measurementFrames: 30, // ~1 second at 30fps
  thresholds: DEFAULT_CYCLING_STATIC_THRESHOLDS,
};

/**
 * Hook return type
 */
export interface UseCyclingStaticAnalysisReturn {
  /** Process a new pose frame */
  processFrame: (frame: PoseFrame) => void;
  /** Current real-time angles */
  currentAngles: CyclingStaticAngles;
  /** Current analysis status */
  status: CyclingStaticStatus;
  /** Is the user in ready position (seated on bike, knee angle > threshold) */
  isInReadyPosition: boolean;
  /** Countdown seconds remaining */
  countdownRemaining: number;
  /** Start measurement for a step */
  startMeasurement: (step: CyclingStaticStep) => void;
  /** Cancel current measurement */
  cancelMeasurement: () => void;
  /** Recorded measurements */
  measurements: {
    heelOnPedal: CyclingStaticMeasurement | null;
    clippedIn: CyclingStaticMeasurement | null;
  };
  /** Final result (available after both measurements) */
  result: CyclingStaticResult | null;
  /** Reset all analysis data */
  reset: () => void;
  /** Set custom countdown duration */
  setCountdownDuration: (seconds: number) => void;
  /** Current countdown duration setting */
  countdownDuration: number;
}

/**
 * Generate analysis from measurements
 */
function generateAnalysis(
  heelMeasurement: CyclingStaticMeasurement | null,
  clippedMeasurement: CyclingStaticMeasurement | null,
  thresholds: CyclingStaticThresholds
): CyclingStaticAnalysis {
  const heelKnee = heelMeasurement?.kneeAngle ?? null;
  const clippedKnee = clippedMeasurement?.kneeAngle ?? null;
  const angleDiff = heelKnee !== null && clippedKnee !== null
    ? heelKnee - clippedKnee
    : null;

  // Saddle assessment
  let saddleStatus: 'optimal' | 'too_low' | 'too_high' | 'unknown' = 'unknown';
  let saddleAssessmentText = '';
  const saddleRecommendations: string[] = [];

  if (heelKnee !== null && clippedKnee !== null) {
    // Check heel-on-pedal measurement (should be nearly straight ~170-180°)
    const heelOk = heelKnee >= thresholds.heelKneeAngleIdealMin;

    // Check clipped-in measurement (should be 145-155°)
    const clippedTooLow = clippedKnee < thresholds.clippedKneeAngleIdealMin;
    const clippedTooHigh = clippedKnee > thresholds.clippedKneeAngleIdealMax;
    const clippedOk = !clippedTooLow && !clippedTooHigh;

    if (heelOk && clippedOk) {
      saddleStatus = 'optimal';
      saddleAssessmentText = `Eccellente! Con il tallone sul pedale la gamba e quasi completamente estesa (${Math.round(heelKnee)}°) e con il pedale agganciato l'angolo del ginocchio (${Math.round(clippedKnee)}°) e nell'intervallo ideale (${thresholds.clippedKneeAngleIdealMin}°-${thresholds.clippedKneeAngleIdealMax}°).`;
    } else if (clippedTooLow) {
      saddleStatus = 'too_low';
      saddleAssessmentText = `Sella troppo bassa. L'angolo del ginocchio con il pedale agganciato (${Math.round(clippedKnee)}°) e inferiore al minimo consigliato di ${thresholds.clippedKneeAngleIdealMin}°. Questo puo aumentare lo stress sul ginocchio.`;
      saddleRecommendations.push('Alza la sella di 5-10mm alla volta');
      saddleRecommendations.push('Dopo ogni regolazione, rifai il test per verificare');
      saddleRecommendations.push('Un angolo troppo chiuso aumenta lo stress sulle ginocchia');
    } else if (clippedTooHigh) {
      saddleStatus = 'too_high';
      saddleAssessmentText = `Sella troppo alta. L'angolo del ginocchio con il pedale agganciato (${Math.round(clippedKnee)}°) e superiore al massimo consigliato di ${thresholds.clippedKneeAngleIdealMax}°. Questo puo causare oscillazione del bacino e problemi alla parte posteriore del ginocchio.`;
      saddleRecommendations.push('Abbassa la sella di 5-10mm alla volta');
      saddleRecommendations.push('Una sella troppo alta causa oscillazione del bacino');
      saddleRecommendations.push('Puo anche causare dolore dietro al ginocchio');
    } else if (!heelOk) {
      saddleStatus = 'too_low';
      saddleAssessmentText = `Con il tallone sul pedale, la gamba non raggiunge l'estensione completa (${Math.round(heelKnee)}°). Questo indica che la sella potrebbe essere troppo bassa.`;
      saddleRecommendations.push('Alza la sella finche la gamba non e quasi dritta con il tallone sul pedale');
    }
  } else if (heelKnee !== null) {
    if (heelKnee >= thresholds.heelKneeAngleIdealMin) {
      saddleAssessmentText = `Con il tallone sul pedale: buona estensione (${Math.round(heelKnee)}°). Completa la misurazione con il pedale agganciato.`;
    } else {
      saddleAssessmentText = `Con il tallone sul pedale: estensione insufficiente (${Math.round(heelKnee)}°). La sella potrebbe essere troppo bassa.`;
    }
  } else if (clippedKnee !== null) {
    if (clippedKnee >= thresholds.clippedKneeAngleIdealMin && clippedKnee <= thresholds.clippedKneeAngleIdealMax) {
      saddleAssessmentText = `Con il pedale agganciato: angolo buono (${Math.round(clippedKnee)}°). Completa la misurazione con il tallone.`;
    } else {
      saddleAssessmentText = `Con il pedale agganciato: angolo ${clippedKnee < thresholds.clippedKneeAngleIdealMin ? 'troppo chiuso' : 'troppo aperto'} (${Math.round(clippedKnee)}°).`;
    }
  } else {
    saddleAssessmentText = 'Misurazioni non disponibili. Completa entrambi i test.';
  }

  // Leg extension analysis
  let heelExtension = 'Non misurato';
  let clippedExtension = 'Non misurato';
  let extensionAssessment = '';

  if (heelKnee !== null) {
    if (heelKnee >= 175) {
      heelExtension = `Estensione completa (${Math.round(heelKnee)}°)`;
    } else if (heelKnee >= thresholds.heelKneeAngleIdealMin) {
      heelExtension = `Buona estensione (${Math.round(heelKnee)}°)`;
    } else {
      heelExtension = `Estensione limitata (${Math.round(heelKnee)}°)`;
    }
  }

  if (clippedKnee !== null) {
    if (clippedKnee >= thresholds.clippedKneeAngleIdealMin && clippedKnee <= thresholds.clippedKneeAngleIdealMax) {
      clippedExtension = `Flessione ottimale (${Math.round(clippedKnee)}°)`;
    } else if (clippedKnee < thresholds.clippedKneeAngleIdealMin) {
      clippedExtension = `Troppo flesso (${Math.round(clippedKnee)}°)`;
    } else {
      clippedExtension = `Troppo esteso (${Math.round(clippedKnee)}°)`;
    }
  }

  if (angleDiff !== null) {
    extensionAssessment = `Differenza tra le due posizioni: ${Math.round(angleDiff)}°. `;
    if (angleDiff >= 20 && angleDiff <= 35) {
      extensionAssessment += 'La differenza e nella norma.';
    } else if (angleDiff < 20) {
      extensionAssessment += 'Differenza inferiore alla norma - verifica la posizione del piede.';
    } else {
      extensionAssessment += 'Differenza elevata - potresti avere bisogno di alzare il tallone durante la pedalata.';
    }
  }

  // Position assessment
  const hipAngle = clippedMeasurement?.hipAngle ?? heelMeasurement?.hipAngle ?? null;
  const trunkAngle = clippedMeasurement?.trunkAngle ?? heelMeasurement?.trunkAngle ?? null;
  let positionAssessment = '';
  const positionRecommendations: string[] = [];

  if (hipAngle !== null) {
    if (hipAngle < 80) {
      positionAssessment = `Posizione molto aggressiva (angolo anca ${Math.round(hipAngle)}°). `;
      positionRecommendations.push('Questa posizione richiede buona flessibilita');
    } else if (hipAngle > 120) {
      positionAssessment = `Posizione molto eretta (angolo anca ${Math.round(hipAngle)}°). `;
    } else {
      positionAssessment = `Angolo dell anca nella norma (${Math.round(hipAngle)}°). `;
    }
  }

  if (trunkAngle !== null) {
    if (trunkAngle < 30) {
      positionAssessment += `Tronco molto inclinato in avanti (${Math.round(trunkAngle)}° dalla verticale).`;
    } else if (trunkAngle > 60) {
      positionAssessment += `Posizione del tronco eretta (${Math.round(trunkAngle)}° dalla verticale).`;
    } else {
      positionAssessment += `Inclinazione del tronco bilanciata (${Math.round(trunkAngle)}° dalla verticale).`;
    }
  }

  // Overall recommendations
  const overallRecommendations: string[] = [];
  if (saddleRecommendations.length > 0) {
    overallRecommendations.push(...saddleRecommendations.slice(0, 2));
  }
  if (positionRecommendations.length > 0) {
    overallRecommendations.push(...positionRecommendations);
  }
  if (saddleStatus === 'optimal') {
    overallRecommendations.push('L\'altezza della sella e ottimale - mantieni questa posizione');
  }

  // Calculate bike fit score
  let bikeFitScore = 50; // Base score

  if (saddleStatus === 'optimal') {
    bikeFitScore += 40;
  } else if (saddleStatus !== 'unknown') {
    bikeFitScore += 15;
  }

  if (heelKnee !== null && heelKnee >= thresholds.heelKneeAngleIdealMin) {
    bikeFitScore += 10;
  }

  bikeFitScore = Math.min(100, Math.max(0, bikeFitScore));

  return {
    saddleAssessment: {
      status: saddleStatus,
      heelKneeAngle: heelKnee,
      clippedKneeAngle: clippedKnee,
      angleDifference: angleDiff,
      assessment: saddleAssessmentText,
      recommendations: saddleRecommendations,
    },
    legExtensionAnalysis: {
      heelExtension,
      clippedExtension,
      assessment: extensionAssessment,
    },
    positionAssessment: {
      hipAngle,
      trunkAngle,
      assessment: positionAssessment || 'Posizione non valutata',
      recommendations: positionRecommendations,
    },
    overallRecommendations,
    bikeFitScore,
  };
}

/**
 * Custom hook for static cycling saddle height analysis
 */
export function useCyclingStaticAnalysis(
  config: Partial<CyclingStaticConfig> = {}
): UseCyclingStaticAnalysisReturn {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  // State
  const [currentAngles, setCurrentAngles] = useState<CyclingStaticAngles>({
    kneeAngle: null,
    hipAngle: null,
    ankleAngle: null,
    trunkAngle: null,
    confidence: 0,
  });

  const [status, setStatus] = useState<CyclingStaticStatus>('idle');
  const [isInReadyPosition, setIsInReadyPosition] = useState(false);
  const [countdownRemaining, setCountdownRemaining] = useState(0);
  const [countdownDuration, setCountdownDuration] = useState(finalConfig.countdownSeconds);

  const [measurements, setMeasurements] = useState<{
    heelOnPedal: CyclingStaticMeasurement | null;
    clippedIn: CyclingStaticMeasurement | null;
  }>({
    heelOnPedal: null,
    clippedIn: null,
  });

  const [result, setResult] = useState<CyclingStaticResult | null>(null);

  // Refs
  const currentStepRef = useRef<CyclingStaticStep | null>(null);
  const measurementBufferRef = useRef<CyclingStaticAngles[]>([]);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const readyPositionCountRef = useRef<number>(0);

  /**
   * Compute angles from a pose frame
   */
  const computeAngles = useCallback((frame: PoseFrame): CyclingStaticAngles => {
    const kp = frame.keypoints;

    // Get keypoints with confidence
    const leftShoulder = getKeypointByName(kp, 'left_shoulder');
    const rightShoulder = getKeypointByName(kp, 'right_shoulder');
    const leftHip = getKeypointByName(kp, 'left_hip');
    const rightHip = getKeypointByName(kp, 'right_hip');
    const leftKnee = getKeypointByName(kp, 'left_knee');
    const rightKnee = getKeypointByName(kp, 'right_knee');
    const leftAnkle = getKeypointByName(kp, 'left_ankle');
    const rightAnkle = getKeypointByName(kp, 'right_ankle');
    const leftFoot = getKeypointByName(kp, 'left_foot_index');
    const rightFoot = getKeypointByName(kp, 'right_foot_index');

    // Convert to points
    const leftShoulderPt = keypointToPoint(leftShoulder);
    const rightShoulderPt = keypointToPoint(rightShoulder);
    const leftHipPt = keypointToPoint(leftHip);
    const rightHipPt = keypointToPoint(rightHip);
    const leftKneePt = keypointToPoint(leftKnee);
    const rightKneePt = keypointToPoint(rightKnee);
    const leftAnklePt = keypointToPoint(leftAnkle);
    const rightAnklePt = keypointToPoint(rightAnkle);
    const leftFootPt = keypointToPoint(leftFoot);
    const rightFootPt = keypointToPoint(rightFoot);

    // For side view, use whichever leg is more visible (higher confidence)
    // The user should be positioned with one side to the camera
    const leftLegConfidence = Math.min(
      leftHip?.score ?? 0,
      leftKnee?.score ?? 0,
      leftAnkle?.score ?? 0
    );
    const rightLegConfidence = Math.min(
      rightHip?.score ?? 0,
      rightKnee?.score ?? 0,
      rightAnkle?.score ?? 0
    );

    let kneeAngle: number | null = null;
    let hipAngle: number | null = null;
    let ankleAngle: number | null = null;
    let overallConfidence = 0;

    if (leftLegConfidence > rightLegConfidence && leftLegConfidence >= finalConfig.thresholds.confidenceThreshold) {
      // Use left leg
      kneeAngle = angleBetweenPoints(leftHipPt, leftKneePt, leftAnklePt);
      hipAngle = angleBetweenPoints(leftShoulderPt, leftHipPt, leftKneePt);
      ankleAngle = angleBetweenPoints(leftKneePt, leftAnklePt, leftFootPt);
      overallConfidence = leftLegConfidence;
    } else if (rightLegConfidence >= finalConfig.thresholds.confidenceThreshold) {
      // Use right leg
      kneeAngle = angleBetweenPoints(rightHipPt, rightKneePt, rightAnklePt);
      hipAngle = angleBetweenPoints(rightShoulderPt, rightHipPt, rightKneePt);
      ankleAngle = angleBetweenPoints(rightKneePt, rightAnklePt, rightFootPt);
      overallConfidence = rightLegConfidence;
    }

    // Compute trunk angle
    const shoulderMid =
      leftShoulderPt && rightShoulderPt
        ? { x: (leftShoulderPt.x + rightShoulderPt.x) / 2, y: (leftShoulderPt.y + rightShoulderPt.y) / 2 }
        : leftShoulderPt || rightShoulderPt;
    const hipMid =
      leftHipPt && rightHipPt
        ? { x: (leftHipPt.x + rightHipPt.x) / 2, y: (leftHipPt.y + rightHipPt.y) / 2 }
        : leftHipPt || rightHipPt;
    const trunkAngle = angleFromVertical(shoulderMid, hipMid);

    return {
      kneeAngle,
      hipAngle,
      ankleAngle,
      trunkAngle,
      confidence: overallConfidence,
    };
  }, [finalConfig.thresholds.confidenceThreshold]);

  /**
   * Check if user is in ready position (seated on bike at 6 o'clock)
   */
  const checkReadyPosition = useCallback((angles: CyclingStaticAngles): boolean => {
    if (angles.kneeAngle === null || angles.confidence < finalConfig.thresholds.confidenceThreshold) {
      return false;
    }

    // User is in ready position when knee angle exceeds threshold (leg more extended = at 6 o'clock)
    // This indicates the leg is down in the pedaling position
    return angles.kneeAngle > finalConfig.thresholds.readyPositionKneeAngle;
  }, [finalConfig.thresholds]);

  /**
   * Complete measurement with averaged values
   */
  const completeMeasurement = useCallback(() => {
    const buffer = measurementBufferRef.current;
    if (buffer.length === 0 || !currentStepRef.current) return;

    // Average all measurements
    const validMeasurements = buffer.filter(m => m.kneeAngle !== null);
    if (validMeasurements.length === 0) return;

    const avgKnee = validMeasurements.reduce((sum, m) => sum + (m.kneeAngle || 0), 0) / validMeasurements.length;
    const avgHip = validMeasurements
      .filter(m => m.hipAngle !== null)
      .reduce((sum, m, _, arr) => sum + (m.hipAngle || 0) / arr.length, 0) || null;
    const avgAnkle = validMeasurements
      .filter(m => m.ankleAngle !== null)
      .reduce((sum, m, _, arr) => sum + (m.ankleAngle || 0) / arr.length, 0) || null;
    const avgTrunk = validMeasurements
      .filter(m => m.trunkAngle !== null)
      .reduce((sum, m, _, arr) => sum + (m.trunkAngle || 0) / arr.length, 0) || null;
    const avgConfidence = validMeasurements.reduce((sum, m) => sum + m.confidence, 0) / validMeasurements.length;

    const measurement: CyclingStaticMeasurement = {
      step: currentStepRef.current,
      kneeAngle: avgKnee,
      hipAngle: avgHip,
      ankleAngle: avgAnkle,
      trunkAngle: avgTrunk,
      timestamp: Date.now(),
      confidence: avgConfidence,
    };

    // Update measurements
    setMeasurements(prev => {
      const updated = currentStepRef.current === 'heel_on_pedal'
        ? { ...prev, heelOnPedal: measurement }
        : { ...prev, clippedIn: measurement };

      // Generate analysis and result
      const analysis = generateAnalysis(
        updated.heelOnPedal,
        updated.clippedIn,
        finalConfig.thresholds
      );

      // Create result if we have at least one measurement
      const newResult: CyclingStaticResult = {
        heelOnPedal: updated.heelOnPedal,
        clippedIn: updated.clippedIn,
        analysis,
        completedAt: Date.now(),
      };
      setResult(newResult);

      return updated;
    });

    // Clear state
    currentStepRef.current = null;
    measurementBufferRef.current = [];
    setStatus('completed');
  }, [finalConfig.thresholds]);

  /**
   * Process a new pose frame
   */
  const processFrame = useCallback((frame: PoseFrame) => {
    if (!frame.isValid) return;

    // Compute current angles
    const angles = computeAngles(frame);
    setCurrentAngles(angles);

    // Check ready position
    const ready = checkReadyPosition(angles);

    // Need consistent ready position (multiple consecutive frames)
    if (ready) {
      readyPositionCountRef.current++;
    } else {
      readyPositionCountRef.current = 0;
    }

    setIsInReadyPosition(readyPositionCountRef.current >= 5);

    // If measuring, add to buffer
    if (status === 'measuring' && currentStepRef.current) {
      measurementBufferRef.current.push(angles);

      // Check if we have enough measurements
      if (measurementBufferRef.current.length >= finalConfig.measurementFrames) {
        completeMeasurement();
      }
    }
  }, [computeAngles, checkReadyPosition, status, finalConfig.measurementFrames, completeMeasurement]);

  /**
   * Start measurement for a step
   */
  const startMeasurement = useCallback((step: CyclingStaticStep) => {
    currentStepRef.current = step;
    measurementBufferRef.current = [];
    setCountdownRemaining(countdownDuration);
    setStatus('countdown');

    // Start countdown
    countdownIntervalRef.current = setInterval(() => {
      setCountdownRemaining(prev => {
        if (prev <= 1) {
          // Countdown finished, start measuring
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }
          setStatus('measuring');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [countdownDuration]);

  /**
   * Cancel current measurement
   */
  const cancelMeasurement = useCallback(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    currentStepRef.current = null;
    measurementBufferRef.current = [];
    setCountdownRemaining(0);
    setStatus('idle');
  }, []);

  /**
   * Reset all analysis data
   */
  const reset = useCallback(() => {
    cancelMeasurement();
    setCurrentAngles({
      kneeAngle: null,
      hipAngle: null,
      ankleAngle: null,
      trunkAngle: null,
      confidence: 0,
    });
    setIsInReadyPosition(false);
    setMeasurements({
      heelOnPedal: null,
      clippedIn: null,
    });
    setResult(null);
    readyPositionCountRef.current = 0;
  }, [cancelMeasurement]);

  /**
   * Set custom countdown duration
   */
  const setCountdownDurationFn = useCallback((seconds: number) => {
    setCountdownDuration(Math.max(1, Math.min(30, seconds)));
  }, []);

  return {
    processFrame,
    currentAngles,
    status,
    isInReadyPosition,
    countdownRemaining,
    startMeasurement,
    cancelMeasurement,
    measurements,
    result,
    reset,
    setCountdownDuration: setCountdownDurationFn,
    countdownDuration,
  };
}

export default useCyclingStaticAnalysis;
