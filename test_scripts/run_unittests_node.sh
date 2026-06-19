#!/bin/bash
# Unit-test runner for a Node.js / TypeScript build folder (Vitest).
# Usage: run_unittests_node.sh <build_folder>
# Exit codes: 1 = bad usage, 2 = cannot enter working folder, 69 = missing toolchain,
#             any other non-zero = propagated from the test command.

set -u

BAD_USAGE_EXIT_CODE=1
FS_ERROR_EXIT_CODE=2
UNRECOVERABLE_ERROR_EXIT_CODE=69

echo "===== [1/7] Toolchain check ====="
if ! command -v node >/dev/null 2>&1; then
  echo "Error: Node.js is not installed (need Node 20+)."
  exit $UNRECOVERABLE_ERROR_EXIT_CODE
fi
if ! command -v npm >/dev/null 2>&1; then
  echo "Error: npm is not installed."
  exit $UNRECOVERABLE_ERROR_EXIT_CODE
fi
echo "node: $(command -v node) $(node --version)"
echo "npm:  $(command -v npm) $(npm --version)"

echo "===== [2/7] Argument validation ====="
if [ -z "${1:-}" ]; then
  echo "Error: No build folder name provided."
  echo "Usage: $0 <build_folder>"
  exit $BAD_USAGE_EXIT_CODE
fi
BUILD_FOLDER="$1"
echo "Build folder (read-only input): $BUILD_FOLDER"

echo "===== [3/7] Working directory setup ====="
WORKING_FOLDER=".tmp/node_$1"
echo "Working folder: $WORKING_FOLDER"
rm -rf "$WORKING_FOLDER"
mkdir -p "$WORKING_FOLDER"

echo "===== [4/7] Copy the build ====="
cp -R "$BUILD_FOLDER"/* "$WORKING_FOLDER"/
echo "Copied $BUILD_FOLDER -> $WORKING_FOLDER"

echo "===== [5/7] Enter the working directory ====="
cd "$WORKING_FOLDER" 2>/dev/null
if [ $? -ne 0 ]; then
  echo "Error: could not enter working folder '$WORKING_FOLDER'."
  exit $FS_ERROR_EXIT_CODE
fi
echo "Now in: $(pwd)"

echo "===== [6/7] Install dependencies (isolated ./node_modules) ====="
if [ -f package-lock.json ]; then
  npm ci || exit $?
else
  npm install || exit $?
fi

echo "===== [7/7] Run unit tests (Vitest) ====="
echo "+ npx vitest run"
npx vitest run
exit_code=$?
echo "Unit-test command 'npx vitest run' exited with code $exit_code (working folder: $(pwd))"
exit $exit_code
