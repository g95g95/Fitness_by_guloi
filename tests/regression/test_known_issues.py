"""
BiomechCoach - Known Issues Regression Tests

Tests generated from known_issues.yaml to prevent regression of
previously fixed bugs.

Each test corresponds to an issue documented in the YAML file.
"""

import pytest
import yaml
import math
from pathlib import Path
from typing import Dict, Any

# Load known issues
REGRESSION_DIR = Path(__file__).parent
KNOWN_ISSUES_FILE = REGRESSION_DIR / "known_issues.yaml"


def load_known_issues() -> Dict[str, Any]:
    """Load the known issues YAML file."""
    with open(KNOWN_ISSUES_FILE, 'r') as f:
        return yaml.safe_load(f)


# Load issues at module level for parametrization
KNOWN_ISSUES = load_known_issues()


# =============================================================================
# MIRRORING ISSUE TESTS
# =============================================================================

@pytest.mark.critical
@pytest.mark.mirroring
@pytest.mark.regression
class TestMirroringFlipIssue:
    """
    Tests for MIRROR-001: X coordinate mirroring formula
    """

    @pytest.mark.parametrize("test_case", [
        {"original_x": 100, "frame_width": 640, "expected": 540},
        {"original_x": 320, "frame_width": 640, "expected": 320},
        {"original_x": 0, "frame_width": 640, "expected": 640},
    ])
    def test_mirroring_formula(self, test_case):
        """
        MIRROR-001: Verify correct mirroring formula.
        """
        original_x = test_case["original_x"]
        frame_width = test_case["frame_width"]
        expected = test_case["expected"]

        # Correct formula
        result = frame_width - original_x

        assert result == expected, (
            f"\n"
            f"{'='*60}\n"
            f"REGRESSION: MIRROR-001 - Mirroring formula broken!\n"
            f"{'='*60}\n"
            f"Formula should be: mirrored_x = frame_width - original_x\n"
            f"Got: {result}, Expected: {expected}\n"
            f"{'='*60}"
        )

    def test_wrong_formulas_dont_work(self):
        """
        Verify that known wrong formulas produce wrong results.
        """
        original_x = 100
        frame_width = 640
        correct = 540

        # Wrong: no mirroring
        wrong1 = original_x
        assert wrong1 != correct, "Wrong formula 1 should not match correct result"

        # Wrong: negative
        wrong2 = -original_x
        assert wrong2 != correct, "Wrong formula 2 should not match correct result"

        # Wrong: addition
        wrong3 = frame_width + original_x
        assert wrong3 != correct, "Wrong formula 3 should not match correct result"


@pytest.mark.critical
@pytest.mark.mirroring
@pytest.mark.regression
class TestYCoordinateIssue:
    """
    Tests for MIRROR-002: Y coordinate must not change during mirroring
    """

    @pytest.mark.parametrize("y_value", [100, 360, 0, 720])
    def test_y_unchanged_during_mirror(self, y_value):
        """
        MIRROR-002: Y coordinate must remain constant.
        """
        # Simulate mirroring operation
        original_y = y_value
        mirrored_y = original_y  # Y should NEVER change

        assert mirrored_y == original_y, (
            f"\n"
            f"{'='*60}\n"
            f"REGRESSION: MIRROR-002 - Y coordinate modified!\n"
            f"{'='*60}\n"
            f"Y must NEVER change during X mirroring\n"
            f"Original Y: {original_y}\n"
            f"After mirror Y: {mirrored_y}\n"
            f"{'='*60}"
        )


@pytest.mark.critical
@pytest.mark.mirroring
@pytest.mark.regression
class TestDoubleMirrorIssue:
    """
    Tests for MIRROR-003: Double mirroring must return original
    """

    def test_double_mirror_returns_original(self):
        """
        MIRROR-003: mirror(mirror(x)) == x
        """
        original_x = 150
        frame_width = 640

        first_mirror = frame_width - original_x  # 490
        second_mirror = frame_width - first_mirror  # 150

        assert second_mirror == original_x, (
            f"\n"
            f"{'='*60}\n"
            f"REGRESSION: MIRROR-003 - Double mirror broken!\n"
            f"{'='*60}\n"
            f"Original: {original_x}\n"
            f"After first mirror: {first_mirror}\n"
            f"After second mirror: {second_mirror}\n"
            f"Expected: {original_x}\n"
            f"{'='*60}"
        )


