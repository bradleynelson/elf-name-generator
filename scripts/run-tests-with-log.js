// Wrapper script that runs tests and logs results
import { spawn } from 'child_process';
import { appendFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const LOG_FILE = join(process.cwd(), 'test-log.txt');

// Initialize log if it doesn't exist
if (!existsSync(LOG_FILE)) {
  writeFileSync(LOG_FILE, '=== Test Log ===\n\n', 'utf8');
}

console.log('Running tests...\n');

// Run vitest
const testProcess = spawn('npx', ['vitest', 'run', '--reporter=verbose'], {
  stdio: ['inherit', 'pipe', 'pipe'],
  shell: true
});

let output = '';
let errorOutput = '';

testProcess.stdout.on('data', (data) => {
  const text = data.toString();
  output += text;
  process.stdout.write(text);
});

testProcess.stderr.on('data', (data) => {
  const text = data.toString();
  errorOutput += text;
  process.stderr.write(text);
});

testProcess.on('close', (code) => {
  // Parse test results from output
  const passedMatch = output.match(/(\d+)\s+passed/);
  const failedMatch = output.match(/(\d+)\s+failed/);
  const totalMatch = output.match(/Tests\s+(\d+)/);
  const durationMatch = output.match(/(\d+)\s+ms/);
  
  const passed = passedMatch ? parseInt(passedMatch[1]) : 0;
  const failed = failedMatch ? parseInt(failedMatch[1]) : 0;
  const total = totalMatch ? parseInt(totalMatch[1]) : (passed + failed);
  const duration = durationMatch ? parseInt(durationMatch[1]) : 0;
  
  // Log to file
  const timestamp = new Date().toISOString();
  const status = failed === 0 ? 'PASS' : 'FAIL';
  
  const entry = `[RUN] ${timestamp} - ${status}\n  Passed: ${passed}/${total}\n  Failed: ${failed}/${total}\n  Duration: ${duration}ms\n\n`;
  
  try {
    appendFileSync(LOG_FILE, entry, 'utf8');
    console.log(`\n✓ Test run logged to test-log.txt`);
  } catch (error) {
    console.error('Failed to write to test log:', error);
  }
  
  process.exit(code);
});

