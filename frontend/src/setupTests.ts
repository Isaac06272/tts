import '@testing-library/jest-dom';

// Mock URL.createObjectURL and revokeObjectURL for tests
global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = jest.fn();