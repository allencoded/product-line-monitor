module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
    '!src/index.ts',
  ],
  coverageDirectory: 'coverage',
  verbose: true,
  globalTeardown: '<rootDir>/jest.teardown.ts',
  testTimeout: 10000,
  maxWorkers: 1, // Run tests serially to avoid resource leaks
  forceExit: true, // Force Jest to exit after all tests complete
};
