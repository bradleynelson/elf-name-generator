# Testing Guide

This project uses [Vitest](https://vitest.dev/) for unit testing.

## Setup

1. Install dependencies:

```bash
npm install
```

## Running Tests

### Run all tests once:

```bash
npm test
```

### Run tests in watch mode (re-runs on file changes):

```bash
npm run test:watch
```

### Run tests with UI (interactive):

```bash
npm run test:ui
```

### Generate coverage report:

```bash
npm run test:coverage
```

## Test Structure

```
tests/
├── setup.js                    # Test configuration and mocks
├── accessibility/
│   └── aria.test.js            # ARIA attributes and accessibility tests
├── core/
│   ├── NameGenerator.test.js   # Elven name generation logic tests
│   └── FavoritesManager.test.js # Favorites storage tests (unified Elven/Dwarven)
├── ui/
│   └── UIController.test.js    # UI display and interaction tests
└── utils/
    ├── phonetics.test.js       # Phonetic utility tests
    └── dataLoader.test.js      # Data loading and validation tests
```

## Recent Updates (v2.7.3+)

### Updated Tests

- ✅ **FavoritesManager.test.js**: Updated for unified storage with `generatorType` tagging
    - Tests now verify generator type is saved with favorites
    - Tests allow same name from different generators
    - Tests `setGeneratorType()` method
- ✅ **aria.test.js**: Added comprehensive ARIA attribute tests
    - Filter buttons with `aria-pressed` states
    - Accordion `aria-controls` linking
    - Tab icons with `aria-hidden`
    - External link indicators
    - Form controls with proper labels

### Missing Tests (To Be Added)

- ⚠️ **DwarvenNameGenerator.test.js**: New generator needs test coverage
- ⚠️ **TabController.test.js**: Tab switching logic needs tests
- ⚠️ **UnifiedNameGenerator.test.js**: Main app coordination needs tests

## Writing Tests

### Example Test Structure

```javascript
import { describe, it, expect, beforeEach } from "vitest";
import { YourClass } from "../../js/path/to/YourClass.js";

describe("YourClass", () => {
    let instance;

    beforeEach(() => {
        instance = new YourClass();
    });

    describe("methodName", () => {
        it("should do something specific", () => {
            const result = instance.methodName();
            expect(result).toBe(expectedValue);
        });
    });
});
```

## What to Test

### High Priority

- ✅ Name generation logic (NameGenerator)
- ✅ Phonetic utilities (syllable counting, connector detection)
- ✅ Favorites management (add, remove, storage)
- ✅ Data validation (component/connector structure)

### Medium Priority

- UI display functions
- Theme switching
- User preference handling

### Lower Priority

- DOM manipulation (harder to test, consider E2E)
- Event handlers (consider integration tests)

## Test Best Practices

1. **Isolate tests**: Each test should be independent
2. **Use descriptive names**: Test names should explain what they're testing
3. **Test edge cases**: Empty inputs, null values, boundary conditions
4. **Mock external dependencies**: localStorage, fetch, DOM APIs
5. **Keep tests fast**: Unit tests should run quickly

## Maintaining Tests

**Workflow for keeping tests up to date:**

1. **After making code changes:**
    - Always run `npm test` to verify nothing broke
    - Fix any failing tests before considering work complete

2. **When adding new features:**
    - Add corresponding tests for new functionality
    - Update existing tests if behavior changes

3. **When refactoring:**
    - Update tests to match new implementation
    - Ensure test coverage remains adequate

4. **Before finishing work:**
    - All tests must pass (`npm test` should show 0 failures)
    - New functionality should have test coverage

**Test maintenance checklist:**

- ✅ Run tests after code changes
- ✅ Fix failing tests immediately
- ✅ Add tests for new features
- ✅ Update tests when behavior changes
- ✅ Keep all tests passing before moving on

## Continuous Integration

To add CI/CD testing, create `.github/workflows/test.yml`:

```yaml
name: Tests
on: [push, pull_request]
jobs:
    test:
        runs-on: ubuntu-latest
        steps:
            - uses: actions/checkout@v3
            - uses: actions/setup-node@v3
              with:
                  node-version: "18"
            - run: npm install
            - run: npm test
```

## Coverage Goals

- Aim for 80%+ coverage on core logic
- Focus on business logic over UI code
- Don't obsess over 100% - some code is hard to test
