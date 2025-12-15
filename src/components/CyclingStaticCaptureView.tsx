/**
 * BiomechCoach - Cycling Static Capture View Component
 *
 * Static saddle height analysis with 2-step workflow:
 * 1. Heel on pedal at 6 o'clock (full leg extension)
 * 2. Clipped in at 6 o'clock (normal pedaling position)
 *
 * Features:
 * - Side camera view
 * - Auto-detection of ready position (knee angle > 120°)
 * - Configurable countdown before measurement
 * - Real-time angle display
 * - Analysis and recommendations
 */

import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CyclingStaticStep,
  CyclingStaticStepConfig,
} from '../lib/poseTypes';
import useCameraStream from '../hooks/useCameraStream';
import usePoseEstimation from '../hooks/usePoseEstimation';
import useCyclingStaticAnalysis from '../hooks/useCyclingStaticAnalysis';
import CameraFeed from './CameraFeed';
import PoseOverlayCanvas from './PoseOverlayCanvas';

/**
 * Step configuration
 */
const STEP_CONFIG: Record<CyclingStaticStep, CyclingStaticStepConfig> = {
  heel_on_pedal: {
    step: 'heel_on_pedal',
    label: 'Tallone sul Pedale',
    instruction: 'Posiziona il TALLONE sul pedale a ore 6 (punto piu basso). La gamba dovrebbe essere quasi completamente estesa.',
    icon: '1',
  },
  clipped_in: {
    step: 'clipped_in',
    label: 'Pedale Agganciato',
    instruction: 'Ora aggancia il piede al pedale (o appoggia la palla del piede) a ore 6. Questa e la posizione normale di pedalata.',
    icon: '2',
  },
};

const STEP_ORDER: CyclingStaticStep[] = ['heel_on_pedal', 'clipped_in'];

/**
 * Format angle for display
 */
function formatAngle(angle: number | null | undefined): string {
  if (angle === null || angle === undefined) return '--';
  return `${Math.round(angle)}°`;
}

/**
 * Format KOPS angle with sign
 */
function formatKopsAngle(angle: number | null | undefined): string {
  if (angle === null || angle === undefined) return '--';
  const rounded = Math.round(angle);
  if (rounded > 0) return `+${rounded}°`;
  return `${rounded}°`;
}

/**
 * Get color class for KOPS angle
 */
function getKopsAngleColorClass(angle: number | null): string {
  if (angle === null) return 'text-gray-400';
  const absAngle = Math.abs(angle);
  if (absAngle <= 2) return 'text-green-400';   // Ideal: 0° ± 2°
  if (absAngle <= 5) return 'text-yellow-400';  // Acceptable
  return 'text-red-400';                         // Too far forward/back
}

/**
 * Get color class based on angle quality for saddle height
 */
function getKneeAngleColorClass(angle: number | null, step: CyclingStaticStep): string {
  if (angle === null) return 'text-gray-400';

  if (step === 'heel_on_pedal') {
    // Heel on pedal should be ~170-180°
    if (angle >= 170) return 'text-green-400';
    if (angle >= 160) return 'text-yellow-400';
    return 'text-red-400';
  } else {
    // Clipped in should be 145-155°
    if (angle >= 145 && angle <= 155) return 'text-green-400';
    if (angle >= 140 && angle <= 160) return 'text-yellow-400';
    return 'text-red-400';
  }
}

/**
 * Cycling Static Capture View Component
 */
