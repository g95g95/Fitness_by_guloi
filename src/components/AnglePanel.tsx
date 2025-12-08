/**
 * BiomechCoach - Angle Panel Component
 *
 * Displays real-time angle measurements in a side panel.
 */

import React from 'react';
import { AngleStats, ActivityMode } from '../lib/poseTypes';

interface AnglePanelProps {
  /** Activity mode (cycling/running) */
  mode: ActivityMode;
  /** Current real-time angles */
  currentAngles: Record<string, number | null>;
  /** Aggregated angle statistics */
  angleStats: Record<string, AngleStats>;
  /** FPS from pose estimation */
  fps?: number;
  /** Cycle/stride count */
  cycleCount?: number;
  /** Cadence (for running) */
  cadence?: number;
  /** Analysis duration in ms */
  duration?: number;
}

/**
 * Format angle value for display
 */
function formatAngle(value: number | null | undefined): string {
  if (value === null || value === undefined) return '--';
  return `${Math.round(value)}°`;
}

/**
 * Format duration in mm:ss
 */
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Single angle display card
 */
interface AngleCardProps {
  label: string;
  current: number | null | undefined;
  avg?: number | null;
  min?: number | null;
  max?: number | null;
  isHighlighted?: boolean;
}

const AngleCard: React.FC<AngleCardProps> = ({ label, current, avg, min, max, isHighlighted }) => {
  return (
    <div
      className={`p-3 rounded-lg ${isHighlighted ? 'bg-biomech-900/50 border border-biomech-500' : 'bg-gray-700/50'
        }`}
    >
      <div className="angle-label mb-1">{label}</div>
      <div className="angle-value">{formatAngle(current)}</div>
      {avg !== undefined && (
        <div className="mt-2 text-xs text-gray-400 space-y-0.5">
          <div className="flex justify-between">
            <span>Avg:</span>
            <span className="text-gray-300">{formatAngle(avg)}</span>
          </div>
          {min !== undefined && max !== undefined && (
            <div className="flex justify-between">
              <span>Range:</span>
              <span className="text-gray-300">
                {formatAngle(min)} - {formatAngle(max)}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Angle Panel Component
 */
const AnglePanel: React.FC<AnglePanelProps> = ({
  mode,
  currentAngles,
  angleStats,
  fps = 0,
  cycleCount = 0,
  cadence = 0,
  duration = 0,
}) => {
  const renderCyclingAngles = () => (
    <>
      {/* Primary angles */}
      <div className="grid grid-cols-2 gap-2">
        <AngleCard
          label="Left Knee (BDC)"
          current={currentAngles.leftKneeFlexion}
          avg={angleStats['left_knee_flexion']?.avg}
          min={angleStats['left_knee_flexion']?.min}
          max={angleStats['left_knee_flexion']?.max}
          isHighlighted
        />
        <AngleCard
          label="Right Knee (BDC)"
          current={currentAngles.rightKneeFlexion}
          avg={angleStats['right_knee_flexion']?.avg}
          min={angleStats['right_knee_flexion']?.min}
          max={angleStats['right_knee_flexion']?.max}
          isHighlighted
        />
      </div>

      {/* Secondary angles */}
      <div className="grid grid-cols-2 gap-2 mt-2">
        <AngleCard
          label="Left Hip"
          current={currentAngles.leftHipAngle}
          avg={angleStats['left_hip_angle']?.avg}
        />
        <AngleCard
          label="Right Hip"
          current={currentAngles.rightHipAngle}
          avg={angleStats['right_hip_angle']?.avg}
        />
      </div>

      <div className="mt-2">
        <AngleCard
          label="Trunk Angle"
          current={currentAngles.trunkAngle}
          avg={angleStats['trunk_angle']?.avg}
          min={angleStats['trunk_angle']?.min}
          max={angleStats['trunk_angle']?.max}
        />
      </div>
    </>
  );

  const renderRunningAngles = () => (
    <>
      {/* Primary angles */}
      <div className="grid grid-cols-2 gap-2">
        <AngleCard
          label="Left Knee"
          current={currentAngles.leftKnee}
          avg={angleStats['left_knee_midstance']?.avg}
          min={angleStats['left_knee_midstance']?.min}
          max={angleStats['left_knee_midstance']?.max}
          isHighlighted
        />
        <AngleCard
          label="Right Knee"
          current={currentAngles.rightKnee}
          avg={angleStats['right_knee_midstance']?.avg}
          min={angleStats['right_knee_midstance']?.min}
          max={angleStats['right_knee_midstance']?.max}
          isHighlighted
        />
      </div>

      {/* Hip extension */}
      <div className="grid grid-cols-2 gap-2 mt-2">
        <AngleCard
          label="Left Hip Ext."
          current={currentAngles.leftHipAngle}
          avg={angleStats['left_hip_extension']?.avg}
          max={angleStats['left_hip_extension']?.max}
        />
        <AngleCard
          label="Right Hip Ext."
          current={currentAngles.rightHipAngle}
          avg={angleStats['right_hip_extension']?.avg}
          max={angleStats['right_hip_extension']?.max}
        />
      </div>

      <div className="mt-2">
        <AngleCard
          label="Trunk Lean"
          current={currentAngles.trunkLean}
          avg={angleStats['trunk_lean']?.avg}
          min={angleStats['trunk_lean']?.min}
          max={angleStats['trunk_lean']?.max}
        />
      </div>

      {/* Cadence display for running */}
      {cadence > 0 && (
        <div className="mt-3 p-3 rounded-lg bg-biomech-900/30 border border-biomech-700">
          <div className="angle-label mb-1">Cadence</div>
          <div className="text-2xl font-mono font-bold text-biomech-300">
            {cadence} <span className="text-sm font-normal">spm</span>
          </div>
        </div>
      )}
    </>
  );

  return (
    <div className="card p-4">
      {/* Header with stats */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">
          {mode === 'cycling' ? 'Cycling Angles' : 'Running Angles'}
        </h3>
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span>{fps} FPS</span>
          <span>{formatDuration(duration)}</span>
        </div>
      </div>

      {/* Cycle/stride count */}
      <div className="mb-4 p-2 bg-gray-700/30 rounded flex items-center justify-between">
        <span className="text-sm text-gray-400">
          {mode === 'cycling' ? 'Pedal Cycles' : 'Strides'}
        </span>
        <span className="text-lg font-mono font-semibold text-white">{cycleCount}</span>
      </div>

      {/* Angle cards */}
      {mode === 'cycling' ? renderCyclingAngles() : renderRunningAngles()}

      {/* Reference info */}
      <div className="mt-4 pt-4 border-t border-gray-700">
        <p className="text-xs text-gray-500">
          {mode === 'cycling'
            ? 'Ideal knee angle at BDC: 140°-150°'
            : 'Maintain consistent cadence 170-180 spm for efficiency'}
        </p>
      </div>
    </div>
  );
};

export default AnglePanel;
