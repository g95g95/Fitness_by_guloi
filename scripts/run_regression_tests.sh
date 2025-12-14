#!/bin/bash
#
# BiomechCoach - Run Critical Regression Tests
#
# This script runs only the critical regression tests.
# Use this before committing changes to ensure no regressions.
#

set -e

echo "=============================================="
echo "BiomechCoach - Critical Regression Tests"
echo "=============================================="
echo ""

# Change to project root
cd "$(dirname "$0")/.."

# Check if pytest is installed
if ! command -v pytest &> /dev/null; then
    echo "ERROR: pytest not found. Install with: pip install pytest pyyaml"
    exit 1
fi

# Run critical tests only
echo "Running CRITICAL tests..."
echo ""

pytest tests/ -m "critical" -v --tb=short --maxfail=3

EXIT_CODE=$?

echo ""
echo "=============================================="
if [ $EXIT_CODE -eq 0 ]; then
    echo "ALL CRITICAL TESTS PASSED"
    echo "=============================================="
else
    echo "CRITICAL TESTS FAILED!"
    echo "DO NOT COMMIT UNTIL ALL TESTS PASS"
    echo "=============================================="
fi

exit $EXIT_CODE
