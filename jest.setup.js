import '@testing-library/jest-dom';

// Mock Firebase
jest.mock('@/lib/firebase', () => ({
  auth: null,
  db: null,
}));

jest.mock('@/lib/firebase-admin', () => ({
  auth: null,
  db: {
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        get: jest.fn(),
        set: jest.fn(),
        update: jest.fn(),
      })),
      where: jest.fn().mockReturnThis(),
      get: jest.fn(),
    })),
  },
}));

// Mock fetch for Node.js environment
if (typeof global.fetch === 'undefined') {
  global.fetch = jest.fn();
}
