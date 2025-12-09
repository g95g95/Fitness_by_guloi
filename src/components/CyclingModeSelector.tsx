/**
 * BiomechCoach - Cycling Mode Selector Component
 *
 * Allows users to choose between Static and Dynamic cycling analysis modes.
 * - Static: Side view analysis at 6 o'clock position (heel on pedal vs clipped in)
 * - Dynamic: Full 4-test workflow with multiple views during pedaling
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CyclingMode } from '../lib/poseTypes';

/**
 * Mode Card Component for cycling mode selection
 */
interface ModeCardProps {
  mode: CyclingMode;
  title: string;
  description: string;
  icon: React.ReactNode;
  features: string[];
  onClick: () => void;
  accentColor: 'blue' | 'green';
}

const ModeCard: React.FC<ModeCardProps> = ({
  title,
  description,
  icon,
  features,
  onClick,
  accentColor,
}) => {
  const colorClasses = {
    blue: {
      border: 'hover:border-blue-500',
      bg: 'bg-blue-500/10 group-hover:bg-blue-500/20',
      text: 'text-blue-400 group-hover:text-blue-300',
      ring: 'focus:ring-blue-500',
      bullet: 'bg-blue-500',
    },
    green: {
      border: 'hover:border-green-500',
      bg: 'bg-green-500/10 group-hover:bg-green-500/20',
      text: 'text-green-400 group-hover:text-green-300',
      ring: 'focus:ring-green-500',
      bullet: 'bg-green-500',
    },
  };

  const colors = colorClasses[accentColor];

  return (
    <button
      onClick={onClick}
      className={`group relative w-full max-w-md p-8 bg-gray-800 hover:bg-gray-750
                 border border-gray-700 ${colors.border} rounded-2xl
                 transition-all duration-300 transform hover:scale-[1.02]
                 focus:outline-none focus:ring-2 ${colors.ring} focus:ring-offset-2
                 focus:ring-offset-gray-900 text-left`}
    >
      {/* Icon */}
      <div
        className={`w-16 h-16 mb-6 rounded-xl ${colors.bg}
                    flex items-center justify-center
                    transition-colors duration-300`}
      >
        <div className={`${colors.text} transition-colors`}>{icon}</div>
      </div>

      {/* Title */}
      <h3 className={`text-2xl font-bold text-white mb-2 ${colors.text} transition-colors`}>
        {title}
      </h3>

      {/* Description */}
      <p className="text-gray-400 text-sm leading-relaxed mb-4">{description}</p>

      {/* Features list */}
      <ul className="space-y-2">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start gap-2 text-sm text-gray-500">
            <span className={`w-1.5 h-1.5 ${colors.bullet} rounded-full mt-1.5 flex-shrink-0`} />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      {/* Arrow indicator */}
      <div className={`mt-6 text-gray-500 ${colors.text} transition-colors`}>
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
 * Cycling Mode Selector Component
 */
const CyclingModeSelector: React.FC = () => {
  const navigate = useNavigate();

  const handleSelectMode = (mode: CyclingMode) => {
    if (mode === 'static') {
      navigate('/cycling/static');
    } else {
      navigate('/cycling/dynamic');
    }
  };

  const handleBack = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950">
      {/* Back button */}
      <button
        onClick={handleBack}
        className="absolute top-6 left-6 p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Header */}
      <div className="text-center mb-12">
        {/* Icon */}
        <div
          className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-biomech-500 to-biomech-700
                      flex items-center justify-center shadow-lg shadow-biomech-500/20"
        >
          <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        </div>

        {/* Title */}
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">Analisi Ciclismo</h1>

        {/* Subtitle */}
        <p className="text-gray-400 text-lg max-w-lg mx-auto">
          Scegli la modalita di analisi piu adatta alle tue esigenze
        </p>
      </div>

      {/* Mode Selection Cards */}
      <div className="flex flex-col md:flex-row gap-6 md:gap-8 w-full max-w-4xl justify-center">
        <ModeCard
          mode="static"
          title="Analisi Statica"
          description="Valuta l'altezza della sella con la gamba a ore 6. Ideale per una regolazione rapida e precisa."
          onClick={() => handleSelectMode('static')}
          accentColor="blue"
          features={[
            'Telecamera laterale',
            'Due misurazioni: tallone e agganciato',
            'Rilevamento automatico posizione',
            'Analisi immediata degli angoli',
          ]}
          icon={
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {/* Static/pause icon with measurement */}
              <rect x="6" y="4" width="4" height="16" rx="1" strokeWidth="1.5" />
              <rect x="14" y="4" width="4" height="16" rx="1" strokeWidth="1.5" />
              <path strokeLinecap="round" strokeWidth="1.5" d="M2 12h2m16 0h2" />
            </svg>
          }
        />

        <ModeCard
          mode="dynamic"
          title="Analisi Dinamica"
          description="Analisi completa durante la pedalata con 4 test da diverse angolazioni. Per una valutazione approfondita."
          onClick={() => handleSelectMode('dynamic')}
          accentColor="green"
          features={[
            '4 test: lato destro, sinistro, frontale, posteriore',
            'Analisi in tempo reale durante la pedalata',
            'Rilevamento cicli e angoli dinamici',
            'Report dettagliato con raccomandazioni',
          ]}
          icon={
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {/* Play/dynamic icon with motion */}
              <polygon points="5,3 19,12 5,21" strokeWidth="1.5" strokeLinejoin="round" />
              <path
                strokeLinecap="round"
                strokeWidth="1.5"
                d="M22 12c0 2-1 4-2 5m0-10c1 1 2 3 2 5"
              />
            </svg>
          }
        />
      </div>

      {/* Info section */}
      <div className="mt-12 text-center max-w-2xl">
        <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Quale scegliere?
        </h4>
        <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-500">
          <div className="p-4 bg-gray-800/50 rounded-lg">
            <span className="text-blue-400 font-medium">Statica</span>: Per regolare rapidamente
            l'altezza della sella. Bastano pochi minuti.
          </div>
          <div className="p-4 bg-gray-800/50 rounded-lg">
            <span className="text-green-400 font-medium">Dinamica</span>: Per un'analisi completa
            della posizione e della pedalata. Richiede ~15-20 minuti.
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-12 text-center text-gray-600 text-xs">
        <p>BiomechCoach - Analisi biomeccanica per ciclisti</p>
      </footer>
    </div>
  );
};

export default CyclingModeSelector;
