/**
 * BiomechCoach - Cycling Capture View Component
 *
 * Complete cycling analysis with 4 sequential tests:
 * 1. Right Side View - lateral angles from right
 * 2. Left Side View - lateral angles from left
 * 3. Front View - frontal plane from front
 * 4. Back View - frontal plane from back
 *
 * Each test requires user approval to start and minimum 30 seconds recording.
 * Results displayed in 4 tabs with detailed analysis and download options.
 */

import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CyclingTestView,
  CyclingTestResult,
  CyclingSession,
  CyclingSessionSummary,
  CyclingDetailedAnalysis,
  CyclingPatternFlags,
  AngleStats,
  DEFAULT_CYCLING_THRESHOLDS,
} from '../lib/poseTypes';
import useCameraStream from '../hooks/useCameraStream';
import usePoseEstimation from '../hooks/usePoseEstimation';
import useCyclingAnalysis from '../hooks/useCyclingAnalysis';
import useFrontalAnalysis from '../hooks/useFrontalAnalysis';
import CameraFeed from './CameraFeed';
import PoseOverlayCanvas from './PoseOverlayCanvas';
import CyclingResultsPanel from './CyclingResultsPanel';

// Minimum test duration in milliseconds (30 seconds)
const MIN_TEST_DURATION = 30000;

// Test configuration
const TEST_CONFIG: Record<CyclingTestView, { label: string; instruction: string; icon: string }> = {
  right_side: {
    label: 'Lato Destro',
    instruction: 'Posiziona la telecamera alla tua DESTRA. Assicurati che tutto il corpo e la bici siano visibili di profilo.',
    icon: '→',
  },
  left_side: {
    label: 'Lato Sinistro',
    instruction: 'Posiziona la telecamera alla tua SINISTRA. Assicurati che tutto il corpo e la bici siano visibili di profilo.',
    icon: '←',
  },
  front: {
    label: 'Frontale',
    instruction: 'Posiziona la telecamera DAVANTI a te. Assicurati che ginocchia, anche e caviglie siano ben visibili.',
    icon: '↓',
  },
  back: {
    label: 'Posteriore',
    instruction: 'Posiziona la telecamera DIETRO di te. Assicurati che ginocchia, anche e caviglie siano ben visibili.',
    icon: '↑',
  },
};

const TEST_ORDER: CyclingTestView[] = ['right_side', 'left_side', 'front', 'back'];

/**
 * Generate detailed analysis for a test
 */
