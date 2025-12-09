/**
 * BiomechCoach - Cycling Results Panel Component
 *
 * Displays results from the 4-test cycling analysis:
 * - 4 tabs for each test (Right Side, Left Side, Front, Back)
 * - Detailed analysis for each test
 * - Individual report download
 * - Final summary tab
 */

import React, { useState } from 'react';
import {
  CyclingSession,
  CyclingTestResult,
  CyclingTestView,
} from '../lib/poseTypes';

interface CyclingResultsPanelProps {
  session: CyclingSession;
  activeTab: CyclingTestView | 'summary';
  onTabChange: (tab: CyclingTestView) => void;
  onBack: () => void;
  onHome: () => void;
}

// Tab configuration
const TAB_CONFIG: Record<CyclingTestView | 'summary', { label: string; icon: string }> = {
  right_side: { label: 'Lato Destro', icon: '→' },
  left_side: { label: 'Lato Sinistro', icon: '←' },
  front: { label: 'Frontale', icon: '↓' },
  back: { label: 'Posteriore', icon: '↑' },
  summary: { label: 'Riassunto', icon: '📊' },
};

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
 * Generate report text for a single test
 */
function generateTestReport(result: CyclingTestResult, testLabel: string): string {
  const { detailedAnalysis, cycleCount, duration, patternFlags } = result;

  let report = `
================================================================================
REPORT ANALISI CICLISMO - ${testLabel.toUpperCase()}
================================================================================

Data: ${new Date(result.completedAt).toLocaleString('it-IT')}
Durata registrazione: ${formatDuration(duration)}
Cicli pedale rilevati: ${cycleCount}

--------------------------------------------------------------------------------
ANALISI GINOCCHIO
--------------------------------------------------------------------------------
Angolo ginocchio sinistro (media): ${detailedAnalysis.kneeAnalysis.leftAngle?.toFixed(1) ?? 'N/D'}°
Angolo ginocchio destro (media): ${detailedAnalysis.kneeAnalysis.rightAngle?.toFixed(1) ?? 'N/D'}°

Valutazione: ${detailedAnalysis.kneeAnalysis.assessment}

Raccomandazioni:
${detailedAnalysis.kneeAnalysis.recommendations.map(r => `  - ${r}`).join('\n') || '  Nessuna raccomandazione specifica'}

--------------------------------------------------------------------------------
ANALISI ANCA
--------------------------------------------------------------------------------
Angolo anca sinistra (media): ${detailedAnalysis.hipAnalysis.leftAngle?.toFixed(1) ?? 'N/D'}°
Angolo anca destra (media): ${detailedAnalysis.hipAnalysis.rightAngle?.toFixed(1) ?? 'N/D'}°

Valutazione: ${detailedAnalysis.hipAnalysis.assessment}

Raccomandazioni:
${detailedAnalysis.hipAnalysis.recommendations.map(r => `  - ${r}`).join('\n') || '  Nessuna raccomandazione specifica'}

--------------------------------------------------------------------------------
ANALISI CAVIGLIA
--------------------------------------------------------------------------------
Angolo caviglia sinistra (media): ${detailedAnalysis.ankleAnalysis.leftAngle?.toFixed(1) ?? 'N/D'}°
Angolo caviglia destra (media): ${detailedAnalysis.ankleAnalysis.rightAngle?.toFixed(1) ?? 'N/D'}°

Valutazione: ${detailedAnalysis.ankleAnalysis.assessment}

Raccomandazioni:
${detailedAnalysis.ankleAnalysis.recommendations.map(r => `  - ${r}`).join('\n') || '  Nessuna raccomandazione specifica'}

--------------------------------------------------------------------------------
ANALISI ALTEZZA SELLA
--------------------------------------------------------------------------------
Valutazione: ${detailedAnalysis.saddleAnalysis.assessment === 'optimal' ? 'OTTIMALE' :
               detailedAnalysis.saddleAnalysis.assessment === 'too_low' ? 'TROPPO BASSA' :
               detailedAnalysis.saddleAnalysis.assessment === 'too_high' ? 'TROPPO ALTA' : 'Non valutabile'}
Angolo ginocchio attuale: ${detailedAnalysis.saddleAnalysis.currentKneeAngle?.toFixed(1) ?? 'N/D'}°
Range ideale: ${detailedAnalysis.saddleAnalysis.idealRange.min}° - ${detailedAnalysis.saddleAnalysis.idealRange.max}°

Raccomandazioni:
${detailedAnalysis.saddleAnalysis.recommendations.map(r => `  - ${r}`).join('\n') || '  Nessuna raccomandazione specifica'}

--------------------------------------------------------------------------------
ANALISI ASIMMETRIE
--------------------------------------------------------------------------------
${detailedAnalysis.asymmetryAnalysis.detected ? 'ASIMMETRIE RILEVATE' : 'Nessuna asimmetria significativa'}

Asimmetria ginocchio: ${detailedAnalysis.asymmetryAnalysis.kneeAsymmetry?.toFixed(1) ?? 'N/D'}°
Asimmetria anca: ${detailedAnalysis.asymmetryAnalysis.hipAsymmetry?.toFixed(1) ?? 'N/D'}°
Asimmetria caviglia: ${detailedAnalysis.asymmetryAnalysis.ankleAsymmetry?.toFixed(1) ?? 'N/D'}°

Valutazione: ${detailedAnalysis.asymmetryAnalysis.assessment}

Raccomandazioni:
${detailedAnalysis.asymmetryAnalysis.recommendations.map(r => `  - ${r}`).join('\n') || '  Nessuna raccomandazione specifica'}

--------------------------------------------------------------------------------
NOTE BIOMECCANICHE
--------------------------------------------------------------------------------
${detailedAnalysis.biomechanicalNotes.map(n => `• ${n}`).join('\n')}

--------------------------------------------------------------------------------
PATTERN RILEVATI
--------------------------------------------------------------------------------
${patternFlags.saddle_low ? '⚠️ Sella troppo bassa\n' : ''}${patternFlags.saddle_high ? '⚠️ Sella troppo alta\n' : ''}${patternFlags.knee_tracking_instability ? '⚠️ Instabilità tracking ginocchio\n' : ''}${patternFlags.excessive_trunk_lean ? '⚠️ Inclinazione tronco eccessiva\n' : ''}${!patternFlags.saddle_low && !patternFlags.saddle_high && !patternFlags.knee_tracking_instability && !patternFlags.excessive_trunk_lean ? 'Nessun pattern problematico rilevato' : ''}

================================================================================
Fine Report - ${testLabel}
================================================================================
`;

  return report;
}

