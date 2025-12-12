/**
 * BiomechCoach - Position Validation Overlay Component
 *
 * Shows visual feedback for starting position validation.
 * Displays red/green indicators for each angle that needs to be in range.
 */

import React from 'react';
import { StartingPositionValidation, getExerciseStartingPosition } from '../lib/exerciseStandards';

interface PositionValidationOverlayProps {
  exerciseId: string;
  validation: StartingPositionValidation;
  isVisible: boolean;
}

/**
 * Human-readable angle names
 */
const ANGLE_LABELS: Record<string, string> = {
  leftKnee: 'Ginocchio SX',
  rightKnee: 'Ginocchio DX',
  leftHipAngle: 'Anca SX',
  rightHipAngle: 'Anca DX',
  leftAnkle: 'Caviglia SX',
  rightAnkle: 'Caviglia DX',
  trunkLean: 'Inclinazione Busto',
};

/**
 * Position Validation Overlay Component
 */
const PositionValidationOverlay: React.FC<PositionValidationOverlayProps> = ({
  exerciseId,
  validation,
  isVisible,
}) => {
  if (!isVisible) return null;

  const startingPosition = getExerciseStartingPosition(exerciseId);

  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      {/* Semi-transparent overlay when not in position */}
      {!validation.isValid && (
        <div className="absolute inset-0 bg-black/30" />
      )}

      {/* Position status banner */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2">
        <div
          className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
            validation.isValid
              ? 'bg-green-600/90 text-white'
              : 'bg-yellow-600/90 text-white'
          }`}
        >
          {validation.isValid ? (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="font-medium">Posizione corretta - Pronto!</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="font-medium">Posizionati correttamente</span>
            </>
          )}
        </div>
      </div>

      {/* Angle indicators panel */}
      <div className="absolute bottom-20 left-4 right-4">
        <div className="bg-gray-900/80 backdrop-blur-sm rounded-lg p-3">
          {/* Description */}
          {startingPosition && (
            <p className="text-sm text-gray-300 mb-3 text-center">
              {startingPosition.description}
            </p>
          )}

          {/* Angle grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {validation.angleResults.map((result) => (
              <div
                key={result.angleName}
                className={`flex items-center gap-2 px-2 py-1.5 rounded ${
                  result.isWithinTolerance
                    ? 'bg-green-900/50 border border-green-500/50'
                    : 'bg-red-900/50 border border-red-500/50'
                }`}
              >
                {/* Status indicator */}
                <div
                  className={`w-3 h-3 rounded-full flex-shrink-0 ${
                    result.isWithinTolerance
                      ? 'bg-green-500'
                      : 'bg-red-500 animate-pulse'
                  }`}
                />

                {/* Angle info */}
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-gray-400 truncate">
                    {ANGLE_LABELS[result.angleName] || result.angleName}
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span
                      className={`text-sm font-medium ${
                        result.isWithinTolerance ? 'text-green-400' : 'text-red-400'
                      }`}
                    >
                      {result.measured !== null ? `${Math.round(result.measured)}°` : '--'}
                    </span>
                    <span className="text-xs text-gray-500">
                      / {result.ideal}°±{result.tolerance}°
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Progress bar */}
          <div className="mt-3">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Angoli corretti</span>
              <span>
                {validation.angleResults.filter((r) => r.isWithinTolerance).length} /{' '}
                {validation.angleResults.length}
              </span>
            </div>
            <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  validation.isValid ? 'bg-green-500' : 'bg-yellow-500'
                }`}
                style={{
                  width: `${
                    (validation.angleResults.filter((r) => r.isWithinTolerance).length /
                      validation.angleResults.length) *
                    100
                  }%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PositionValidationOverlay;
