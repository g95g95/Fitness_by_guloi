/**
 * PasswordGate - Password protection component for debug mode
 *
 * When VITE_IS_DEBUG is true, requires password entry before accessing the app.
 */

import React, { useState, useEffect } from 'react';

interface PasswordGateProps {
  children: React.ReactNode;
}

const PasswordGate: React.FC<PasswordGateProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const isDebugMode = import.meta.env.VITE_IS_DEBUG === 'true';
  const correctPassword = import.meta.env.VITE_DEBUG_PASSWORD || 'CERVARA';

  // Check if already authenticated in session
  useEffect(() => {
    if (!isDebugMode) {
      setIsAuthenticated(true);
      return;
    }
    const stored = sessionStorage.getItem('biomech_authenticated');
    if (stored === 'true') {
      setIsAuthenticated(true);
    }
  }, [isDebugMode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === correctPassword) {
      sessionStorage.setItem('biomech_authenticated', 'true');
      setIsAuthenticated(true);
      setError(false);
    } else {
      setError(true);
    }
  };

  // If not debug mode or already authenticated, show children
  if (!isDebugMode || isAuthenticated) {
    return <>{children}</>;
  }

  // Show password form
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg max-w-sm w-full mx-4">
        <h1 className="text-2xl font-bold text-white mb-6 text-center">
          BiomechCoach
        </h1>
        <p className="text-gray-400 text-sm mb-6 text-center">
          Enter password to access the application
        </p>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(false);
            }}
            placeholder="Password"
            className={`w-full px-4 py-3 rounded-lg bg-gray-700 text-white border-2
              ${error ? 'border-red-500' : 'border-gray-600'}
              focus:border-blue-500 focus:outline-none mb-4`}
            autoFocus
          />
          {error && (
            <p className="text-red-500 text-sm mb-4 text-center">
              Incorrect password
            </p>
          )}
          <button
            type="submit"
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
          >
            Enter
          </button>
        </form>
      </div>
    </div>
  );
};

export default PasswordGate;
