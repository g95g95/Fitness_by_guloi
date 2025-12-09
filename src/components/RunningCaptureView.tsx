/**
 * BiomechCoach - Running Capture View Component
 *
 * Main view for running assessment mode with timed recording.
 * Features:
 * - Camera feed with pose overlay
 * - Configurable recording duration and countdown
 * - Post-recording analysis with pattern detection
 * - Assessment report with recommendations
 */

import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RunningPatternFlags } from '../lib/poseTypes';
import {
  AssessmentConfig,
  AssessmentSession,
  ExerciseAssessmentResult,
  downloadSessionAsJson,
  downloadSessionAsPdf,
  generateSessionId,
} from '../lib/assessmentTypes';
import { getActivePatterns, RUNNING_PATTERN_SUGGESTIONS } from '../lib/patterns/runningPatterns';
import useCameraStream from '../hooks/useCameraStream';
import usePoseEstimation from '../hooks/usePoseEstimation';
import useRunningAnalysis from '../hooks/useRunningAnalysis';
import useFrontalAnalysis from '../hooks/useFrontalAnalysis';
import CameraFeed from './CameraFeed';
import PoseOverlayCanvas from './PoseOverlayCanvas';
import AnglePanel from './AnglePanel';
import RecordingTimer, { RecordingProgressBar } from './RecordingTimer';
import PatternBadges, { PatternSummary } from './PatternBadges';
import AssessmentConfigModal from './AssessmentConfigModal';

/**
 * Running assessment result interface
 */
interface RunningAssessmentResult {
  timestamp: number;
  durationSeconds: number;
  strideCount: number;
  cadence: number;
  patternFlags: RunningPatternFlags;
  angleStats: Record<string, { avg: number | null; min: number | null; max: number | null }>;
  score: number;
  status: 'excellent' | 'good' | 'fair' | 'needs_work';
  summary: string;
  recommendations: string[];
}

/**
 * Running Capture View Component
 */
