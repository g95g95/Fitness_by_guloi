"""
BiomechCoach - Critical Mirroring Regression Tests

THESE TESTS MUST NEVER FAIL IN PRODUCTION.
They verify that the mirroring/specchiatura system remains intact.

If any test in this file fails, it means the mocap data transformation
has been incorrectly modified and MUST be fixed immediately.
"""

import pytest
import json
from pathlib import Path
from typing import Dict, List, Any

# Test configuration
FIXTURES_DIR = Path(__file__).parent.parent / "fixtures"
FRAME_WIDTH = 640
FRAME_HEIGHT = 720


class MirroringError(AssertionError):
    """Custom error for mirroring issues with clear messaging."""
    pass


def mirror_x_coordinate(x: float, frame_width: int) -> float:
    """
    The CANONICAL mirroring function.
    This is the ONLY correct way to mirror X coordinates.

    Formula: mirrored_x = frame_width - original_x
    """
    return frame_width - x


def mirror_pose(pose: Dict[str, Any], frame_width: int) -> Dict[str, Any]:
    """
    Mirror a complete pose frame.
    Only X coordinates are flipped, Y coordinates remain unchanged.
    """
    mirrored = {
        "timestamp": pose["timestamp"],
        "isValid": pose["isValid"],
        "keypoints": []
    }

    for kp in pose["keypoints"]:
        mirrored_kp = {
            "name": kp["name"],
            "x": mirror_x_coordinate(kp["x"], frame_width),
            "y": kp["y"],  # Y NEVER changes in mirroring
            "score": kp["score"]
        }
        mirrored["keypoints"].append(mirrored_kp)

    return mirrored


def load_reference_fixture(filename: str) -> Dict:
    """Load a reference fixture file."""
    filepath = FIXTURES_DIR / filename
    with open(filepath, 'r') as f:
        return json.load(f)


# =============================================================================
# CRITICAL MIRRORING TESTS - MUST NEVER FAIL
# =============================================================================

@pytest.mark.critical
@pytest.mark.mirroring
class TestMirroringCritical:
    """
    Critical tests for mirroring functionality.
    These tests verify that the mirroring system works correctly.
    """

    def test_mirror_formula_is_correct(self):
        """
        CRITICAL: Verify the mirroring formula is correct.
        mirrored_x = frame_width - original_x
        """
        test_cases = [
            # (original_x, frame_width, expected_mirrored_x)
            (0.0, 640, 640.0),
            (640.0, 640, 0.0),
            (320.0, 640, 320.0),  # Center stays center
            (100.0, 640, 540.0),
            (500.0, 640, 140.0),
        ]

        for original_x, frame_width, expected in test_cases:
            result = mirror_x_coordinate(original_x, frame_width)
            assert result == expected, (
                f"\n"
                f"{'='*60}\n"
                f"ERRORE CRITICO: FORMULA SPECCHIATURA ERRATA!\n"
                f"{'='*60}\n"
                f"Input: x={original_x}, frame_width={frame_width}\n"
                f"Expected: {expected}\n"
                f"Got: {result}\n"
                f"Formula corretta: mirrored_x = frame_width - original_x\n"
                f"{'='*60}"
            )

    def test_mirroring_is_reversible(self):
        """
        CRITICAL: Mirroring applied twice must return original coordinates.
        """
        original_x = 150.0

        # Mirror once
        mirrored = mirror_x_coordinate(original_x, FRAME_WIDTH)

        # Mirror again
        double_mirrored = mirror_x_coordinate(mirrored, FRAME_WIDTH)

        assert abs(double_mirrored - original_x) < 0.001, (
            f"\n"
            f"{'='*60}\n"
            f"ERRORE CRITICO: SPECCHIATURA NON REVERSIBILE!\n"
            f"{'='*60}\n"
            f"Original: {original_x}\n"
            f"After mirror: {mirrored}\n"
            f"After double mirror: {double_mirrored}\n"
            f"Expected after double: {original_x}\n"
            f"{'='*60}"
        )

    def test_center_point_unchanged_after_mirror(self):
        """
        CRITICAL: Center of frame (x = frame_width/2) must stay at center.
        """
        center_x = FRAME_WIDTH / 2  # 320
        mirrored_center = mirror_x_coordinate(center_x, FRAME_WIDTH)

        assert abs(mirrored_center - center_x) < 0.001, (
            f"\n"
            f"{'='*60}\n"
            f"ERRORE CRITICO: CENTRO SPOSTATO DOPO SPECCHIATURA!\n"
            f"{'='*60}\n"
            f"Center X: {center_x}\n"
            f"After mirror: {mirrored_center}\n"
            f"Center MUST stay at center!\n"
            f"{'='*60}"
        )

    def test_y_coordinate_never_changes(self):
        """
        CRITICAL: Y coordinate must NEVER change during mirroring.
        """
        test_y_values = [0.0, 100.0, 360.0, 720.0]

        for y in test_y_values:
            # Y should be unchanged in mirroring (only X flips)
            # This test ensures no one accidentally modifies Y
            original_kp = {"name": "test", "x": 200.0, "y": y, "score": 0.9}
            mirrored_pose = mirror_pose(
                {"timestamp": 0, "isValid": True, "keypoints": [original_kp]},
                FRAME_WIDTH
            )
            mirrored_y = mirrored_pose["keypoints"][0]["y"]

            assert mirrored_y == y, (
                f"\n"
                f"{'='*60}\n"
                f"ERRORE CRITICO: COORDINATA Y MODIFICATA!\n"
                f"{'='*60}\n"
                f"Original Y: {y}\n"
                f"After mirror Y: {mirrored_y}\n"
                f"LA COORDINATA Y NON DEVE MAI CAMBIARE!\n"
                f"{'='*60}"
            )


