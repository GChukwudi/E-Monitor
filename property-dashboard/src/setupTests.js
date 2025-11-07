import '@testing-library/jest-dom';

// Mock TextEncoder/TextDecoder (required for some libraries)
global.TextEncoder = require('util').TextEncoder;
global.TextDecoder = require('util').TextDecoder;

// Mock Firebase
global.firebase = {
  initializeApp: jest.fn(),
  database: jest.fn(() => ({
    ref: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
  })),
};

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});