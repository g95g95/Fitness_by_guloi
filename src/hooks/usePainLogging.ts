/**
 * BiomechCoach - Pain Logging Hook
 *
 * Manages pain tracking for session-level correlation analysis.
 * Stores pain entries in localStorage for persistence across sessions.
 *
 * Note: This is for educational/tracking purposes only and does not
 * provide medical advice or diagnosis.
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  PainEntry,
  PainLocation,
  PainCorrelation,
  PatternFlags,
  SymmetryMetrics,
  FrontalMetrics,
} from '../lib/poseTypes';

/**
 * Local storage key for pain entries
 */
const STORAGE_KEY = 'biomechcoach_pain_entries';

/**
 * Maximum number of entries to keep in history
 */
const MAX_ENTRIES = 50;

/**
 * Pain threshold for "high pain" classification
 */
const HIGH_PAIN_THRESHOLD = 6;

/**
 * Pain threshold for "low pain" classification
 */
const LOW_PAIN_THRESHOLD = 2;

/**
 * Hook return type
 */
export interface UsePainLoggingReturn {
  /** All stored pain entries */
  entries: PainEntry[];
  /** Add a new pain entry */
  addEntry: (
    intensity: number,
    location: PainLocation,
    notes?: string,
    sessionMetrics?: {
      patternFlags?: PatternFlags;
      symmetry?: SymmetryMetrics;
      frontalMetrics?: FrontalMetrics;
    }
  ) => void;
  /** Remove an entry by ID */
  removeEntry: (id: string) => void;
  /** Clear all entries */
  clearAll: () => void;
  /** Get entries filtered by pain level */
  getEntriesByPainLevel: (minPain: number, maxPain: number) => PainEntry[];
  /** Get pain correlations with patterns */
  getCorrelations: () => PainCorrelation[];
  /** Get summary text for correlations */
  getCorrelationSummary: () => string[];
  /** Average pain intensity */
  averagePain: number;
  /** Most common pain location */
  mostCommonLocation: PainLocation | null;
}

/**
 * Generate a simple unique ID
 */
