import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Allow camera access in development
    https: false,
    host: true,
  },
  optimizeDeps: {
    // Exclude MediaPipe from optimization to avoid issues
    exclude: ['@mediapipe/pose', '@mediapipe/camera_utils', '@mediapipe/drawing_utils'],
  },
});
