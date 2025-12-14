"""
BiomechCoach Test Configuration

This file contains pytest fixtures and configuration used across all tests.
"""

import pytest
import json
import os
from pathlib import Path
from typing import Dict, List, Any

# Test directories
TESTS_DIR = Path(__file__).parent
FIXTURES_DIR = TESTS_DIR / "fixtures"
REGRESSION_DIR = TESTS_DIR / "regression"


@pytest.fixture
def fixtures_path() -> Path:
    """Return path to fixtures directory."""
    return FIXTURES_DIR


@pytest.fixture
def sample_pose_frame() -> Dict[str, Any]:
    """
    Return a sample pose frame with known keypoint positions.
    This represents a person facing the camera in the original (non-mirrored) view.
    """
    # Standard MediaPipe pose with 33 keypoints
    # Person facing camera, right arm raised
    return {
        "timestamp": 1000.0,
        "isValid": True,
        "keypoints": [
            {"name": "nose", "x": 320.0, "y": 100.0, "score": 0.95},
            {"name": "left_eye_inner", "x": 330.0, "y": 90.0, "score": 0.92},
            {"name": "left_eye", "x": 335.0, "y": 90.0, "score": 0.93},
            {"name": "left_eye_outer", "x": 340.0, "y": 90.0, "score": 0.91},
            {"name": "right_eye_inner", "x": 310.0, "y": 90.0, "score": 0.92},
            {"name": "right_eye", "x": 305.0, "y": 90.0, "score": 0.93},
            {"name": "right_eye_outer", "x": 300.0, "y": 90.0, "score": 0.91},
            {"name": "left_ear", "x": 350.0, "y": 95.0, "score": 0.88},
            {"name": "right_ear", "x": 290.0, "y": 95.0, "score": 0.88},
            {"name": "mouth_left", "x": 330.0, "y": 115.0, "score": 0.90},
            {"name": "mouth_right", "x": 310.0, "y": 115.0, "score": 0.90},
            {"name": "left_shoulder", "x": 380.0, "y": 180.0, "score": 0.95},
            {"name": "right_shoulder", "x": 260.0, "y": 180.0, "score": 0.95},
            {"name": "left_elbow", "x": 420.0, "y": 280.0, "score": 0.92},
            {"name": "right_elbow", "x": 200.0, "y": 150.0, "score": 0.92},  # Raised
            {"name": "left_wrist", "x": 440.0, "y": 350.0, "score": 0.88},
            {"name": "right_wrist", "x": 180.0, "y": 80.0, "score": 0.88},   # Raised
            {"name": "left_pinky", "x": 445.0, "y": 360.0, "score": 0.75},
            {"name": "right_pinky", "x": 175.0, "y": 70.0, "score": 0.75},
            {"name": "left_index", "x": 442.0, "y": 355.0, "score": 0.78},
            {"name": "right_index", "x": 178.0, "y": 75.0, "score": 0.78},
            {"name": "left_thumb", "x": 438.0, "y": 345.0, "score": 0.76},
            {"name": "right_thumb", "x": 182.0, "y": 85.0, "score": 0.76},
            {"name": "left_hip", "x": 360.0, "y": 380.0, "score": 0.94},
            {"name": "right_hip", "x": 280.0, "y": 380.0, "score": 0.94},
            {"name": "left_knee", "x": 370.0, "y": 520.0, "score": 0.93},
            {"name": "right_knee", "x": 270.0, "y": 520.0, "score": 0.93},
            {"name": "left_ankle", "x": 375.0, "y": 650.0, "score": 0.91},
            {"name": "right_ankle", "x": 265.0, "y": 650.0, "score": 0.91},
            {"name": "left_heel", "x": 378.0, "y": 670.0, "score": 0.85},
            {"name": "right_heel", "x": 262.0, "y": 670.0, "score": 0.85},
            {"name": "left_foot_index", "x": 385.0, "y": 680.0, "score": 0.82},
            {"name": "right_foot_index", "x": 255.0, "y": 680.0, "score": 0.82},
        ]
    }


@pytest.fixture
def frame_width() -> int:
    """Standard frame width for tests."""
    return 640


@pytest.fixture
def frame_height() -> int:
    """Standard frame height for tests."""
    return 720


