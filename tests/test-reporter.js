// Custom Vitest reporter that logs to test-log.txt
import { appendFileSync } from 'fs';
import { join } from 'path';

const LOG_FILE = join(process.cwd(), 'test-log.txt');

export default class TestLoggerReporter {
  constructor() {
    this.startTime = null;
  }

  onInit() {
    this.startTime = Date.now();
  }

  onFinished(files) {
    const duration = Date.now() - this.startTime;
    
    // Calculate totals
    let total = 0;
    let passed = 0;
    let failed = 0;
    
    files.forEach(file => {
      file.tasks.forEach(task => {
        if (task.type === 'test') {
          total++;
          if (task.mode === 'run') {
            if (task.result?.state === 'pass') {
              passed++;
            } else if (task.result?.state === 'fail') {
              failed++;
            }
          }
        }
      });
    });
    
    // Log to file
    const timestamp = new Date().toISOString();
    const status = failed === 0 ? 'PASS' : 'FAIL';
    
    const entry = `[RUN] ${timestamp} - ${status}\n  Passed: ${passed}/${total}\n  Failed: ${failed}/${total}\n  Duration: ${duration}ms\n\n`;
    
    try {
      appendFileSync(LOG_FILE, entry, 'utf8');
    } catch (error) {
      console.error('Failed to write to test log:', error);
    }
  }
}

