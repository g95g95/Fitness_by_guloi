/**
 * BiomechCoach - Recording Timer Component
 *
 * Displays countdown overlay during static exercise recording.
 * Shows 3-2-1 countdown, then recording progress.
 */

import React, { useState, useEffect } from 'react';

interface RecordingTimerProps {
  /** Whether recording is active */
  isRecording: boolean;
  /** Target duration in seconds */
  targetDuration: number;
  /** Current elapsed seconds */
  elapsedSeconds: number;
  /** Callback when countdown completes */
  onCountdownComplete?: () => void;
  /** Callback when recording completes */
  onRecordingComplete?: () => void;
}

type RecordingPhase = 'idle' | 'countdown' | 'recording' | 'complete';

/**
 * Recording Timer Component
 */
const RecordingTimer: React.FC<RecordingTimerProps> = ({
  isRecording,
  targetDuration,
  elapsedSeconds,
  onCountdownComplete,
  onRecordingComplete,
}) => {
  const [phase, setPhase] = useState<RecordingPhase>('idle');
  const [countdownValue, setCountdownValue] = useState(3);

  // Handle phase transitions
  useEffect(() => {
    if (isRecording && phase === 'idle') {
      setPhase('countdown');
      setCountdownValue(3);
    } else if (!isRecording && phase !== 'idle') {
      setPhase('complete');
      // Reset after a moment
      const timer = setTimeout(() => setPhase('idle'), 2000);
      return () => clearTimeout(timer);
    }
  }, [isRecording, phase]);

  // Handle countdown
  useEffect(() => {
    if (phase !== 'countdown') return;

    if (countdownValue > 0) {
      const timer = setTimeout(() => {
        setCountdownValue((v) => v - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setPhase('recording');
      onCountdownComplete?.();
    }
  }, [phase, countdownValue, onCountdownComplete]);

  // Check for recording completion
  useEffect(() => {
    if (phase === 'recording' && elapsedSeconds >= targetDuration) {
      setPhase('complete');
      onRecordingComplete?.();
    }
  }, [phase, elapsedSeconds, targetDuration, onRecordingComplete]);

  // Calculate remaining time
  const remainingSeconds = Math.max(0, targetDuration - elapsedSeconds);
  const progressPercent = (elapsedSeconds / targetDuration) * 100;

  // Don't render if idle
  if (phase === 'idle') return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
      {/* Semi-transparent overlay during countdown */}
      {phase === 'countdown' && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      )}

      {/* Countdown display */}
      {phase === 'countdown' && (
        <div className="relative text-center">
          <div className="text-9xl font-bold text-white animate-pulse">
            {countdownValue}
          </div>
          <div className="text-xl text-gray-300 mt-4">Get Ready...</div>
        </div>
      )}

      {/* Recording indicator */}
      {phase === 'recording' && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2">
          <div className="bg-black/70 backdrop-blur-sm rounded-full px-6 py-3 flex items-center gap-3">
            {/* Recording dot */}
            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />

            {/* Time display */}
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-white tabular-nums">
                {Math.ceil(remainingSeconds)}
              </span>
              <span className="text-sm text-gray-400">s remaining</span>
            </div>

            {/* Circular progress */}
            <div className="relative w-8 h-8">
              <svg className="w-8 h-8 -rotate-90" viewBox="0 0 32 32">
                {/* Background circle */}
                <circle
                  cx="16"
                  cy="16"
                  r="14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  className="text-gray-600"
                />
                {/* Progress circle */}
                <circle
                  cx="16"
                  cy="16"
                  r="14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeDasharray={`${2 * Math.PI * 14}`}
                  strokeDashoffset={`${2 * Math.PI * 14 * (1 - progressPercent / 100)}`}
                  strokeLinecap="round"
                  className="text-purple-500 transition-all duration-100"
                />
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* Completion display */}
      {phase === 'complete' && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center">
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
              <svg className="w-10 h-10 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="text-2xl font-bold text-white">Recording Complete</div>
            <div className="text-gray-400 mt-2">Analyzing results...</div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Standalone countdown component for use outside video overlay
 */
export const CountdownOverlay: React.FC<{
  seconds: number;
  onComplete: () => void;
}> = ({ seconds, onComplete }) => {
  const [count, setCount] = useState(seconds);

  useEffect(() => {
    if (count > 0) {
      const timer = setTimeout(() => setCount((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      onComplete();
    }
  }, [count, onComplete]);

  if (count === 0) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="text-center">
        <div className="text-9xl font-bold text-white animate-pulse">{count}</div>
        <div className="text-xl text-gray-300 mt-4">Get Ready...</div>
      </div>
    </div>
  );
};

/**
 * Progress bar component for recording
 */
export const RecordingProgressBar: React.FC<{
  elapsed: number;
  total: number;
  isRecording: boolean;
}> = ({ elapsed, total, isRecording }) => {
  const percent = Math.min(100, (elapsed / total) * 100);

  if (!isRecording) return null;

  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-gray-400 mb-1">
        <span>Recording...</span>
        <span>{Math.ceil(total - elapsed)}s remaining</span>
      </div>
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-purple-500 transition-all duration-100 ease-linear"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
};

export default RecordingTimer;
