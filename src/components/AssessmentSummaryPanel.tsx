/**
 * BiomechCoach - Assessment Summary Panel
 *
 * Displays the assessment results for a single exercise,
 * including angle deviations, asymmetries, recommendations, etc.
 */

import React, { useState } from 'react';
import { ExerciseAssessmentResult } from '../lib/assessmentTypes';
import { AngleDeviation } from '../lib/exerciseStandards';
import { PredictedPain } from '../lib/painPrediction';

interface AssessmentSummaryPanelProps {
  result: ExerciseAssessmentResult | null;
  onDownloadJson?: () => void;
  onClearResult?: () => void;
  isRecording?: boolean;
}

/**
 * Status badge component
 */
const StatusBadge: React.FC<{ status: ExerciseAssessmentResult['status']; score: number }> = ({
  status,
  score,
}) => {
  const statusConfig = {
    excellent: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Eccellente' },
    good: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Buono' },
    fair: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'Discreto' },
    needs_work: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Da migliorare' },
  };

  const config = statusConfig[status];

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${config.bg}`}>
      <span className={`text-2xl font-bold ${config.text}`}>{score}</span>
      <span className={`text-sm ${config.text}`}>/100 - {config.label}</span>
    </div>
  );
};

/**
 * Angle deviation item
 */
const AngleDeviationItem: React.FC<{ deviation: AngleDeviation }> = ({ deviation }) => {
  const statusColors = {
    optimal: 'text-green-400',
    acceptable: 'text-blue-400',
    needs_improvement: 'text-yellow-400',
    out_of_range: 'text-red-400',
  };

  const statusLabels = {
    optimal: 'Ottimale',
    acceptable: 'Accettabile',
    needs_improvement: 'Da migliorare',
    out_of_range: 'Fuori range',
  };

  const angleNames: Record<string, string> = {
    leftKnee: 'Ginocchio Sx',
    rightKnee: 'Ginocchio Dx',
    leftHipAngle: 'Anca Sx',
    rightHipAngle: 'Anca Dx',
    leftAnkle: 'Caviglia Sx',
    rightAnkle: 'Caviglia Dx',
    trunkLean: 'Inclinazione Tronco',
  };

  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-700 last:border-0">
      <div className="flex-1">
        <div className="text-sm text-gray-300">
          {angleNames[deviation.angleName] || deviation.angleName}
        </div>
        <div className="text-xs text-gray-500">
          Ideale: {deviation.ideal}°
        </div>
      </div>
      <div className="text-right">
        <div className={`text-sm font-medium ${statusColors[deviation.status]}`}>
          {deviation.measured.toFixed(1)}°
        </div>
        <div className={`text-xs ${statusColors[deviation.status]}`}>
          {deviation.deviation > 0 ? '+' : ''}{deviation.deviation.toFixed(1)}° ({statusLabels[deviation.status]})
        </div>
      </div>
    </div>
  );
};

/**
 * Probable pain item component
 */
const ProbablePainItem: React.FC<{ pain: PredictedPain }> = ({ pain }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const probabilityConfig = {
    high: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', label: 'Alta' },
    moderate: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400', label: 'Media' },
    low: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', label: 'Bassa' },
  };

  const config = probabilityConfig[pain.probability];

  return (
    <div className={`rounded-lg border ${config.border} ${config.bg} overflow-hidden`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-3 text-left"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className={`w-5 h-5 ${config.text}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="text-sm font-medium text-white">{pain.location}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-0.5 rounded-full ${config.bg} ${config.text}`}>
              {config.label}
            </span>
            <svg
              className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-1">{pain.reason}</p>
      </button>

      {isExpanded && (
        <div className="px-3 pb-3 space-y-2">
          {/* Related patterns */}
          <div>
            <span className="text-xs text-gray-500">Pattern correlati:</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {pain.relatedPatterns.map((pattern, idx) => (
                <span key={idx} className="text-xs px-2 py-0.5 bg-gray-700 text-gray-300 rounded">
                  {pattern}
                </span>
              ))}
            </div>
          </div>

          {/* Prevention tips */}
          <div>
            <span className="text-xs text-gray-500">Come prevenire:</span>
            <ul className="mt-1 space-y-1">
              {pain.preventionTips.map((tip, idx) => (
                <li key={idx} className="text-xs text-gray-400 flex items-start gap-1">
                  <span className="text-green-500">✓</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Collapsible section
 */
const CollapsibleSection: React.FC<{
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: string | number;
}> = ({ title, children, defaultOpen = false, badge }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-gray-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-800 hover:bg-gray-750 transition-colors"
      >
        <span className="text-sm font-medium text-gray-200">{title}</span>
        <div className="flex items-center gap-2">
          {badge !== undefined && (
            <span className="px-2 py-0.5 text-xs bg-gray-700 text-gray-300 rounded-full">
              {badge}
            </span>
          )}
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      {isOpen && <div className="p-4 bg-gray-800/50">{children}</div>}
    </div>
  );
};

/**
 * Assessment Summary Panel Component
 */
const AssessmentSummaryPanel: React.FC<AssessmentSummaryPanelProps> = ({
  result,
  onDownloadJson,
  onClearResult,
  isRecording,
}) => {
  if (isRecording) {
    return (
      <div className="space-y-4">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            <span className="text-white font-medium">Assessment in corso...</span>
          </div>
          <p className="text-sm text-gray-400 mt-2">
            Mantieni la posizione. Il riepilogo apparirà al termine della registrazione.
          </p>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="card p-4">
        <p className="text-gray-400 text-sm text-center">
          Seleziona un esercizio e completa l'assessment per vedere il riepilogo.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Score and Status */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-300">Punteggio Assessment</h3>
          <StatusBadge status={result.status} score={result.score} />
        </div>
        <p className="text-sm text-gray-400">{result.summary}</p>
      </div>

      {/* Angle Deviations */}
      {result.angleDeviations.length > 0 && (
        <CollapsibleSection
          title="Angoli vs Standard"
          defaultOpen={true}
          badge={result.angleDeviations.length}
        >
          <div className="space-y-1">
            {result.angleDeviations.map((deviation, idx) => (
              <AngleDeviationItem key={idx} deviation={deviation} />
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Asymmetries */}
      {result.asymmetries.length > 0 && (
        <CollapsibleSection
          title="Asimmetrie Rilevate"
          badge={result.asymmetries.length}
        >
          <div className="space-y-2">
            {result.asymmetries.map((asym, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg ${
                  asym.significance === 'significant'
                    ? 'bg-red-500/10 border border-red-500/30'
                    : asym.significance === 'moderate'
                    ? 'bg-yellow-500/10 border border-yellow-500/30'
                    : 'bg-gray-700/50'
                }`}
              >
                <div className="text-sm text-white">{asym.description}</div>
                <div className="text-xs text-gray-400 mt-1">
                  Sx: {asym.leftValue.toFixed(1)} | Dx: {asym.rightValue.toFixed(1)} | Diff: {asym.difference.toFixed(1)}
                </div>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Instabilities */}
      {result.instabilities.length > 0 && (
        <CollapsibleSection
          title="Instabilità Osservate"
          badge={result.instabilities.length}
        >
          <div className="space-y-2">
            {result.instabilities.map((inst, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg ${
                  inst.severity === 'severe'
                    ? 'bg-red-500/10 border border-red-500/30'
                    : inst.severity === 'moderate'
                    ? 'bg-yellow-500/10 border border-yellow-500/30'
                    : 'bg-blue-500/10 border border-blue-500/30'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    inst.severity === 'severe'
                      ? 'bg-red-500/20 text-red-400'
                      : inst.severity === 'moderate'
                      ? 'bg-yellow-500/20 text-yellow-400'
                      : 'bg-blue-500/20 text-blue-400'
                  }`}>
                    {inst.severity === 'severe' ? 'Severa' : inst.severity === 'moderate' ? 'Moderata' : 'Lieve'}
                  </span>
                  <span className="text-sm text-white">{inst.type}</span>
                </div>
                <div className="text-xs text-gray-400 mt-1">{inst.description}</div>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Pain */}
      {result.pain && (
        <CollapsibleSection title="Dolore Riportato">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Intensità</span>
              <div className="flex items-center gap-2">
                <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      result.pain.intensity <= 3
                        ? 'bg-green-500'
                        : result.pain.intensity <= 6
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                    }`}
                    style={{ width: `${result.pain.intensity * 10}%` }}
                  />
                </div>
                <span className="text-sm text-white font-medium">{result.pain.intensity}/10</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Localizzazione</span>
              <span className="text-sm text-white">{result.pain.location.replace(/_/g, ' ')}</span>
            </div>
            {result.pain.notes && (
              <div className="text-sm text-gray-400 mt-2">
                <span className="text-gray-500">Note:</span> {result.pain.notes}
              </div>
            )}
          </div>
        </CollapsibleSection>
      )}

      {/* Probable Pains */}
      {result.probablePains && result.probablePains.length > 0 && (
        <CollapsibleSection
          title="Dolori Probabili"
          defaultOpen={true}
          badge={result.probablePains.length}
        >
          <div className="space-y-3">
            {result.probablePains.map((pain, idx) => (
              <ProbablePainItem key={idx} pain={pain} />
            ))}
          </div>
          <div className="mt-3 p-2 bg-gray-700/30 rounded-lg">
            <p className="text-xs text-gray-500 italic">
              Queste previsioni sono basate sui pattern biomeccanici rilevati e non sostituiscono una valutazione medica professionale.
            </p>
          </div>
        </CollapsibleSection>
      )}

      {/* Recommendations */}
      <CollapsibleSection
        title="Raccomandazioni"
        defaultOpen={true}
      >
        {/* Exercises */}
        {result.recommendations.exercises.length > 0 && (
          <div className="mb-4">
            <h4 className="text-xs font-medium text-purple-400 uppercase tracking-wider mb-2">
              Esercizi Consigliati
            </h4>
            <div className="space-y-2">
              {result.recommendations.exercises.map((rec, idx) => (
                <div key={idx} className="p-2 bg-gray-700/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      rec.priority === 'high'
                        ? 'bg-red-500/20 text-red-400'
                        : rec.priority === 'medium'
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : 'bg-gray-600 text-gray-400'
                    }`}>
                      {rec.priority === 'high' ? 'Alta' : rec.priority === 'medium' ? 'Media' : 'Bassa'}
                    </span>
                    <span className="text-sm text-white font-medium">{rec.exercise}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{rec.reason}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Muscles */}
        {result.recommendations.muscles.length > 0 && (
          <div className="mb-4">
            <h4 className="text-xs font-medium text-blue-400 uppercase tracking-wider mb-2">
              Muscoli da Rafforzare
            </h4>
            <div className="space-y-2">
              {result.recommendations.muscles.map((rec, idx) => (
                <div key={idx} className="p-2 bg-gray-700/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      rec.priority === 'high'
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {rec.priority === 'high' ? 'Alta' : 'Media'}
                    </span>
                    <span className="text-sm text-white font-medium">{rec.muscle}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{rec.reason}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {rec.exercises.map((ex, exIdx) => (
                      <span key={exIdx} className="text-xs px-2 py-0.5 bg-gray-600 text-gray-300 rounded">
                        {ex}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Patterns */}
        {result.recommendations.patterns.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-green-400 uppercase tracking-wider mb-2">
              Pattern Neuromotori
            </h4>
            <div className="space-y-2">
              {result.recommendations.patterns.map((rec, idx) => (
                <div key={idx} className="p-2 bg-gray-700/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      rec.priority === 'high'
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {rec.priority === 'high' ? 'Alta' : 'Media'}
                    </span>
                    <span className="text-sm text-white font-medium">{rec.pattern}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{rec.description}</p>
                  <div className="mt-2">
                    <span className="text-xs text-gray-500">Drill consigliati:</span>
                    <ul className="mt-1 space-y-1">
                      {rec.drills.map((drill, drillIdx) => (
                        <li key={drillIdx} className="text-xs text-gray-400 flex items-start gap-1">
                          <span className="text-gray-500">•</span>
                          {drill}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CollapsibleSection>

      {/* Actions */}
      <div className="flex gap-2">
        {onDownloadJson && (
          <button
            onClick={onDownloadJson}
            className="flex-1 px-4 py-2 text-sm text-white bg-purple-600 hover:bg-purple-500 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Scarica JSON
          </button>
        )}
        {onClearResult && (
          <button
            onClick={onClearResult}
            className="px-4 py-2 text-sm text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
          >
            Ripeti
          </button>
        )}
      </div>
    </div>
  );
};

export default AssessmentSummaryPanel;
