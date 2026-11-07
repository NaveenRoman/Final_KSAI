/**
 * Codexa Pipeline Unification Verification Test Suite.
 *
 * Verifies that:
 * 1. Main execution route (/api/run) never attempts local Docker and uses signed broker envelope.
 * 2. Contest routes (/api/contests/.../run and /submit) use signed broker execution with user.id.
 * 3. Interactive routes (/api/run/stream, input, stop) are disabled and cannot spawn host processes.
 * 4. src/lib/interactive-process.ts contains zero child_process or Docker spawns.
 * 5. src/lib/code-execution.ts routes strictly through buildSignedExecutionEnvelope to DJANGO_RUN_URL.
 * 6. backend/broker/runner_backend.py enforces bounded streaming output collection.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

let passedTests = 0;
let failedTests = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`  \x1b[32m✓ [PASS]\x1b[0m ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  \x1b[31m✗ [FAIL]\x1b[0m ${name}`);
    console.error(`    Error: ${err.message}`);
    failedTests++;
  }
}

console.log('\n' + '='.repeat(80));
console.log('   CODEXA PHASE 4.11 — PIPELINE UNIFICATION VERIFICATION SUITE');
console.log('='.repeat(80) + '\n');

const ROOT = path.resolve(__dirname, '..');

// -----------------------------------------------------------------------------
// TEST GROUP 1: Main Execution Route (/api/run)
// -----------------------------------------------------------------------------
console.log('--- TEST GROUP 1: Main Execution Route (/api/run) ---');

const runRoutePath = path.join(ROOT, 'src/app/api/run/route.ts');
const runRouteSrc = fs.readFileSync(runRoutePath, 'utf8');

runTest('Main route exports maxDuration = 25', () => {
  assert.match(runRouteSrc, /export\s+const\s+maxDuration\s*=\s*25/, 'maxDuration must be exported as 25');
});

runTest('Main route passes studentId: user.id to executeCode', () => {
  assert.match(runRouteSrc, /studentId:\s*user\.id/, 'studentId must be authenticated user.id');
});

runTest('Main route does not contain local Docker fallback block', () => {
  assert.doesNotMatch(runRouteSrc, /execResult\.infrastructureError\s*\{[\s\S]*?fetch\(/, 'No nested infrastructureError fallback');
});

runTest('Main route has zero child_process or docker-sandbox references', () => {
  assert.doesNotMatch(runRouteSrc, /child_process/, 'child_process must not be imported');
  assert.doesNotMatch(runRouteSrc, /docker-sandbox/, 'docker-sandbox must not be imported');
});

// -----------------------------------------------------------------------------
// TEST GROUP 2: Contest Execution Routes (/api/contests/...)
// -----------------------------------------------------------------------------
console.log('\n--- TEST GROUP 2: Contest Execution Routes ---');

const contestRunPath = path.join(ROOT, 'src/app/api/contests/[contestId]/challenges/[challengeId]/run/route.ts');
const contestRunSrc = fs.readFileSync(contestRunPath, 'utf8');

runTest('Contest run route exports maxDuration = 25', () => {
  assert.match(contestRunSrc, /export\s+const\s+maxDuration\s*=\s*25/);
});

runTest('Contest run route passes authenticated studentId: user.id to executeCode', () => {
  assert.match(contestRunSrc, /studentId:\s*user\.id/);
});

runTest('Contest run route fails closed with 503 on infrastructureError', () => {
  assert.match(contestRunSrc, /if\s*\(execRes\.infrastructureError\)[\s\S]*?status:\s*503/);
});

const contestSubmitPath = path.join(ROOT, 'src/app/api/contests/[contestId]/challenges/[challengeId]/submit/route.ts');
const contestSubmitSrc = fs.readFileSync(contestSubmitPath, 'utf8');

runTest('Contest submit route exports maxDuration = 25', () => {
  assert.match(contestSubmitSrc, /export\s+const\s+maxDuration\s*=\s*25/);
});

runTest('Contest submit route passes authenticated studentId: user.id to executeCode', () => {
  assert.match(contestSubmitSrc, /studentId:\s*user\.id/);
});

runTest('Contest submit route handles infrastructureError with 503', () => {
  assert.match(contestSubmitSrc, /if\s*\(infrastructureErrorOccurred\)[\s\S]*?status:\s*503/);
});

// -----------------------------------------------------------------------------
// TEST GROUP 3: Interactive Routes Disablement & Anti-Spawn Verification
// -----------------------------------------------------------------------------
console.log('\n--- TEST GROUP 3: Interactive Routes Disablement ---');

const streamRoutePath = path.join(ROOT, 'src/app/api/run/stream/route.ts');
const streamRouteSrc = fs.readFileSync(streamRoutePath, 'utf8');

runTest('Stream route returns HTTP 503 offline response', () => {
  assert.match(streamRouteSrc, /status:\s*503/);
  assert.match(streamRouteSrc, /INTERACTIVE_EXECUTION_OFFLINE/);
});

runTest('Stream route does not import interactive-process or child_process', () => {
  assert.doesNotMatch(streamRouteSrc, /import[\s\S]*?from\s*["']@\/lib\/interactive-process["']/);
  assert.doesNotMatch(streamRouteSrc, /child_process/);
});

const inputRoutePath = path.join(ROOT, 'src/app/api/run/input/route.ts');
const inputRouteSrc = fs.readFileSync(inputRoutePath, 'utf8');

runTest('Input route returns HTTP 503 offline response', () => {
  assert.match(inputRouteSrc, /status:\s*503/);
  assert.match(inputRouteSrc, /INTERACTIVE_EXECUTION_OFFLINE/);
});

const stopRoutePath = path.join(ROOT, 'src/app/api/run/stop/route.ts');
const stopRouteSrc = fs.readFileSync(stopRoutePath, 'utf8');

runTest('Stop route does not invoke cleanupSession or child processes', () => {
  assert.doesNotMatch(stopRouteSrc, /cleanupSession/);
  assert.doesNotMatch(stopRouteSrc, /child_process/);
});

const interactiveProcessPath = path.join(ROOT, 'src/lib/interactive-process.ts');
const interactiveProcessSrc = fs.readFileSync(interactiveProcessPath, 'utf8');

runTest('interactive-process.ts has zero child_process or spawn invocations', () => {
  assert.doesNotMatch(interactiveProcessSrc, /import[\s\S]*?child_process/);
  assert.doesNotMatch(interactiveProcessSrc, /spawn\s*\(/);
  assert.doesNotMatch(interactiveProcessSrc, /docker-sandbox/);
});

// -----------------------------------------------------------------------------
// TEST GROUP 4: Centralized Code Execution Module (/lib/code-execution.ts)
// -----------------------------------------------------------------------------
console.log('\n--- TEST GROUP 4: Centralized Code Execution Module ---');

const codeExecPath = path.join(ROOT, 'src/lib/code-execution.ts');
const codeExecSrc = fs.readFileSync(codeExecPath, 'utf8');

runTest('code-execution.ts imports and uses buildSignedExecutionEnvelope', () => {
  assert.match(codeExecSrc, /import\s*\{[^}]*buildSignedExecutionEnvelope[^}]*\}\s*from\s*["']\.\/broker-signer["']/);
  assert.match(codeExecSrc, /buildSignedExecutionEnvelope\s*\(/);
});

runTest('code-execution.ts dispatches strictly to DJANGO_RUN_URL', () => {
  assert.match(codeExecSrc, /DJANGO_RUN_URL/);
  assert.match(codeExecSrc, /fetch\(djangoRunUrl/);
});

runTest('code-execution.ts enforces 14-second default fetch timeout', () => {
  assert.match(codeExecSrc, /timeoutMs\s*=\s*14000/);
});

runTest('code-execution.ts fails closed with structured 503 on network error', () => {
  assert.match(codeExecSrc, /exitCode:\s*isTimeout\s*\?\s*504\s*:\s*503/);
  assert.match(codeExecSrc, /infrastructureError:\s*true/);
});

runTest('code-execution.ts has zero child_process or docker-sandbox references', () => {
  assert.doesNotMatch(codeExecSrc, /child_process/);
  assert.doesNotMatch(codeExecSrc, /executeInDockerSandbox/);
});

// -----------------------------------------------------------------------------
// TEST GROUP 5: Bounded Streaming Output in Broker (runner_backend.py)
// -----------------------------------------------------------------------------
console.log('\n--- TEST GROUP 5: Broker Bounded Streaming Output ---');

const runnerBackendPath = path.join(ROOT, 'backend/broker/runner_backend.py');
const runnerBackendSrc = fs.readFileSync(runnerBackendPath, 'utf8');

runTest('runner_backend.py uses subprocess.Popen with bounded streaming', () => {
  assert.match(runnerBackendSrc, /subprocess\.Popen\(/);
  assert.match(runnerBackendSrc, /stdout=subprocess\.PIPE/);
  assert.match(runnerBackendSrc, /stderr=subprocess\.PIPE/);
});

runTest('runner_backend.py drains pipe in worker threads', () => {
  assert.match(runnerBackendSrc, /threading\.Thread\(target=drain_pipe/);
});

runTest('runner_backend.py enforces MAX_OUTPUT_LENGTH limit during streaming', () => {
  assert.match(runnerBackendSrc, /current_len\s*<\s*MAX_OUTPUT_LENGTH/);
  assert.match(runnerBackendSrc, /avail\s*=\s*MAX_OUTPUT_LENGTH\s*-\s*current_len/);
});

runTest('runner_backend.py truncates with explicit byte limit notice', () => {
  assert.match(runnerBackendSrc, /Output truncated: exceeded .* bytes limit/);
});

// -----------------------------------------------------------------------------
// SUMMARY
// -----------------------------------------------------------------------------
console.log('\n' + '='.repeat(80));
console.log(`TOTAL: ${passedTests + failedTests} | PASSED: ${passedTests} | FAILED: ${failedTests}`);
console.log('='.repeat(80) + '\n');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