function generateId(): string {
  return `pain_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Load entries from localStorage
 */
function loadEntries(): PainEntry[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to load pain entries:', error);
  }
  return [];
}

/**
 * Save entries to localStorage
 */
function saveEntries(entries: PainEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch (error) {
    console.error('Failed to save pain entries:', error);
  }
}

/**
 * Custom hook for pain logging and correlation analysis
 */
export function usePainLogging(): UsePainLoggingReturn {
  const [entries, setEntries] = useState<PainEntry[]>(() => loadEntries());

  // Save to localStorage whenever entries change
  useEffect(() => {
    saveEntries(entries);
  }, [entries]);

  /**
   * Add a new pain entry
   */
  const addEntry = useCallback(
    (
      intensity: number,
      location: PainLocation,
      notes?: string,
      sessionMetrics?: {
        patternFlags?: PatternFlags;
        symmetry?: SymmetryMetrics;
        frontalMetrics?: FrontalMetrics;
      }
    ) => {
      const newEntry: PainEntry = {
        id: generateId(),
        timestamp: Date.now(),
        intensity: Math.max(0, Math.min(10, intensity)), // Clamp 0-10
        location,
        notes,
        sessionMetrics,
      };

      setEntries((prev) => {
        // Add new entry and trim to max size
        const updated = [newEntry, ...prev].slice(0, MAX_ENTRIES);
        return updated;
      });
    },
    []
  );

  /**
   * Remove an entry by ID
   */
  const removeEntry = useCallback((id: string) => {
    setEntries((prev) => prev.filter((entry) => entry.id !== id));
  }, []);

  /**
   * Clear all entries
   */
  const clearAll = useCallback(() => {
    setEntries([]);
  }, []);

  /**
   * Get entries filtered by pain level
   */
  const getEntriesByPainLevel = useCallback(
    (minPain: number, maxPain: number): PainEntry[] => {
      return entries.filter(
        (entry) => entry.intensity >= minPain && entry.intensity <= maxPain
      );
    },
    [entries]
  );

  /**
   * Compute pattern-pain correlations
   */
  const getCorrelations = useCallback((): PainCorrelation[] => {
    const correlations: PainCorrelation[] = [];

    // Need at least a few entries for meaningful correlation
    if (entries.length < 3) return correlations;

    const highPainEntries = entries.filter((e) => e.intensity >= HIGH_PAIN_THRESHOLD);
    const lowPainEntries = entries.filter((e) => e.intensity <= LOW_PAIN_THRESHOLD);

    if (highPainEntries.length === 0 || lowPainEntries.length === 0) {
      return correlations;
    }

    // Count pattern occurrences in high vs low pain sessions
    const patterns: (keyof PatternFlags)[] = [
      'overstride',
      'hip_drop',
      'knee_valgus',
      'pronation',
      'limited_hip_extension',
      'excessive_trunk_lean',
      'saddle_low',
      'saddle_high',
      'knee_tracking_instability',
    ];

    for (const pattern of patterns) {
      const highPainCount = highPainEntries.filter(
        (e) => e.sessionMetrics?.patternFlags?.[pattern] === true
      ).length;

      const lowPainCount = lowPainEntries.filter(
        (e) => e.sessionMetrics?.patternFlags?.[pattern] === true
      ).length;

      // Calculate occurrence rates
      const highPainRate = highPainCount / highPainEntries.length;
      const lowPainRate = lowPainCount / lowPainEntries.length;

      // Only include if pattern appears in at least some sessions
      if (highPainCount > 0 || lowPainCount > 0) {
        // Determine correlation strength
        const diff = highPainRate - lowPainRate;
        let strength: 'weak' | 'moderate' | 'strong' = 'weak';
        if (Math.abs(diff) > 0.4) {
          strength = 'strong';
        } else if (Math.abs(diff) > 0.2) {
          strength = 'moderate';
        }

        correlations.push({
          pattern,
          highPainOccurrence: highPainRate,
          lowPainOccurrence: lowPainRate,
          correlationStrength: strength,
        });
      }
    }

    // Sort by correlation strength (highest difference first)
    correlations.sort((a, b) => {
      const diffA = Math.abs(a.highPainOccurrence - a.lowPainOccurrence);
      const diffB = Math.abs(b.highPainOccurrence - b.lowPainOccurrence);
      return diffB - diffA;
    });

    return correlations;
  }, [entries]);

  /**
   * Generate human-readable correlation summary
   */
  const getCorrelationSummary = useCallback((): string[] => {
    const correlations = getCorrelations();
    const summaries: string[] = [];

    // Get high/low pain session counts
    const highPainCount = entries.filter((e) => e.intensity >= HIGH_PAIN_THRESHOLD).length;
    const lowPainCount = entries.filter((e) => e.intensity <= LOW_PAIN_THRESHOLD).length;

    if (highPainCount === 0 || lowPainCount === 0) {
      summaries.push(
        'Not enough data for correlation analysis. Continue logging pain after sessions.'
      );
      return summaries;
    }

    // Find patterns that correlate with high pain
    const significantCorrelations = correlations.filter(
      (c) =>
        c.correlationStrength !== 'weak' &&
        c.highPainOccurrence > c.lowPainOccurrence
    );

    if (significantCorrelations.length === 0) {
      summaries.push(
        'No significant pattern-pain correlations detected yet. Keep tracking for better insights.'
      );
    } else {
      summaries.push(
        `Based on ${highPainCount} high-pain and ${lowPainCount} low-pain sessions:`
      );

      for (const corr of significantCorrelations.slice(0, 3)) {
        const patternName = corr.pattern
          .split('_')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');

        const highPercent = Math.round(corr.highPainOccurrence * 100);
        const lowPercent = Math.round(corr.lowPainOccurrence * 100);

        summaries.push(
          `"${patternName}" appears in ${highPercent}% of high-pain sessions vs ${lowPercent}% of low-pain sessions.`
        );
      }
    }

    return summaries;
  }, [entries, getCorrelations]);

  /**
   * Calculate average pain intensity
   */
  const averagePain = useMemo(() => {
    if (entries.length === 0) return 0;
    const sum = entries.reduce((acc, entry) => acc + entry.intensity, 0);
    return sum / entries.length;
  }, [entries]);

  /**
   * Find most common pain location
   */
  const mostCommonLocation = useMemo((): PainLocation | null => {
    if (entries.length === 0) return null;

    const locationCounts: Record<string, number> = {};
    for (const entry of entries) {
      locationCounts[entry.location] = (locationCounts[entry.location] || 0) + 1;
    }

    let maxCount = 0;
    let mostCommon: PainLocation | null = null;

    for (const [location, count] of Object.entries(locationCounts)) {
      if (count > maxCount) {
        maxCount = count;
        mostCommon = location as PainLocation;
      }
    }

    return mostCommon;
  }, [entries]);

  return {
    entries,
    addEntry,
    removeEntry,
    clearAll,
    getEntriesByPainLevel,
    getCorrelations,
    getCorrelationSummary,
    averagePain,
    mostCommonLocation,
  };
}

export default usePainLogging;

/**
 * Human-readable labels for pain locations
 */
export const PAIN_LOCATION_LABELS: Record<PainLocation, string> = {
  front_knee: 'Front of Knee',
  outer_knee: 'Outside of Knee',
  inner_knee: 'Inside of Knee',
  back_knee: 'Back of Knee',
  hip_front: 'Front of Hip',
  hip_side: 'Side of Hip',
  lower_back: 'Lower Back',
  ankle: 'Ankle',
  shin: 'Shin',
  calf: 'Calf',
  foot: 'Foot',
  other: 'Other',
};
