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

import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StaticExercise, PainLocation } from '../lib/poseTypes';
import { getExerciseInstructions } from '../lib/staticExercises';
import { AssessmentConfig, AssessmentReportMode, AssessmentPainEntry, downloadSessionAsJson, downloadSessionAsPdf } from '../lib/assessmentTypes';
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
   */
  const handleStartAssessment = (config: AssessmentConfig, reportMode: AssessmentReportMode) => {
    if (!staticAnalysis.currentExercise) return;

    assessment.updateConfig(config);
    assessment.setReportMode(reportMode);

    // Start countdown with detection delay
    setShowCountdown(true);
    setCountdownValue(config.detectionDelay);

    const countdownInterval = setInterval(() => {
      setCountdownValue((v) => {
        if (v <= 1) {
          clearInterval(countdownInterval);
          setShowCountdown(false);
          // Start actual recording with configured duration
          staticAnalysis.startRecording(config.duration);
          return 0;
        }
        return v - 1;
      });
    }, 1000);
  };

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
                {assessment.reportMode === 'per_exercise' && ' | Report per esercizio'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
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

                  {/* Countdown overlay */}
                  {showCountdown && (
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-20">
                      <div className="text-center">
                        <div className="text-9xl font-bold text-white animate-pulse">
                          {countdownValue}
                        </div>
                        <div className="text-xl text-gray-300 mt-4">Preparati...</div>
                        <div className="text-sm text-gray-400 mt-2">
                          Posizionati correttamente per l'esercizio
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
                      ) : (
                        <>
                          <div className="text-sm text-gray-400">
                            {completedExercises.has(currentExercise.id)
                              ? 'Assessment completato. Vedi risultati a destra o ripeti.'
                              : 'Pronto per iniziare l\'assessment'}
                          </div>
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

              {/* Real-time analysis (when no result and not recording) */}
              {!currentResult && !staticAnalysis.recording.isRecording && (
                <>
                  {/* Pattern Badges */}
                  {isProcessing && Object.keys(staticAnalysis.patternFlags).length > 0 && (
                    <div className="card p-4">
                      <h3 className="text-sm font-medium text-gray-300 mb-3">Pattern in Tempo Reale</h3>
                      <PatternSummary patterns={staticAnalysis.patternFlags} mode="static" />
                      <div className="mt-2">
                        <PatternBadges patterns={staticAnalysis.patternFlags} mode="static" compact={true} />
                      </div>
                    </div>
                  )}

                  {/* Metrics summary */}
                  {staticAnalysis.staticMetrics && (
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

                  {/* Summary Panel */}
                  <SummaryPanel
                    suggestions={staticAnalysis.suggestions}
                    muscleInsights={staticAnalysis.muscleInsights}
                    isAnalyzing={isProcessing && isStreaming}
                  />
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
