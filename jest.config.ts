import type { Config } from 'jest';

const config: Config = {
  testEnvironment: 'node', // Electron unit tests run in Node
  roots: ['<rootDir>/electron', '<rootDir>/src', '<rootDir>/common'],
  moduleFileExtensions: ['ts', 'tsx', 'js'],
  transform: { '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.json' }] },
  testMatch: ['**/?(*.)+(spec|test).[tj]s?(x)'],
  moduleNameMapper: {
    // Stub out Electron at unit‑test level
    '^electron$': '<rootDir>/tests/__mocks__/electron.ts',
  },
  clearMocks: true,
  collectCoverageFrom: ['src/**/*.{ts,tsx}', 'electron/**/*.{ts,tsx}'],
};

export default config;