/**
 * Generate complete session summary report
 */
function generateSummaryReport(session: CyclingSession): string {
  const { summary, results } = session;
  if (!summary) return 'Riassunto non disponibile';

  let report = `
================================================================================
REPORT COMPLETO ANALISI CICLISMO
================================================================================

Data sessione: ${new Date(session.startedAt).toLocaleString('it-IT')}
Durata totale: ${formatDuration(summary.totalDuration)}
Test completati: ${Object.keys(results).length}/4

================================================================================
VALUTAZIONE ALTEZZA SELLA
================================================================================
${summary.saddleHeightAssessment}

================================================================================
PUNTEGGIO BIKE FIT
================================================================================
${summary.bikeFitScore}/100

Valutazione: ${summary.overallAssessment}

================================================================================
CONFRONTO LATO DESTRO vs LATO SINISTRO
================================================================================
Differenza angolo ginocchio: ${summary.sideComparison.kneeAngleDifference ?? 'N/D'}°
Differenza angolo anca: ${summary.sideComparison.hipAngleDifference ?? 'N/D'}°
Differenza angolo caviglia: ${summary.sideComparison.ankleAngleDifference ?? 'N/D'}°

Valutazione: ${summary.sideComparison.assessment}

================================================================================
CONFRONTO VISTA FRONTALE vs POSTERIORE
================================================================================
Tracking ginocchio (fronte): ${summary.frontalComparison.kneeTrackingLeft}
Tracking ginocchio (retro): ${summary.frontalComparison.kneeTrackingRight}
Stabilità pelvi: ${summary.frontalComparison.pelvisStability}

Valutazione: ${summary.frontalComparison.assessment}

================================================================================
ASIMMETRIE CHIAVE RILEVATE
================================================================================
${summary.keyAsymmetries.length > 0 ? summary.keyAsymmetries.map(a => `• ${a}`).join('\n') : 'Nessuna asimmetria significativa rilevata'}

================================================================================
RACCOMANDAZIONI PRIORITARIE
================================================================================
${summary.priorityRecommendations.length > 0 ? summary.priorityRecommendations.map((r, i) => `${i + 1}. ${r}`).join('\n') : 'Nessuna raccomandazione prioritaria'}

================================================================================
DETTAGLI PER TEST
================================================================================
${results.right_side ? `
LATO DESTRO:
  Durata: ${formatDuration(results.right_side.duration)}
  Cicli pedale: ${results.right_side.cycleCount}
  Angolo ginocchio medio: ${results.right_side.detailedAnalysis.kneeAnalysis.leftAngle?.toFixed(1) ?? results.right_side.detailedAnalysis.kneeAnalysis.rightAngle?.toFixed(1) ?? 'N/D'}°
` : 'LATO DESTRO: Non completato\n'}
${results.left_side ? `
LATO SINISTRO:
  Durata: ${formatDuration(results.left_side.duration)}
  Cicli pedale: ${results.left_side.cycleCount}
  Angolo ginocchio medio: ${results.left_side.detailedAnalysis.kneeAnalysis.leftAngle?.toFixed(1) ?? results.left_side.detailedAnalysis.kneeAnalysis.rightAngle?.toFixed(1) ?? 'N/D'}°
` : 'LATO SINISTRO: Non completato\n'}
${results.front ? `
FRONTALE:
  Durata: ${formatDuration(results.front.duration)}
  Tracking ginocchio: ${results.front.patternFlags.knee_tracking_instability ? 'Instabile' : 'Stabile'}
` : 'FRONTALE: Non completato\n'}
${results.back ? `
POSTERIORE:
  Durata: ${formatDuration(results.back.duration)}
  Tracking ginocchio: ${results.back.patternFlags.knee_tracking_instability ? 'Instabile' : 'Stabile'}
` : 'POSTERIORE: Non completato\n'}

================================================================================
Fine Report Completo
================================================================================

Nota: Questo report è generato automaticamente e fornisce indicazioni generali
basate sull'analisi del movimento. Per una valutazione professionale del bike
fitting, si consiglia di consultare un esperto certificato.
`;

  return report;
}

