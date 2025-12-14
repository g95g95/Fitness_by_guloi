@echo off
REM BiomechCoach - Setup Git Hooks (Windows)

echo Setting up BiomechCoach git hooks...

REM Change to project root
cd /d "%~dp0\.."

REM Create hooks directory if it doesn't exist
if not exist ".git\hooks" mkdir ".git\hooks"

REM Create pre-commit hook
(
echo #!/bin/bash
echo #
echo # Pre-commit hook for BiomechCoach
echo # Runs critical regression tests before allowing commit.
echo #
echo.
echo echo ""
echo echo "Running pre-commit regression tests..."
echo echo ""
echo.
echo # Run only critical tests
echo pytest tests/ -m "critical" -v --tb=line --maxfail=1 -q
echo.
echo EXIT_CODE=$?
echo.
echo if [ $EXIT_CODE -ne 0 ]; then
echo     echo ""
echo     echo "=============================================="
echo     echo "COMMIT BLOCKED: Critical tests failed!"
echo     echo "=============================================="
echo     echo ""
echo     echo "Fix the failing tests before committing."
echo     echo "To bypass ^(NOT RECOMMENDED^): git commit --no-verify"
echo     echo ""
echo     exit 1
echo fi
echo.
echo echo ""
echo echo "All critical tests passed. Proceeding with commit..."
echo echo ""
echo exit 0
) > ".git\hooks\pre-commit"

echo Pre-commit hook installed successfully!
echo.
echo The hook will run critical regression tests before each commit.
echo To bypass (NOT RECOMMENDED): git commit --no-verify
