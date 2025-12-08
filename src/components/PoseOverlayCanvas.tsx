/**
 * BiomechCoach - Pose Overlay Canvas Component
 *
 * Draws the skeleton overlay on top of the video feed,
 * visualizing detected keypoints and connections.
 */

import React, { useRef, useEffect, useCallback } from 'react';
import { PoseFrame, SKELETON_CONNECTIONS, MIN_KEYPOINT_CONFIDENCE, Keypoint } from '../lib/poseTypes';

interface PoseOverlayCanvasProps {
  /** Current pose frame to draw */
  pose: PoseFrame | null;
  /** Canvas dimensions */
  width: number;
  height: number;
  /** Whether the video is mirrored */
  mirrored?: boolean;
  /** Show angle labels on joints */
  showAngles?: boolean;
  /** Current angles to display */
  angles?: Record<string, number | null>;
  /** Activity mode for angle display */
  mode?: 'cycling' | 'running';
}

/**
 * Colors for skeleton visualization
 */
const COLORS = {
  skeleton: '#0ea5e9',       // Biomech blue
  skeletonDim: '#0ea5e980',  // Semi-transparent
  joint: '#22c55e',          // Green for joints
  jointDim: '#22c55e80',     // Semi-transparent
  angleText: '#f59e0b',      // Amber for angle text
  angleArc: '#f59e0b50',     // Semi-transparent amber
};

/**
 * Draw a line between two points
 */
function drawLine(
  ctx: CanvasRenderingContext2D,
  from: { x: number; y: number },
  to: { x: number; y: number },
  color: string,
  lineWidth: number = 3
) {
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.stroke();
}

/**
 * Draw a circle at a point
 */
function drawCircle(
  ctx: CanvasRenderingContext2D,
  point: { x: number; y: number },
  radius: number,
  color: string
) {
  ctx.beginPath();
  ctx.arc(point.x, point.y, radius, 0, 2 * Math.PI);
  ctx.fillStyle = color;
  ctx.fill();
}

/**
 * Draw angle arc and label
 */
function drawAngle(
  ctx: CanvasRenderingContext2D,
  center: { x: number; y: number },
  angle: number,
  _label: string
) {
  // Draw text background
  ctx.font = 'bold 14px sans-serif';
  const text = `${Math.round(angle)}°`;
  const metrics = ctx.measureText(text);
  const textX = center.x + 15;
  const textY = center.y - 10;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(textX - 2, textY - 12, metrics.width + 8, 18);

  // Draw text
  ctx.fillStyle = COLORS.angleText;
  ctx.fillText(text, textX + 2, textY + 2);
}

/**
 * Pose Overlay Canvas Component
 */
const PoseOverlayCanvas: React.FC<PoseOverlayCanvasProps> = ({
  pose,
  width,
  height,
  mirrored = true,
  showAngles = true,
  angles = {},
  mode = 'cycling',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  /**
   * Get keypoint by name
   */
  const getKeypoint = useCallback(
    (name: string): Keypoint | undefined => {
      if (!pose) return undefined;
      return pose.keypoints.find((kp) => kp.name === name);
    },
    [pose]
  );

  /**
   * Transform point coordinates (mirror if needed)
   */
  const transformPoint = useCallback(
    (x: number, y: number): { x: number; y: number } => {
      return {
        x: mirrored ? width - x : x,
        y: y,
      };
    },
    [mirrored, width]
  );

  /**
   * Draw the pose overlay
   */
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    if (!pose || !pose.isValid) return;

    // Draw skeleton connections
    for (const [startName, endName] of SKELETON_CONNECTIONS) {
      const startKp = getKeypoint(startName);
      const endKp = getKeypoint(endName);

      if (!startKp || !endKp) continue;

      const isLowConfidence =
        startKp.score < MIN_KEYPOINT_CONFIDENCE || endKp.score < MIN_KEYPOINT_CONFIDENCE;

      const startPoint = transformPoint(startKp.x, startKp.y);
      const endPoint = transformPoint(endKp.x, endKp.y);

      drawLine(
        ctx,
        startPoint,
        endPoint,
        isLowConfidence ? COLORS.skeletonDim : COLORS.skeleton,
        isLowConfidence ? 2 : 3
      );
    }

    // Draw keypoints
    for (const keypoint of pose.keypoints) {
      const isLowConfidence = keypoint.score < MIN_KEYPOINT_CONFIDENCE;
      const point = transformPoint(keypoint.x, keypoint.y);

      // Different sizes for different joint types
      let radius = 5;
      if (keypoint.name.includes('eye') || keypoint.name.includes('ear')) {
        radius = 3;
      } else if (
        keypoint.name.includes('hip') ||
        keypoint.name.includes('knee') ||
        keypoint.name.includes('shoulder')
      ) {
        radius = 7;
      }

      drawCircle(ctx, point, radius, isLowConfidence ? COLORS.jointDim : COLORS.joint);
    }

    // Draw angle labels
    if (showAngles) {
      // Knee angles
      if (mode === 'cycling') {
        const leftKnee = getKeypoint('left_knee');
        const rightKnee = getKeypoint('right_knee');

        if (leftKnee && angles.leftKneeFlexion != null) {
          const point = transformPoint(leftKnee.x, leftKnee.y);
          drawAngle(ctx, point, angles.leftKneeFlexion, 'L Knee');
        }

        if (rightKnee && angles.rightKneeFlexion != null) {
          const point = transformPoint(rightKnee.x, rightKnee.y);
          drawAngle(ctx, point, angles.rightKneeFlexion, 'R Knee');
        }

        // Hip angles
        const leftHip = getKeypoint('left_hip');
        const rightHip = getKeypoint('right_hip');

        if (leftHip && angles.leftHipAngle != null) {
          const point = transformPoint(leftHip.x, leftHip.y);
          drawAngle(ctx, point, angles.leftHipAngle, 'L Hip');
        }

        if (rightHip && angles.rightHipAngle != null) {
          const point = transformPoint(rightHip.x, rightHip.y);
          drawAngle(ctx, point, angles.rightHipAngle, 'R Hip');
        }
      } else {
        // Running mode
        const leftKnee = getKeypoint('left_knee');
        const rightKnee = getKeypoint('right_knee');

        if (leftKnee && angles.leftKnee != null) {
          const point = transformPoint(leftKnee.x, leftKnee.y);
          drawAngle(ctx, point, angles.leftKnee, 'L Knee');
        }

        if (rightKnee && angles.rightKnee != null) {
          const point = transformPoint(rightKnee.x, rightKnee.y);
          drawAngle(ctx, point, angles.rightKnee, 'R Knee');
        }
      }
    }
  }, [pose, width, height, getKeypoint, transformPoint, showAngles, angles, mode]);

  // Redraw whenever pose changes
  useEffect(() => {
    draw();
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute inset-0 w-full h-full"
    />
  );
};

export default PoseOverlayCanvas;
