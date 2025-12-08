/**
 * BiomechCoach - Camera Stream Hook
 *
 * Handles camera permissions, stream initialization, and cleanup.
 * Provides a simple interface for accessing the webcam.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Camera status states
 */
export type CameraStatus =
  | 'idle'           // Not started
  | 'requesting'     // Requesting permissions
  | 'active'         // Camera is streaming
  | 'error'          // An error occurred
  | 'denied';        // Permission denied

/**
 * Camera resolution presets
 */
export interface CameraResolution {
  width: number;
  height: number;
  label: string;
}

/**
 * Available resolution options
 */
export const CAMERA_RESOLUTIONS: CameraResolution[] = [
  { width: 1920, height: 1080, label: '1080p (Full HD)' },
  { width: 1280, height: 720, label: '720p (HD)' },
  { width: 854, height: 480, label: '480p (SD)' },
  { width: 640, height: 360, label: '360p' },
];

/**
 * Hook return type
 */
export interface UseCameraStreamReturn {
  /** Reference to attach to video element */
  videoRef: React.RefObject<HTMLVideoElement | null>;
  /** Current camera status */
  status: CameraStatus;
  /** Error message if any */
  error: string | null;
  /** Start the camera stream */
  startCamera: (resolution?: CameraResolution) => Promise<void>;
  /** Stop the camera stream */
  stopCamera: () => void;
  /** Current stream dimensions */
  dimensions: { width: number; height: number } | null;
  /** Is the camera currently streaming */
  isStreaming: boolean;
  /** Available camera devices */
  devices: MediaDeviceInfo[];
  /** Switch to a different camera */
  switchCamera: (deviceId: string) => Promise<void>;
  /** Current device ID */
  currentDeviceId: string | null;
}

/**
 * Custom hook for managing camera stream
 *
 * @returns Camera stream controls and state
 */
export function useCameraStream(): UseCameraStreamReturn {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [status, setStatus] = useState<CameraStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [currentDeviceId, setCurrentDeviceId] = useState<string | null>(null);

  /**
   * Enumerate available video input devices
   */
  const enumerateDevices = useCallback(async () => {
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = allDevices.filter((d) => d.kind === 'videoinput');
      setDevices(videoDevices);
      return videoDevices;
    } catch {
      console.warn('Could not enumerate devices');
      return [];
    }
  }, []);

  /**
   * Start the camera stream
   */
  const startCamera = useCallback(
    async (resolution: CameraResolution = CAMERA_RESOLUTIONS[1]) => {
      // Check if mediaDevices API is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setStatus('error');
        setError('Camera API not available. Please use a modern browser with HTTPS.');
        return;
      }

      setStatus('requesting');
      setError(null);

      try {
        // Request camera access with preferred resolution
        const constraints: MediaStreamConstraints = {
          video: {
            width: { ideal: resolution.width },
            height: { ideal: resolution.height },
            facingMode: 'user', // Default to front camera
            frameRate: { ideal: 30, min: 15 },
          },
          audio: false,
        };

        // If we have a specific device ID, use it
        if (currentDeviceId) {
          (constraints.video as MediaTrackConstraints).deviceId = { exact: currentDeviceId };
        }

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;

        // Get actual stream dimensions
        const videoTrack = stream.getVideoTracks()[0];
        const settings = videoTrack.getSettings();
        setDimensions({
          width: settings.width || resolution.width,
          height: settings.height || resolution.height,
        });

        // Set device ID
        setCurrentDeviceId(settings.deviceId || null);

        // Attach stream to video element
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        setStatus('active');

        // Enumerate devices after successful camera access
        await enumerateDevices();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';

        if (errorMessage.includes('Permission denied') || errorMessage.includes('NotAllowedError')) {
          setStatus('denied');
          setError('Camera permission denied. Please allow camera access and try again.');
        } else if (errorMessage.includes('NotFoundError') || errorMessage.includes('DevicesNotFoundError')) {
          setStatus('error');
          setError('No camera found. Please connect a camera and try again.');
        } else if (errorMessage.includes('NotReadableError') || errorMessage.includes('TrackStartError')) {
          setStatus('error');
          setError('Camera is in use by another application. Please close other apps and try again.');
        } else {
          setStatus('error');
          setError(`Camera error: ${errorMessage}`);
        }

        console.error('Camera error:', err);
      }
    },
    [currentDeviceId, enumerateDevices]
  );

  /**
   * Stop the camera stream and release resources
   */
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setStatus('idle');
    setDimensions(null);
    setError(null);
  }, []);

  /**
   * Switch to a different camera device
   */
  const switchCamera = useCallback(
    async (deviceId: string) => {
      setCurrentDeviceId(deviceId);

      // If camera is currently active, restart with new device
      if (status === 'active') {
        stopCamera();
        // Small delay to ensure cleanup
        await new Promise((resolve) => setTimeout(resolve, 100));
        await startCamera();
      }
    },
    [status, stopCamera, startCamera]
  );

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  /**
   * Handle video element metadata loaded
   */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      setDimensions({
        width: video.videoWidth,
        height: video.videoHeight,
      });
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, []);

  return {
    videoRef,
    status,
    error,
    startCamera,
    stopCamera,
    dimensions,
    isStreaming: status === 'active',
    devices,
    switchCamera,
    currentDeviceId,
  };
}

export default useCameraStream;
