/**
 * BiomechCoach - Main Application Component
 *
 * Sets up routing and provides the main application structure.
 */

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ModeSelector from './components/ModeSelector';
import CyclingCaptureView from './components/CyclingCaptureView';
import StaticCaptureView from './components/StaticCaptureView';
import RunningCaptureView from './components/RunningCaptureView';

/**
 * Main App Component
 */
const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-900">
      <Routes>
        {/* Landing page - mode selection */}
        <Route path="/" element={<ModeSelector />} />

        {/* Cycling analysis view - 4 test workflow */}
        <Route path="/cycling" element={<CyclingCaptureView />} />

        {/* Running analysis view */}
        <Route path="/running" element={<RunningCaptureView />} />

        {/* Static assessment view */}
        <Route path="/static" element={<StaticCaptureView />} />

        {/* Catch all - redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
};

export default App;
