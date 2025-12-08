/**
 * BiomechCoach - Pose Estimation Hook
 *
 * Manages pose estimation using MediaPipe Pose.
 * Processes video frames and extracts keypoints.
 *
 * This implementation uses MediaPipe Pose loaded from CDN
 * for better browser compatibility.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Keypoint,
  PoseFrame,
  KeypointName,
  KEYPOINT_INDICES,
  MIN_KEYPOINT_CONFIDENCE,
} from '../lib/poseTypes';

/**
 * Pose estimation status
 */
export type PoseEstimationStatus =
  | 'uninitialized'
  | 'loading'
  | 'ready'
  | 'processing'
  | 'error';

/**
 * MediaPipe Pose configuration
 */
export interface PoseConfig {
  /** Model complexity: 0 (lite), 1 (full), 2 (heavy) */
  modelComplexity: 0 | 1 | 2;
  /** Minimum detection confidence */
  minDetectionConfidence: number;
  /** Minimum tracking confidence */
  minTrackingConfidence: number;
  /** Enable segmentation mask */
  enableSegmentation: boolean;
  /** Smooth segmentation */
  smoothSegmentation: boolean;
}

/**
 * Default pose configuration
 */
const DEFAULT_CONFIG: PoseConfig = {
  modelComplexity: 1,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5,
  enableSegmentation: false,
  smoothSegmentation: false,
};

/**
 * Hook return type
 */
export interface UsePoseEstimationReturn {
  /** Current status */
  status: PoseEstimationStatus;
  /** Error message if any */
  error: string | null;
  /** Current pose frame */
  currentPose: PoseFrame | null;
  /** Initialize the pose model */
  initialize: (config?: Partial<PoseConfig>) => Promise<void>;
  /** Process a video element */
  processFrame: (video: HTMLVideoElement) => Promise<PoseFrame | null>;
  /** Stop processing */
  stop: () => void;
  /** Is currently processing */
  isProcessing: boolean;
  /** Frames per second */
  fps: number;
}

// Type declarations for MediaPipe Pose (loaded from CDN)
interface MediaPipePoseResults {
  poseLandmarks?: Array<{
    x: number;
    y: number;
    z: number;
    visibility?: number;
  }>;
}

interface MediaPipePose {
  setOptions: (options: Record<string, unknown>) => void;
  onResults: (callback: (results: MediaPipePoseResults) => void) => void;
  send: (input: { image: HTMLVideoElement }) => Promise<void>;
  close: () => void;
}

// Declare global window type for MediaPipe
declare global {
  interface Window {
    Pose?: new (config: { locateFile: (file: string) => string }) => MediaPipePose;
  }
}

/**
 * MediaPipe keypoint names in order
 */
const MEDIAPIPE_KEYPOINT_NAMES: KeypointName[] = [
  'nose',
  'left_eye_inner',
  'left_eye',
  'left_eye_outer',
  'right_eye_inner',
  'right_eye',
  'right_eye_outer',
  'left_ear',
  'right_ear',
  'mouth_left',
  'mouth_right',
  'left_shoulder',
  'right_shoulder',
  'left_elbow',
  'right_elbow',
  'left_wrist',
  'right_wrist',
  'left_pinky',
  'right_pinky',
  'left_index',
  'right_index',
  'left_thumb',
  'right_thumb',
  'left_hip',
  'right_hip',
  'left_knee',
  'right_knee',
  'left_ankle',
  'right_ankle',
  'left_heel',
  'right_heel',
  'left_foot_index',
  'right_foot_index',
];

/**
 * Load MediaPipe scripts from CDN
 */
