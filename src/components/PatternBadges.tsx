/**
 * BiomechCoach - Pattern Badges Component
 *
 * Displays detected biomechanical pattern flags as visual badges.
 * Provides at-a-glance feedback about detected issues.
 */

import React from 'react';
import { PatternFlags, RunningPatternFlags, CyclingPatternFlags, StaticPatternFlags } from '../lib/poseTypes';

interface PatternBadgesProps {
  /** Pattern flags to display */
  patterns: PatternFlags | StaticPatternFlags;
  /** Activity mode for context-appropriate display */
  mode: 'cycling' | 'running' | 'static';
  /** Compact display mode */
  compact?: boolean;
}

/**
 * Pattern badge configuration
 */
interface PatternConfig {
  label: string;
  shortLabel: string;
  color: 'red' | 'orange' | 'yellow' | 'blue';
  icon: string;
}

/**
 * Running pattern configurations
 */
const RUNNING_PATTERNS: Record<keyof RunningPatternFlags, PatternConfig> = {
  overstride: {
    label: 'Overstriding',
    shortLabel: 'Overstride',
    color: 'orange',
    icon: '👟',
  },
  hip_drop: {
    label: 'Hip Drop',
    shortLabel: 'Hip Drop',
    color: 'orange',
    icon: '⬇️',
  },
  knee_valgus: {
    label: 'Knee Valgus',
    shortLabel: 'Valgus',
    color: 'red',
    icon: '🦵',
  },
  pronation: {
    label: 'Excessive Pronation',
    shortLabel: 'Pronation',
    color: 'yellow',
    icon: '🦶',
  },
  limited_hip_extension: {
    label: 'Limited Hip Extension',
    shortLabel: 'Hip Ext.',
    color: 'yellow',
    icon: '🔄',
  },
  excessive_trunk_lean: {
    label: 'Trunk Lean Issue',
    shortLabel: 'Trunk',
    color: 'yellow',
    icon: '🧍',
  },
};

/**
 * Cycling pattern configurations
 */
const CYCLING_PATTERNS: Record<keyof CyclingPatternFlags, PatternConfig> = {
  saddle_low: {
    label: 'Saddle Too Low',
    shortLabel: 'Low Saddle',
    color: 'orange',
    icon: '⬇️',
  },
  saddle_high: {
    label: 'Saddle Too High',
    shortLabel: 'High Saddle',
    color: 'orange',
    icon: '⬆️',
  },
  knee_tracking_instability: {
    label: 'Knee Tracking Issue',
    shortLabel: 'Knee Track',
    color: 'red',
    icon: '↔️',
  },
  excessive_trunk_lean: {
    label: 'Aggressive Position',
    shortLabel: 'Aggressive',
    color: 'blue',
    icon: '🚴',
  },
};

/**
 * Static assessment pattern configurations
 */
const STATIC_PATTERNS: Record<keyof StaticPatternFlags, PatternConfig> = {
  static_instability: {
    label: 'Balance Instability',
    shortLabel: 'Unstable',
    color: 'orange',
    icon: '⚖️',
  },
  static_hip_drop: {
    label: 'Pelvic Drop',
    shortLabel: 'Hip Drop',
    color: 'orange',
    icon: '⬇️',
  },
  static_knee_valgus: {
    label: 'Knee Valgus',
    shortLabel: 'Valgus',
    color: 'red',
    icon: '🦵',
  },
  static_trunk_compensation: {
    label: 'Trunk Compensation',
    shortLabel: 'Trunk',
    color: 'yellow',
    icon: '🧍',
  },
  static_asymmetry: {
    label: 'Left/Right Asymmetry',
    shortLabel: 'Asymmetry',
    color: 'yellow',
    icon: '↔️',
  },
  static_ankle_pronation: {
    label: 'Ankle Pronation',
    shortLabel: 'Pronation',
    color: 'yellow',
    icon: '🦶',
  },
};

/**
 * Color class mappings
 */
