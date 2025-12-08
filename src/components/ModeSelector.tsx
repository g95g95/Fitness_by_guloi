/**
 * BiomechCoach - Mode Selector Component
 *
 * Landing page for selecting activity mode (Cycling, Running, or Static).
 * Also includes option to load previous assessment sessions.
 */

import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ActivityMode } from '../lib/poseTypes';
import { AssessmentSession, parseImportedSession, loadSessionsFromStorage } from '../lib/assessmentTypes';

interface ModeSelectorProps {
  /** Optional callback when mode is selected */
  onSelect?: (mode: ActivityMode) => void;
}

/**
 * Mode Card Component
 */
interface ModeCardProps {
  mode: ActivityMode;
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
  accentColor?: string;
}

const ModeCard: React.FC<ModeCardProps> = ({ title, description, icon, onClick, accentColor = 'biomech' }) => {
  const colorClasses = {
    biomech: {
      border: 'hover:border-biomech-500',
      bg: 'bg-biomech-500/10 group-hover:bg-biomech-500/20',
      text: 'text-biomech-400 group-hover:text-biomech-300',
      ring: 'focus:ring-biomech-500',
      arrow: 'group-hover:text-biomech-400',
    },
    purple: {
      border: 'hover:border-purple-500',
      bg: 'bg-purple-500/10 group-hover:bg-purple-500/20',
      text: 'text-purple-400 group-hover:text-purple-300',
      ring: 'focus:ring-purple-500',
      arrow: 'group-hover:text-purple-400',
    },
  };

  const colors = colorClasses[accentColor as keyof typeof colorClasses] || colorClasses.biomech;

  return (
    <button
      onClick={onClick}
      className={`group relative w-full max-w-sm p-8 bg-gray-800 hover:bg-gray-750
                 border border-gray-700 ${colors.border} rounded-2xl
                 transition-all duration-300 transform hover:scale-[1.02]
                 focus:outline-none focus:ring-2 ${colors.ring} focus:ring-offset-2
                 focus:ring-offset-gray-900`}
    >
      {/* Icon */}
      <div className={`w-20 h-20 mx-auto mb-6 rounded-full ${colors.bg}
                    flex items-center justify-center
                    transition-colors duration-300`}>
        <div className={`${colors.text} transition-colors`}>
          {icon}
        </div>
      </div>

      {/* Title */}
      <h3 className={`text-2xl font-bold text-white mb-3 ${colors.text} transition-colors`}>
        {title}
      </h3>

      {/* Description */}
      <p className="text-gray-400 text-sm leading-relaxed">{description}</p>

      {/* Arrow indicator */}
      <div className={`mt-6 text-gray-500 ${colors.arrow} transition-colors`}>
        <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 8l4 4m0 0l-4 4m4-4H3"
          />
        </svg>
      </div>
    </button>
  );
};

/**
 * Session Preview Modal
 */
interface SessionPreviewModalProps {
  session: AssessmentSession | null;
  isOpen: boolean;
  onClose: () => void;
  onView: () => void;
}

