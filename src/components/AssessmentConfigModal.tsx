/**
 * BiomechCoach - Assessment Configuration Modal
 *
 * Modal for configuring assessment settings:
 * - Duration selection
 * - Detection delay
 * - Report mode (per exercise vs end of session)
 */

import React, { useState } from 'react';
import { AssessmentConfig, AssessmentReportMode, ASSESSMENT_DURATIONS, DETECTION_DELAYS } from '../lib/assessmentTypes';

interface AssessmentConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStart: (config: AssessmentConfig, reportMode: AssessmentReportMode) => void;
  initialConfig?: AssessmentConfig;
  initialReportMode?: AssessmentReportMode;
}

const AssessmentConfigModal: React.FC<AssessmentConfigModalProps> = ({
  isOpen,
  onClose,
  onStart,
  initialConfig,
  initialReportMode,
}) => {
  const [duration, setDuration] = useState(initialConfig?.duration || 20);
  const [detectionDelay, setDetectionDelay] = useState(initialConfig?.detectionDelay || 5);
  const [reportMode, setReportMode] = useState<AssessmentReportMode>(initialReportMode || 'per_exercise');

  if (!isOpen) return null;

  const handleStart = () => {
    onStart({ duration, detectionDelay }, reportMode);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl max-w-md w-full shadow-xl border border-gray-700">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">Configura Assessment</h2>
          <p className="text-sm text-gray-400 mt-1">
            Imposta i parametri per la registrazione
          </p>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-6">
          {/* Duration Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Durata Registrazione
            </label>
            <div className="grid grid-cols-2 gap-2">
              {ASSESSMENT_DURATIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setDuration(option.value)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    duration === option.value
                      ? 'border-purple-500 bg-purple-500/10'
                      : 'border-gray-600 hover:border-gray-500 bg-gray-700/50'
                  }`}
                >
                  <div className={`text-lg font-semibold ${
                    duration === option.value ? 'text-purple-400' : 'text-white'
                  }`}>
                    {option.label}
                  </div>
                  <div className="text-xs text-gray-400">{option.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Detection Delay */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Tempo di Preparazione
            </label>
            <p className="text-xs text-gray-400 mb-3">
              Tempo prima dell'inizio della registrazione per posizionarti
            </p>
            <div className="flex gap-2">
              {DETECTION_DELAYS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setDetectionDelay(option.value)}
                  className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                    detectionDelay === option.value
                      ? 'border-purple-500 bg-purple-500/10'
                      : 'border-gray-600 hover:border-gray-500 bg-gray-700/50'
                  }`}
                >
                  <div className={`text-lg font-semibold ${
                    detectionDelay === option.value ? 'text-purple-400' : 'text-white'
                  }`}>
                    {option.label}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Report Mode */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Modalità Riepilogo
            </label>
            <div className="space-y-2">
              <button
                onClick={() => setReportMode('per_exercise')}
                className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                  reportMode === 'per_exercise'
                    ? 'border-green-500 bg-green-500/10'
                    : 'border-gray-600 hover:border-gray-500 bg-gray-700/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    reportMode === 'per_exercise' ? 'border-green-500' : 'border-gray-500'
                  }`}>
                    {reportMode === 'per_exercise' && (
                      <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                    )}
                  </div>
                  <div>
                    <div className={`font-medium ${
                      reportMode === 'per_exercise' ? 'text-green-400' : 'text-white'
                    }`}>
                      Esercizio per esercizio
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      Report JSON generato dopo ogni esercizio (raccomandato)
                    </div>
                  </div>
                  <span className="ml-auto text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full">
                    Consigliato
                  </span>
                </div>
              </button>

              <button
                onClick={() => setReportMode('end_of_session')}
                className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                  reportMode === 'end_of_session'
                    ? 'border-yellow-500 bg-yellow-500/10'
                    : 'border-gray-600 hover:border-gray-500 bg-gray-700/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    reportMode === 'end_of_session' ? 'border-yellow-500' : 'border-gray-500'
                  }`}>
                    {reportMode === 'end_of_session' && (
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                    )}
                  </div>
                  <div>
                    <div className={`font-medium ${
                      reportMode === 'end_of_session' ? 'text-yellow-400' : 'text-white'
                    }`}>
                      Fine sessione (tutti gli esercizi)
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      Report unico generato al termine di tutti i 20 esercizi
                    </div>
                  </div>
                </div>
              </button>
            </div>
            {reportMode === 'end_of_session' && (
              <div className="mt-2 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <p className="text-xs text-yellow-400">
                  Attenzione: In questa modalità dovrai completare tutti gli esercizi prima di vedere il riepilogo completo.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-700 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-sm text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
          >
            Annulla
          </button>
          <button
            onClick={handleStart}
            className="flex-1 px-4 py-2.5 text-sm text-white bg-purple-600 hover:bg-purple-500 rounded-lg transition-colors font-medium"
          >
            Inizia Assessment
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssessmentConfigModal;