function generateDetailedAnalysis(
  angleStats: Record<string, AngleStats>,
  patternFlags: CyclingPatternFlags,
  testType: CyclingTestView
): CyclingDetailedAnalysis {
  const isLateralView = testType === 'right_side' || testType === 'left_side';
  const isFrontalView = testType === 'front' || testType === 'back';

  // Get angle values
  const leftKnee = angleStats['left_knee_flexion']?.avg ?? null;
  const rightKnee = angleStats['right_knee_flexion']?.avg ?? null;
  const leftHip = angleStats['left_hip_angle']?.avg ?? null;
  const rightHip = angleStats['right_hip_angle']?.avg ?? null;
  const leftAnkle = angleStats['left_ankle_angle']?.avg ?? null;
  const rightAnkle = angleStats['right_ankle_angle']?.avg ?? null;
  const trunk = angleStats['trunk_angle']?.avg ?? null;

  // Calculate asymmetries
  const kneeAsymmetry = leftKnee !== null && rightKnee !== null ? Math.abs(leftKnee - rightKnee) : null;
  const hipAsymmetry = leftHip !== null && rightHip !== null ? Math.abs(leftHip - rightHip) : null;
  const ankleAsymmetry = leftAnkle !== null && rightAnkle !== null ? Math.abs(leftAnkle - rightAnkle) : null;

  // Average knee angle for saddle assessment
  const avgKnee = leftKnee !== null && rightKnee !== null
    ? (leftKnee + rightKnee) / 2
    : leftKnee ?? rightKnee;

  // Ankle analysis
  const ankleAnalysis = {
    leftAngle: leftAnkle,
    rightAngle: rightAnkle,
    assessment: '',
    recommendations: [] as string[],
  };

  if (leftAnkle !== null || rightAnkle !== null) {
    const avgAnkle = leftAnkle !== null && rightAnkle !== null
      ? (leftAnkle + rightAnkle) / 2
      : leftAnkle ?? rightAnkle ?? 0;

    if (avgAnkle < 90) {
      ankleAnalysis.assessment = 'Caviglia in dorsiflessione eccessiva. Questo potrebbe indicare una posizione del piede troppo avanzata sulla pedivella.';
      ankleAnalysis.recommendations.push('Verifica la posizione delle tacchette (se presenti)');
      ankleAnalysis.recommendations.push('Controlla che il tallone non scenda troppo durante la pedalata');
    } else if (avgAnkle > 110) {
      ankleAnalysis.assessment = 'Caviglia in plantarflessione. Stai pedalando troppo sulle punte.';
      ankleAnalysis.recommendations.push('Cerca di mantenere la caviglia più neutra');
      ankleAnalysis.recommendations.push('Verifica la posizione delle tacchette');
    } else {
      ankleAnalysis.assessment = 'Angolo della caviglia nella norma. Buona posizione del piede sul pedale.';
    }
  } else {
    ankleAnalysis.assessment = isLateralView
      ? 'Angolo caviglia non rilevato. Assicurati che i piedi siano visibili.'
      : 'Vista frontale/posteriore: focus su tracking del ginocchio.';
  }

  // Knee analysis
  const kneeAnalysis = {
    leftAngle: leftKnee,
    rightAngle: rightKnee,
    atBDC: true,
    assessment: '',
    recommendations: [] as string[],
  };

  if (isLateralView && avgKnee !== null) {
    if (avgKnee < DEFAULT_CYCLING_THRESHOLDS.kneeFlexionBdcMin) {
      kneeAnalysis.assessment = `Angolo del ginocchio al punto morto inferiore (${Math.round(avgKnee)}°) troppo chiuso. La sella potrebbe essere troppo bassa.`;
      kneeAnalysis.recommendations.push('Considera di alzare la sella di 5-10mm');
      kneeAnalysis.recommendations.push('Un angolo troppo chiuso aumenta lo stress sul ginocchio');
    } else if (avgKnee > DEFAULT_CYCLING_THRESHOLDS.kneeFlexionBdcMax) {
      kneeAnalysis.assessment = `Angolo del ginocchio al punto morto inferiore (${Math.round(avgKnee)}°) troppo esteso. La sella potrebbe essere troppo alta.`;
      kneeAnalysis.recommendations.push('Considera di abbassare la sella di 5-10mm');
      kneeAnalysis.recommendations.push('Un\'estensione eccessiva può causare problemi alla parte posteriore del ginocchio');
    } else if (avgKnee >= DEFAULT_CYCLING_THRESHOLDS.kneeFlexionBdcIdealMin &&
               avgKnee <= DEFAULT_CYCLING_THRESHOLDS.kneeFlexionBdcIdealMax) {
      kneeAnalysis.assessment = `Eccellente! Angolo del ginocchio (${Math.round(avgKnee)}°) nell'intervallo ideale (140°-150°).`;
    } else {
      kneeAnalysis.assessment = `Angolo del ginocchio (${Math.round(avgKnee)}°) accettabile ma migliorabile. Intervallo ideale: 140°-150°.`;
    }
  } else if (isFrontalView) {
    kneeAnalysis.assessment = 'Vista frontale: focus sul tracking laterale del ginocchio durante la pedalata.';
    if (patternFlags.knee_tracking_instability) {
      kneeAnalysis.recommendations.push('Rilevata instabilità nel tracking del ginocchio');
      kneeAnalysis.recommendations.push('Lavora sulla stabilità del core e dei glutei');
    }
  }

  // Hip analysis
  const hipAnalysis = {
    leftAngle: leftHip,
    rightAngle: rightHip,
    assessment: '',
    recommendations: [] as string[],
  };

  if (isLateralView && (leftHip !== null || rightHip !== null)) {
    const avgHip = leftHip !== null && rightHip !== null
      ? (leftHip + rightHip) / 2
      : leftHip ?? rightHip ?? 0;

    if (avgHip < DEFAULT_CYCLING_THRESHOLDS.hipAngleMin) {
      hipAnalysis.assessment = `Angolo dell'anca molto chiuso (${Math.round(avgHip)}°). Posizione molto aggressiva/aerodinamica.`;
      hipAnalysis.recommendations.push('Questa posizione richiede buona flessibilità');
      hipAnalysis.recommendations.push('Potrebbe limitare l\'attivazione dei glutei');
    } else if (avgHip > DEFAULT_CYCLING_THRESHOLDS.hipAngleMax) {
      hipAnalysis.assessment = `Angolo dell'anca molto aperto (${Math.round(avgHip)}°). Posizione molto eretta.`;
      hipAnalysis.recommendations.push('Posizione comoda ma meno efficiente aerodinamicamente');
    } else {
      hipAnalysis.assessment = `Angolo dell'anca (${Math.round(avgHip)}°) in un buon range per pedalata efficiente.`;
    }
  } else if (isFrontalView) {
    hipAnalysis.assessment = 'Vista frontale: valutazione della stabilità pelvica durante la pedalata.';
  }

  // Saddle analysis
  const saddleAnalysis = {
    assessment: 'unknown' as 'optimal' | 'too_low' | 'too_high' | 'unknown',
    currentKneeAngle: avgKnee,
    idealRange: { min: 140, max: 150 },
    recommendations: [] as string[],
  };

  if (isLateralView && avgKnee !== null) {
    if (avgKnee < DEFAULT_CYCLING_THRESHOLDS.kneeFlexionBdcMin) {
      saddleAnalysis.assessment = 'too_low';
      saddleAnalysis.recommendations.push('Sella troppo bassa: alza di 5-10mm alla volta');
      saddleAnalysis.recommendations.push('Dopo ogni regolazione, pedala per alcuni minuti prima di rivalutare');
    } else if (avgKnee > DEFAULT_CYCLING_THRESHOLDS.kneeFlexionBdcMax) {
      saddleAnalysis.assessment = 'too_high';
      saddleAnalysis.recommendations.push('Sella troppo alta: abbassa di 5-10mm alla volta');
      saddleAnalysis.recommendations.push('Una sella troppo alta causa oscillazione del bacino');
    } else {
      saddleAnalysis.assessment = 'optimal';
      saddleAnalysis.recommendations.push('Altezza sella ottimale per efficienza e comfort');
    }
  }

  // Asymmetry analysis
  const asymmetryAnalysis = {
    detected: (kneeAsymmetry !== null && kneeAsymmetry > 5) ||
              (hipAsymmetry !== null && hipAsymmetry > 5) ||
              (ankleAsymmetry !== null && ankleAsymmetry > 5),
    kneeAsymmetry,
    hipAsymmetry,
    ankleAsymmetry,
    assessment: '',
    recommendations: [] as string[],
  };

  if (asymmetryAnalysis.detected) {
    const asymmetries: string[] = [];
    if (kneeAsymmetry !== null && kneeAsymmetry > 5) {
      asymmetries.push(`ginocchio (${Math.round(kneeAsymmetry)}°)`);
    }
    if (hipAsymmetry !== null && hipAsymmetry > 5) {
      asymmetries.push(`anca (${Math.round(hipAsymmetry)}°)`);
    }
    if (ankleAsymmetry !== null && ankleAsymmetry > 5) {
      asymmetries.push(`caviglia (${Math.round(ankleAsymmetry)}°)`);
    }
    asymmetryAnalysis.assessment = `Asimmetria rilevata in: ${asymmetries.join(', ')}.`;
    asymmetryAnalysis.recommendations.push('Verifica eventuali differenze di lunghezza delle gambe');
    asymmetryAnalysis.recommendations.push('Controlla l\'allineamento delle tacchette');
    asymmetryAnalysis.recommendations.push('Considera una valutazione fisioterapica');
  } else {
    asymmetryAnalysis.assessment = 'Nessuna asimmetria significativa rilevata.';
  }

  // Biomechanical notes
  const biomechanicalNotes: string[] = [];

  if (trunk !== null) {
    if (trunk < 30) {
      biomechanicalNotes.push(`Posizione del tronco molto aggressiva (${Math.round(trunk)}° dalla verticale). Richiede buona forza del core e flessibilità.`);
    } else if (trunk > 60) {
      biomechanicalNotes.push(`Posizione del tronco molto eretta (${Math.round(trunk)}° dalla verticale). Comoda ma meno aerodinamica.`);
    } else {
      biomechanicalNotes.push(`Inclinazione del tronco (${Math.round(trunk)}°) bilanciata tra comfort e aerodinamica.`);
    }
  }

  if (patternFlags.excessive_trunk_lean) {
    biomechanicalNotes.push('Eccessiva inclinazione del tronco potrebbe indicare un reach troppo lungo o una sella troppo arretrata.');
  }

  if (isLateralView) {
    biomechanicalNotes.push('Vista laterale: ottimale per valutare altezza sella e angoli articolari nel piano sagittale.');
  } else {
    biomechanicalNotes.push('Vista frontale/posteriore: ottimale per valutare tracking del ginocchio e stabilità pelvica.');
  }

  return {
    ankleAnalysis,
    kneeAnalysis,
    hipAnalysis,
    saddleAnalysis,
    asymmetryAnalysis,
    biomechanicalNotes,
  };
}