const COLOR_CLASSES: Record<string, string> = {
  red: 'bg-red-500/20 text-red-400 border-red-500/30',
  orange: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  yellow: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
};

/**
 * Single badge component
 */
const Badge: React.FC<{
  config: PatternConfig;
  compact?: boolean;
}> = ({ config, compact }) => {
  const colorClass = COLOR_CLASSES[config.color] || COLOR_CLASSES.yellow;

  if (compact) {
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 text-xs rounded border ${colorClass}`}
        title={config.label}
      >
        <span className="mr-1">{config.icon}</span>
        {config.shortLabel}
      </span>
    );
  }

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${colorClass}`}
    >
      <span className="text-lg">{config.icon}</span>
      <span className="text-sm font-medium">{config.label}</span>
    </div>
  );
};

/**
 * Pattern Badges Component
 */
const PatternBadges: React.FC<PatternBadgesProps> = ({
  patterns,
  mode,
  compact = false,
}) => {
  // Get active patterns
  const activePatterns: Array<{ key: string; config: PatternConfig }> = [];

  if (mode === 'running') {
    const runningKeys = Object.keys(RUNNING_PATTERNS) as (keyof RunningPatternFlags)[];
    for (const key of runningKeys) {
      if ((patterns as RunningPatternFlags)[key]) {
        activePatterns.push({
          key,
          config: RUNNING_PATTERNS[key],
        });
      }
    }
  } else if (mode === 'cycling') {
    const cyclingKeys = Object.keys(CYCLING_PATTERNS) as (keyof CyclingPatternFlags)[];
    for (const key of cyclingKeys) {
      if ((patterns as CyclingPatternFlags)[key]) {
        activePatterns.push({
          key,
          config: CYCLING_PATTERNS[key],
        });
      }
    }
  } else if (mode === 'static') {
    const staticKeys = Object.keys(STATIC_PATTERNS) as (keyof StaticPatternFlags)[];
    for (const key of staticKeys) {
      if ((patterns as StaticPatternFlags)[key]) {
        activePatterns.push({
          key,
          config: STATIC_PATTERNS[key],
        });
      }
    }
  }

  // No patterns detected
  if (activePatterns.length === 0) {
    return null;
  }

  return (
    <div className={compact ? 'flex flex-wrap gap-1' : 'space-y-2'}>
      {activePatterns.map(({ key, config }) => (
        <Badge key={key} config={config} compact={compact} />
      ))}
    </div>
  );
};

/**
 * Summary section showing pattern count
 */
export const PatternSummary: React.FC<{
  patterns: PatternFlags | StaticPatternFlags;
  mode: 'cycling' | 'running' | 'static';
}> = ({ patterns, mode }) => {
  let count = 0;

  if (mode === 'running') {
    const runningKeys = Object.keys(RUNNING_PATTERNS) as (keyof RunningPatternFlags)[];
    count = runningKeys.filter((key) => (patterns as RunningPatternFlags)[key]).length;
  } else if (mode === 'cycling') {
    const cyclingKeys = Object.keys(CYCLING_PATTERNS) as (keyof CyclingPatternFlags)[];
    count = cyclingKeys.filter((key) => (patterns as CyclingPatternFlags)[key]).length;
  } else if (mode === 'static') {
    const staticKeys = Object.keys(STATIC_PATTERNS) as (keyof StaticPatternFlags)[];
    count = staticKeys.filter((key) => (patterns as StaticPatternFlags)[key]).length;
  }

  if (count === 0) {
    return (
      <div className="text-sm text-green-400 flex items-center gap-2">
        <span>✓</span>
        <span>No significant patterns detected</span>
      </div>
    );
  }

  return (
    <div className="text-sm text-yellow-400 flex items-center gap-2">
      <span>⚠</span>
      <span>
        {count} pattern{count > 1 ? 's' : ''} detected
      </span>
    </div>
  );
};

export default PatternBadges;
