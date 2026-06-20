#!/bin/bash
# Conformance-test runner for a Node.js / TypeScript build folder (Vitest), install-inline variant.
# Usage: run_conformance_tests_node.sh <build_folder> <conformance_tests_folder>
# Exit codes: 69 = bad usage / missing toolchain / cannot enter working folder,
#             1 = no tests discovered, any other non-zero = propagated from the test command.

set -u

UNRECOVERABLE_ERROR_EXIT_CODE=69
NO_TESTS_EXIT_CODE=1

echo "===== [1/8] Toolchain check ====="
if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  echo "Error: Node.js 20+ and npm are required."
  exit $UNRECOVERABLE_ERROR_EXIT_CODE
fi
echo "node: $(command -v node) $(node --version)"
echo "npm:  $(command -v npm) $(npm --version)"

echo "===== [2/8] Argument validation ====="
if [ -z "${1:-}" ]; then
  echo "Error: No build folder name provided."
  echo "Usage: $0 <build_folder> <conformance_tests_folder>"
  exit $UNRECOVERABLE_ERROR_EXIT_CODE
fi
if [ -z "${2:-}" ]; then
  echo "Error: No conformance tests folder provided."
  echo "Usage: $0 <build_folder> <conformance_tests_folder>"
  exit $UNRECOVERABLE_ERROR_EXIT_CODE
fi
BUILD_FOLDER="$1"
CONFORMANCE_TESTS_FOLDER="$2"

echo "===== [3/8] Capture original working directory ====="
current_dir=$(pwd)
echo "Original cwd: $current_dir"
echo "Build folder (read-only):            $BUILD_FOLDER"
echo "Conformance tests folder (read-only): $CONFORMANCE_TESTS_FOLDER"

echo "===== [4/8] Working directory setup ====="
WORKING_FOLDER=".tmp/node_$1"
echo "Working folder: $WORKING_FOLDER"
rm -rf "$WORKING_FOLDER"
mkdir -p "$WORKING_FOLDER"

echo "===== [5/8] Copy the build (tests stay where they are) ====="
cp -R "$BUILD_FOLDER"/* "$WORKING_FOLDER"/
echo "Copied $BUILD_FOLDER -> $WORKING_FOLDER"

echo "===== [6/8] Enter the working directory ====="
cd "$WORKING_FOLDER" 2>/dev/null
if [ $? -ne 0 ]; then
  echo "Error: could not enter working folder '$WORKING_FOLDER'."
  exit $UNRECOVERABLE_ERROR_EXIT_CODE
fi
echo "Now in: $(pwd)"

echo "===== [7/8] Install dependencies (isolated ./node_modules) ====="
# The renderer-generated package-lock.json is frequently incomplete (it has been
# observed to omit vitest's own runtime dependency 'vite-node'). `npm ci` installs
# the lockfile verbatim, faithfully reproducing the gap so vitest cannot start.
# Drop the generated lockfile and let `npm install` resolve the full tree from
# package.json instead.
rm -f package-lock.json
npm install || exit $?

echo "===== [8/8] Run conformance tests (Vitest) ====="
# The conformance folder ships its own vitest.config.ts that imports `vitest/config`,
# aliases the package to `process.cwd()/src/...`, and includes its test via __dirname.
# That config can only resolve `vitest/config` and the alias when it sits next to a
# node_modules and is run with cwd = the staged build. So co-locate the (read-only)
# tests INTO the staged build, then run Vitest from here with that config.
SRC_TESTS="$current_dir/$CONFORMANCE_TESTS_FOLDER"
LOCAL_TESTS=".conformance_run"
rm -rf "$LOCAL_TESTS"
mkdir -p "$LOCAL_TESTS"
cp -R "$SRC_TESTS"/* "$LOCAL_TESTS"/ 2>/dev/null
CONF_CONFIG="$(pwd)/$LOCAL_TESTS/vitest.config.ts"
if [ -f "$CONF_CONFIG" ]; then
  echo "+ npx vitest run --config \"$CONF_CONFIG\"   (cwd=$(pwd))"
  output=$(npx vitest run --config "$CONF_CONFIG" 2>&1)
else
  echo "+ npx vitest run --root \"$(pwd)\" \"$(pwd)/$LOCAL_TESTS\""
  output=$(npx vitest run --root "$(pwd)" "$(pwd)/$LOCAL_TESTS" 2>&1)
fi
exit_code=$?
echo "$output"

# Guard against a green run that discovered no tests.
if echo "$output" | grep -qiE "no test files found|no tests found"; then
  echo "Error: no conformance tests were discovered under $SRC_TESTS."
  exit $NO_TESTS_EXIT_CODE
fi

echo "Conformance-test command exited with code $exit_code (tests: $SRC_TESTS)"
exit $exit_code