/**
 * Generate session summary from all test results
 */
function generateSessionSummary(results: CyclingSession['results']): CyclingSessionSummary {
  const rightSide = results.right_side;
  const leftSide = results.left_side;
  const front = results.front;
  const back = results.back;

  // Calculate total duration
  const totalDuration =
    (rightSide?.duration || 0) +
    (leftSide?.duration || 0) +
    (front?.duration || 0) +
    (back?.duration || 0);

  // Saddle height assessment (from lateral views)
  let saddleHeightAssessment = 'Non valutabile - test laterali mancanti';
  const saddleAssessments: string[] = [];

  if (rightSide && rightSide.detailedAnalysis.saddleAnalysis.assessment !== 'unknown') {
    saddleAssessments.push(rightSide.detailedAnalysis.saddleAnalysis.assessment);
  }
  if (leftSide && leftSide.detailedAnalysis.saddleAnalysis.assessment !== 'unknown') {
    saddleAssessments.push(leftSide.detailedAnalysis.saddleAnalysis.assessment);
  }

  if (saddleAssessments.length > 0) {
    const optimalCount = saddleAssessments.filter(a => a === 'optimal').length;
    const lowCount = saddleAssessments.filter(a => a === 'too_low').length;
    const highCount = saddleAssessments.filter(a => a === 'too_high').length;

    if (optimalCount === saddleAssessments.length) {
      saddleHeightAssessment = 'Altezza sella OTTIMALE da entrambi i lati';
    } else if (lowCount > 0 && highCount > 0) {
      saddleHeightAssessment = 'Risultati contrastanti tra i due lati - possibile asimmetria fisica';
    } else if (lowCount > 0) {
      saddleHeightAssessment = 'Sella TROPPO BASSA - considera di alzarla di 5-10mm';
    } else if (highCount > 0) {
      saddleHeightAssessment = 'Sella TROPPO ALTA - considera di abbassarla di 5-10mm';
    }
  }

  // Key asymmetries
  const keyAsymmetries: string[] = [];

  // Compare side tests
  const rightKnee = rightSide?.angleStats['left_knee_flexion']?.avg ?? rightSide?.angleStats['right_knee_flexion']?.avg;
  const leftKnee = leftSide?.angleStats['left_knee_flexion']?.avg ?? leftSide?.angleStats['right_knee_flexion']?.avg;
  const rightHip = rightSide?.angleStats['left_hip_angle']?.avg ?? rightSide?.angleStats['right_hip_angle']?.avg;
  const leftHip = leftSide?.angleStats['left_hip_angle']?.avg ?? leftSide?.angleStats['right_hip_angle']?.avg;

  const kneeAngleDiff = rightKnee !== undefined && rightKnee !== null && leftKnee !== undefined && leftKnee !== null
    ? Math.round(Math.abs(rightKnee - leftKnee))
    : null;
  const hipAngleDiff = rightHip !== undefined && rightHip !== null && leftHip !== undefined && leftHip !== null
    ? Math.round(Math.abs(rightHip - leftHip))
    : null;

  if (kneeAngleDiff !== null && kneeAngleDiff > 5) {
    keyAsymmetries.push(`Differenza angolo ginocchio tra lato destro e sinistro: ${kneeAngleDiff}°`);
  }
  if (hipAngleDiff !== null && hipAngleDiff > 5) {
    keyAsymmetries.push(`Differenza angolo anca tra lato destro e sinistro: ${hipAngleDiff}°`);
  }

  // Check frontal views for knee tracking
  if (front?.patternFlags.knee_tracking_instability || back?.patternFlags.knee_tracking_instability) {
    keyAsymmetries.push('Instabilità nel tracking del ginocchio rilevata nelle viste frontali');
  }

  // Priority recommendations
  const priorityRecommendations: string[] = [];

  // Collect all unique recommendations
  const allRecs = new Set<string>();
  [rightSide, leftSide, front, back].forEach(result => {
    if (result) {
      result.detailedAnalysis.saddleAnalysis.recommendations.forEach(r => allRecs.add(r));
      result.detailedAnalysis.kneeAnalysis.recommendations.forEach(r => allRecs.add(r));
      result.detailedAnalysis.asymmetryAnalysis.recommendations.forEach(r => allRecs.add(r));
    }
  });

  priorityRecommendations.push(...Array.from(allRecs).slice(0, 5));

  // Side comparison
  const sideComparison = {
    kneeAngleDifference: kneeAngleDiff,
    hipAngleDifference: hipAngleDiff,
    ankleAngleDifference: null as number | null,
    assessment: kneeAngleDiff !== null && kneeAngleDiff > 10
      ? 'Asimmetria significativa tra lato destro e sinistro'
      : 'Buona simmetria tra i due lati',
  };

  // Frontal comparison
  const frontalComparison = {
    kneeTrackingLeft: front?.patternFlags.knee_tracking_instability ? 'Instabile' : 'Stabile',
    kneeTrackingRight: back?.patternFlags.knee_tracking_instability ? 'Instabile' : 'Stabile',
    pelvisStability: 'Da valutare',
    assessment: 'Valutazione frontale completata',
  };

  // Calculate bike fit score (0-100)
  let bikeFitScore = 70; // Base score

  // Saddle height contribution (30 points)
  if (saddleAssessments.includes('optimal')) {
    bikeFitScore += 30;
  } else if (saddleAssessments.length > 0) {
    bikeFitScore += 10;
  }

  // Symmetry contribution (20 points)
  if (keyAsymmetries.length === 0) {
    bikeFitScore += 20;
  } else if (keyAsymmetries.length === 1) {
    bikeFitScore += 10;
  }

  // Knee tracking (10 points)
  if (!front?.patternFlags.knee_tracking_instability && !back?.patternFlags.knee_tracking_instability) {
    bikeFitScore += 10;
  }

  // Cap score
  bikeFitScore = Math.min(100, Math.max(0, bikeFitScore));

  // Overall assessment
  let overallAssessment = '';
  if (bikeFitScore >= 90) {
    overallAssessment = 'Eccellente posizionamento in bici! La tua posizione è ben bilanciata e ottimizzata.';
  } else if (bikeFitScore >= 70) {
    overallAssessment = 'Buon posizionamento con margini di miglioramento. Segui le raccomandazioni per ottimizzare.';
  } else if (bikeFitScore >= 50) {
    overallAssessment = 'Posizionamento da migliorare. Alcune regolazioni potrebbero aumentare comfort ed efficienza.';
  } else {
    overallAssessment = 'Posizionamento da rivedere. Considera una sessione di bike fitting professionale.';
  }

  return {
    totalDuration,
    saddleHeightAssessment,
    keyAsymmetries,
    priorityRecommendations,
    sideComparison,
    frontalComparison,
    bikeFitScore,
    overallAssessment,
  };
}

