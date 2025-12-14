# BiomechCoach - Test Suite Documentation

## Overview

This test suite is designed to prevent regression bugs in the BiomechCoach motion capture system, with a particular focus on **mirroring/specchiatura** which is a critical feature that must never break.

## Directory Structure

```
tests/
├── conftest.py              # Pytest configuration and fixtures
├── unit/                    # Unit tests
│   └── test_coordinate_transforms.py
├── regression/              # Regression tests
│   ├── test_mirroring.py    # CRITICAL: Mirroring tests
│   ├── test_known_issues.py # Tests from known_issues.yaml
│   └── known_issues.yaml    # Pattern learning database
└── fixtures/                # Reference data
    ├── reference_pose_standing.json
    ├── reference_pose_squat.json
    └── reference_pose_single_leg.json
```

## Quick Start

### Install Dependencies

```bash
pip install pytest pyyaml
```

### Run All Tests

```bash
pytest tests/ -v
```

### Run Critical Tests Only (Recommended before commits)

```bash
pytest tests/ -m "critical" -v
```

### Run Mirroring Tests Only

```bash
pytest tests/ -m "mirroring" -v
```

## Test Markers

| Marker | Description | Usage |
|--------|-------------|-------|
| `critical` | Must NEVER fail in production | `pytest -m "critical"` |
| `mirroring` | Mirroring/specchiatura tests | `pytest -m "mirroring"` |
| `regression` | Known issue regression tests | `pytest -m "regression"` |
| `coordinate` | Coordinate system tests | `pytest -m "coordinate"` |

## Critical Tests

The following tests are marked as **critical** and block commits if they fail:

1. **Mirroring Formula** - `mirrored_x = frame_width - original_x`
2. **Mirroring Reversibility** - `mirror(mirror(x)) == x`
3. **Center Point Stability** - Center of frame stays at center after mirroring
4. **Y Coordinate Immutability** - Y NEVER changes during X mirroring
5. **Reference Snapshot Matching** - Computed mirroring matches saved reference

## Adding New Tests

### For New Bugs (Pattern Learning)

1. Add the bug to `regression/known_issues.yaml`:

```yaml
mirroring_issues:
  new_bug:
    id: "MIRROR-XXX"
    severity: "critical"
    description: "Description of the bug"
    test_cases:
      - input: value
        expected: value
```

2. Add corresponding test in `regression/test_known_issues.py`:

```python
@pytest.mark.critical
@pytest.mark.regression
class TestNewBug:
    def test_new_bug_case(self):
        # Test implementation
        pass
```

### For New Features

1. Add unit tests in `unit/` directory
2. If the feature involves mirroring, add tests to `regression/test_mirroring.py`

## Updating Reference Data

When you intentionally change mirroring behavior (rare):

1. Run tests to understand current state:
   ```bash
   pytest tests/regression/test_mirroring.py -v
   ```

2. Update fixtures:
   ```python
   # In Python
   from tests.conftest import save_fixture
   save_fixture("reference_pose_standing.json", new_data)
   ```

3. Verify tests pass with new reference:
   ```bash
   pytest tests/ -m "mirroring" -v
   ```

4. Document the change in commit message

## Pre-commit Hook

The pre-commit hook runs critical tests before allowing commits.

### Setup (Unix/Mac)
```bash
./scripts/setup_hooks.sh
```

### Setup (Windows)
```cmd
scripts\setup_hooks.bat
```

### Bypass (NOT RECOMMENDED)
```bash
git commit --no-verify
```

## CI/CD Integration

GitHub Actions runs:
1. **Critical regression tests** - Must pass
2. **Mirroring tests** - Must pass
3. **Unit tests** - Must pass

Workflow file: `.github/workflows/regression-tests.yml`

## Error Messages

Test failures produce clear error messages:

```
==============================================================
ERRORE CRITICO: SPECCHIATURA MODIFICATA!
==============================================================
Keypoint: left_shoulder
Original X: 385.0
Expected mirrored X: 255.0
Actual mirrored X: 385.0
Frame width: 640
==============================================================
La specchiatura deve seguire: mirrored_x = frame_width - original_x
QUESTO TEST NON DEVE MAI FALLIRE IN PRODUZIONE!
==============================================================
```

## Known Issues Database

The `known_issues.yaml` file documents:

- **MIRROR-001**: Mirroring formula errors
- **MIRROR-002**: Y coordinate modification
- **MIRROR-003**: Double mirror reversibility
- **COORD-001**: Axis swap (X/Y confusion)
- **COORD-002**: Coordinate origin errors
- **COORD-003**: Normalized vs pixel confusion
- **KP-001**: Keypoint index errors
- **KP-002**: Left/right swap
- **ANGLE-001**: Angle vertex order
- **ANGLE-002**: Radians vs degrees

## Commands Reference

```bash
# Run all tests
pytest tests/ -v

# Run critical tests (before commit)
pytest tests/ -m "critical" -v --maxfail=1

# Run mirroring tests
pytest tests/ -m "mirroring" -v

# Run regression tests
pytest tests/ -m "regression" -v

# Run unit tests
pytest tests/unit/ -v

# Run with detailed failure output
pytest tests/ -v --tb=long

# Run specific test file
pytest tests/regression/test_mirroring.py -v

# Run specific test class
pytest tests/regression/test_mirroring.py::TestMirroringCritical -v

# Run specific test
pytest tests/regression/test_mirroring.py::TestMirroringCritical::test_mirror_formula_is_correct -v
```

## Troubleshooting

### Tests not finding modules
```bash
# Ensure you're in project root
cd /path/to/Fitness_by_guloi
pytest tests/ -v
```

### YAML parsing errors
```bash
pip install pyyaml
```

### Pre-commit hook not running
```bash
# Check hook is executable
ls -la .git/hooks/pre-commit

# Reinstall hook
./scripts/setup_hooks.sh
```