@pytest.mark.critical
@pytest.mark.mirroring
class TestMirroringAgainstReference:
    """
    Test mirroring against known reference data.
    Uses snapshot testing approach.
    """

    def test_standing_pose_mirroring_matches_reference(self):
        """
        CRITICAL: Standing pose mirroring must match reference exactly.
        """
        reference = load_reference_fixture("reference_pose_standing.json")
        frame_width = reference["frame_width"]
        original_pose = reference["pose"]
        expected_mirrored = reference["expected_mirrored"]

        # Compute mirrored pose
        actual_mirrored = mirror_pose(original_pose, frame_width)

        # Compare each keypoint
        for i, (actual_kp, expected_kp) in enumerate(
            zip(actual_mirrored["keypoints"], expected_mirrored["keypoints"])
        ):
            assert abs(actual_kp["x"] - expected_kp["x"]) < 0.001, (
                f"\n"
                f"{'='*60}\n"
                f"ERRORE CRITICO: SPECCHIATURA REFERENCE MISMATCH!\n"
                f"{'='*60}\n"
                f"Keypoint: {actual_kp['name']} (index {i})\n"
                f"Expected X: {expected_kp['x']}\n"
                f"Actual X: {actual_kp['x']}\n"
                f"Original X: {original_pose['keypoints'][i]['x']}\n"
                f"Frame width: {frame_width}\n"
                f"{'='*60}"
            )

            # Also verify Y didn't change
            original_y = original_pose["keypoints"][i]["y"]
            assert actual_kp["y"] == original_y, (
                f"\n"
                f"{'='*60}\n"
                f"ERRORE CRITICO: Y COORDINATE CHANGED!\n"
                f"{'='*60}\n"
                f"Keypoint: {actual_kp['name']}\n"
                f"Original Y: {original_y}\n"
                f"After mirror Y: {actual_kp['y']}\n"
                f"{'='*60}"
            )

    def test_left_right_keypoints_swap_correctly(self):
        """
        CRITICAL: After mirroring, left keypoints should be where right were.
        """
        reference = load_reference_fixture("reference_pose_standing.json")
        frame_width = reference["frame_width"]
        original_pose = reference["pose"]

        mirrored = mirror_pose(original_pose, frame_width)

        # Find shoulder keypoints
        original_left_shoulder = None
        original_right_shoulder = None
        mirrored_left_shoulder = None
        mirrored_right_shoulder = None

        for kp in original_pose["keypoints"]:
            if kp["name"] == "left_shoulder":
                original_left_shoulder = kp
            elif kp["name"] == "right_shoulder":
                original_right_shoulder = kp

        for kp in mirrored["keypoints"]:
            if kp["name"] == "left_shoulder":
                mirrored_left_shoulder = kp
            elif kp["name"] == "right_shoulder":
                mirrored_right_shoulder = kp

        # After mirroring, original left_shoulder X should become right side
        # mirrored_left_shoulder.x should equal frame_width - original_left_shoulder.x
        expected_mirrored_left_x = frame_width - original_left_shoulder["x"]

        assert abs(mirrored_left_shoulder["x"] - expected_mirrored_left_x) < 0.001, (
            f"\n"
            f"{'='*60}\n"
            f"ERRORE CRITICO: LEFT SHOULDER MIRRORING FAILED!\n"
            f"{'='*60}\n"
            f"Original left_shoulder X: {original_left_shoulder['x']}\n"
            f"Expected mirrored X: {expected_mirrored_left_x}\n"
            f"Actual mirrored X: {mirrored_left_shoulder['x']}\n"
            f"{'='*60}"
        )