async function loadMediaPipeScripts(): Promise<void> {
  // Check if already loaded
  if (window.Pose) return;

  const scripts = [
    'https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/pose.js',
  ];

  for (const src of scripts) {
    await new Promise<void>((resolve, reject) => {
      // Check if script already exists
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = src;
      script.crossOrigin = 'anonymous';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load: ${src}`));
      document.head.appendChild(script);
    });
  }

  // Wait for Pose to be available
  let attempts = 0;
  while (!window.Pose && attempts < 50) {
    await new Promise((r) => setTimeout(r, 100));
    attempts++;
  }

  if (!window.Pose) {
    throw new Error('MediaPipe Pose failed to initialize');
  }
}

/**
 * Custom hook for pose estimation
 */
export function usePoseEstimation(): UsePoseEstimationReturn {
  const [status, setStatus] = useState<PoseEstimationStatus>('uninitialized');
  const [error, setError] = useState<string | null>(null);
  const [currentPose, setCurrentPose] = useState<PoseFrame | null>(null);
  const [fps, setFps] = useState<number>(0);

  const poseRef = useRef<MediaPipePose | null>(null);
  const startTimeRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  const lastFpsUpdateRef = useRef<number>(0);
  const isProcessingRef = useRef<boolean>(false);
  const latestResultsRef = useRef<MediaPipePoseResults | null>(null);

  /**
   * Initialize the pose model
   */
  const initialize = useCallback(async (config: Partial<PoseConfig> = {}) => {
    setStatus('loading');
    setError(null);

    const finalConfig = { ...DEFAULT_CONFIG, ...config };

    try {
      // Load MediaPipe scripts
      await loadMediaPipeScripts();

      // Create pose instance
      const pose = new window.Pose!({
        locateFile: (file: string) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/${file}`;
        },
      });

      // Configure pose model
      pose.setOptions({
        modelComplexity: finalConfig.modelComplexity,
        smoothLandmarks: true,
        enableSegmentation: finalConfig.enableSegmentation,
        smoothSegmentation: finalConfig.smoothSegmentation,
        minDetectionConfidence: finalConfig.minDetectionConfidence,
        minTrackingConfidence: finalConfig.minTrackingConfidence,
      });

      // Set up results callback
      pose.onResults((results: MediaPipePoseResults) => {
        latestResultsRef.current = results;
      });

      poseRef.current = pose;
      startTimeRef.current = performance.now();
      setStatus('ready');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to initialize pose model: ${errorMessage}`);
      setStatus('error');
      console.error('Pose initialization error:', err);
    }
  }, []);

  /**
   * Convert MediaPipe results to our PoseFrame format
   */
  const convertToPoseFrame = useCallback(
    (
      results: MediaPipePoseResults,
      videoWidth: number,
      videoHeight: number
    ): PoseFrame => {
      const timestamp = performance.now() - startTimeRef.current;

      if (!results.poseLandmarks) {
        return {
          timestamp,
          keypoints: [],
          isValid: false,
        };
      }

      const keypoints: Keypoint[] = results.poseLandmarks.map((landmark, index) => {
        const name = MEDIAPIPE_KEYPOINT_NAMES[index] || (`unknown_${index}` as KeypointName);
        return {
          name,
          x: landmark.x * videoWidth,
          y: landmark.y * videoHeight,
          score: landmark.visibility ?? 0.5,
        };
      });

      // Check if we have enough high-confidence keypoints for valid pose
      const validKeypoints = keypoints.filter((kp) => kp.score >= MIN_KEYPOINT_CONFIDENCE);
      const isValid = validKeypoints.length >= 10; // At least 10 keypoints visible

      return {
        timestamp,
        keypoints,
        isValid,
      };
    },
    []
  );

  /**
   * Process a single video frame
   */
  const processFrame = useCallback(
    async (video: HTMLVideoElement): Promise<PoseFrame | null> => {
      if (!poseRef.current || status !== 'ready') {
        return null;
      }

      if (isProcessingRef.current) {
        return currentPose;
      }

      isProcessingRef.current = true;
      latestResultsRef.current = null;

      try {
        // Send frame to pose model
        await poseRef.current.send({ image: video });

        // Wait a bit for results callback
        await new Promise((r) => setTimeout(r, 10));

        const results = latestResultsRef.current;
        if (!results) {
          isProcessingRef.current = false;
          return null;
        }

        const poseFrame = convertToPoseFrame(results, video.videoWidth, video.videoHeight);
        setCurrentPose(poseFrame);

        // Update FPS counter
        frameCountRef.current++;
        const now = performance.now();
        if (now - lastFpsUpdateRef.current >= 1000) {
          const elapsed = (now - lastFpsUpdateRef.current) / 1000;
          setFps(Math.round(frameCountRef.current / elapsed));
          frameCountRef.current = 0;
          lastFpsUpdateRef.current = now;
        }

        isProcessingRef.current = false;
        return poseFrame;
      } catch (err) {
        console.error('Frame processing error:', err);
        isProcessingRef.current = false;
        return null;
      }
    },
    [status, currentPose, convertToPoseFrame]
  );

  /**
   * Stop processing and cleanup
   */
  const stop = useCallback(() => {
    isProcessingRef.current = false;
    if (poseRef.current) {
      poseRef.current.close();
      poseRef.current = null;
    }
    setStatus('uninitialized');
    setCurrentPose(null);
    setFps(0);
  }, []);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (poseRef.current) {
        poseRef.current.close();
      }
    };
  }, []);

  return {
    status,
    error,
    currentPose,
    initialize,
    processFrame,
    stop,
    isProcessing: isProcessingRef.current,
    fps,
  };
}

/**
 * Utility function to get keypoint by name from a pose frame
 */
export function getKeypoint(pose: PoseFrame | null, name: KeypointName): Keypoint | null {
  if (!pose || !pose.keypoints) return null;
  const index = KEYPOINT_INDICES[name];
  if (index === undefined) return null;
  const keypoint = pose.keypoints[index];
  if (!keypoint || keypoint.score < MIN_KEYPOINT_CONFIDENCE) return null;
  return keypoint;
}

export default usePoseEstimation;
