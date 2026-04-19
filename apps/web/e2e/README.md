# Finventory E2E Browser Automation Tests

This directory contains Playwright-based end-to-end browser automation tests for the Finventory web application.

## Test Coverage

### Full Workflow Tests (`full-workflow.spec.ts`)
- User signup/signin
- Seller creates listings (Grade A, Sushi Grade with certification)
- Buyer browses marketplace with filters
- Buyer places order
- Seller confirms pickup with QR code
- Order lifecycle management
- Responsive design verification
- Error handling scenarios

### Critical Paths (`critical-paths.spec.ts`)
- Homepage navigation
- Marketplace page structure
- Auth page functionality
- Responsive layout (mobile, tablet, desktop)
- API integration verification
- Visual regression checks
- Accessibility verification

## Running Tests

### Prerequisites
```bash
npm install
npx playwright install
```

### Run All Tests
```bash
npm run test:e2e
```

### Run in Headed Mode (see browser)
```bash
npm run test:e2e:headed
```

### Run with UI Mode
```bash
npm run test:e2e:ui
```

### Debug Mode
```bash
npm run test:e2e:debug
```

### Run Specific Test File
```bash
npx playwright test e2e/critical-paths.spec.ts
```

### Run on Specific Browser
```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=Mobile\ Chrome
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `WEB_URL` | Base URL of the web app | `http://localhost:5173` |
| `CI` | Run in CI mode (no watch, different retry logic) | `false` |

## Test Structure

```
e2e/
├── README.md                    # This file
├── full-workflow.spec.ts        # Complete user workflow tests
├── critical-paths.spec.ts       # Critical path smoke tests
└── fixtures/                    # Test data (if needed)
```

## Test Data

Tests use dynamically generated test users to avoid conflicts:
- Emails: `test-{timestamp}@example.com`
- Password: `TestPassword123!`

## Common Issues

### Tests fail due to element not found
The UI might have changed. Update selectors in the test files to match current DOM structure.

### Firebase auth issues in tests
Ensure Firebase Auth emulator is running or use test credentials that work with your Firebase project.

### Flaky tests
Tests may be flaky due to:
- Network latency (increase timeouts)
- Firebase initialization delays
- Animation timing (use `waitFor` with appropriate conditions)

## Adding New Tests

1. Create a new `.spec.ts` file in `e2e/`
2. Follow the pattern of existing tests
3. Use `data-testid` attributes in the UI for reliable selectors
4. Add `test.step()` for clear test reporting
5. Include screenshots on failure using `test.afterEach()`

## CI/CD Integration

Tests run in CI mode when `CI=true`:
- Headless mode
- 2 retries on failure
- 1 worker (sequential)
- HTML report generated

## Reports

After running tests, view the HTML report:
```bash
npx playwright show-report
```
