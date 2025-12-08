// Simple test logger that writes to test-log.txt
import { writeFileSync, appendFileSync, existsSync } from 'fs';
import { join } from 'path';

const LOG_FILE = join(process.cwd(), 'test-log.txt');

/**
 * Initialize log file if it doesn't exist
 */
export function initLog() {
  if (!existsSync(LOG_FILE)) {
    writeFileSync(LOG_FILE, '=== Test Log ===\n\n', 'utf8');
  }
}

/**
 * Log a test update event
 * @param {string} file - Test file that was updated
 * @param {string} reason - Reason for update
 */
export function logUpdate(file, reason = '') {
  const timestamp = new Date().toISOString();
  const entry = `[UPDATE] ${timestamp}\n  File: ${file}\n  Reason: ${reason || 'Test file updated'}\n\n`;
  appendFileSync(LOG_FILE, entry, 'utf8');
}

/**
 * Log a test run
 * @param {Object} results - Test results
 * @param {number} results.passed - Number of passed tests
 * @param {number} results.failed - Number of failed tests
 * @param {number} results.total - Total number of tests
 * @param {number} results.duration - Duration in ms
 */
export function logRun(results) {
  const timestamp = new Date().toISOString();
  const { passed = 0, failed = 0, total = 0, duration = 0 } = results;
  const status = failed === 0 ? 'PASS' : 'FAIL';
  
  const entry = `[RUN] ${timestamp} - ${status}\n  Passed: ${passed}/${total}\n  Failed: ${failed}/${total}\n  Duration: ${duration}ms\n\n`;
  appendFileSync(LOG_FILE, entry, 'utf8');
}

/**
 * Get the last test run summary
 */
export function getLastRun() {
  if (!existsSync(LOG_FILE)) {
    return null;
  }
  
  const content = require('fs').readFileSync(LOG_FILE, 'utf8');
  const runs = content.match(/\[RUN\].*?(?=\[|$)/gs);
  
  if (!runs || runs.length === 0) {
    return null;
  }
  
  const lastRun = runs[runs.length - 1];
  const match = lastRun.match(/\[RUN\] (.*?) - (PASS|FAIL).*?Passed: (\d+)\/(\d+).*?Failed: (\d+)\/(\d+)/s);
  
  if (match) {
    return {
      timestamp: match[1],
      status: match[2],
      passed: parseInt(match[3]),
      total: parseInt(match[4]),
      failed: parseInt(match[6])
    };
  }
  
  return null;
}



