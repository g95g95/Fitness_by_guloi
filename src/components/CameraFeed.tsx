/**
 * BiomechCoach - Camera Feed Component
 *
 * Displays the video feed from the webcam with controls
 * for starting/stopping the camera.
 */

import React, { forwardRef } from 'react';
import { CameraStatus, CameraResolution, CAMERA_RESOLUTIONS } from '../hooks/useCameraStream';

interface CameraFeedProps {
  /** Camera status */
  status: CameraStatus;
  /** Error message if any */
  error: string | null;
  /** Start camera callback */
  onStart: (resolution?: CameraResolution) => void;
  /** Stop camera callback */
  onStop: () => void;
  /** Video dimensions */
  dimensions: { width: number; height: number } | null;
  /** Children (for overlay canvas) */
  children?: React.ReactNode;
  /** Show framing guide */
  showFramingGuide?: boolean;
  /** Activity mode for framing instructions */
  mode?: 'cycling' | 'running' | 'static';
}

/**
 * Camera Feed Component
 * Wraps video element with controls and status indicators
 */
const CameraFeed = forwardRef<HTMLVideoElement, CameraFeedProps>(
  (
    {
      status,
      error,
      onStart,
      onStop,
      dimensions,
      children,
      showFramingGuide = true,
      mode = 'cycling',
    },
    ref
  ) => {
    const getFramingInstructions = () => {
      if (mode === 'cycling') {
        return 'Position yourself in side view with your full body visible on the bike.';
      }
      if (mode === 'running') {
        return 'Position yourself in side view with your full body visible on the treadmill.';
      }
      // Static mode
      return 'Position yourself with your full body visible. View depends on the selected exercise.';
    };

    const renderStatusOverlay = () => {
      if (status === 'active') return null;

      return (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/90 z-10">
          {status === 'idle' && (
            <>
              <div className="text-center mb-6">
                <svg
                  className="w-16 h-16 mx-auto mb-4 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                <p className="text-gray-400 text-sm max-w-xs">
                  {getFramingInstructions()}
                </p>
              </div>
              <button
                onClick={() => onStart(CAMERA_RESOLUTIONS[1])}
                className="btn-primary"
              >
                Start Camera
              </button>
            </>
          )}

          {status === 'requesting' && (
            <div className="text-center">
              <div className="animate-spin w-12 h-12 border-4 border-biomech-500 border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-gray-300">Requesting camera access...</p>
              <p className="text-gray-500 text-sm mt-2">
                Please allow camera permissions when prompted.
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center max-w-sm">
              <svg
                className="w-16 h-16 mx-auto mb-4 text-red-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <p className="text-red-400 mb-4">{error}</p>
              <button onClick={() => onStart()} className="btn-secondary">
                Try Again
              </button>
            </div>
          )}

          {status === 'denied' && (
            <div className="text-center max-w-sm">
              <svg
                className="w-16 h-16 mx-auto mb-4 text-yellow-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                />
              </svg>
              <p className="text-yellow-400 mb-2">Camera Permission Denied</p>
              <p className="text-gray-400 text-sm mb-4">
                BiomechCoach needs camera access to analyze your movement.
                Please enable camera permissions in your browser settings.
              </p>
              <button onClick={() => onStart()} className="btn-secondary">
                Try Again
              </button>
            </div>
          )}
        </div>
      );
    };

    return (
      <div className="video-container">
        {/* Video element - mirrored for natural "mirror" experience */}
        <video
          ref={ref}
          autoPlay
          playsInline
          muted
          style={{ transform: 'scaleX(-1)' }}
        />

        {/* Overlay canvas (children) */}
        {children}

        {/* Status overlay */}
        {renderStatusOverlay()}

        {/* Framing guide when camera is active */}
        {status === 'active' && showFramingGuide && (
          <div className="absolute bottom-4 left-4 right-4 text-center">
            <p className="text-white/80 text-sm bg-black/50 px-3 py-1 rounded inline-block">
              {getFramingInstructions()}
            </p>
          </div>
        )}

        {/* Camera info badge */}
        {status === 'active' && dimensions && (
          <div className="absolute top-4 left-4 flex items-center gap-2">
            <span className="flex items-center gap-1.5 bg-black/50 text-white/80 text-xs px-2 py-1 rounded">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              {dimensions.width}x{dimensions.height}
            </span>
          </div>
        )}

        {/* Stop button when active */}
        {status === 'active' && (
          <button
            onClick={onStop}
            className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 text-white rounded-lg transition-colors"
            title="Stop Camera"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>
    );
  }
);

CameraFeed.displayName = 'CameraFeed';

export default CameraFeed;
