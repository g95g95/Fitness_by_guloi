/**
 * BiomechCoach - Exercise List Component
 *
 * Displays the list of 20 static assessment exercises
 * with selection and completion state tracking.
 */

import React from 'react';
import { StaticExercise } from '../lib/poseTypes';
import { STATIC_EXERCISES, CATEGORY_LABELS, VIEW_LABELS } from '../lib/staticExercises';

interface ExerciseListProps {
  /** Currently selected exercise */
  selectedExercise: StaticExercise | null;
  /** Callback when exercise is selected */
  onSelect: (exercise: StaticExercise) => void;
  /** Set of completed exercise IDs */
  completedExercises?: Set<string>;
  /** Whether the list is compact (no description) */
  compact?: boolean;
}

/**
 * View badge component
 */
const ViewBadge: React.FC<{ view: StaticExercise['view'] }> = ({ view }) => {
  const colors = {
    front: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    side: 'bg-green-500/20 text-green-400 border-green-500/30',
    either: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  };

  return (
    <span className={`text-xs px-2 py-0.5 rounded border ${colors[view]}`}>
      {VIEW_LABELS[view]}
    </span>
  );
};

/**
 * Category header component
 */
const CategoryHeader: React.FC<{ category: StaticExercise['category'] }> = ({ category }) => {
  return (
    <div className="sticky top-0 bg-gray-800/95 backdrop-blur-sm px-3 py-2 border-b border-gray-700">
      <h4 className="text-xs font-semibold text-purple-400 uppercase tracking-wider">
        {CATEGORY_LABELS[category]}
      </h4>
    </div>
  );
};

/**
 * Exercise item component
 */
const ExerciseItem: React.FC<{
  exercise: StaticExercise;
  isSelected: boolean;
  isCompleted: boolean;
  onClick: () => void;
  compact?: boolean;
}> = ({ exercise, isSelected, isCompleted, onClick, compact }) => {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-3 transition-colors
                ${isSelected
          ? 'bg-purple-500/20 border-l-2 border-purple-500'
          : 'hover:bg-gray-700/50 border-l-2 border-transparent'
        }
                ${isCompleted ? 'opacity-70' : ''}`}
    >
      <div className="flex items-start gap-2">
        {/* Completion indicator */}
        <div className="flex-shrink-0 mt-0.5">
          {isCompleted ? (
            <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
          ) : (
            <div className="w-4 h-4 rounded-full border-2 border-gray-500" />
          )}
        </div>

        {/* Exercise info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-sm font-medium truncate ${isSelected ? 'text-purple-300' : 'text-white'}`}>
              {exercise.name}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ViewBadge view={exercise.view} />
            <span className="text-xs text-gray-500">{exercise.durationSeconds}s</span>
          </div>
          {!compact && (
            <p className="text-xs text-gray-400 mt-1 line-clamp-2">{exercise.description}</p>
          )}
        </div>
      </div>
    </button>
  );
};

/**
 * Exercise List Component
 */
const ExerciseList: React.FC<ExerciseListProps> = ({
  selectedExercise,
  onSelect,
  completedExercises = new Set(),
  compact = false,
}) => {
  // Group exercises by category
  const exercisesByCategory = STATIC_EXERCISES.reduce((acc, exercise) => {
    if (!acc[exercise.category]) {
      acc[exercise.category] = [];
    }
    acc[exercise.category].push(exercise);
    return acc;
  }, {} as Record<StaticExercise['category'], StaticExercise[]>);

  // Order categories
  const categoryOrder: StaticExercise['category'][] = [
    'squat',
    'balance',
    'heel_raise',
    'lunge',
    'hinge',
    'stance',
  ];

  return (
    <div className="h-full flex flex-col bg-gray-800 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-700 bg-gray-800">
        <h3 className="text-sm font-semibold text-white">Static Assessment Exercises</h3>
        <p className="text-xs text-gray-400 mt-1">
          {completedExercises.size} of {STATIC_EXERCISES.length} completed
        </p>
        {/* Progress bar */}
        <div className="mt-2 h-1.5 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-purple-500 transition-all duration-300"
            style={{ width: `${(completedExercises.size / STATIC_EXERCISES.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Exercise list */}
      <div className="flex-1 overflow-y-auto">
        {categoryOrder.map((category) => {
          const exercises = exercisesByCategory[category];
          if (!exercises || exercises.length === 0) return null;

          return (
            <div key={category}>
              <CategoryHeader category={category} />
              <div className="divide-y divide-gray-700/50">
                {exercises.map((exercise) => (
                  <ExerciseItem
                    key={exercise.id}
                    exercise={exercise}
                    isSelected={selectedExercise?.id === exercise.id}
                    isCompleted={completedExercises.has(exercise.id)}
                    onClick={() => onSelect(exercise)}
                    compact={compact}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer with stats */}
      <div className="px-4 py-2 border-t border-gray-700 bg-gray-800/50">
        <div className="flex justify-between text-xs text-gray-500">
          <span>{STATIC_EXERCISES.length} exercises</span>
          <span>{Math.round((completedExercises.size / STATIC_EXERCISES.length) * 100)}% complete</span>
        </div>
      </div>
    </div>
  );
};

export default ExerciseList;