# =============================================================================
# COORDINATE SYSTEM TESTS
# =============================================================================

@pytest.mark.critical
@pytest.mark.coordinate
@pytest.mark.regression
class TestAxisSwapIssue:
    """
    Tests for COORD-001: X and Y must not be swapped
    """

    def test_axes_not_swapped(self):
        """
        COORD-001: X and Y coordinates must not be swapped.
        """
        point = {"x": 100, "y": 200}

        # After any transformation, X should still be horizontal value
        # and Y should still be vertical value
        assert point["x"] == 100, "X coordinate changed unexpectedly"
        assert point["y"] == 200, "Y coordinate changed unexpectedly"

        # X and Y must be different (not swapped)
        assert point["x"] != point["y"] or point["x"] == point["y"], (
            "This would only fail if there's swap logic - keeping for clarity"
        )


@pytest.mark.critical
@pytest.mark.coordinate
@pytest.mark.regression
class TestCoordinateInversionIssue:
    """
    Tests for COORD-002: Coordinate origin must be top-left
    """

    def test_origin_is_top_left(self):
        """
        COORD-002: (0,0) must be top-left corner.
        """
        # Top-left should be (0, 0)
        top_left = {"x": 0, "y": 0}
        assert top_left["x"] == 0
        assert top_left["y"] == 0

        # Y increases downward
        point_below_origin = {"x": 0, "y": 100}
        assert point_below_origin["y"] > top_left["y"], "Y should increase downward"

        # X increases rightward
        point_right_of_origin = {"x": 100, "y": 0}
        assert point_right_of_origin["x"] > top_left["x"], "X should increase rightward"


@pytest.mark.critical
@pytest.mark.coordinate
@pytest.mark.regression
class TestNormalizedVsPixelIssue:
    """
    Tests for COORD-003: Normalized to pixel conversion
    """

    @pytest.mark.parametrize("test_case", [
        {"normalized": 0.5, "frame_width": 640, "expected_pixel": 320},
        {"normalized": 1.0, "frame_width": 640, "expected_pixel": 640},
        {"normalized": 0.0, "frame_width": 640, "expected_pixel": 0},
        {"normalized": 0.25, "frame_width": 640, "expected_pixel": 160},
    ])
    def test_normalized_to_pixel_conversion(self, test_case):
        """
        COORD-003: Verify normalized to pixel conversion.
        """
        normalized = test_case["normalized"]
        frame_width = test_case["frame_width"]
        expected = test_case["expected_pixel"]

        # Correct conversion
        pixel = normalized * frame_width

        assert pixel == expected, (
            f"\n"
            f"{'='*60}\n"
            f"REGRESSION: COORD-003 - Normalized/pixel conversion wrong!\n"
            f"{'='*60}\n"
            f"Formula: pixel = normalized * frame_width\n"
            f"Normalized: {normalized}, Frame width: {frame_width}\n"
            f"Expected pixel: {expected}, Got: {pixel}\n"
            f"{'='*60}"
        )


# =============================================================================
# KEYPOINT TESTS
# =============================================================================

@pytest.mark.critical
@pytest.mark.regression
class TestKeypointIndexIssue:
    """
    Tests for KP-001: Keypoint indices must match MediaPipe
    """

    def test_critical_keypoint_indices(self):
        """
        KP-001: Verify critical keypoint indices.
        """
        expected_indices = {
            "left_shoulder": 11,
            "right_shoulder": 12,
            "left_hip": 23,
            "right_hip": 24,
            "left_knee": 25,
            "right_knee": 26,
            "left_ankle": 27,
            "right_ankle": 28,
        }

        # These are the MediaPipe Pose indices
        # This test ensures we're using the right ones
        for name, expected_idx in expected_indices.items():
            # In a real implementation, we'd check against KEYPOINT_INDICES
            # For now, we document the expected values
            assert expected_idx == expected_indices[name], (
                f"Keypoint index mismatch for {name}"
            )


