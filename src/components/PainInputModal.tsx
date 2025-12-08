/**
 * BiomechCoach - Pain Input Modal Component
 *
 * Modal for logging pain after a session.
 * Captures intensity, location, and optional notes.
 */

import React, { useState } from 'react';
import { PainLocation, PatternFlags, SymmetryMetrics, FrontalMetrics } from '../lib/poseTypes';
import { PAIN_LOCATION_LABELS } from '../hooks/usePainLogging';

interface PainInputModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** Callback when pain is submitted */
  onSubmit: (
    intensity: number,
    location: PainLocation,
    notes?: string,
    sessionMetrics?: {
      patternFlags?: PatternFlags;
      symmetry?: SymmetryMetrics;
      frontalMetrics?: FrontalMetrics;
    }
  ) => void;
  /** Current session metrics to associate with pain entry */
  sessionMetrics?: {
    patternFlags?: PatternFlags;
    symmetry?: SymmetryMetrics;
    frontalMetrics?: FrontalMetrics;
  };
}

/**
 * Pain location options for dropdown
 */
const PAIN_LOCATIONS: PainLocation[] = [
  'front_knee',
  'outer_knee',
  'inner_knee',
  'back_knee',
  'hip_front',
  'hip_side',
  'lower_back',
  'ankle',
  'shin',
  'calf',
  'foot',
  'other',
];

/**
 * Pain Input Modal Component
 */
const PainInputModal: React.FC<PainInputModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  sessionMetrics,
}) => {
  const [intensity, setIntensity] = useState<number>(0);
  const [location, setLocation] = useState<PainLocation>('front_knee');
  const [notes, setNotes] = useState<string>('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(intensity, location, notes || undefined, sessionMetrics);
    // Reset form
    setIntensity(0);
    setLocation('front_knee');
    setNotes('');
    onClose();
  };

  const handleSkip = () => {
    onClose();
  };

  const getIntensityLabel = (value: number): string => {
    if (value === 0) return 'No pain';
    if (value <= 2) return 'Mild';
    if (value <= 4) return 'Moderate';
    if (value <= 6) return 'Uncomfortable';
    if (value <= 8) return 'Severe';
    return 'Very severe';
  };

  const getIntensityColor = (value: number): string => {
    if (value === 0) return 'text-green-400';
    if (value <= 2) return 'text-green-300';
    if (value <= 4) return 'text-yellow-400';
    if (value <= 6) return 'text-orange-400';
    if (value <= 8) return 'text-red-400';
    return 'text-red-500';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6 border border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">Session Pain Log</h2>
          <button
            onClick={handleSkip}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Pain Intensity Slider */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Pain Intensity
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="0"
                max="10"
                value={intensity}
                onChange={(e) => setIntensity(parseInt(e.target.value))}
                className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <span className={`text-2xl font-bold w-8 text-center ${getIntensityColor(intensity)}`}>
                {intensity}
              </span>
            </div>
            <div className={`text-sm mt-1 ${getIntensityColor(intensity)}`}>
              {getIntensityLabel(intensity)}
            </div>
          </div>

          {/* Pain Location Dropdown */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Pain Location
            </label>
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value as PainLocation)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg
                       text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {PAIN_LOCATIONS.map((loc) => (
                <option key={loc} value={loc}>
                  {PAIN_LOCATION_LABELS[loc]}
                </option>
              ))}
            </select>
          </div>

          {/* Optional Notes */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional details..."
              rows={3}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg
                       text-white placeholder-gray-400 resize-none
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Disclaimer */}
          <p className="text-xs text-gray-500 mb-6">
            Pain tracking is for personal reference only. Consult a healthcare
            professional for persistent pain.
          </p>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleSkip}
              className="flex-1 px-4 py-2 text-gray-300 hover:text-white
                       bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              Skip
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 text-white
                       bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors font-medium"
            >
              Log Pain
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/**
 * Pain correlation summary component
 */
export const PainCorrelationSummary: React.FC<{
  summaries: string[];
}> = ({ summaries }) => {
  if (summaries.length === 0) return null;

  return (
    <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
      <h3 className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
        <span>📊</span>
        Pain Correlation Insights
      </h3>
      <ul className="space-y-1">
        {summaries.map((summary, index) => (
          <li key={index} className="text-xs text-gray-400">
            {summary}
          </li>
        ))}
      </ul>
      <p className="text-xs text-gray-500 mt-2 italic">
        Correlations are informational only and not medical diagnoses.
      </p>
    </div>
  );
};

export default PainInputModal;