/**
 * Format duration in mm:ss
 */
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Cycling Capture View Component
 */
const CyclingCaptureView: React.FC = () => {
  const navigate = useNavigate();

  // Camera hook
  const {
    videoRef,
    status: cameraStatus,
    error: cameraError,
    startCamera,
    stopCamera,
    dimensions,
    isStreaming,
  } = useCameraStream();

  // Pose estimation hook
  const {
    status: poseStatus,
    error: poseError,
    currentPose,
    initialize: initializePose,
    processFrame,
  } = usePoseEstimation();

  // Analysis hooks
  const cyclingAnalysis = useCyclingAnalysis();
  const frontalAnalysis = useFrontalAnalysis('cycling');

  // Session state
  const [session, setSession] = useState<CyclingSession>({
    id: `cycling-${Date.now()}`,
    startedAt: Date.now(),
    results: {},
  });

  // Current test state
  const [currentTestIndex, setCurrentTestIndex] = useState(0);
  const [testStatus, setTestStatus] = useState<'idle' | 'ready' | 'recording' | 'completed'>('idle');
  const [testStartTime, setTestStartTime] = useState<number | null>(null);
  const [testDuration, setTestDuration] = useState(0);

  // UI state
  const [showResults, setShowResults] = useState(false);
  const [activeResultTab, setActiveResultTab] = useState<CyclingTestView>('right_side');

  // Refs
  const animationFrameRef = useRef<number>(0);
  const lastProcessTimeRef = useRef<number>(0);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Constants
  const TARGET_FPS = 20;
  const FRAME_INTERVAL = 1000 / TARGET_FPS;

  // Current test type
  const currentTest = TEST_ORDER[currentTestIndex];
  const isLateralView = currentTest === 'right_side' || currentTest === 'left_side';

  /**
   * Initialize pose model
   */
  useEffect(() => {
    initializePose({ modelComplexity: 1 });
  }, [initializePose]);

  /**
   * Main processing loop
   */
  const processLoop = useCallback(() => {
    if (!isStreaming || poseStatus !== 'ready' || !videoRef.current || testStatus !== 'recording') {
      animationFrameRef.current = requestAnimationFrame(processLoop);
      return;
    }

    const now = performance.now();
    const elapsed = now - lastProcessTimeRef.current;

    if (elapsed >= FRAME_INTERVAL) {
      lastProcessTimeRef.current = now;

      processFrame(videoRef.current).then((pose) => {
        if (pose && pose.isValid) {
          const frameWidth = dimensions?.width || 640;
          const frameHeight = dimensions?.height || 480;

          if (isLateralView) {
            // Lateral view: use cycling analysis
            cyclingAnalysis.processFrame(pose);
          } else {
            // Frontal view: use frontal analysis
            frontalAnalysis.processFrame(pose, frameWidth, frameHeight);
            // Also run cycling analysis for basic angles
            cyclingAnalysis.processFrame(pose);
          }
        }
      });
    }

    animationFrameRef.current = requestAnimationFrame(processLoop);
  }, [
    isStreaming,
    poseStatus,
    videoRef,
    processFrame,
    cyclingAnalysis,
    frontalAnalysis,
    dimensions,
    FRAME_INTERVAL,
    testStatus,
    isLateralView,
  ]);

  /**
   * Start/stop processing loop
   */
  useEffect(() => {
    if (isStreaming && poseStatus === 'ready') {
      animationFrameRef.current = requestAnimationFrame(processLoop);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isStreaming, poseStatus, processLoop]);

  /**
   * Timer for test duration
   */
  useEffect(() => {
    if (testStatus === 'recording' && testStartTime) {
      timerIntervalRef.current = setInterval(() => {
        setTestDuration(Date.now() - testStartTime);
      }, 100);
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [testStatus, testStartTime]);

  /**
   * Handle back navigation
   */
  const handleBack = () => {
    stopCamera();
    cyclingAnalysis.reset();
    frontalAnalysis.reset();
    navigate('/');
  };

  /**
   * Handle start test (user approval)
   */
  const handleStartTest = () => {
    // Reset analysis for new test
    cyclingAnalysis.reset();
    frontalAnalysis.reset();

    setTestStatus('recording');
    setTestStartTime(Date.now());
    setTestDuration(0);
  };

  /**
   * Handle stop test
   */
  const handleStopTest = () => {
    if (testDuration < MIN_TEST_DURATION) {
      alert(`Il test deve durare almeno 30 secondi. Durata attuale: ${formatDuration(testDuration)}`);
      return;
    }

    // Save test result
    const result: CyclingTestResult = {
      testType: currentTest,
      duration: testDuration,
      completedAt: Date.now(),
      angleStats: { ...cyclingAnalysis.angleStats },
      suggestions: [...cyclingAnalysis.suggestions],
      muscleInsights: [...cyclingAnalysis.muscleInsights],
      patternFlags: { ...cyclingAnalysis.patternFlags },
      symmetryMetrics: { ...cyclingAnalysis.symmetryMetrics },
      cycleCount: cyclingAnalysis.cycleCount,
      detailedAnalysis: generateDetailedAnalysis(
        cyclingAnalysis.angleStats,
        cyclingAnalysis.patternFlags,
        currentTest
      ),
    };

    // Update session
    setSession(prev => ({
      ...prev,
      results: {
        ...prev.results,
        [currentTest]: result,
      },
    }));

    setTestStatus('completed');

    // Clear timer
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
  };

  /**
   * Handle next test
   */
  const handleNextTest = () => {
    if (currentTestIndex < TEST_ORDER.length - 1) {
      setCurrentTestIndex(prev => prev + 1);
      setTestStatus('idle');
      setTestDuration(0);
      setTestStartTime(null);
      cyclingAnalysis.reset();
      frontalAnalysis.reset();
    } else {
      // All tests completed - show results
      setSession(prev => ({
        ...prev,
        completedAt: Date.now(),
        summary: generateSessionSummary(prev.results),
      }));
      setShowResults(true);
    }
  };

  /**
   * Handle view results
   */
  const handleViewResults = () => {
    setSession(prev => ({
      ...prev,
      summary: generateSessionSummary(prev.results),
    }));
    setShowResults(true);
  };

  /**
   * Get current angles for overlay
   */
  const getCurrentAnglesForOverlay = (): Record<string, number | null> => {
    const angles = cyclingAnalysis.currentAngles;
    return {
      leftKneeFlexion: angles.leftKneeFlexion,
      rightKneeFlexion: angles.rightKneeFlexion,
      leftHipAngle: angles.leftHipAngle,
      rightHipAngle: angles.rightHipAngle,
      leftAnkleAngle: angles.leftAnkleAngle,
      rightAnkleAngle: angles.rightAnkleAngle,
      trunkAngle: angles.trunkAngle,
    };
  };

  /**
   * Check if minimum duration reached
   */
  const canStopTest = testDuration >= MIN_TEST_DURATION;
  const remainingTime = Math.max(0, MIN_TEST_DURATION - testDuration);

  // If showing results, render results panel
  if (showResults) {
    return (
      <CyclingResultsPanel
        session={session}
        activeTab={activeResultTab}
        onTabChange={setActiveResultTab}
        onBack={() => setShowResults(false)}
        onHome={handleBack}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBack}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              title="Torna alla home"
            >
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-lg font-semibold text-white">Analisi Ciclismo</h1>
              <p className="text-xs text-gray-400">
                {poseStatus === 'ready' ? 'Modello pose pronto' : 'Caricamento modello...'}
              </p>
            </div>
          </div>

          {/* Test progress indicator */}
          <div className="flex items-center gap-2">
            {TEST_ORDER.map((test, index) => (
              <div
                key={test}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
                  index < currentTestIndex
                    ? 'bg-green-600 text-white'
                    : index === currentTestIndex
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-400'
                }`}
              >
                <span>{TEST_CONFIG[test].icon}</span>
                <span className="hidden sm:inline">{index + 1}</span>
              </div>
            ))}
          </div>

          {/* View results button (if any test completed) */}
          {Object.keys(session.results).length > 0 && (
            <button
              onClick={handleViewResults}
              className="px-3 py-1.5 text-sm text-white bg-purple-600 hover:bg-purple-500 rounded-lg transition-colors"
            >
              Vedi Risultati
            </button>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Video feed with overlay */}
            <div className="lg:col-span-2">
              <div className="card overflow-hidden">
                <CameraFeed
                  ref={videoRef as React.RefObject<HTMLVideoElement>}
                  status={cameraStatus}
                  error={cameraError || poseError}
                  onStart={startCamera}
                  onStop={stopCamera}
                  dimensions={dimensions}
                  showFramingGuide={testStatus !== 'recording'}
                  mode="cycling"
                >
                  {/* Pose overlay */}
                  {dimensions && currentPose && (
                    <PoseOverlayCanvas
                      pose={currentPose}
                      width={dimensions.width}
                      height={dimensions.height}
                      mirrored={true}
                      showAngles={testStatus === 'recording'}
                      angles={getCurrentAnglesForOverlay()}
                      mode="cycling"
                    />
                  )}
                </CameraFeed>
              </div>

              {/* Timer and controls */}
              <div className="mt-4 p-4 bg-gray-800 rounded-lg">
                {/* Test info */}
                <div className="mb-4">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <span className="text-2xl">{TEST_CONFIG[currentTest].icon}</span>
                    Test {currentTestIndex + 1}/4: {TEST_CONFIG[currentTest].label}
                  </h2>
                  <p className="text-gray-400 mt-1">{TEST_CONFIG[currentTest].instruction}</p>
                </div>

                {/* Timer */}
                {testStatus === 'recording' && (
                  <div className="mb-4 p-4 bg-gray-900 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-gray-400">Durata:</span>
                        <span className="text-3xl font-mono font-bold text-white ml-2">
                          {formatDuration(testDuration)}
                        </span>
                      </div>
                      <div>
                        {!canStopTest ? (
                          <span className="text-yellow-400">
                            Minimo rimanente: {formatDuration(remainingTime)}
                          </span>
                        ) : (
                          <span className="text-green-400 flex items-center gap-1">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            Puoi fermare il test
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className="mt-2 h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${canStopTest ? 'bg-green-500' : 'bg-yellow-500'}`}
                        style={{ width: `${Math.min(100, (testDuration / MIN_TEST_DURATION) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Control buttons */}
                <div className="flex gap-3">
                  {testStatus === 'idle' && (
                    <button
                      onClick={() => setTestStatus('ready')}
                      disabled={!isStreaming || poseStatus !== 'ready'}
                      className="flex-1 py-3 px-6 text-lg font-semibold text-white bg-blue-600
                               hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed
                               rounded-lg transition-colors"
                    >
                      Prepara Test
                    </button>
                  )}

                  {testStatus === 'ready' && (
                    <>
                      <button
                        onClick={handleStartTest}
                        className="flex-1 py-3 px-6 text-lg font-semibold text-white bg-green-600
                                 hover:bg-green-500 rounded-lg transition-colors"
                      >
                        Inizia Registrazione
                      </button>
                      <button
                        onClick={() => setTestStatus('idle')}
                        className="py-3 px-6 text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                      >
                        Annulla
                      </button>
                    </>
                  )}

                  {testStatus === 'recording' && (
                    <button
                      onClick={handleStopTest}
                      disabled={!canStopTest}
                      className={`flex-1 py-3 px-6 text-lg font-semibold text-white rounded-lg transition-colors ${
                        canStopTest
                          ? 'bg-red-600 hover:bg-red-500'
                          : 'bg-gray-600 cursor-not-allowed'
                      }`}
                    >
                      {canStopTest ? 'Ferma Test' : `Attendi ${formatDuration(remainingTime)}`}
                    </button>
                  )}

                  {testStatus === 'completed' && (
                    <button
                      onClick={handleNextTest}
                      className="flex-1 py-3 px-6 text-lg font-semibold text-white bg-green-600
                               hover:bg-green-500 rounded-lg transition-colors"
                    >
                      {currentTestIndex < TEST_ORDER.length - 1 ? 'Prossimo Test' : 'Vedi Risultati Completi'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Side panel - real-time angles */}
            <div className="space-y-4">
              {/* Current test status */}
              <div className="card p-4">
                <h3 className="text-sm font-medium text-gray-300 mb-3">Stato Test</h3>
                <div className="space-y-2">
                  {TEST_ORDER.map((test, index) => {
                    const result = session.results[test];
                    const isCurrent = index === currentTestIndex;
                    const isCompleted = !!result;

                    return (
                      <div
                        key={test}
                        className={`flex items-center justify-between p-2 rounded ${
                          isCurrent ? 'bg-blue-600/20 border border-blue-500' : 'bg-gray-700/50'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span>{TEST_CONFIG[test].icon}</span>
                          <span className={isCurrent ? 'text-white' : 'text-gray-400'}>
                            {TEST_CONFIG[test].label}
                          </span>
                        </span>
                        {isCompleted ? (
                          <span className="text-green-400 text-sm">
                            {formatDuration(result.duration)}
                          </span>
                        ) : isCurrent && testStatus === 'recording' ? (
                          <span className="text-blue-400 text-sm animate-pulse">
                            Registrando...
                          </span>
                        ) : (
                          <span className="text-gray-500 text-sm">In attesa</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Real-time angles (only during recording) */}
              {testStatus === 'recording' && (
                <div className="card p-4">
                  <h3 className="text-sm font-medium text-gray-300 mb-3">Angoli in Tempo Reale</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Ginocchio SX:</span>
                      <span className="text-white font-mono">
                        {cyclingAnalysis.currentAngles.leftKneeFlexion?.toFixed(0) ?? '--'}°
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Ginocchio DX:</span>
                      <span className="text-white font-mono">
                        {cyclingAnalysis.currentAngles.rightKneeFlexion?.toFixed(0) ?? '--'}°
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Anca SX:</span>
                      <span className="text-white font-mono">
                        {cyclingAnalysis.currentAngles.leftHipAngle?.toFixed(0) ?? '--'}°
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Anca DX:</span>
                      <span className="text-white font-mono">
                        {cyclingAnalysis.currentAngles.rightHipAngle?.toFixed(0) ?? '--'}°
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Caviglia SX:</span>
                      <span className="text-white font-mono">
                        {cyclingAnalysis.currentAngles.leftAnkleAngle?.toFixed(0) ?? '--'}°
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Caviglia DX:</span>
                      <span className="text-white font-mono">
                        {cyclingAnalysis.currentAngles.rightAnkleAngle?.toFixed(0) ?? '--'}°
                      </span>
                    </div>
                    <div className="border-t border-gray-700 pt-2 mt-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Tronco:</span>
                        <span className="text-white font-mono">
                          {cyclingAnalysis.currentAngles.trunkAngle?.toFixed(0) ?? '--'}°
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Cicli pedale:</span>
                        <span className="text-white font-mono">
                          {cyclingAnalysis.cycleCount}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Reference info */}
              <div className="card p-4">
                <h3 className="text-sm font-medium text-gray-300 mb-2">Riferimenti</h3>
                <div className="text-xs text-gray-500 space-y-1">
                  <p>Angolo ginocchio ideale al BDC: 140°-150°</p>
                  <p>Angolo anca ottimale: 80°-120°</p>
                  <p>Durata minima test: 30 secondi</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 border-t border-gray-700 px-4 py-2 text-center text-xs text-gray-500">
        BiomechCoach - {TEST_CONFIG[currentTest].instruction}
      </footer>
    </div>
  );
};

export default CyclingCaptureView;
