/**
 * BiomechCoach - Capture View Component
 *
 * Main analysis view with camera feed, pose overlay,
 * angle measurements, and coaching suggestions.
 */

import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ActivityMode } from '../lib/poseTypes';
import useCameraStream from '../hooks/useCameraStream';
import usePoseEstimation from '../hooks/usePoseEstimation';
import useCyclingAnalysis from '../hooks/useCyclingAnalysis';
import useRunningAnalysis from '../hooks/useRunningAnalysis';
import CameraFeed from './CameraFeed';
import PoseOverlayCanvas from './PoseOverlayCanvas';
import AnglePanel from './AnglePanel';
import SummaryPanel from './SummaryPanel';

interface CaptureViewProps {
  /** Activity mode */
  mode: ActivityMode;
}

/**
 * Capture View Component
 */
const CaptureView: React.FC<CaptureViewProps> = ({ mode }) => {
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

  // Analysis hooks
  const cyclingAnalysis = useCyclingAnalysis();
  const runningAnalysis = useRunningAnalysis();

  // Get the appropriate analysis based on mode
  const analysis = mode === 'cycling' ? cyclingAnalysis : runningAnalysis;

  // State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const animationFrameRef = useRef<number>(0);
  const lastProcessTimeRef = useRef<number>(0);

  // Target FPS for processing (to avoid overwhelming the system)
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

    // Throttle processing to target FPS
    if (elapsed >= FRAME_INTERVAL) {
      lastProcessTimeRef.current = now;

      // Process the current frame
      processFrame(videoRef.current).then((pose) => {
        if (pose && pose.isValid) {
          setIsAnalyzing(true);

          // Run analysis based on mode
          if (mode === 'cycling') {
            cyclingAnalysis.processFrame(pose);
          } else {
            runningAnalysis.processFrame(
              pose,
              dimensions?.width || 640,
              dimensions?.height || 480
            );
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
    mode,
    cyclingAnalysis,
    runningAnalysis,
    dimensions,
    FRAME_INTERVAL,
  ]);

  /**
   * Start/stop processing loop based on camera status
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
    analysis.reset();
    navigate('/');
  };

  /**
   * Handle reset analysis
   */
  const handleReset = () => {
    analysis.reset();
    setIsAnalyzing(false);
  };

  /**
   * Get current angles for overlay as a plain record
   */
  const getCurrentAnglesForOverlay = (): Record<string, number | null> => {
    if (mode === 'cycling') {
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
    }
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
              <h1 className="text-lg font-semibold text-white">
                {mode === 'cycling' ? 'Cycling Analysis' : 'Running Analysis'}
              </h1>
              <p className="text-xs text-gray-400">
                {poseStatus === 'ready' ? 'Pose model ready' : 'Loading pose model...'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleReset}
              className="px-3 py-1.5 text-sm text-gray-300 hover:text-white
                       bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              Reset
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Video feed with overlay - takes 2 columns on large screens */}
            <div className="lg:col-span-2">
              <div className="card overflow-hidden">
                <CameraFeed
                  ref={videoRef as React.RefObject<HTMLVideoElement>}
                  status={cameraStatus}
                  error={cameraError || poseError}
                  onStart={startCamera}
                  onStop={stopCamera}
                  dimensions={dimensions}
                  showFramingGuide={!isAnalyzing}
                  mode={mode}
                >
                  {/* Pose overlay canvas */}
                  {dimensions && currentPose && (
                    <PoseOverlayCanvas
                      pose={currentPose}
                      width={dimensions.width}
                      height={dimensions.height}
                      mirrored={true}
                      showAngles={true}
                      angles={getCurrentAnglesForOverlay()}
                      mode={mode}
                    />
                  )}
                </CameraFeed>
              </div>

              {/* Status bar below video */}
              <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                <span>
                  {poseStatus === 'loading' && 'Loading pose model...'}
                  {poseStatus === 'ready' && isStreaming && `Processing at ${fps} FPS`}
                  {poseStatus === 'error' && 'Pose model error'}
                </span>
                <span>
                  {mode === 'cycling'
                    ? `${cyclingAnalysis.cycleCount} pedal cycles detected`
                    : `${runningAnalysis.strideCount} strides detected`}
                </span>
              </div>
            </div>

            {/* Side panel - angle measurements and suggestions */}
            <div className="space-y-4">
              {/* Angle Panel */}
              <AnglePanel
                mode={mode}
                currentAngles={getCurrentAnglesForOverlay()}
                angleStats={analysis.angleStats}
                fps={fps}
                cycleCount={mode === 'cycling' ? cyclingAnalysis.cycleCount : runningAnalysis.strideCount}
                cadence={mode === 'running' ? runningAnalysis.cadence : undefined}
                duration={analysis.duration}
              />

              {/* Summary Panel */}
              <SummaryPanel
                suggestions={analysis.suggestions}
                muscleInsights={analysis.muscleInsights}
                isAnalyzing={isAnalyzing && isStreaming}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Footer info */}
      <footer className="bg-gray-800 border-t border-gray-700 px-4 py-2 text-center text-xs text-gray-500">
        BiomechCoach - Position your camera at side view for best results
      </footer>
    </div>
  );
};

export default CaptureView;