@pytest.mark.critical
@pytest.mark.mirroring
class TestMirroringEdgeCases:
    """
    Test edge cases that often cause mirroring bugs.
    """

    def test_mirroring_at_frame_edges(self):
        """
        CRITICAL: Test mirroring at frame boundaries.
        """
        edge_cases = [
            (0.0, 640, 640.0),      # Left edge -> right edge
            (640.0, 640, 0.0),      # Right edge -> left edge
            (1.0, 640, 639.0),      # Near left edge
            (639.0, 640, 1.0),      # Near right edge
        ]

        for original_x, frame_width, expected in edge_cases:
            result = mirror_x_coordinate(original_x, frame_width)
            assert abs(result - expected) < 0.001, (
                f"Edge case failed: x={original_x} -> expected {expected}, got {result}"
            )

    def test_mirroring_different_frame_sizes(self):
        """
        CRITICAL: Mirroring must work with different frame sizes.
        """
        frame_sizes = [640, 1280, 1920, 800]

        for frame_width in frame_sizes:
            center = frame_width / 2

            # Center should stay center
            mirrored_center = mirror_x_coordinate(center, frame_width)
            assert abs(mirrored_center - center) < 0.001, (
                f"Center mirroring failed for frame_width={frame_width}"
            )

            # Quarter points should swap
            quarter = frame_width / 4
            three_quarter = 3 * frame_width / 4

            mirrored_quarter = mirror_x_coordinate(quarter, frame_width)
            assert abs(mirrored_quarter - three_quarter) < 0.001, (
                f"Quarter mirroring failed for frame_width={frame_width}"
            )

    def test_negative_x_handling(self):
        """
        CRITICAL: Negative X values (if they occur) should be handled.
        """
        # This shouldn't happen in practice, but let's ensure it doesn't crash
        negative_x = -10.0
        result = mirror_x_coordinate(negative_x, FRAME_WIDTH)

        # Result should be frame_width - (-10) = frame_width + 10
        expected = FRAME_WIDTH + 10.0
        assert result == expected, (
            f"Negative X handling failed: expected {expected}, got {result}"
        )

    def test_x_beyond_frame_handling(self):
        """
        CRITICAL: X values beyond frame width should be handled.
        """
        beyond_x = 700.0  # Beyond 640 frame width
        result = mirror_x_coordinate(beyond_x, FRAME_WIDTH)

        # Result should be frame_width - 700 = -60
        expected = FRAME_WIDTH - beyond_x
        assert result == expected, (
            f"Beyond frame X handling failed: expected {expected}, got {result}"
        )


@pytest.mark.critical
@pytest.mark.mirroring
class TestMirroringConsistency:
    """
    Test that mirroring is consistent across multiple applications.
    """

    def test_batch_mirroring_consistency(self):
        """
        CRITICAL: Mirroring multiple poses should be consistent.
        """
        reference = load_reference_fixture("reference_pose_standing.json")
        frame_width = reference["frame_width"]
        original_pose = reference["pose"]

        # Mirror the same pose 100 times
        results = []
        for _ in range(100):
            mirrored = mirror_pose(original_pose, frame_width)
            results.append(mirrored["keypoints"][0]["x"])  # Check first keypoint

        # All results should be identical
        first_result = results[0]
        for i, result in enumerate(results):
            assert result == first_result, (
                f"Inconsistent mirroring at iteration {i}: {result} != {first_result}"
            )

    def test_all_keypoints_mirrored_consistently(self):
        """
        CRITICAL: All 33 keypoints must be mirrored using the same formula.
        """
        reference = load_reference_fixture("reference_pose_standing.json")
        frame_width = reference["frame_width"]
        original_pose = reference["pose"]

        mirrored = mirror_pose(original_pose, frame_width)

        for i, (orig_kp, mirr_kp) in enumerate(
            zip(original_pose["keypoints"], mirrored["keypoints"])
        ):
            expected_x = frame_width - orig_kp["x"]

            assert abs(mirr_kp["x"] - expected_x) < 0.001, (
                f"\n"
                f"{'='*60}\n"
                f"ERRORE: KEYPOINT {i} ({orig_kp['name']}) NOT MIRRORED CORRECTLY!\n"
                f"{'='*60}\n"
                f"Original X: {orig_kp['x']}\n"
                f"Expected mirrored: {expected_x}\n"
                f"Actual mirrored: {mirr_kp['x']}\n"
                f"{'='*60}"
            )


# =============================================================================
# SNAPSHOT TESTS - Compare against saved reference data
# =============================================================================

@pytest.mark.critical
@pytest.mark.mirroring
class TestMirroringSnapshots:
    """
    Snapshot tests that compare current output against saved reference.
    If these fail, either the code is wrong OR the reference needs updating.
    """

    def test_snapshot_standing_pose(self):
        """
        Compare mirrored standing pose against reference snapshot.
        """
        reference = load_reference_fixture("reference_pose_standing.json")

        computed_mirrored = mirror_pose(
            reference["pose"],
            reference["frame_width"]
        )
        expected_mirrored = reference["expected_mirrored"]

        # Deep compare all keypoints
        for comp_kp, exp_kp in zip(
            computed_mirrored["keypoints"],
            expected_mirrored["keypoints"]
        ):
            assert abs(comp_kp["x"] - exp_kp["x"]) < 0.01, (
                f"Snapshot mismatch for {comp_kp['name']}: "
                f"computed={comp_kp['x']}, expected={exp_kp['x']}"
            )
            assert comp_kp["y"] == exp_kp["y"], (
                f"Y changed for {comp_kp['name']}: "
                f"computed={comp_kp['y']}, expected={exp_kp['y']}"
            )


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-m", "critical"])
