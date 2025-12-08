# BiomechCoach

Real-time biomechanical analysis for cyclists and runners using AI-powered pose estimation.

## Features

- **Real-time Pose Estimation**: Uses MediaPipe Pose for accurate body tracking
- **Cycling Analysis**: Analyze bike fit, pedaling mechanics, and muscle engagement
- **Running Analysis**: Analyze gait, stride mechanics, and running form
- **Live Feedback**: Get instant coaching suggestions based on your movement
- **Angle Tracking**: Monitor key joint angles (knee, hip, ankle, trunk)

## Getting Started

### Prerequisites

- Node.js 18+
- Modern browser with camera support (Chrome, Firefox, Edge)

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Usage

1. Open the app in your browser (default: http://localhost:5173)
2. Select your activity: **Cycling** or **Running**
3. Position your camera at a **side view** angle
4. Start the camera and begin your activity
5. View real-time angle measurements and coaching suggestions

## Cycling Mode

Analyzes your cycling position on an indoor trainer:

- **Knee angle at BDC**: Optimal range 140°-150°
- **Hip angle**: Indicates position aggressiveness
- **Trunk angle**: Measures aerodynamic position
- **Saddle height suggestions**: Based on knee extension

## Running Mode

Analyzes your running form on a treadmill:

- **Knee flexion at midstance**: Impact absorption indicator
- **Hip extension**: Propulsion efficiency
- **Trunk lean**: Running posture analysis
- **Cadence tracking**: Steps per minute
- **Overstriding detection**: Foot placement analysis

## Project Structure

```
src/
├── components/         # React UI components
│   ├── CameraFeed.tsx      # Camera video display
│   ├── PoseOverlayCanvas.tsx # Skeleton visualization
│   ├── AnglePanel.tsx      # Angle measurements display
│   ├── SummaryPanel.tsx    # Coaching suggestions
│   ├── ModeSelector.tsx    # Activity selection
│   └── CaptureView.tsx     # Main analysis view
├── hooks/             # Custom React hooks
│   ├── useCameraStream.ts  # Camera management
│   ├── usePoseEstimation.ts # MediaPipe integration
│   ├── useCyclingAnalysis.ts # Cycling biomechanics
│   └── useRunningAnalysis.ts # Running biomechanics
├── lib/               # Utilities and types
│   ├── poseTypes.ts       # TypeScript types
│   ├── vectorMath.ts      # Angle calculations
│   ├── cyclingHeuristics.ts # Cycling coaching rules
│   └── runningHeuristics.ts # Running coaching rules
└── styles/            # CSS styles
    └── index.css          # Tailwind + custom styles
```

## Tech Stack

- **React 18** with TypeScript
- **Vite** for fast development and builds
- **Tailwind CSS** for styling
- **MediaPipe Pose** for pose estimation
- **React Router** for navigation

## Browser Compatibility

- Chrome 90+
- Firefox 88+
- Edge 90+
- Safari 14.1+ (limited camera support)

Note: Camera access requires HTTPS in production or localhost in development.

## Disclaimer

BiomechCoach provides educational feedback based on pose estimation and general biomechanics principles. It is not a substitute for professional coaching, bike fitting, or medical advice. Always consult qualified professionals for personalized guidance.

## License

MIT License - See LICENSE file for details
