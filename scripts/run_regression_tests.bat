@echo off
REM BiomechCoach - Run Critical Regression Tests (Windows)

echo ==============================================
echo BiomechCoach - Critical Regression Tests
echo ==============================================
echo.

REM Change to project root
cd /d "%~dp0\.."

REM Check if pytest is available
where pytest >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: pytest not found. Install with: pip install pytest pyyaml
    exit /b 1
)

REM Run critical tests only
echo Running CRITICAL tests...
echo.

pytest tests/ -m "critical" -v --tb=short --maxfail=3

set EXIT_CODE=%ERRORLEVEL%

echo.
echo ==============================================
if %EXIT_CODE% EQU 0 (
    echo ALL CRITICAL TESTS PASSED
) else (
    echo CRITICAL TESTS FAILED!
    echo DO NOT COMMIT UNTIL ALL TESTS PASS
)
echo ==============================================

exit /b %EXIT_CODE%
