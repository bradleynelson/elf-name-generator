// Test setup file
// This runs before all tests

// Mock localStorage for tests
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = value.toString();
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

global.localStorage = localStorageMock;

// Mock window.speechSynthesis for tests
global.window = global.window || {};
global.window.speechSynthesis = {
  speak: () => {},
  cancel: () => {},
  getVoices: () => [],
  speaking: false,
  addEventListener: () => {}
};

// Reset localStorage before each test
beforeEach(() => {
  localStorage.clear();
});