const RunningCaptureView: React.FC = () => {
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

  // Running analysis hook
  const runningAnalysis = useRunningAnalysis();

  // Frontal analysis hook
  const frontalAnalysis = useFrontalAnalysis('running');

  // State
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showCountdown, setShowCountdown] = useState(false);
  const [countdownValue, setCountdownValue] = useState(5);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingElapsed, setRecordingElapsed] = useState(0);
  const [recordingDuration, setRecordingDuration] = useState(20);
  const [assessmentResult, setAssessmentResult] = useState<RunningAssessmentResult | null>(null);
  const [config, setConfig] = useState<AssessmentConfig>({ duration: 20, detectionDelay: 5 });

  const animationFrameRef = useRef<number>(0);
  const lastProcessTimeRef = useRef<number>(0);
  const recordingStartRef = useRef<number>(0);
  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Target FPS for processing
  const TARGET_FPS = 20;
  const FRAME_INTERVAL = 1000 / TARGET_FPS;

  /**
   * Initialize pose model when component mounts
   */
  useEffect(() => {
    initializePose({ modelComplexity: 1 });
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

          // Process frame through running analysis
          runningAnalysis.processFrame(pose, frameWidth, frameHeight);

          // Also process through frontal analysis
          frontalAnalysis.processFrame(pose, frameWidth, frameHeight);

          // Update frontal metrics in running analysis
          if (frontalAnalysis.aggregatedMetrics) {
            runningAnalysis.setFrontalMetrics(frontalAnalysis.aggregatedMetrics);
          }
        }
      });
    }

    animationFrameRef.current = requestAnimationFrame(processLoop);
  }, [isStreaming, poseStatus, videoRef, processFrame, dimensions, runningAnalysis, frontalAnalysis, FRAME_INTERVAL]);

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
    runningAnalysis.reset();
    navigate('/');
  };

  /**
   * Handle start assessment button click
   */
  const handleStartAssessmentClick = () => {
    setShowConfigModal(true);
  };

  /**
   * Calculate score from pattern flags
   */
  const calculateScore = (patterns: RunningPatternFlags): number => {
    let score = 100;
    const flagCount = Object.values(patterns).filter(Boolean).length;
    score -= flagCount * 12;
    return Math.max(0, Math.min(100, score));
  };

  /**
   * Get status from score
   */
  const getStatusFromScore = (score: number): RunningAssessmentResult['status'] => {
    if (score >= 85) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 50) return 'fair';
    return 'needs_work';
  };

  /**
   * Generate recommendations from patterns
   */
  const generateRecommendations = (patterns: RunningPatternFlags): string[] => {
    const recs: string[] = [];
    const patternKeys = Object.keys(patterns) as (keyof RunningPatternFlags)[];

    for (const key of patternKeys) {
      if (patterns[key]) {
        const suggestion = RUNNING_PATTERN_SUGGESTIONS[key];
        if (suggestion) {
          recs.push(suggestion.detail);
        }
      }
    }

    if (recs.length === 0) {
      recs.push('Ottima tecnica di corsa! Continua a mantenere una buona forma.');
    }

    return recs;
  };

  /**
   * Generate summary text
   */
  const generateSummary = (patterns: RunningPatternFlags, score: number, cadence: number): string => {
    const activePatterns = getActivePatterns(patterns);

    if (activePatterns.length === 0) {
      return `Eccellente tecnica di corsa. Cadenza: ${cadence} passi/min. Nessun pattern problematico rilevato.`;
    }

    return `Pattern rilevati: ${activePatterns.join(', ')}. Cadenza: ${cadence} passi/min. Punteggio: ${score}/100.`;
  };

  /**
   * Complete recording and generate assessment
   */
  const completeRecording = useCallback(() => {
    setIsRecording(false);

    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }

    // Generate assessment result
    const patterns = runningAnalysis.patternFlags;
    const score = calculateScore(patterns);

    const result: RunningAssessmentResult = {
      timestamp: Date.now(),
      durationSeconds: recordingDuration,
      strideCount: runningAnalysis.strideCount,
      cadence: runningAnalysis.cadence,
      patternFlags: patterns,
      angleStats: Object.fromEntries(
        Object.entries(runningAnalysis.angleStats).map(([k, v]) => [
          k,
          { avg: v.avg, min: v.min, max: v.max },
        ])
      ),
      score,
      status: getStatusFromScore(score),
      summary: generateSummary(patterns, score, runningAnalysis.cadence),
      recommendations: generateRecommendations(patterns),
    };

    setAssessmentResult(result);
  }, [runningAnalysis, recordingDuration]);

  /**
   * Handle assessment config and start recording
   */
  const handleStartAssessment = (newConfig: AssessmentConfig) => {
    setConfig(newConfig);
    setRecordingDuration(newConfig.duration);
    setAssessmentResult(null);

    // Reset analysis
    runningAnalysis.reset();
    frontalAnalysis.reset();

    // Start countdown
    setShowCountdown(true);
    setCountdownValue(newConfig.detectionDelay);

    const countdownInterval = setInterval(() => {
      setCountdownValue((v) => {
        if (v <= 1) {
          clearInterval(countdownInterval);
          setShowCountdown(false);
          startRecording(newConfig.duration);
          return 0;
        }
        return v - 1;
      });
    }, 1000);
  };

  /**
   * Start the actual recording
   */
  const startRecording = (duration: number) => {
    setIsRecording(true);
    setRecordingElapsed(0);
    recordingStartRef.current = Date.now();

    recordingIntervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - recordingStartRef.current) / 1000);
      setRecordingElapsed(elapsed);

      if (elapsed >= duration) {
        completeRecording();
      }
    }, 100);
  };

  /**
   * Handle repeat assessment
   */
  const handleRepeat = () => {
    setAssessmentResult(null);
    runningAnalysis.reset();
    frontalAnalysis.reset();
    setIsProcessing(false);
  };

  /**
   * Handle download JSON
   */
  const handleDownloadJson = () => {
    if (!assessmentResult) return;

    const session: AssessmentSession = {
      sessionId: generateSessionId(),
      startTimestamp: assessmentResult.timestamp - assessmentResult.durationSeconds * 1000,
      endTimestamp: assessmentResult.timestamp,
      mode: 'single',
      version: '1.0.0',
      exercises: [
        {
          exerciseId: 'running-assessment',
          exerciseName: 'Analisi Corsa',
          category: 'running',
          timestamp: assessmentResult.timestamp,
          durationSeconds: assessmentResult.durationSeconds,
          measuredAngles: {
            leftKnee: assessmentResult.angleStats['left_knee_midstance']?.avg || null,
            rightKnee: assessmentResult.angleStats['right_knee_midstance']?.avg || null,
            leftHipAngle: assessmentResult.angleStats['left_hip_extension']?.avg || null,
            rightHipAngle: assessmentResult.angleStats['right_hip_extension']?.avg || null,
            leftAnkle: null,
            rightAnkle: null,
            trunkLean: assessmentResult.angleStats['trunk_lean']?.avg || null,
          },
          angleDeviations: [],
          patternFlags: assessmentResult.patternFlags as any,
          staticMetrics: { totalSway: 0, swayX: 0, swayY: 0, angleVariability: {} },
          asymmetries: [],
          instabilities: [],
          score: assessmentResult.score,
          status: assessmentResult.status,
          recommendations: {
            exercises: assessmentResult.recommendations.map((r, i) => ({
              exercise: `Consiglio ${i + 1}`,
              reason: r,
              targetArea: 'running',
              priority: 'medium' as const,
            })),
            muscles: [],
            patterns: [],
          },
          probablePains: [],
          summary: assessmentResult.summary,
        } as ExerciseAssessmentResult,
      ],
      globalRecommendations: { priorityExercises: [], musclesFocus: [], patternsFocus: [] },
      sessionSummary: {
        exercisesCompleted: 1,
        averageScore: assessmentResult.score,
        commonIssues: getActivePatterns(assessmentResult.patternFlags),
        strengths: [],
        areasForImprovement: [],
      },
    };

    downloadSessionAsJson(session);
  };

  /**
   * Handle download PDF
   */
  const handleDownloadPdf = () => {
    if (!assessmentResult) return;

    const session: AssessmentSession = {
      sessionId: generateSessionId(),
      startTimestamp: assessmentResult.timestamp - assessmentResult.durationSeconds * 1000,
      endTimestamp: assessmentResult.timestamp,
      mode: 'single',
      version: '1.0.0',
      exercises: [
        {
          exerciseId: 'running-assessment',
          exerciseName: 'Analisi Corsa',
          category: 'running',
          timestamp: assessmentResult.timestamp,
          durationSeconds: assessmentResult.durationSeconds,
          measuredAngles: {
            leftKnee: assessmentResult.angleStats['left_knee_midstance']?.avg || null,
            rightKnee: assessmentResult.angleStats['right_knee_midstance']?.avg || null,
            leftHipAngle: assessmentResult.angleStats['left_hip_extension']?.avg || null,
            rightHipAngle: assessmentResult.angleStats['right_hip_extension']?.avg || null,
            leftAnkle: null,
            rightAnkle: null,
            trunkLean: assessmentResult.angleStats['trunk_lean']?.avg || null,
          },
          angleDeviations: [],
          patternFlags: assessmentResult.patternFlags as any,
          staticMetrics: { totalSway: 0, swayX: 0, swayY: 0, angleVariability: {} },
          asymmetries: [],
          instabilities: [],
          score: assessmentResult.score,
          status: assessmentResult.status,
          recommendations: {
            exercises: assessmentResult.recommendations.map((r, i) => ({
              exercise: `Consiglio ${i + 1}`,
              reason: r,
              targetArea: 'running',
              priority: 'medium' as const,
            })),
            muscles: [],
            patterns: [],
          },
          probablePains: [],
          summary: assessmentResult.summary,
        } as ExerciseAssessmentResult,
      ],
      globalRecommendations: { priorityExercises: [], musclesFocus: [], patternsFocus: [] },
      sessionSummary: {
        exercisesCompleted: 1,
        averageScore: assessmentResult.score,
        commonIssues: getActivePatterns(assessmentResult.patternFlags),
        strengths: [],
        areasForImprovement: [],
      },
    };

    downloadSessionAsPdf(session);
  };

  /**
   * Get current angles for overlay
   */
  const getCurrentAnglesForOverlay = (): Record<string, number | null> => {
    const angles = runningAnalysis.currentAngles;
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

  /**
   * Status badge component
   */
  const StatusBadge: React.FC<{ status: RunningAssessmentResult['status']; score: number }> = ({
    status,
    score,
  }) => {
    const statusConfig = {
      excellent: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Eccellente' },
      good: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Buono' },
      fair: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'Discreto' },
      needs_work: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Da migliorare' },
    };

    const cfg = statusConfig[status];

    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${cfg.bg}`}>
        <span className={`text-2xl font-bold ${cfg.text}`}>{score}</span>
        <span className={`text-sm ${cfg.text}`}>/100 - {cfg.label}</span>
      </div>
    );
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }, []);

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
              <h1 className="text-lg font-semibold text-white">Running Assessment</h1>
              <p className="text-xs text-gray-400">
                {poseStatus === 'ready' ? 'Pose model ready' : 'Loading pose model...'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Status indicator */}
            {isRecording && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-red-600/20 rounded-lg">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-sm text-red-400">Registrazione</span>
              </div>
            )}
            {assessmentResult && (
              <StatusBadge status={assessmentResult.status} score={assessmentResult.score} />
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 p-4 overflow-hidden">
        <div className="max-w-7xl mx-auto h-full">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full">
            {/* Video feed with overlay - takes 2 columns */}
            <div className="lg:col-span-2">
              <div className="card overflow-hidden relative">
                {/* Instructions header */}
                <div className="bg-gray-800/90 px-4 py-3 border-b border-gray-700">
                  <h2 className="text-white font-medium">Analisi della Corsa</h2>
                  <p className="text-sm text-gray-400 mt-1">
                    {isRecording
                      ? 'Corri avanti e indietro mantenendo una velocità costante.'
                      : assessmentResult
                      ? 'Assessment completato. Vedi i risultati a destra.'
                      : 'Posiziona la fotocamera di lato. Premi "Start" per iniziare la registrazione.'}
                  </p>
                </div>

                <CameraFeed
                  ref={videoRef as React.RefObject<HTMLVideoElement>}
                  status={cameraStatus}
                  error={cameraError || poseError}
                  onStart={startCamera}
                  onStop={stopCamera}
                  dimensions={dimensions}
                  showFramingGuide={!isProcessing}
                  mode="running"
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
                      mode="running"
                    />
                  )}

                  {/* Recording timer overlay */}
                  <RecordingTimer
                    isRecording={isRecording}
                    targetDuration={recordingDuration}
                    elapsedSeconds={recordingElapsed}
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
                          Posizionati di lato alla fotocamera
                        </div>
                      </div>
                    </div>
                  )}
                </CameraFeed>

                {/* Controls below video */}
                <div className="bg-gray-800/90 px-4 py-3 border-t border-gray-700">
                  {isRecording ? (
                    <RecordingProgressBar
                      elapsed={recordingElapsed}
                      total={recordingDuration}
                      isRecording={isRecording}
                    />
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-400">
                        {assessmentResult
                          ? `${assessmentResult.strideCount} passi rilevati | Cadenza: ${assessmentResult.cadence} spm`
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
                        {assessmentResult ? 'Nuova Analisi' : 'Start Assessment'}
                      </button>
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
                  {isRecording
                    ? `Recording: ${runningAnalysis.strideCount} strides`
                    : `${runningAnalysis.strideCount} strides detected`}
                </span>
              </div>
            </div>

            {/* Side panel - Assessment results */}
            <div className="lg:col-span-1 space-y-4 h-[calc(100vh-180px)] overflow-y-auto">
              {/* Assessment Result Panel */}
              {assessmentResult && (
                <div className="space-y-4">
                  {/* Score */}
                  <div className="card p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-medium text-gray-300">Punteggio Assessment</h3>
                      <StatusBadge status={assessmentResult.status} score={assessmentResult.score} />
                    </div>
                    <p className="text-sm text-gray-400">{assessmentResult.summary}</p>
                  </div>

                  {/* Stats */}
                  <div className="card p-4">
                    <h3 className="text-sm font-medium text-gray-300 mb-3">Statistiche</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-400">{assessmentResult.strideCount}</div>
                        <div className="text-xs text-gray-400">Passi</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-400">{assessmentResult.cadence}</div>
                        <div className="text-xs text-gray-400">Cadenza (spm)</div>
                      </div>
                    </div>
                  </div>

                  {/* Patterns */}
                  {getActivePatterns(assessmentResult.patternFlags).length > 0 && (
                    <div className="card p-4">
                      <h3 className="text-sm font-medium text-gray-300 mb-3">Pattern Rilevati</h3>
                      <PatternSummary patterns={assessmentResult.patternFlags} mode="running" />
                      <div className="mt-2">
                        <PatternBadges patterns={assessmentResult.patternFlags} mode="running" compact={true} />
                      </div>
                    </div>
                  )}

                  {/* Recommendations */}
                  <div className="card p-4">
                    <h3 className="text-sm font-medium text-gray-300 mb-3">Raccomandazioni</h3>
                    <div className="space-y-2">
                      {assessmentResult.recommendations.map((rec, idx) => (
                        <div key={idx} className="p-3 bg-gray-700/50 rounded-lg">
                          <p className="text-sm text-gray-300">{rec}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={handleDownloadJson}
                      className="flex-1 px-4 py-2 text-sm text-white bg-purple-600 hover:bg-purple-500 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      JSON
                    </button>
                    <button
                      onClick={handleDownloadPdf}
                      className="flex-1 px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      PDF
                    </button>
                    <button
                      onClick={handleRepeat}
                      className="px-4 py-2 text-sm text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                    >
                      Ripeti
                    </button>
                  </div>
                </div>
              )}

              {/* Real-time analysis (when recording or no result) */}
              {!assessmentResult && (
                <>
                  {/* Pattern Badges */}
                  {isProcessing && Object.keys(runningAnalysis.patternFlags).length > 0 && (
                    <div className="card p-4">
                      <h3 className="text-sm font-medium text-gray-300 mb-3">Pattern in Tempo Reale</h3>
                      <PatternSummary patterns={runningAnalysis.patternFlags} mode="running" />
                      <div className="mt-2">
                        <PatternBadges patterns={runningAnalysis.patternFlags} mode="running" compact={true} />
                      </div>
                    </div>
                  )}

                  {/* Angle Panel */}
                  <AnglePanel
                    mode="running"
                    currentAngles={getCurrentAnglesForOverlay()}
                    angleStats={runningAnalysis.angleStats}
                    fps={fps}
                    cycleCount={runningAnalysis.strideCount}
                    cadence={runningAnalysis.cadence}
                    duration={runningAnalysis.duration}
                  />

                  {/* Recording indicator */}
                  {isRecording && (
                    <div className="card p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                        <span className="text-white font-medium">Registrazione in corso...</span>
                      </div>
                      <p className="text-sm text-gray-400 mt-2">
                        Corri avanti e indietro. Il riepilogo apparirà al termine.
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* Empty state */}
              {!assessmentResult && !isRecording && !isProcessing && (
                <div className="card p-4">
                  <p className="text-gray-400 text-sm text-center">
                    Avvia la fotocamera e premi "Start Assessment" per iniziare l'analisi della corsa.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 border-t border-gray-700 px-4 py-2 text-center text-xs text-gray-500">
        BiomechCoach - Running Assessment Mode | Posiziona la telecamera di lato per migliori risultati
      </footer>

      {/* Assessment Config Modal */}
      <AssessmentConfigModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        onStart={handleStartAssessment}
        initialConfig={config}
        initialReportMode="per_exercise"
      />
    </div>
  );
};

export default RunningCaptureView;
