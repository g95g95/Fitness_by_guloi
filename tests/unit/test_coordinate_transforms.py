"""
BiomechCoach - Unit Tests for Coordinate Transformations

These tests verify the core coordinate transformation functions.
"""

import pytest
import math
from typing import Dict, Tuple


# =============================================================================
# COORDINATE TRANSFORMATION FUNCTIONS
# (These mirror the actual implementations)
# =============================================================================

def mirror_x(x: float, frame_width: int) -> float:
    """Mirror X coordinate horizontally."""
    return frame_width - x


def normalize_coordinate(pixel: float, dimension: int) -> float:
    """Convert pixel coordinate to normalized (0-1) range."""
    return pixel / dimension


def denormalize_coordinate(normalized: float, dimension: int) -> float:
    """Convert normalized coordinate to pixel value."""
    return normalized * dimension


def angle_between_points(
    a: Tuple[float, float],
    b: Tuple[float, float],
    c: Tuple[float, float]
) -> float:
    """
    Calculate angle at point B formed by points A-B-C.
    Returns angle in degrees.
    """
    # Vectors BA and BC
    ba = (a[0] - b[0], a[1] - b[1])
    bc = (c[0] - b[0], c[1] - b[1])

    # Dot product
    dot = ba[0] * bc[0] + ba[1] * bc[1]

    # Magnitudes
    mag_ba = math.sqrt(ba[0]**2 + ba[1]**2)
    mag_bc = math.sqrt(bc[0]**2 + bc[1]**2)

    if mag_ba == 0 or mag_bc == 0:
        return 0

    # Clamp to avoid floating point errors
    cos_angle = max(-1, min(1, dot / (mag_ba * mag_bc)))

    # Convert to degrees
    return math.acos(cos_angle) * (180 / math.pi)


def angle_from_vertical(
    top: Tuple[float, float],
    bottom: Tuple[float, float]
) -> float:
    """
    Calculate angle from vertical (Y-axis).
    0° = perfectly vertical, 90° = horizontal
    """
    dx = bottom[0] - top[0]
    dy = bottom[1] - top[1]

    if dy == 0:
        return 90.0

    angle_rad = math.atan(abs(dx) / abs(dy))
    return angle_rad * (180 / math.pi)


# =============================================================================
# UNIT TESTS
# =============================================================================

class TestMirrorX:
    """Unit tests for X coordinate mirroring."""

    def test_basic_mirroring(self):
        assert mirror_x(100, 640) == 540
        assert mirror_x(540, 640) == 100

    def test_center_unchanged(self):
        assert mirror_x(320, 640) == 320

    def test_edges(self):
        assert mirror_x(0, 640) == 640
        assert mirror_x(640, 640) == 0

    def test_different_frame_widths(self):
        assert mirror_x(100, 1280) == 1180
        assert mirror_x(640, 1280) == 640  # Center

    def test_reversibility(self):
        original = 123.5
        frame_width = 640
        mirrored = mirror_x(original, frame_width)
        double_mirrored = mirror_x(mirrored, frame_width)
        assert abs(double_mirrored - original) < 0.001


class TestNormalization:
    """Unit tests for coordinate normalization."""

    def test_normalize_center(self):
        assert normalize_coordinate(320, 640) == 0.5

    def test_normalize_edges(self):
        assert normalize_coordinate(0, 640) == 0.0
        assert normalize_coordinate(640, 640) == 1.0

    def test_denormalize_center(self):
        assert denormalize_coordinate(0.5, 640) == 320

    def test_denormalize_edges(self):
        assert denormalize_coordinate(0.0, 640) == 0.0
        assert denormalize_coordinate(1.0, 640) == 640.0

    def test_normalize_denormalize_roundtrip(self):
        original = 234.5
        dimension = 640
        normalized = normalize_coordinate(original, dimension)
        denormalized = denormalize_coordinate(normalized, dimension)
        assert abs(denormalized - original) < 0.001


class TestAngleBetweenPoints:
    """Unit tests for angle calculation."""

    def test_right_angle(self):
        # Points forming a right angle at B
        a = (0, 0)
        b = (1, 0)
        c = (1, 1)
        angle = angle_between_points(a, b, c)
        assert abs(angle - 90) < 0.001

    def test_straight_line(self):
        # Points in a straight line - 180 degree angle
        a = (0, 0)
        b = (1, 0)
        c = (2, 0)
        angle = angle_between_points(a, b, c)
        assert abs(angle - 180) < 0.001

    def test_135_degree_angle(self):
        # 135 degree angle - typical obtuse angle geometry
        # A is at left, B is at origin, C is up-right diagonal
        a = (0, 0)
        b = (1, 0)
        c = (2, 1)
        angle = angle_between_points(a, b, c)
        # The angle at B is 135 degrees
        assert abs(angle - 135) < 1  # Allow some tolerance

    def test_zero_length_vector(self):
        # Same point for A and B
        a = (1, 1)
        b = (1, 1)
        c = (2, 2)
        angle = angle_between_points(a, b, c)
        assert angle == 0  # Should handle gracefully

    def test_vertex_order_matters(self):
        # Angle should be at middle point (B)
        a = (0, 0)
        b = (1, 0)
        c = (1, 1)

        # Angle at B
        angle_at_b = angle_between_points(a, b, c)

        # Different order - angle at different vertex
        angle_at_c = angle_between_points(b, c, a)

        # These should be different
        # (unless by coincidence, which won't happen with these points)
        assert angle_at_b != angle_at_c


class TestAngleFromVertical:
    """Unit tests for vertical angle calculation."""

    def test_vertical_line(self):
        top = (100, 0)
        bottom = (100, 100)
        angle = angle_from_vertical(top, bottom)
        assert abs(angle) < 0.001  # 0 degrees

    def test_45_degree_lean(self):
        top = (100, 0)
        bottom = (200, 100)  # 45 degree diagonal
        angle = angle_from_vertical(top, bottom)
        assert abs(angle - 45) < 0.001

    def test_horizontal_line(self):
        top = (100, 100)
        bottom = (200, 100)
        angle = angle_from_vertical(top, bottom)
        assert abs(angle - 90) < 0.001


class TestCoordinateBounds:
    """Test coordinate boundary conditions."""

    def test_valid_coordinates_within_bounds(self):
        frame_width = 640
        frame_height = 720

        valid_points = [
            (0, 0),
            (frame_width, 0),
            (0, frame_height),
            (frame_width, frame_height),
            (320, 360),
        ]

        for x, y in valid_points:
            assert 0 <= x <= frame_width
            assert 0 <= y <= frame_height

    def test_mirrored_stays_in_bounds(self):
        frame_width = 640

        test_x_values = [0, 100, 320, 500, 640]

        for x in test_x_values:
            mirrored = mirror_x(x, frame_width)
            assert 0 <= mirrored <= frame_width, (
                f"Mirrored x={mirrored} out of bounds for original x={x}"
            )


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
