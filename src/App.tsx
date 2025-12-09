/**
 * BiomechCoach - Main Application Component
 *
 * Sets up routing and provides the main application structure.
 */

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ModeSelector from './components/ModeSelector';
import CyclingModeSelector from './components/CyclingModeSelector';
import CyclingCaptureView from './components/CyclingCaptureView';
import CyclingStaticCaptureView from './components/CyclingStaticCaptureView';
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

        {/* Cycling mode selector - static vs dynamic */}
        <Route path="/cycling" element={<CyclingModeSelector />} />

        {/* Cycling dynamic analysis - 4 test workflow */}
        <Route path="/cycling/dynamic" element={<CyclingCaptureView />} />

        {/* Cycling static analysis - 2 step saddle height */}
        <Route path="/cycling/static" element={<CyclingStaticCaptureView />} />

        {/* Running analysis view */}
        <Route path="/running" element={<RunningCaptureView />} />

        {/* Static assessment view (postural) */}
        <Route path="/static" element={<StaticCaptureView />} />

        {/* Catch all - redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
};

export default App;