@pytest.fixture
def mirrored_pose_frame(sample_pose_frame, frame_width) -> Dict[str, Any]:
    """
    Return the correctly mirrored version of sample_pose_frame.
    Mirroring flips X coordinates: new_x = frame_width - original_x
    """
    mirrored = {
        "timestamp": sample_pose_frame["timestamp"],
        "isValid": sample_pose_frame["isValid"],
        "keypoints": []
    }

    for kp in sample_pose_frame["keypoints"]:
        mirrored_kp = {
            "name": kp["name"],
            "x": frame_width - kp["x"],  # Mirror X coordinate
            "y": kp["y"],  # Y stays the same
            "score": kp["score"]
        }
        mirrored["keypoints"].append(mirrored_kp)

    return mirrored


@pytest.fixture
def load_fixture():
    """Factory fixture to load JSON fixtures."""
    def _load(filename: str) -> Dict:
        filepath = FIXTURES_DIR / filename
        with open(filepath, 'r') as f:
            return json.load(f)
    return _load


@pytest.fixture
def save_fixture():
    """Factory fixture to save reference data."""
    def _save(filename: str, data: Dict) -> None:
        filepath = FIXTURES_DIR / filename
        with open(filepath, 'w') as f:
            json.dump(data, f, indent=2)
    return _save


class MirroringAssertionError(AssertionError):
    """Custom exception for mirroring errors with clear messaging."""
    pass


@pytest.fixture
def assert_mirroring_intact():
    """
    Custom assertion that checks mirroring hasn't changed.
    Provides clear error messages when mirroring is broken.
    """
    def _assert(original_x: float, mirrored_x: float, frame_width: int,
                keypoint_name: str, tolerance: float = 0.001):
        expected_mirrored_x = frame_width - original_x

        if abs(mirrored_x - expected_mirrored_x) > tolerance:
            raise MirroringAssertionError(
                f"\n"
                f"{'='*60}\n"
                f"ERRORE CRITICO: SPECCHIATURA MODIFICATA!\n"
                f"{'='*60}\n"
                f"Keypoint: {keypoint_name}\n"
                f"Original X: {original_x}\n"
                f"Expected mirrored X: {expected_mirrored_x}\n"
                f"Actual mirrored X: {mirrored_x}\n"
                f"Frame width: {frame_width}\n"
                f"Difference: {abs(mirrored_x - expected_mirrored_x)}\n"
                f"{'='*60}\n"
                f"La specchiatura deve seguire: mirrored_x = frame_width - original_x\n"
                f"QUESTO TEST NON DEVE MAI FALLIRE IN PRODUZIONE!\n"
                f"{'='*60}"
            )
    return _assert


@pytest.fixture
def assert_coordinates_valid():
    """Assert that coordinate system hasn't been swapped or inverted."""
    def _assert(keypoints: List[Dict], frame_width: int, frame_height: int):
        errors = []

        for kp in keypoints:
            # Check X bounds
            if kp["x"] < 0 or kp["x"] > frame_width:
                errors.append(
                    f"Keypoint {kp['name']}: X={kp['x']} out of bounds [0, {frame_width}]"
                )
            # Check Y bounds
            if kp["y"] < 0 or kp["y"] > frame_height:
                errors.append(
                    f"Keypoint {kp['name']}: Y={kp['y']} out of bounds [0, {frame_height}]"
                )

        if errors:
            raise AssertionError(
                f"\n"
                f"{'='*60}\n"
                f"ERRORE: COORDINATE FUORI RANGE!\n"
                f"{'='*60}\n"
                + "\n".join(errors) +
                f"\n{'='*60}"
            )
    return _assert


# Register custom markers
def pytest_configure(config):
    """Register custom markers."""
    config.addinivalue_line(
        "markers", "critical: marks tests as critical (must pass)"
    )
    config.addinivalue_line(
        "markers", "mirroring: tests for mirroring/specchiatura"
    )


# Custom pytest hooks for better reporting
def pytest_runtest_makereport(item, call):
    """Add extra info for critical test failures."""
    if call.excinfo is not None:
        if any(marker.name == 'critical' for marker in item.iter_markers()):
            # Could add logging, notifications, etc.
            pass
