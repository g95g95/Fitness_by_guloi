/**
 * BiomechCoach - Mode Selector Component
 *
 * Landing page for selecting activity mode (Cycling or Running).
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ActivityMode } from '../lib/poseTypes';

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
 * Mode Selector Component
 */
const ModeSelector: React.FC<ModeSelectorProps> = ({ onSelect }) => {
  const navigate = useNavigate();

  const handleSelectMode = (mode: ActivityMode) => {
    if (onSelect) {
      onSelect(mode);
    }
    navigate(`/${mode}`);
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
    </div>
  );
};

export default ModeSelector;
