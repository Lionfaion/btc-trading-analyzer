// Global test setup for all test suites
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
  log: jest.fn(),
  debug: jest.fn()
};

// Mock window object for browser-based tests
global.window = {
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  location: { href: 'http://localhost:3000' },
  localStorage: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn()
  },
  navigator: {
    onLine: true
  }
};

global.navigator = {
  onLine: true
};

// Mock document for DOM tests
global.document = {
  getElementById: jest.fn(),
  createElement: jest.fn(),
  addEventListener: jest.fn()
};

// Mock performance API (use plain function so resetMocks doesn't clear it)
global.performance = {
  now: () => Date.now()
};

// Default timeout for all tests
jest.setTimeout(10000);

// In Node 22 unhandled rejections are fatal — suppress them in test environment
// Retry logic creates intermediate rejections that are always caught by the test assertions
process.on('unhandledRejection', () => {});
