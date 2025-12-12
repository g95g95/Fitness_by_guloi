/**
 * BiomechCoach - Static Capture View Component
 *
 * Main view for static assessment mode.
 * Features:
 * - Exercise list on the left
 * - Camera feed with pose overlay in the center
 * - Assessment results and recommendations on the right
 * - Configurable assessment duration and report mode
 */

import React, { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { StaticExercise, PainLocation } from '../lib/poseTypes';
import { getExerciseInstructions } from '../lib/staticExercises';
import { AssessmentConfig, AssessmentReportMode, AssessmentPainEntry, downloadSessionAsJson, downloadSessionAsPdf } from '../lib/assessmentTypes';
import { validateStartingPosition, StartingPositionValidation } from '../lib/exerciseStandards';
import useCameraStream from '../hooks/useCameraStream';
import usePoseEstimation from '../hooks/usePoseEstimation';
import useStaticAnalysis from '../hooks/useStaticAnalysis';
import useFrontalAnalysis from '../hooks/useFrontalAnalysis';
import usePainLogging from '../hooks/usePainLogging';
import useAssessment from '../hooks/useAssessment';
import CameraFeed from './CameraFeed';
import PoseOverlayCanvas from './PoseOverlayCanvas';
import ExerciseList from './ExerciseList';
import RecordingTimer, { RecordingProgressBar } from './RecordingTimer';
import SummaryPanel from './SummaryPanel';
import PatternBadges, { PatternSummary } from './PatternBadges';
import PainInputModal from './PainInputModal';
import AssessmentSummaryPanel from './AssessmentSummaryPanel';
import AssessmentConfigModal from './AssessmentConfigModal';
import PositionValidationOverlay from './PositionValidationOverlay';

/** Assessment mode type */
type AssessmentMode = 'static' | 'live-time';

/**
 * Static Capture View Component
 */
const StaticCaptureView: React.FC = () => {
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
    fps,
  } = usePoseEstimation();

  // Static analysis hook
  const staticAnalysis = useStaticAnalysis();

  // Frontal analysis hook (for front view exercises)
  const frontalAnalysis = useFrontalAnalysis('static');

  // Pain logging hook
  const painLogging = usePainLogging();

  // Assessment hook
  const assessment = useAssessment();

  // State
  const [completedExercises, setCompletedExercises] = useState<Set<string>>(new Set());
  const [showPainModal, setShowPainModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCountdown, setShowCountdown] = useState(false);
  const [countdownValue, setCountdownValue] = useState(3);
  const [pendingPainExercise, setPendingPainExercise] = useState<StaticExercise | null>(null);

  // New states for enhanced functionality
  const [assessmentMode, setAssessmentMode] = useState<AssessmentMode>('static');
  const [isWaitingForPosition, setIsWaitingForPosition] = useState(false);
  const [liveTimeMaxDuration, setLiveTimeMaxDuration] = useState(60); // seconds
  const [showLiveTimeSettings, setShowLiveTimeSettings] = useState(false);
  const [pendingConfig, setPendingConfig] = useState<AssessmentConfig | null>(null);

  const animationFrameRef = useRef<number>(0);
  const lastProcessTimeRef = useRef<number>(0);

  // Target FPS for processing
  const TARGET_FPS = 20;
  const FRAME_INTERVAL = 1000 / TARGET_FPS;

  /**
   * Initialize pose model when component mounts
   */
  useEffect(() => {
    initializePose({ modelComplexity: 1 });
    // Start assessment session
    assessment.startSession('full');
  }, [initializePose]);

  /**
   * Main processing loop
   */
  const processLoop = useCallback(() => {
    if (!isStreaming || poseStatus !== 'ready' || !videoRef.current) {
      animationFrameRef.current = requestAnimationFrame(processLoop);
      return;
    }

    const now = performance.now();
    const elapsed = now - lastProcessTimeRef.current;

    if (elapsed >= FRAME_INTERVAL) {
      lastProcessTimeRef.current = now;

      processFrame(videoRef.current).then((pose) => {
        if (pose && pose.isValid) {
          setIsProcessing(true);

          const frameWidth = dimensions?.width || 640;
          const frameHeight = dimensions?.height || 480;

          // Process frame through static analysis
          staticAnalysis.processFrame(pose, frameWidth, frameHeight);

          // Also process through frontal analysis if exercise needs it
          const currentExercise = staticAnalysis.currentExercise;
          if (currentExercise && (currentExercise.view === 'front' || currentExercise.view === 'either')) {
            frontalAnalysis.processFrame(pose, frameWidth, frameHeight);

            // Update frontal metrics in static analysis
            if (frontalAnalysis.aggregatedMetrics) {
              staticAnalysis.setFrontalMetrics(frontalAnalysis.aggregatedMetrics);
            }
          }
        }
      });
    }

    animationFrameRef.current = requestAnimationFrame(processLoop);
  }, [isStreaming, poseStatus, videoRef, processFrame, dimensions, staticAnalysis, frontalAnalysis, FRAME_INTERVAL]);

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
   * Calculate position validation for current exercise
   */
  const positionValidation = useMemo((): StartingPositionValidation => {
    const currentExercise = staticAnalysis.currentExercise;
    if (!currentExercise) {
      return { isValid: false, angleResults: [] };
    }

    const measuredAngles: Record<string, number | null> = {
      leftKnee: staticAnalysis.currentAngles.leftKnee,
      rightKnee: staticAnalysis.currentAngles.rightKnee,
      leftHipAngle: staticAnalysis.currentAngles.leftHipAngle,
      rightHipAngle: staticAnalysis.currentAngles.rightHipAngle,
      leftAnkle: staticAnalysis.currentAngles.leftAnkle,
      rightAnkle: staticAnalysis.currentAngles.rightAnkle,
      trunkLean: staticAnalysis.currentAngles.trunkLean,
    };

    return validateStartingPosition(currentExercise.id, measuredAngles);
  }, [staticAnalysis.currentExercise, staticAnalysis.currentAngles]);

  /**
   * Handle back navigation
   */
  const handleBack = () => {
    stopCamera();
    staticAnalysis.reset();
    navigate('/');
  };

  /**
   * Handle exercise selection
   */
  const handleSelectExercise = (exercise: StaticExercise) => {
    staticAnalysis.setExercise(exercise);
    frontalAnalysis.reset();
    setIsProcessing(false);
  };

  /**
   * Handle start assessment button click
   */
  const handleStartAssessmentClick = () => {
    if (!staticAnalysis.currentExercise) return;
    setShowConfigModal(true);
  };

  /**
   * Handle assessment config and start recording
   * Now waits for correct position before starting countdown
   */
  const handleStartAssessment = (config: AssessmentConfig, reportMode: AssessmentReportMode) => {
    if (!staticAnalysis.currentExercise) return;

    assessment.updateConfig(config);
    assessment.setReportMode(reportMode);

    // Store config and start waiting for position
    setPendingConfig(config);
    setIsWaitingForPosition(true);
    setPositionValidSince(null);
  };

  /**
   * Effect to handle position validation and countdown
   * When position is valid, starts countdown. Countdown does NOT subtract from recording time.
   */
  useEffect(() => {
    if (!isWaitingForPosition || !pendingConfig) return;

    if (positionValidation.isValid) {
      // Position is now valid - start countdown
      setIsWaitingForPosition(false);
      setShowCountdown(true);
      setCountdownValue(pendingConfig.detectionDelay);

      let currentCountdown = pendingConfig.detectionDelay;
      const countdownInterval = setInterval(() => {
        currentCountdown -= 1;
        setCountdownValue(currentCountdown);

        if (currentCountdown <= 0) {
          clearInterval(countdownInterval);
          setShowCountdown(false);
          // Start recording with FULL duration (countdown is separate)
          staticAnalysis.startRecording(pendingConfig.duration);
          setPendingConfig(null);
        }
      }, 1000);

      return () => clearInterval(countdownInterval);
    }
  }, [isWaitingForPosition, pendingConfig, positionValidation.isValid, staticAnalysis]);

  /**
   * Handle Live-Time assessment start
   */
  const handleStartLiveTimeAssessment = () => {
    if (!staticAnalysis.currentExercise) return;

    // Start waiting for correct starting position
    setIsWaitingForPosition(true);
  };

  /**
   * Effect to handle Live-Time mode: starts when position valid, then records for full duration
   * Position validation is ONLY used to START recording, not to stop it during exercise
   */
  useEffect(() => {
    if (assessmentMode !== 'live-time') return;

    if (isWaitingForPosition && positionValidation.isValid) {
      // Position is valid, start recording immediately for full duration
      setIsWaitingForPosition(false);
      staticAnalysis.startRecording(liveTimeMaxDuration);
    }
    // Note: Once recording starts, it runs for the full duration.
    // The user can move freely during the exercise (squat, lunge, etc.)
  }, [assessmentMode, isWaitingForPosition, positionValidation.isValid, staticAnalysis, liveTimeMaxDuration]);

  /**
   * Handle recording complete
   */
  const handleRecordingComplete = useCallback(() => {
    const currentExercise = staticAnalysis.currentExercise;
    if (currentExercise) {
      setCompletedExercises((prev) => new Set(prev).add(currentExercise.id));

      // Show pain modal
      setPendingPainExercise(currentExercise);
      setShowPainModal(true);
    }
  }, [staticAnalysis.currentExercise]);

  // Watch for recording completion
  useEffect(() => {
    if (!staticAnalysis.recording.isRecording && staticAnalysis.recording.frames.length > 0) {
      handleRecordingComplete();
    }
  }, [staticAnalysis.recording.isRecording, staticAnalysis.recording.frames.length, handleRecordingComplete]);

  /**
   * Handle pain submission and record assessment
   */
  const handlePainSubmit = (
    intensity: number,
    location: PainLocation,
    notes?: string
  ) => {
    // Add to pain logging
    painLogging.addEntry(intensity, location, notes, {
      patternFlags: staticAnalysis.patternFlags,
      symmetry: staticAnalysis.staticMetrics?.asymmetry
        ? {
            knee_flexion_diff: staticAnalysis.staticMetrics.asymmetry.kneeAngleDiff,
            hip_drop_diff: staticAnalysis.staticMetrics.asymmetry.hipHeightDiff,
          }
        : undefined,
      frontalMetrics: frontalAnalysis.aggregatedMetrics,
    });

    // Record assessment result
    if (pendingPainExercise) {
      const painEntry: AssessmentPainEntry = {
        intensity,
        location,
        notes,
      };

      assessment.recordExerciseResult(
        pendingPainExercise,
        staticAnalysis.currentAngles,
        staticAnalysis.patternFlags,
        staticAnalysis.staticMetrics,
        staticAnalysis.recording.elapsedSeconds,
        painEntry
      );
    }

    setShowPainModal(false);
    setPendingPainExercise(null);
  };

  /**
   * Handle skip pain (still record assessment)
   */
  const handleSkipPain = () => {
    if (pendingPainExercise) {
      assessment.recordExerciseResult(
        pendingPainExercise,
        staticAnalysis.currentAngles,
        staticAnalysis.patternFlags,
        staticAnalysis.staticMetrics,
        staticAnalysis.recording.elapsedSeconds
      );
    }
    setShowPainModal(false);
    setPendingPainExercise(null);
  };

  /**
   * Handle finish session
   */
  const handleFinishSession = () => {
    const session = assessment.endSession();
    if (session) {
      // Automatically download the session
      downloadSessionAsJson(session);
    }
  };

  /**
   * Handle download current exercise JSON
   */
  const handleDownloadExerciseJson = () => {
    const currentExercise = staticAnalysis.currentExercise;
    if (!currentExercise) return;

    const result = assessment.getExerciseResult(currentExercise.id);
    if (result) {
      const json = JSON.stringify(result, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `assessment_${currentExercise.id}_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  /**
   * Handle download current exercise as PDF
   */
  const handleDownloadExercisePdf = () => {
    const currentExercise = staticAnalysis.currentExercise;
    if (!currentExercise) return;

    const result = assessment.getExerciseResult(currentExercise.id);
    if (result) {
      // Create a mini session with just this exercise for PDF export
      const miniSession = {
        sessionId: `single_${currentExercise.id}_${Date.now()}`,
        startTimestamp: result.timestamp,
        endTimestamp: Date.now(),
        mode: 'single' as const,
        version: '1.0.0',
        exercises: [result],
        globalRecommendations: {
          priorityExercises: result.recommendations.exercises,
          musclesFocus: result.recommendations.muscles,
          patternsFocus: result.recommendations.patterns,
        },
        sessionSummary: {
          exercisesCompleted: 1,
          averageScore: result.score,
          commonIssues: [],
          strengths: [],
          areasForImprovement: [],
        },
      };
      downloadSessionAsPdf(miniSession);
    }
  };

  /**
   * Handle clear exercise result (re-record)
   */
  const handleClearExerciseResult = () => {
    const currentExercise = staticAnalysis.currentExercise;
    if (currentExercise) {
      assessment.clearExerciseResult(currentExercise.id);
      setCompletedExercises((prev) => {
        const newSet = new Set(prev);
        newSet.delete(currentExercise.id);
        return newSet;
      });
    }
  };

  /**
   * Get current angles for overlay
   */
  const getCurrentAnglesForOverlay = (): Record<string, number | null> => {
    const angles = staticAnalysis.currentAngles;
    return {
      leftKnee: angles.leftKnee,
      rightKnee: angles.rightKnee,
      leftHipAngle: angles.leftHipAngle,
      rightHipAngle: angles.rightHipAngle,
      leftAnkle: angles.leftAnkle,
      rightAnkle: angles.rightAnkle,
      trunkLean: angles.trunkLean,
    };
  };

  const currentExercise = staticAnalysis.currentExercise;
  const currentResult = currentExercise ? assessment.getExerciseResult(currentExercise.id) : undefined;

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBack}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              title="Back to home"
            >
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-lg font-semibold text-white">Static Assessment</h1>
              <p className="text-xs text-gray-400">
                {poseStatus === 'ready' ? 'Pose model ready' : 'Loading pose model...'}
              </p>
            </div>
          </div>

          {/* Mode Tabs */}
          <div className="flex items-center gap-1 bg-gray-900 rounded-lg p-1">
            <button
              onClick={() => setAssessmentMode('static')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                assessmentMode === 'static'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Static Assessment
            </button>
            <button
              onClick={() => setAssessmentMode('live-time')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                assessmentMode === 'live-time'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Live-Time
            </button>
          </div>

          <div className="flex items-center gap-3">
            {/* Live-Time settings button */}
            {assessmentMode === 'live-time' && (
              <div className="relative">
                <button
                  onClick={() => setShowLiveTimeSettings(!showLiveTimeSettings)}
                  className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                  title="Impostazioni Live-Time"
                >
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>

                {/* Settings dropdown */}
                {showLiveTimeSettings && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 p-4">
                    <h4 className="text-sm font-medium text-white mb-3">Impostazioni Live-Time</h4>
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">Durata massima</label>
                      <select
                        value={liveTimeMaxDuration}
                        onChange={(e) => setLiveTimeMaxDuration(Number(e.target.value))}
                        className="w-full bg-gray-700 text-white text-sm rounded px-2 py-1.5 border border-gray-600"
                      >
                        <option value={30}>30 secondi</option>
                        <option value={60}>60 secondi</option>
                        <option value={90}>90 secondi</option>
                        <option value={120}>2 minuti</option>
                      </select>
                      <p className="text-xs text-gray-500 mt-2">
                        La registrazione si ferma automaticamente quando esci dalla posizione per 2+ secondi.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Progress indicator */}
            <div className="text-sm text-gray-400">
              {completedExercises.size} / 20 exercises
            </div>

            {/* Finish button */}
            {completedExercises.size > 0 && (
              <button
                onClick={handleFinishSession}
                className="px-3 py-1.5 text-sm text-white
                         bg-purple-600 hover:bg-purple-500 rounded-lg transition-colors"
              >
                Termina e Scarica Report
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 p-4 overflow-hidden">
        <div className="max-w-7xl mx-auto h-full">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-full">
            {/* Exercise List - Left column */}
            <div className="lg:col-span-1 h-[calc(100vh-180px)] overflow-hidden">
              <ExerciseList
                selectedExercise={currentExercise}
                onSelect={handleSelectExercise}
                completedExercises={completedExercises}
              />
            </div>

            {/* Video feed with overlay - Center */}
            <div className="lg:col-span-2">
              <div className="card overflow-hidden relative">
                {/* Exercise info header */}
                {currentExercise && (
                  <div className="bg-gray-800/90 px-4 py-3 border-b border-gray-700">
                    <h2 className="text-white font-medium">{currentExercise.name}</h2>
                    <p className="text-sm text-gray-400 mt-1">
                      {getExerciseInstructions(currentExercise)}
                    </p>
                  </div>
                )}

                <CameraFeed
                  ref={videoRef as React.RefObject<HTMLVideoElement>}
                  status={cameraStatus}
                  error={cameraError || poseError}
                  onStart={startCamera}
                  onStop={stopCamera}
                  dimensions={dimensions}
                  showFramingGuide={!isProcessing}
                  mode="static"
                >
                  {/* Pose overlay */}
                  {dimensions && currentPose && (
                    <PoseOverlayCanvas
                      pose={currentPose}
                      width={dimensions.width}
                      height={dimensions.height}
                      mirrored={true}
                      showAngles={true}
                      angles={getCurrentAnglesForOverlay()}
                      mode="static"
                    />
                  )}

                  {/* Recording timer overlay */}
                  <RecordingTimer
                    isRecording={staticAnalysis.recording.isRecording}
                    targetDuration={staticAnalysis.recording.targetDuration}
                    elapsedSeconds={staticAnalysis.recording.elapsedSeconds}
                  />

                  {/* Position validation overlay - shows when waiting for correct position */}
                  {currentExercise && isWaitingForPosition && (
                    <PositionValidationOverlay
                      exerciseId={currentExercise.id}
                      validation={positionValidation}
                      isVisible={true}
                    />
                  )}

                  {/* Countdown overlay */}
                  {showCountdown && (
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-20">
                      <div className="text-center">
                        <div className="text-9xl font-bold text-white animate-pulse">
                          {countdownValue}
                        </div>
                        <div className="text-xl text-gray-300 mt-4">Preparati...</div>
                        <div className="text-sm text-gray-400 mt-2">
                          La registrazione inizierà a breve
                        </div>
                      </div>
                    </div>
                  )}
                </CameraFeed>

                {/* Controls below video */}
                <div className="bg-gray-800/90 px-4 py-3 border-t border-gray-700">
                  {currentExercise ? (
                    <div className="flex items-center justify-between">
                      {staticAnalysis.recording.isRecording ? (
                        <RecordingProgressBar
                          elapsed={staticAnalysis.recording.elapsedSeconds}
                          total={staticAnalysis.recording.targetDuration}
                          isRecording={staticAnalysis.recording.isRecording}
                        />
                      ) : isWaitingForPosition ? (
                        <>
                          <div className="text-sm text-yellow-400 flex items-center gap-2">
                            <svg className="w-4 h-4 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            Posizionati correttamente per iniziare
                          </div>
                          <button
                            onClick={() => {
                              setIsWaitingForPosition(false);
                              setPendingConfig(null);
                            }}
                            className="px-4 py-2 text-sm text-white bg-red-600
                                     hover:bg-red-500 rounded-lg transition-colors"
                          >
                            Annulla
                          </button>
                        </>
                      ) : (
                        <>
                          <div className="text-sm text-gray-400">
                            {completedExercises.has(currentExercise.id)
                              ? 'Assessment completato. Vedi risultati a destra o ripeti.'
                              : assessmentMode === 'static'
                                ? 'Pronto per iniziare l\'assessment'
                                : 'Posizionati e la registrazione partirà automaticamente'}
                          </div>
                          {assessmentMode === 'static' ? (
                            <button
                              onClick={handleStartAssessmentClick}
                              disabled={!isStreaming || poseStatus !== 'ready' || showCountdown}
                              className="px-4 py-2 text-sm text-white bg-purple-600
                                       hover:bg-purple-500 disabled:bg-gray-600 disabled:cursor-not-allowed
                                       rounded-lg transition-colors flex items-center gap-2"
                            >
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <circle cx="10" cy="10" r="6" />
                              </svg>
                              Start Assessment
                            </button>
                          ) : (
                            <button
                              onClick={handleStartLiveTimeAssessment}
                              disabled={!isStreaming || poseStatus !== 'ready'}
                              className="px-4 py-2 text-sm text-white bg-green-600
                                       hover:bg-green-500 disabled:bg-gray-600 disabled:cursor-not-allowed
                                       rounded-lg transition-colors flex items-center gap-2"
                            >
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                              </svg>
                              Start Live-Time
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="text-center text-gray-400 text-sm">
                      Seleziona un esercizio dalla lista per iniziare
                    </div>
                  )}
                </div>
              </div>

              {/* Status bar */}
              <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                <span>
                  {poseStatus === 'loading' && 'Loading pose model...'}
                  {poseStatus === 'ready' && isStreaming && `Processing at ${fps} FPS`}
                  {poseStatus === 'error' && 'Pose model error'}
                </span>
                <span>
                  {staticAnalysis.recording.isRecording
                    ? `Recording: ${staticAnalysis.recording.frames.length} frames`
                    : ''}
                </span>
              </div>
            </div>

            {/* Side panel - Assessment results */}
            <div className="lg:col-span-1 space-y-4 h-[calc(100vh-180px)] overflow-y-auto">
              {/* Assessment Summary Panel (when result exists) */}
              {(currentResult || staticAnalysis.recording.isRecording) && (
                <AssessmentSummaryPanel
                  result={currentResult || null}
                  onDownloadJson={currentResult ? handleDownloadExerciseJson : undefined}
                  onDownloadPdf={currentResult ? handleDownloadExercisePdf : undefined}
                  onClearResult={currentResult ? handleClearExerciseResult : undefined}
                  isRecording={staticAnalysis.recording.isRecording}
                />
              )}

              {/* Real-time analysis (when recording OR when no result yet) */}
              {!currentResult && (
                <>
                  {/* Pattern Badges - show during recording */}
                  {staticAnalysis.recording.isRecording && Object.keys(staticAnalysis.patternFlags).length > 0 && (
                    <div className="card p-4">
                      <h3 className="text-sm font-medium text-gray-300 mb-3">Pattern in Tempo Reale</h3>
                      <PatternSummary patterns={staticAnalysis.patternFlags} mode="static" />
                      <div className="mt-2">
                        <PatternBadges patterns={staticAnalysis.patternFlags} mode="static" compact={true} />
                      </div>
                    </div>
                  )}

                  {/* Metrics summary - show during recording */}
                  {staticAnalysis.recording.isRecording && staticAnalysis.staticMetrics && (
                    <div className="card p-4">
                      <h3 className="text-sm font-medium text-gray-300 mb-3">Metriche Stabilità</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Total Sway</span>
                          <span className={`font-medium ${
                            staticAnalysis.staticMetrics.comSway.swayTotal > 0.02
                              ? 'text-yellow-400'
                              : 'text-green-400'
                          }`}>
                            {(staticAnalysis.staticMetrics.comSway.swayTotal * 100).toFixed(1)}%
                          </span>
                        </div>
                        {staticAnalysis.staticMetrics.asymmetry.kneeAngleDiff !== undefined && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">Asimmetria Ginocchio</span>
                            <span className="text-white font-medium">
                              {Math.abs(staticAnalysis.staticMetrics.asymmetry.kneeAngleDiff).toFixed(1)}°
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Summary Panel with suggestions - show during recording */}
                  {staticAnalysis.recording.isRecording && (
                    <SummaryPanel
                      suggestions={staticAnalysis.suggestions}
                      muscleInsights={staticAnalysis.muscleInsights}
                      isAnalyzing={isProcessing && isStreaming}
                    />
                  )}
                </>
              )}

              {/* Empty state */}
              {!currentExercise && !currentResult && (
                <div className="card p-4">
                  <p className="text-gray-400 text-sm text-center">
                    Seleziona un esercizio per vedere l'analisi in tempo reale o i risultati dell'assessment.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 border-t border-gray-700 px-4 py-2 text-center text-xs text-gray-500">
        BiomechCoach - Static Assessment Mode | {currentExercise
          ? `Posiziona la telecamera per vista ${currentExercise.view}`
          : 'Seleziona un esercizio per iniziare'}
      </footer>

      {/* Assessment Config Modal */}
      <AssessmentConfigModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        onStart={handleStartAssessment}
        initialConfig={assessment.config}
        initialReportMode={assessment.reportMode}
      />

      {/* Pain Input Modal */}
      <PainInputModal
        isOpen={showPainModal}
        onClose={handleSkipPain}
        onSubmit={handlePainSubmit}
        sessionMetrics={{
          patternFlags: staticAnalysis.patternFlags as Record<string, boolean | undefined>,
          symmetry: staticAnalysis.staticMetrics?.asymmetry
            ? {
                knee_flexion_diff: staticAnalysis.staticMetrics.asymmetry.kneeAngleDiff,
                hip_drop_diff: staticAnalysis.staticMetrics.asymmetry.hipHeightDiff,
              }
            : undefined,
          frontalMetrics: frontalAnalysis.aggregatedMetrics,
        }}
      />
    </div>
  );
};

export default StaticCaptureView;