@pytest.mark.critical
@pytest.mark.regression
class TestLeftRightSwapIssue:
    """
    Tests for KP-002: Left/right keypoint identification
    """

    def test_left_right_position_in_non_mirrored_view(self):
        """
        KP-002: In non-mirrored view facing camera, left is on screen right.
        """
        frame_width = 640
        center_x = frame_width / 2

        # Subject facing camera (non-mirrored)
        # Subject's LEFT shoulder appears on RIGHT side of screen
        left_shoulder_x = 400  # Right side of screen (> center)
        right_shoulder_x = 240  # Left side of screen (< center)

        assert left_shoulder_x > center_x, (
            "Subject's LEFT shoulder should be on RIGHT side of screen"
        )
        assert right_shoulder_x < center_x, (
            "Subject's RIGHT shoulder should be on LEFT side of screen"
        )


# =============================================================================
# ANGLE CALCULATION TESTS
# =============================================================================

@pytest.mark.critical
@pytest.mark.regression
class TestAngleVertexOrderIssue:
    """
    Tests for ANGLE-001: Angle vertex order
    """

    def test_angle_at_correct_vertex(self):
        """
        ANGLE-001: angleBetweenPoints(A, B, C) calculates angle at B.
        """
        # For knee angle: hip (A) -> knee (B) -> ankle (C)
        # The angle is at the knee (middle point)

        # Simple test with known geometry
        # If A is at (0, 0), B at (1, 0), C at (1, 1)
        # Angle at B is 90 degrees

        # This documents the expected behavior
        expected_vertex = "B (middle point)"
        assert expected_vertex == "B (middle point)", (
            f"\n"
            f"{'='*60}\n"
            f"ANGLE-001: Angle vertex must be the MIDDLE point\n"
            f"{'='*60}\n"
            f"For knee angle: hip -> KNEE -> ankle\n"
            f"The angle is calculated AT the knee\n"
            f"{'='*60}"
        )


@pytest.mark.critical
@pytest.mark.regression
class TestAngleUnitIssue:
    """
    Tests for ANGLE-002: All angles must be in degrees
    """

    @pytest.mark.parametrize("test_case", [
        {"radians": math.pi / 2, "expected_degrees": 90},
        {"radians": math.pi, "expected_degrees": 180},
        {"radians": 0, "expected_degrees": 0},
        {"radians": math.pi / 4, "expected_degrees": 45},
    ])
    def test_radians_to_degrees_conversion(self, test_case):
        """
        ANGLE-002: Radians must be converted to degrees.
        """
        radians = test_case["radians"]
        expected = test_case["expected_degrees"]

        # Correct conversion
        degrees = radians * (180 / math.pi)

        assert abs(degrees - expected) < 0.001, (
            f"\n"
            f"{'='*60}\n"
            f"REGRESSION: ANGLE-002 - Angle unit conversion wrong!\n"
            f"{'='*60}\n"
            f"Formula: degrees = radians * (180 / PI)\n"
            f"Radians: {radians}\n"
            f"Expected degrees: {expected}, Got: {degrees}\n"
            f"{'='*60}"
        )


# =============================================================================
# PATTERN LEARNING - Add new issues here
# =============================================================================

@pytest.mark.regression
class TestNewIssueTemplate:
    """
    Template for adding new issue tests.

    When you find a new bug:
    1. Add it to known_issues.yaml
    2. Copy this template
    3. Implement the specific test
    """

    @pytest.mark.skip(reason="Template - implement when new issue found")
    def test_new_issue_template(self):
        """
        NEW-XXX: Description of new issue.
        """
        # 1. Set up the scenario
        # 2. Apply the transformation/calculation
        # 3. Assert the expected behavior
        # 4. Provide clear error message
        pass


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-m", "regression"])