const CyclingStaticCaptureView: React.FC = () => {
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

  // Static analysis hook
  const staticAnalysis = useCyclingStaticAnalysis();

  // UI state
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [customCountdown, setCustomCountdown] = useState(staticAnalysis.countdownDuration);

  // Processing refs
  const animationFrameRef = useRef<number>(0);
  const lastProcessTimeRef = useRef<number>(0);

  // Constants
  const TARGET_FPS = 20;
  const FRAME_INTERVAL = 1000 / TARGET_FPS;

  // Current step
  const currentStep = STEP_ORDER[currentStepIndex];
  const currentStepConfig = STEP_CONFIG[currentStep];

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
          staticAnalysis.processFrame(pose);
        }
      });
    }

    animationFrameRef.current = requestAnimationFrame(processLoop);
  }, [isStreaming, poseStatus, videoRef, processFrame, staticAnalysis, FRAME_INTERVAL]);

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
   * Handle step completion
   */
  useEffect(() => {
    if (staticAnalysis.status === 'completed') {
      // Auto-advance to next step or show results
      if (currentStepIndex < STEP_ORDER.length - 1) {
        // Give user a moment to see the measurement was completed
        const timer = setTimeout(() => {
          setCurrentStepIndex(prev => prev + 1);
          // Reset status for next measurement
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [staticAnalysis.status, currentStepIndex]);

  /**
   * Handle back navigation
   */
  const handleBack = () => {
    stopCamera();
    staticAnalysis.reset();
    navigate('/cycling');
  };

  /**
   * Handle start measurement
   */
  const handleStartMeasurement = () => {
    staticAnalysis.setCountdownDuration(customCountdown);
    staticAnalysis.startMeasurement(currentStep);
  };

  /**
   * Handle view results
   */
  const handleViewResults = () => {
    setShowResults(true);
  };

  /**
   * Handle reset
   */
  const handleReset = () => {
    staticAnalysis.reset();
    setCurrentStepIndex(0);
    setShowResults(false);
  };

  /**
   * Get current angles for overlay
   */
  const getCurrentAnglesForOverlay = (): Record<string, number | null> => {
    const angles = staticAnalysis.currentAngles;
    return {
      // Show knee angle prominently since that's what we're measuring
      kneeAngle: angles.kneeAngle,
      hipAngle: angles.hipAngle,
    };
  };

  // If showing results, render results view
  if (showResults && staticAnalysis.result) {
    const { analysis } = staticAnalysis.result;
    const { measurements } = staticAnalysis;

    return (
      <div className="min-h-screen bg-gray-900 flex flex-col">
        {/* Header */}
        <header className="bg-gray-800 border-b border-gray-700 px-4 py-3">
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowResults(false)}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-lg font-semibold text-white">Risultati Analisi Statica</h1>
            </div>
            <button
              onClick={handleReset}
              className="px-3 py-1.5 text-sm text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              Nuovo Test
            </button>
          </div>
        </header>

        {/* Results content */}
        <main className="flex-1 p-4 overflow-y-auto">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Score card */}
            <div className="card p-6 text-center">
              <div className={`text-6xl font-bold mb-2 ${
                analysis.bikeFitScore >= 80 ? 'text-green-400' :
                analysis.bikeFitScore >= 60 ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {analysis.bikeFitScore}
              </div>
              <div className="text-gray-400">Punteggio Bike Fit</div>
              <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-700">
                <span className={`w-3 h-3 rounded-full ${
                  analysis.saddleAssessment.status === 'optimal' ? 'bg-green-500' :
                  analysis.saddleAssessment.status === 'unknown' ? 'bg-gray-500' : 'bg-yellow-500'
                }`} />
                <span className="text-white font-medium">
                  {analysis.saddleAssessment.status === 'optimal' ? 'Sella OK' :
                   analysis.saddleAssessment.status === 'too_low' ? 'Sella Troppo Bassa' :
                   analysis.saddleAssessment.status === 'too_high' ? 'Sella Troppo Alta' : 'Da Valutare'}
                </span>
              </div>
            </div>

            {/* Measurements comparison */}
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Misurazioni</h2>
              <div className="grid grid-cols-2 gap-4">
                {/* Heel on pedal */}
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <div className="text-sm text-gray-400 mb-1">Tallone sul Pedale</div>
                  {measurements.heelOnPedal ? (
                    <>
                      <div className={`text-3xl font-bold ${getKneeAngleColorClass(measurements.heelOnPedal.kneeAngle, 'heel_on_pedal')}`}>
                        {formatAngle(measurements.heelOnPedal.kneeAngle)}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">Ideale: 170°-180°</div>
                      {measurements.heelOnPedal.kopsAngle !== null && (
                        <div className={`text-sm mt-2 ${getKopsAngleColorClass(measurements.heelOnPedal.kopsAngle)}`}>
                          KOPS: {formatKopsAngle(measurements.heelOnPedal.kopsAngle)}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-2xl text-gray-500">Non misurato</div>
                  )}
                </div>

                {/* Clipped in */}
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <div className="text-sm text-gray-400 mb-1">Pedale Agganciato</div>
                  {measurements.clippedIn ? (
                    <>
                      <div className={`text-3xl font-bold ${getKneeAngleColorClass(measurements.clippedIn.kneeAngle, 'clipped_in')}`}>
                        {formatAngle(measurements.clippedIn.kneeAngle)}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">Ideale: 145°-155°</div>
                      {measurements.clippedIn.kopsAngle !== null && (
                        <div className={`text-sm mt-2 ${getKopsAngleColorClass(measurements.clippedIn.kopsAngle)}`}>
                          KOPS: {formatKopsAngle(measurements.clippedIn.kopsAngle)}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-2xl text-gray-500">Non misurato</div>
                  )}
                </div>
              </div>

              {/* Angle difference */}
              {analysis.saddleAssessment.angleDifference !== null && (
                <div className="mt-4 p-3 bg-gray-700/30 rounded-lg">
                  <div className="text-sm text-gray-400">Differenza</div>
                  <div className="text-xl font-bold text-white">
                    {Math.round(analysis.saddleAssessment.angleDifference)}°
                  </div>
                </div>
              )}
            </div>

            {/* Saddle assessment */}
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Valutazione Sella</h2>
              <p className="text-gray-300 leading-relaxed">{analysis.saddleAssessment.assessment}</p>

              {analysis.saddleAssessment.recommendations.length > 0 && (
                <div className="mt-4 space-y-2">
                  {analysis.saddleAssessment.recommendations.map((rec, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-sm">
                      <span className="text-yellow-400 mt-0.5">!</span>
                      <span className="text-gray-400">{rec}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Leg extension */}
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Estensione Gamba</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Con tallone:</span>
                  <span className="text-white">{analysis.legExtensionAnalysis.heelExtension}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Con piede agganciato:</span>
                  <span className="text-white">{analysis.legExtensionAnalysis.clippedExtension}</span>
                </div>
              </div>
              {analysis.legExtensionAnalysis.assessment && (
                <p className="mt-4 text-sm text-gray-400">{analysis.legExtensionAnalysis.assessment}</p>
              )}
            </div>

            {/* Position assessment */}
            {analysis.positionAssessment.assessment && (
              <div className="card p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Posizione</h2>
                <p className="text-gray-300">{analysis.positionAssessment.assessment}</p>
                {(analysis.positionAssessment.hipAngle || analysis.positionAssessment.trunkAngle) && (
                  <div className="mt-4 flex gap-4">
                    {analysis.positionAssessment.hipAngle && (
                      <div className="text-sm">
                        <span className="text-gray-500">Anca: </span>
                        <span className="text-white">{formatAngle(analysis.positionAssessment.hipAngle)}</span>
                      </div>
                    )}
                    {analysis.positionAssessment.trunkAngle && (
                      <div className="text-sm">
                        <span className="text-gray-500">Tronco: </span>
                        <span className="text-white">{formatAngle(analysis.positionAssessment.trunkAngle)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Overall recommendations */}
            {analysis.overallRecommendations.length > 0 && (
              <div className="card p-6 bg-blue-900/20 border-blue-700">
                <h2 className="text-lg font-semibold text-blue-400 mb-4">Raccomandazioni</h2>
                <ul className="space-y-2">
                  {analysis.overallRecommendations.map((rec, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-blue-400 mt-1">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </span>
                      <span className="text-gray-300">{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-4">
              <button
                onClick={() => setShowResults(false)}
                className="flex-1 py-3 px-6 text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              >
                Torna alla Misurazione
              </button>
              <button
                onClick={handleBack}
                className="flex-1 py-3 px-6 text-white bg-biomech-600 hover:bg-biomech-500 rounded-lg transition-colors"
              >
                Fine
              </button>
            </div>
          </div>
        </main>
      </div>
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
              title="Torna alla selezione"
            >
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-lg font-semibold text-white">Analisi Statica Ciclismo</h1>
              <p className="text-xs text-gray-400">
                {poseStatus === 'ready' ? 'Modello pose pronto' : 'Caricamento modello...'}
              </p>
            </div>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2">
            {STEP_ORDER.map((step, index) => {
              const completed = staticAnalysis.measurements[step === 'heel_on_pedal' ? 'heelOnPedal' : 'clippedIn'] !== null;
              const isCurrent = index === currentStepIndex;

              return (
                <div
                  key={step}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm ${
                    completed
                      ? 'bg-green-600 text-white'
                      : isCurrent
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-400'
                  }`}
                >
                  <span className="font-bold">{index + 1}</span>
                  <span className="hidden sm:inline ml-1">{STEP_CONFIG[step].label}</span>
                </div>
              );
            })}
          </div>

          {/* View results button */}
          {staticAnalysis.result && (
            <button
              onClick={handleViewResults}
              className="px-4 py-2 text-sm text-white bg-purple-600 hover:bg-purple-500 rounded-lg transition-colors"
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
                  showFramingGuide={staticAnalysis.status !== 'measuring'}
                  mode="cycling"
                >
                  {/* Pose overlay */}
                  {dimensions && currentPose && (
                    <PoseOverlayCanvas
                      pose={currentPose}
                      width={dimensions.width}
                      height={dimensions.height}
                      mirrored={false} // Side view, no mirroring
                      showAngles={true}
                      angles={getCurrentAnglesForOverlay()}
                      mode="cycling"
                    />
                  )}

                  {/* Countdown overlay */}
                  {staticAnalysis.status === 'countdown' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <div className="text-center">
                        <div className="text-8xl font-bold text-white animate-pulse">
                          {staticAnalysis.countdownRemaining}
                        </div>
                        <div className="text-xl text-gray-300 mt-4">Mantieni la posizione...</div>
                      </div>
                    </div>
                  )}

                  {/* Measuring overlay */}
                  {staticAnalysis.status === 'measuring' && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="bg-green-600/80 px-6 py-3 rounded-lg">
                        <div className="text-xl font-bold text-white animate-pulse">
                          Misurazione in corso...
                        </div>
                      </div>
                    </div>
                  )}
                </CameraFeed>
              </div>

              {/* Controls */}
              <div className="mt-4 p-4 bg-gray-800 rounded-lg">
                {/* Step info */}
                <div className="mb-4">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <span className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-lg">
                      {currentStepConfig.icon}
                    </span>
                    {currentStepConfig.label}
                  </h2>
                  <p className="text-gray-400 mt-2">{currentStepConfig.instruction}</p>
                </div>

                {/* Ready position indicator */}
                <div className={`mb-4 p-3 rounded-lg flex items-center gap-3 ${
                  staticAnalysis.isInReadyPosition ? 'bg-green-600/20' : 'bg-gray-700'
                }`}>
                  <span className={`w-3 h-3 rounded-full ${
                    staticAnalysis.isInReadyPosition ? 'bg-green-500 animate-pulse' : 'bg-gray-500'
                  }`} />
                  <span className={staticAnalysis.isInReadyPosition ? 'text-green-400' : 'text-gray-400'}>
                    {staticAnalysis.isInReadyPosition
                      ? 'Posizione rilevata! Pronto per la misurazione.'
                      : 'Posiziona la gamba a ore 6 (pedale in basso)'}
                  </span>
                </div>

                {/* Countdown selector */}
                {staticAnalysis.status === 'idle' && (
                  <div className="mb-4 flex items-center gap-3">
                    <span className="text-gray-400 text-sm">Secondi di attesa:</span>
                    <div className="flex gap-2">
                      {[3, 5, 10].map(sec => (
                        <button
                          key={sec}
                          onClick={() => setCustomCountdown(sec)}
                          className={`px-3 py-1 rounded text-sm ${
                            customCountdown === sec
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          }`}
                        >
                          {sec}s
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Control buttons */}
                <div className="flex gap-3">
                  {staticAnalysis.status === 'idle' && (
                    <button
                      onClick={handleStartMeasurement}
                      disabled={!isStreaming || poseStatus !== 'ready' || !staticAnalysis.isInReadyPosition}
                      className="flex-1 py-3 px-6 text-lg font-semibold text-white bg-blue-600
                               hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed
                               rounded-lg transition-colors"
                    >
                      {staticAnalysis.isInReadyPosition ? 'Avvia Misurazione' : 'Attendi Posizione...'}
                    </button>
                  )}

                  {(staticAnalysis.status === 'countdown' || staticAnalysis.status === 'measuring') && (
                    <button
                      onClick={staticAnalysis.cancelMeasurement}
                      className="flex-1 py-3 px-6 text-lg font-semibold text-white bg-red-600
                               hover:bg-red-500 rounded-lg transition-colors"
                    >
                      Annulla
                    </button>
                  )}

                  {staticAnalysis.status === 'completed' && currentStepIndex < STEP_ORDER.length - 1 && (
                    <button
                      onClick={() => setCurrentStepIndex(prev => prev + 1)}
                      className="flex-1 py-3 px-6 text-lg font-semibold text-white bg-green-600
                               hover:bg-green-500 rounded-lg transition-colors"
                    >
                      Prossimo Step
                    </button>
                  )}

                  {staticAnalysis.status === 'completed' && currentStepIndex === STEP_ORDER.length - 1 && (
                    <button
                      onClick={handleViewResults}
                      className="flex-1 py-3 px-6 text-lg font-semibold text-white bg-purple-600
                               hover:bg-purple-500 rounded-lg transition-colors"
                    >
                      Vedi Risultati
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Side panel */}
            <div className="space-y-4">
              {/* Real-time angles */}
              <div className="card p-4">
                <h3 className="text-sm font-medium text-gray-300 mb-3">Angoli in Tempo Reale</h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-400">Ginocchio:</span>
                      <span className={`font-mono font-bold ${
                        getKneeAngleColorClass(staticAnalysis.currentAngles.kneeAngle, currentStep)
                      }`}>
                        {formatAngle(staticAnalysis.currentAngles.kneeAngle)}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          staticAnalysis.currentAngles.kneeAngle
                            ? staticAnalysis.currentAngles.kneeAngle >= 145
                              ? 'bg-green-500'
                              : 'bg-yellow-500'
                            : 'bg-gray-600'
                        }`}
                        style={{
                          width: `${Math.min(100, ((staticAnalysis.currentAngles.kneeAngle || 0) / 180) * 100)}%`
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Anca:</span>
                    <span className="text-white font-mono">
                      {formatAngle(staticAnalysis.currentAngles.hipAngle)}
                    </span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Tronco:</span>
                    <span className="text-white font-mono">
                      {formatAngle(staticAnalysis.currentAngles.trunkAngle)}
                    </span>
                  </div>

                  {/* KOPS angle */}
                  <div className="flex justify-between text-sm border-t border-gray-700 pt-2">
                    <span className="text-gray-400 flex items-center gap-1" title="Knee Over Pedal Spindle - A ore 3, misura se il ginocchio è sopra l'asse del pedale. 0° = ideale. Positivo = ginocchio avanti. Negativo = ginocchio indietro.">
                      KOPS
                      <span className="text-gray-500 cursor-help text-xs">ⓘ</span>
                    </span>
                    <span className={`font-mono font-bold ${getKopsAngleColorClass(staticAnalysis.currentAngles.kopsAngle)}`}>
                      {formatKopsAngle(staticAnalysis.currentAngles.kopsAngle)}
                    </span>
                  </div>

                  <div className="flex justify-between text-sm border-t border-gray-700 pt-2">
                    <span className="text-gray-400">Confidenza:</span>
                    <span className={`font-mono ${
                      staticAnalysis.currentAngles.confidence >= 0.8 ? 'text-green-400' :
                      staticAnalysis.currentAngles.confidence >= 0.6 ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {Math.round(staticAnalysis.currentAngles.confidence * 100)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Measurements status */}
              <div className="card p-4">
                <h3 className="text-sm font-medium text-gray-300 mb-3">Misurazioni</h3>
                <div className="space-y-3">
                  {STEP_ORDER.map((step, index) => {
                    const measurement = staticAnalysis.measurements[step === 'heel_on_pedal' ? 'heelOnPedal' : 'clippedIn'];
                    const isCurrent = index === currentStepIndex;

                    return (
                      <div
                        key={step}
                        className={`p-3 rounded-lg ${
                          measurement
                            ? 'bg-green-600/20 border border-green-600/50'
                            : isCurrent
                            ? 'bg-blue-600/20 border border-blue-600/50'
                            : 'bg-gray-700/50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-sm font-medium ${
                            measurement ? 'text-green-400' : isCurrent ? 'text-blue-400' : 'text-gray-400'
                          }`}>
                            {STEP_CONFIG[step].label}
                          </span>
                          {measurement && (
                            <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        {measurement ? (
                          <div>
                            <div className="text-2xl font-bold text-white">
                              {formatAngle(measurement.kneeAngle)}
                            </div>
                            {measurement.kopsAngle !== null && (
                              <div className={`text-sm ${getKopsAngleColorClass(measurement.kopsAngle)}`}>
                                KOPS: {formatKopsAngle(measurement.kopsAngle)}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500">
                            {isCurrent ? 'In attesa...' : 'Non ancora misurato'}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Reference info */}
              <div className="card p-4">
                <h3 className="text-sm font-medium text-gray-300 mb-2">Valori di Riferimento</h3>
                <div className="text-xs text-gray-500 space-y-2">
                  <div>
                    <span className="text-gray-400">Tallone sul pedale:</span>
                    <span className="text-white ml-2">170°-180° (gamba quasi dritta)</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Pedale agganciato:</span>
                    <span className="text-white ml-2">145°-155° (leggera flessione)</span>
                  </div>
                  <div>
                    <span className="text-gray-400">KOPS (ore 3):</span>
                    <span className="text-white ml-2">0° ± 2° (ginocchio sopra pedale)</span>
                  </div>
                  <div className="pt-2 border-t border-gray-700">
                    <span className="text-gray-400">Posizione:</span>
                    <span className="text-white ml-2">Telecamera di lato, pedale a ore 6</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 border-t border-gray-700 px-4 py-2 text-center text-xs text-gray-500">
        BiomechCoach - Posiziona la telecamera di lato per una misurazione accurata
      </footer>
    </div>
  );
};

export default CyclingStaticCaptureView;