/**
 * Download text as file
 */
function downloadReport(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Single Test Result Tab Content
 */
const TestResultContent: React.FC<{
  result: CyclingTestResult;
  testType: CyclingTestView;
}> = ({ result, testType }) => {
  const { detailedAnalysis, cycleCount, duration, patternFlags } = result;
  const testLabel = TAB_CONFIG[testType].label;

  const handleDownload = () => {
    const report = generateTestReport(result, testLabel);
    const timestamp = new Date().toISOString().split('T')[0];
    downloadReport(report, `report-ciclismo-${testType}-${timestamp}.txt`);
  };

  return (
    <div className="space-y-6">
      {/* Header with download button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">{testLabel}</h2>
          <p className="text-gray-400">
            Durata: {formatDuration(duration)} | Cicli pedale: {cycleCount}
          </p>
        </div>
        <button
          onClick={handleDownload}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500
                   text-white rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Scarica Report
        </button>
      </div>

      {/* Pattern alerts */}
      {(patternFlags.saddle_low || patternFlags.saddle_high ||
        patternFlags.knee_tracking_instability || patternFlags.excessive_trunk_lean) && (
        <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <h3 className="text-yellow-400 font-semibold mb-2">Pattern Rilevati</h3>
          <div className="space-y-1">
            {patternFlags.saddle_low && (
              <p className="text-yellow-300 text-sm">⚠️ Sella potenzialmente troppo bassa</p>
            )}
            {patternFlags.saddle_high && (
              <p className="text-yellow-300 text-sm">⚠️ Sella potenzialmente troppo alta</p>
            )}
            {patternFlags.knee_tracking_instability && (
              <p className="text-yellow-300 text-sm">⚠️ Instabilità nel tracking del ginocchio</p>
            )}
            {patternFlags.excessive_trunk_lean && (
              <p className="text-yellow-300 text-sm">⚠️ Inclinazione eccessiva del tronco</p>
            )}
          </div>
        </div>
      )}

      {/* Analysis sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Knee Analysis */}
        <div className="card p-4">
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <span className="text-blue-400">🦵</span> Analisi Ginocchio
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Ginocchio SX:</span>
              <span className="text-white font-mono">
                {detailedAnalysis.kneeAnalysis.leftAngle?.toFixed(1) ?? '--'}°
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Ginocchio DX:</span>
              <span className="text-white font-mono">
                {detailedAnalysis.kneeAnalysis.rightAngle?.toFixed(1) ?? '--'}°
              </span>
            </div>
            <p className="text-gray-300 mt-2 pt-2 border-t border-gray-700">
              {detailedAnalysis.kneeAnalysis.assessment}
            </p>
            {detailedAnalysis.kneeAnalysis.recommendations.length > 0 && (
              <ul className="mt-2 space-y-1">
                {detailedAnalysis.kneeAnalysis.recommendations.map((rec, i) => (
                  <li key={i} className="text-blue-300 text-xs">• {rec}</li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Hip Analysis */}
        <div className="card p-4">
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <span className="text-green-400">🦴</span> Analisi Anca
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Anca SX:</span>
              <span className="text-white font-mono">
                {detailedAnalysis.hipAnalysis.leftAngle?.toFixed(1) ?? '--'}°
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Anca DX:</span>
              <span className="text-white font-mono">
                {detailedAnalysis.hipAnalysis.rightAngle?.toFixed(1) ?? '--'}°
              </span>
            </div>
            <p className="text-gray-300 mt-2 pt-2 border-t border-gray-700">
              {detailedAnalysis.hipAnalysis.assessment}
            </p>
            {detailedAnalysis.hipAnalysis.recommendations.length > 0 && (
              <ul className="mt-2 space-y-1">
                {detailedAnalysis.hipAnalysis.recommendations.map((rec, i) => (
                  <li key={i} className="text-green-300 text-xs">• {rec}</li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Ankle Analysis */}
        <div className="card p-4">
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <span className="text-purple-400">🦶</span> Analisi Caviglia
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Caviglia SX:</span>
              <span className="text-white font-mono">
                {detailedAnalysis.ankleAnalysis.leftAngle?.toFixed(1) ?? '--'}°
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Caviglia DX:</span>
              <span className="text-white font-mono">
                {detailedAnalysis.ankleAnalysis.rightAngle?.toFixed(1) ?? '--'}°
              </span>
            </div>
            <p className="text-gray-300 mt-2 pt-2 border-t border-gray-700">
              {detailedAnalysis.ankleAnalysis.assessment}
            </p>
            {detailedAnalysis.ankleAnalysis.recommendations.length > 0 && (
              <ul className="mt-2 space-y-1">
                {detailedAnalysis.ankleAnalysis.recommendations.map((rec, i) => (
                  <li key={i} className="text-purple-300 text-xs">• {rec}</li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Saddle Analysis */}
        <div className="card p-4">
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <span className="text-orange-400">🚴</span> Altezza Sella
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Valutazione:</span>
              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                detailedAnalysis.saddleAnalysis.assessment === 'optimal'
                  ? 'bg-green-500/20 text-green-400'
                  : detailedAnalysis.saddleAnalysis.assessment === 'too_low'
                  ? 'bg-red-500/20 text-red-400'
                  : detailedAnalysis.saddleAnalysis.assessment === 'too_high'
                  ? 'bg-orange-500/20 text-orange-400'
                  : 'bg-gray-500/20 text-gray-400'
              }`}>
                {detailedAnalysis.saddleAnalysis.assessment === 'optimal' ? 'OTTIMALE' :
                 detailedAnalysis.saddleAnalysis.assessment === 'too_low' ? 'TROPPO BASSA' :
                 detailedAnalysis.saddleAnalysis.assessment === 'too_high' ? 'TROPPO ALTA' : 'N/D'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Angolo attuale:</span>
              <span className="text-white font-mono">
                {detailedAnalysis.saddleAnalysis.currentKneeAngle?.toFixed(1) ?? '--'}°
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Range ideale:</span>
              <span className="text-white font-mono">
                {detailedAnalysis.saddleAnalysis.idealRange.min}° - {detailedAnalysis.saddleAnalysis.idealRange.max}°
              </span>
            </div>
            {detailedAnalysis.saddleAnalysis.recommendations.length > 0 && (
              <ul className="mt-2 pt-2 border-t border-gray-700 space-y-1">
                {detailedAnalysis.saddleAnalysis.recommendations.map((rec, i) => (
                  <li key={i} className="text-orange-300 text-xs">• {rec}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Asymmetry Analysis */}
      <div className="card p-4">
        <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          <span className="text-red-400">⚖️</span> Analisi Asimmetrie
        </h3>
        <div className={`p-3 rounded-lg ${
          detailedAnalysis.asymmetryAnalysis.detected
            ? 'bg-red-500/10 border border-red-500/30'
            : 'bg-green-500/10 border border-green-500/30'
        }`}>
          <p className={detailedAnalysis.asymmetryAnalysis.detected ? 'text-red-300' : 'text-green-300'}>
            {detailedAnalysis.asymmetryAnalysis.assessment}
          </p>
        </div>
        {detailedAnalysis.asymmetryAnalysis.detected && (
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="text-center">
              <p className="text-gray-400 text-xs">Ginocchio</p>
              <p className="text-white font-mono text-lg">
                {detailedAnalysis.asymmetryAnalysis.kneeAsymmetry?.toFixed(1) ?? '--'}°
              </p>
            </div>
            <div className="text-center">
              <p className="text-gray-400 text-xs">Anca</p>
              <p className="text-white font-mono text-lg">
                {detailedAnalysis.asymmetryAnalysis.hipAsymmetry?.toFixed(1) ?? '--'}°
              </p>
            </div>
            <div className="text-center">
              <p className="text-gray-400 text-xs">Caviglia</p>
              <p className="text-white font-mono text-lg">
                {detailedAnalysis.asymmetryAnalysis.ankleAsymmetry?.toFixed(1) ?? '--'}°
              </p>
            </div>
          </div>
        )}
        {detailedAnalysis.asymmetryAnalysis.recommendations.length > 0 && (
          <ul className="mt-4 space-y-1">
            {detailedAnalysis.asymmetryAnalysis.recommendations.map((rec, i) => (
              <li key={i} className="text-red-300 text-sm">• {rec}</li>
            ))}
          </ul>
        )}
      </div>

      {/* Biomechanical Notes */}
      <div className="card p-4">
        <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          <span className="text-cyan-400">📝</span> Note Biomeccaniche
        </h3>
        <ul className="space-y-2">
          {detailedAnalysis.biomechanicalNotes.map((note, i) => (
            <li key={i} className="text-gray-300 text-sm flex items-start gap-2">
              <span className="text-cyan-400">•</span>
              {note}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

/**
 * Summary Tab Content
 */
const SummaryContent: React.FC<{
  session: CyclingSession;
}> = ({ session }) => {
  const { summary, results } = session;

  if (!summary) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Riassunto non disponibile. Completa tutti i test.</p>
      </div>
    );
  }

  const handleDownload = () => {
    const report = generateSummaryReport(session);
    const timestamp = new Date().toISOString().split('T')[0];
    downloadReport(report, `report-ciclismo-completo-${timestamp}.txt`);
  };

  return (
    <div className="space-y-6">
      {/* Header with download */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Riassunto Completo</h2>
          <p className="text-gray-400">
            Durata totale: {formatDuration(summary.totalDuration)} |
            Test completati: {Object.keys(results).length}/4
          </p>
        </div>
        <button
          onClick={handleDownload}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500
                   text-white rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Scarica Report Completo
        </button>
      </div>

      {/* Bike Fit Score */}
      <div className="card p-6 text-center">
        <h3 className="text-gray-400 text-sm mb-2">Punteggio Bike Fit</h3>
        <div className="relative w-32 h-32 mx-auto">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="64"
              cy="64"
              r="56"
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              className="text-gray-700"
            />
            <circle
              cx="64"
              cy="64"
              r="56"
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              strokeDasharray={`${(summary.bikeFitScore / 100) * 352} 352`}
              className={
                summary.bikeFitScore >= 80 ? 'text-green-500' :
                summary.bikeFitScore >= 60 ? 'text-yellow-500' :
                'text-red-500'
              }
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-4xl font-bold text-white">{summary.bikeFitScore}</span>
          </div>
        </div>
        <p className="text-gray-300 mt-4">{summary.overallAssessment}</p>
      </div>

      {/* Saddle Height Assessment */}
      <div className="card p-4">
        <h3 className="text-lg font-semibold text-white mb-3">Valutazione Altezza Sella</h3>
        <p className={`text-lg ${
          summary.saddleHeightAssessment.includes('OTTIMALE') ? 'text-green-400' :
          summary.saddleHeightAssessment.includes('TROPPO') ? 'text-yellow-400' :
          'text-gray-300'
        }`}>
          {summary.saddleHeightAssessment}
        </p>
      </div>

      {/* Side Comparison */}
      <div className="card p-4">
        <h3 className="text-lg font-semibold text-white mb-3">Confronto Lato DX vs SX</h3>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center p-3 bg-gray-700/50 rounded-lg">
            <p className="text-gray-400 text-xs">Diff. Ginocchio</p>
            <p className="text-white font-mono text-xl">
              {summary.sideComparison.kneeAngleDifference ?? '--'}°
            </p>
          </div>
          <div className="text-center p-3 bg-gray-700/50 rounded-lg">
            <p className="text-gray-400 text-xs">Diff. Anca</p>
            <p className="text-white font-mono text-xl">
              {summary.sideComparison.hipAngleDifference ?? '--'}°
            </p>
          </div>
          <div className="text-center p-3 bg-gray-700/50 rounded-lg">
            <p className="text-gray-400 text-xs">Diff. Caviglia</p>
            <p className="text-white font-mono text-xl">
              {summary.sideComparison.ankleAngleDifference ?? '--'}°
            </p>
          </div>
        </div>
        <p className="text-gray-300">{summary.sideComparison.assessment}</p>
      </div>

      {/* Frontal Comparison */}
      <div className="card p-4">
        <h3 className="text-lg font-semibold text-white mb-3">Confronto Vista Frontale/Posteriore</h3>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="p-3 bg-gray-700/50 rounded-lg">
            <p className="text-gray-400 text-xs">Tracking Ginocchio (Fronte)</p>
            <p className={`font-semibold ${
              summary.frontalComparison.kneeTrackingLeft === 'Stabile'
                ? 'text-green-400'
                : 'text-yellow-400'
            }`}>
              {summary.frontalComparison.kneeTrackingLeft}
            </p>
          </div>
          <div className="p-3 bg-gray-700/50 rounded-lg">
            <p className="text-gray-400 text-xs">Tracking Ginocchio (Retro)</p>
            <p className={`font-semibold ${
              summary.frontalComparison.kneeTrackingRight === 'Stabile'
                ? 'text-green-400'
                : 'text-yellow-400'
            }`}>
              {summary.frontalComparison.kneeTrackingRight}
            </p>
          </div>
        </div>
        <p className="text-gray-300">{summary.frontalComparison.assessment}</p>
      </div>

      {/* Key Asymmetries */}
      {summary.keyAsymmetries.length > 0 && (
        <div className="card p-4 border border-yellow-500/30">
          <h3 className="text-lg font-semibold text-yellow-400 mb-3">Asimmetrie Chiave</h3>
          <ul className="space-y-2">
            {summary.keyAsymmetries.map((asymmetry, i) => (
              <li key={i} className="text-yellow-300 flex items-start gap-2">
                <span>⚠️</span>
                {asymmetry}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Priority Recommendations */}
      {summary.priorityRecommendations.length > 0 && (
        <div className="card p-4 border border-blue-500/30">
          <h3 className="text-lg font-semibold text-blue-400 mb-3">Raccomandazioni Prioritarie</h3>
          <ol className="space-y-2">
            {summary.priorityRecommendations.map((rec, i) => (
              <li key={i} className="text-blue-300 flex items-start gap-2">
                <span className="bg-blue-500/20 text-blue-400 w-6 h-6 rounded-full flex items-center justify-center text-sm flex-shrink-0">
                  {i + 1}
                </span>
                {rec}
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Test Summary Cards */}
      <div className="card p-4">
        <h3 className="text-lg font-semibold text-white mb-3">Riepilogo Test</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(['right_side', 'left_side', 'front', 'back'] as CyclingTestView[]).map(test => {
            const result = results[test];
            return (
              <div
                key={test}
                className={`p-3 rounded-lg ${result ? 'bg-green-500/10' : 'bg-gray-700/50'}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span>{TAB_CONFIG[test].icon}</span>
                  <span className="text-gray-300 text-sm">{TAB_CONFIG[test].label}</span>
                </div>
                {result ? (
                  <div className="text-xs text-gray-400">
                    <p>Durata: {formatDuration(result.duration)}</p>
                    <p>Cicli: {result.cycleCount}</p>
                  </div>
                ) : (
                  <p className="text-gray-500 text-xs">Non completato</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/**
 * Cycling Results Panel Component
 */
const CyclingResultsPanel: React.FC<CyclingResultsPanelProps> = ({
  session,
  activeTab,
  onTabChange,
  onBack,
  onHome,
}) => {
  const [currentTab, setCurrentTab] = useState<CyclingTestView | 'summary'>(
    session.summary ? 'summary' : activeTab
  );

  const handleTabClick = (tab: CyclingTestView | 'summary') => {
    setCurrentTab(tab);
    if (tab !== 'summary') {
      onTabChange(tab);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              title="Torna ai test"
            >
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-lg font-semibold text-white">Risultati Analisi</h1>
          </div>
          <button
            onClick={onHome}
            className="px-3 py-1.5 text-sm text-gray-300 hover:text-white
                     bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
          >
            Torna alla Home
          </button>
        </div>
      </header>

      {/* Tab navigation */}
      <div className="bg-gray-800 border-b border-gray-700 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex gap-1 overflow-x-auto py-2">
            {(['right_side', 'left_side', 'front', 'back', 'summary'] as (CyclingTestView | 'summary')[]).map(tab => {
              const isSummaryTab = tab === 'summary';
              const isCompleted = isSummaryTab || (session.results[tab as CyclingTestView] !== undefined);
              const isActive = currentTab === tab;

              return (
                <button
                  key={tab}
                  onClick={() => handleTabClick(tab)}
                  disabled={!isCompleted}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                           transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : isCompleted
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <span>{TAB_CONFIG[tab].icon}</span>
                  <span>{TAB_CONFIG[tab].label}</span>
                  {isCompleted && !isSummaryTab && (
                    <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 p-4 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          {currentTab === 'summary' ? (
            <SummaryContent session={session} />
          ) : session.results[currentTab] ? (
            <TestResultContent
              result={session.results[currentTab]!}
              testType={currentTab}
            />
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-400">Test non ancora completato</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default CyclingResultsPanel;
