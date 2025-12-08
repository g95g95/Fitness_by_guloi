/**
 * BiomechCoach - Summary Panel Component
 *
 * Displays coaching suggestions and muscle insights.
 */

import React from 'react';
import { Suggestion, MuscleInsight, SuggestionSeverity } from '../lib/poseTypes';

interface SummaryPanelProps {
  /** Coaching suggestions */
  suggestions: Suggestion[];
  /** Muscle engagement insights */
  muscleInsights: MuscleInsight[];
  /** Whether analysis is active */
  isAnalyzing?: boolean;
}

/**
 * Get icon and color for suggestion severity
 */
function getSeverityStyle(severity: SuggestionSeverity): {
  icon: React.ReactNode;
  bgColor: string;
  textColor: string;
} {
  switch (severity) {
    case 'warning':
      return {
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        ),
        bgColor: 'bg-yellow-500/10',
        textColor: 'text-yellow-400',
      };
    case 'improvement':
      return {
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
        ),
        bgColor: 'bg-blue-500/10',
        textColor: 'text-blue-400',
      };
    case 'info':
    default:
      return {
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        ),
        bgColor: 'bg-green-500/10',
        textColor: 'text-green-400',
      };
  }
}

/**
 * Get color for muscle engagement level
 */
function getEngagementStyle(engagement: 'low' | 'moderate' | 'high'): {
  bgColor: string;
  textColor: string;
  label: string;
} {
  switch (engagement) {
    case 'high':
      return {
        bgColor: 'bg-green-500/20',
        textColor: 'text-green-400',
        label: 'High',
      };
    case 'moderate':
      return {
        bgColor: 'bg-yellow-500/20',
        textColor: 'text-yellow-400',
        label: 'Moderate',
      };
    case 'low':
    default:
      return {
        bgColor: 'bg-red-500/20',
        textColor: 'text-red-400',
        label: 'Low',
      };
  }
}

/**
 * Suggestion Item Component
 */
const SuggestionItem: React.FC<{ suggestion: Suggestion }> = ({ suggestion }) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const style = getSeverityStyle(suggestion.severity);

  return (
    <div className={`${style.bgColor} rounded-lg p-3 mb-2`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full text-left flex items-start gap-2"
      >
        <span className={`${style.textColor} suggestion-icon`}>{style.icon}</span>
        <div className="flex-1 min-w-0">
          <p className={`${style.textColor} font-medium text-sm`}>{suggestion.message}</p>
          {suggestion.detail && (
            <p
              className={`text-gray-400 text-xs mt-1 ${isExpanded ? '' : 'line-clamp-2'
                }`}
            >
              {suggestion.detail}
            </p>
          )}
        </div>
        {suggestion.detail && (
          <svg
            className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''
              }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>
    </div>
  );
};

/**
 * Muscle Insight Item Component
 */
const MuscleInsightItem: React.FC<{ insight: MuscleInsight }> = ({ insight }) => {
  const style = getEngagementStyle(insight.engagement);

  return (
    <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-700/30 transition-colors">
      <div className={`${style.bgColor} ${style.textColor} px-2 py-0.5 rounded text-xs font-medium`}>
        {style.label}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-200">{insight.muscleGroup}</p>
        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{insight.note}</p>
      </div>
    </div>
  );
};

/**
 * Summary Panel Component
 */
const SummaryPanel: React.FC<SummaryPanelProps> = ({
  suggestions,
  muscleInsights,
  isAnalyzing = false,
}) => {
  return (
    <div className="space-y-4">
      {/* Suggestions Section */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-white">Coaching Tips</h3>
          {isAnalyzing && (
            <span className="flex items-center gap-1.5 text-xs text-biomech-400">
              <span className="w-2 h-2 bg-biomech-400 rounded-full animate-pulse" />
              Analyzing
            </span>
          )}
        </div>

        {suggestions.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <svg
              className="w-10 h-10 mx-auto mb-2 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
            <p className="text-sm">
              {isAnalyzing
                ? 'Gathering data for analysis...'
                : 'Start recording to get coaching tips'}
            </p>
          </div>
        ) : (
          <div>
            {suggestions.map((suggestion) => (
              <SuggestionItem key={suggestion.id} suggestion={suggestion} />
            ))}
          </div>
        )}
      </div>

      {/* Muscle Insights Section */}
      <div className="card p-4">
        <h3 className="text-lg font-semibold text-white mb-3">Muscle Engagement</h3>

        {muscleInsights.length === 0 ? (
          <div className="text-center py-4 text-gray-500">
            <p className="text-sm">No muscle data yet</p>
          </div>
        ) : (
          <div className="space-y-1">
            {muscleInsights.map((insight, index) => (
              <MuscleInsightItem key={`${insight.muscleGroup}-${index}`} insight={insight} />
            ))}
          </div>
        )}

        {/* Disclaimer */}
        <p className="mt-4 text-xs text-gray-600 italic">
          Note: Muscle engagement estimates are educational approximations based on joint angles,
          not direct measurements.
        </p>
      </div>
    </div>
  );
};

export default SummaryPanel;