const SessionPreviewModal: React.FC<SessionPreviewModalProps> = ({
  session,
  isOpen,
  onClose,
  onView,
}) => {
  if (!isOpen || !session) return null;

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl max-w-lg w-full shadow-xl border border-gray-700">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">Riepilogo Sessione</h2>
          <p className="text-sm text-gray-400 mt-1">
            {formatDate(session.startTimestamp)}
          </p>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-700/50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-purple-400">
                {session.exercises.length}
              </div>
              <div className="text-xs text-gray-400">Esercizi</div>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-green-400">
                {session.sessionSummary?.averageScore || 0}
              </div>
              <div className="text-xs text-gray-400">Punteggio Medio</div>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-blue-400">
                {session.sessionSummary?.commonIssues?.length || 0}
              </div>
              <div className="text-xs text-gray-400">Issues</div>
            </div>
          </div>

          {/* Exercises List */}
          <div>
            <h3 className="text-sm font-medium text-gray-300 mb-2">Esercizi Completati</h3>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {session.exercises.map((ex, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between py-2 px-3 bg-gray-700/30 rounded-lg"
                >
                  <span className="text-sm text-gray-300">{ex.exerciseName}</span>
                  <span className={`text-sm font-medium ${
                    ex.score >= 85 ? 'text-green-400' :
                    ex.score >= 70 ? 'text-blue-400' :
                    ex.score >= 50 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {ex.score}/100
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Global Recommendations Preview */}
          {session.globalRecommendations?.priorityExercises?.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-300 mb-2">Esercizi Prioritari</h3>
              <div className="flex flex-wrap gap-2">
                {session.globalRecommendations.priorityExercises.slice(0, 3).map((rec, idx) => (
                  <span
                    key={idx}
                    className="text-xs px-2 py-1 bg-purple-500/20 text-purple-400 rounded-full"
                  >
                    {rec.exercise}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-700 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-sm text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
          >
            Chiudi
          </button>
          <button
            onClick={onView}
            className="flex-1 px-4 py-2.5 text-sm text-white bg-purple-600 hover:bg-purple-500 rounded-lg transition-colors font-medium"
          >
            Visualizza Dettagli
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Mode Selector Component
 */
const ModeSelector: React.FC<ModeSelectorProps> = ({ onSelect }) => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showSessionModal, setShowSessionModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState<AssessmentSession | null>(null);
  const [recentSessions, setRecentSessions] = useState<AssessmentSession[]>([]);
  const [showRecentSessions, setShowRecentSessions] = useState(false);

  const handleSelectMode = (mode: ActivityMode) => {
    if (onSelect) {
      onSelect(mode);
    }
    navigate(`/${mode}`);
  };

  const handleLoadSession = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const session = parseImportedSession(content);
      if (session) {
        setSelectedSession(session);
        setShowSessionModal(true);
      } else {
        alert('File JSON non valido. Assicurati che sia un file di assessment BiomechCoach.');
      }
    };
    reader.readAsText(file);

    // Reset input
    event.target.value = '';
  };

  const handleShowRecentSessions = () => {
    const sessions = loadSessionsFromStorage();
    setRecentSessions(sessions);
    setShowRecentSessions(true);
  };

  const handleSelectRecentSession = (session: AssessmentSession) => {
    setSelectedSession(session);
    setShowRecentSessions(false);
    setShowSessionModal(true);
  };

  const handleViewSession = () => {
    if (selectedSession) {
      // Store session in sessionStorage for viewing
      sessionStorage.setItem('viewingSession', JSON.stringify(selectedSession));
      navigate('/static?view=session');
    }
    setShowSessionModal(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950">
      {/* Header */}
      <div className="text-center mb-12">
        {/* Logo/Icon */}
        <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-biomech-500 to-biomech-700
                      flex items-center justify-center shadow-lg shadow-biomech-500/20">
          <svg className="w-14 h-14 text-white" viewBox="0 0 100 100" fill="none" stroke="currentColor">
            {/* Simplified human figure */}
            <circle cx="50" cy="20" r="8" strokeWidth="3" />
            <line x1="50" y1="28" x2="50" y2="55" strokeWidth="3" strokeLinecap="round" />
            <line x1="30" y1="38" x2="70" y2="38" strokeWidth="3" strokeLinecap="round" />
            <line x1="50" y1="55" x2="35" y2="80" strokeWidth="3" strokeLinecap="round" />
            <line x1="50" y1="55" x2="65" y2="80" strokeWidth="3" strokeLinecap="round" />
            {/* Joint markers */}
            <circle cx="50" cy="55" r="4" fill="currentColor" />
            <circle cx="35" cy="80" r="3" fill="currentColor" />
            <circle cx="65" cy="80" r="3" fill="currentColor" />
          </svg>
        </div>

        {/* Title */}
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
          BiomechCoach
        </h1>

        {/* Tagline */}
        <p className="text-gray-400 text-lg max-w-md mx-auto">
          Real-time biomechanical analysis for cyclists, runners, and static assessments.
          Improve your form with AI-powered insights.
        </p>
      </div>

      {/* Mode Selection Cards */}
      <div className="flex flex-col md:flex-row flex-wrap gap-6 md:gap-8 w-full max-w-5xl justify-center">
        <ModeCard
          mode="cycling"
          title="Cycling"
          description="Analyze your bike fit and pedaling mechanics on an indoor trainer. Get feedback on saddle height, hip angle, and muscle engagement."
          onClick={() => handleSelectMode('cycling')}
          icon={
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {/* Bicycle icon */}
              <circle cx="5.5" cy="17.5" r="3.5" strokeWidth="1.5" />
              <circle cx="18.5" cy="17.5" r="3.5" strokeWidth="1.5" />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M5.5 17.5l4-9.5h4l2 5.5m0 0L18.5 17.5m-3-4l-4 4m0-8l2 4"
              />
              <circle cx="15" cy="6" r="1.5" fill="currentColor" />
            </svg>
          }
        />

        <ModeCard
          mode="running"
          title="Running"
          description="Analyze your running gait on a treadmill. Get feedback on stride mechanics, hip extension, trunk lean, and potential injury risks."
          onClick={() => handleSelectMode('running')}
          icon={
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {/* Running person icon */}
              <circle cx="14" cy="4" r="2" strokeWidth="1.5" />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M4 20l4-4 3-1 3-4-2-2-4 1-2 4m10-4l3 3v5m-3-8l-4 4"
              />
            </svg>
          }
        />

        <ModeCard
          mode="static"
          title="Static Assessment"
          description="Perform 20 postural and control tests. Assess balance, stability, and movement quality with exercises like squats, single-leg stance, and more."
          onClick={() => handleSelectMode('static')}
          accentColor="purple"
          icon={
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {/* Standing person with balance indicator */}
              <circle cx="12" cy="4" r="2" strokeWidth="1.5" />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M12 6v8m-3 0l3 6 3-6m-6 0h6"
              />
              {/* Balance/stability arc */}
              <path
                strokeLinecap="round"
                strokeWidth="1.5"
                d="M6 22c0-3.3 2.7-6 6-6s6 2.7 6 6"
              />
              {/* Small stability markers */}
              <circle cx="6" cy="22" r="1" fill="currentColor" />
              <circle cx="18" cy="22" r="1" fill="currentColor" />
            </svg>
          }
        />
      </div>

      {/* Load Session Section */}
      <div className="mt-12 flex flex-col items-center gap-4">
        <div className="flex gap-3">
          <button
            onClick={handleLoadSession}
            className="px-6 py-3 text-sm text-purple-400 border border-purple-500/50 hover:bg-purple-500/10
                     rounded-lg transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Carica Riepilogo
          </button>

          <button
            onClick={handleShowRecentSessions}
            className="px-6 py-3 text-sm text-gray-400 border border-gray-600 hover:bg-gray-800
                     rounded-lg transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Sessioni Recenti
          </button>
        </div>

        <p className="text-xs text-gray-500 text-center max-w-md">
          Carica un file JSON di una sessione precedente per visualizzare i risultati
          o accedi alle sessioni salvate localmente.
        </p>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Instructions */}
      <div className="mt-12 text-center max-w-lg">
        <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
          How it works
        </h4>
        <div className="flex flex-col md:flex-row justify-center gap-4 md:gap-8 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-biomech-500/20 text-biomech-400 flex items-center justify-center text-xs font-bold">
              1
            </span>
            <span>Select activity</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-biomech-500/20 text-biomech-400 flex items-center justify-center text-xs font-bold">
              2
            </span>
            <span>Position camera (side view)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-biomech-500/20 text-biomech-400 flex items-center justify-center text-xs font-bold">
              3
            </span>
            <span>Get real-time feedback</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-12 text-center text-gray-600 text-xs">
        <p>
          BiomechCoach uses AI-powered pose estimation for educational purposes only.
          <br />
          Not intended as medical or professional coaching advice.
        </p>
      </footer>

      {/* Session Preview Modal */}
      <SessionPreviewModal
        session={selectedSession}
        isOpen={showSessionModal}
        onClose={() => setShowSessionModal(false)}
        onView={handleViewSession}
      />

      {/* Recent Sessions Modal */}
      {showRecentSessions && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl max-w-md w-full shadow-xl border border-gray-700">
            <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Sessioni Recenti</h2>
              <button
                onClick={() => setShowRecentSessions(false)}
                className="p-1 text-gray-400 hover:text-white"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-6 py-4 max-h-96 overflow-y-auto">
              {recentSessions.length === 0 ? (
                <p className="text-gray-400 text-center py-8">
                  Nessuna sessione salvata localmente.
                </p>
              ) : (
                <div className="space-y-2">
                  {recentSessions.map((session, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSelectRecentSession(session)}
                      className="w-full p-4 bg-gray-700/50 hover:bg-gray-700 rounded-lg text-left transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-white">
                          {new Date(session.startTimestamp).toLocaleDateString('it-IT', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                        <span className={`text-sm font-medium ${
                          (session.sessionSummary?.averageScore || 0) >= 70 ? 'text-green-400' : 'text-yellow-400'
                        }`}>
                          {session.sessionSummary?.averageScore || 0}/100
                        </span>
                      </div>
                      <div className="text-xs text-gray-400">
                        {session.exercises.length} esercizi completati
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModeSelector;
