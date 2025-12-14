#!/bin/bash
#
# BiomechCoach - Setup Git Hooks
#
# This script installs the pre-commit hook that runs regression tests.
#

set -e

echo "Setting up BiomechCoach git hooks..."

# Change to project root
cd "$(dirname "$0")/.."
PROJECT_ROOT=$(pwd)

# Create hooks directory if it doesn't exist
mkdir -p .git/hooks

# Create pre-commit hook
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
#
# Pre-commit hook for BiomechCoach
# Runs critical regression tests before allowing commit.
#

echo ""
echo "Running pre-commit regression tests..."
echo ""

# Run only critical tests
pytest tests/ -m "critical" -v --tb=line --maxfail=1 -q

EXIT_CODE=$?

if [ $EXIT_CODE -ne 0 ]; then
    echo ""
    echo "=============================================="
    echo "COMMIT BLOCKED: Critical tests failed!"
    echo "=============================================="
    echo ""
    echo "Fix the failing tests before committing."
    echo "To bypass (NOT RECOMMENDED): git commit --no-verify"
    echo ""
    exit 1
fi

echo ""
echo "All critical tests passed. Proceeding with commit..."
echo ""
exit 0
EOF

# Make hook executable
chmod +x .git/hooks/pre-commit

echo "Pre-commit hook installed successfully!"
echo ""
echo "The hook will run critical regression tests before each commit."
echo "To bypass (NOT RECOMMENDED): git commit --no-verify"
