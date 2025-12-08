# Test Log

This project maintains a simple text log (`test-log.txt`) that tracks:

- When test files are updated
- When tests are run
- Test results (passed/failed counts)

## Logging Test Updates

When you update a test file, log it manually:

```bash
npm run test:log-update "tests/core/FavoritesManager.test.js" "Updated for unified storage"
```

Or with the full command:

```bash
node scripts/log-test-update.js "tests/core/FavoritesManager.test.js" "Updated for unified storage"
```

## Running Tests with Logging

### Automatic Logging

Run tests and automatically log results:

```bash
npm run test:run:log
```

This will:

1. Run all tests
2. Parse the results
3. Append to `test-log.txt` with timestamp, pass/fail counts, and duration

### Manual Logging

Run tests normally, then manually parse and log:

```bash
npm test
# Then manually update test-log.txt if needed
```

## Log Format

### Update Entry

```
[UPDATE] 2024-12-19T12:34:56.789Z
  File: tests/core/FavoritesManager.test.js
  Reason: Updated for unified storage with generatorType tagging
```

### Run Entry

```
[RUN] 2024-12-19T12:34:56.789Z - PASS
  Passed: 45/45
  Failed: 0/45
  Duration: 1234ms
```

## Viewing the Log

Simply open `test-log.txt` in any text editor. The log is append-only and maintains a chronological history of all test updates and runs.

## Best Practices

1. **Log updates immediately** after modifying test files
2. **Run tests with logging** before committing changes
3. **Check the log** to verify tests have been run recently
4. **Keep the log** in version control to track test history
