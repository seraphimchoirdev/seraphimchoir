import type { Config } from 'jest';
import nextJest from 'next/jest';

const createJestConfig = nextJest({
  // Next.js 앱의 경로 (next.config.ts가 있는 디렉토리)
  dir: './',
});

// Jest에 전달할 커스텀 설정
const config: Config = {
  coverageProvider: 'v8',
  testEnvironment: 'jsdom',

  // 테스트 전에 실행할 설정 파일 (순서 중요!)
  setupFiles: ['<rootDir>/jest.polyfills.ts'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],

  // 모듈 경로 매핑 (tsconfig.json의 paths와 동일)
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },

  // 테스트 파일 패턴
  testMatch: [
    '**/__tests__/**/*.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)',
  ],

  // 제외할 디렉토리
  testPathIgnorePatterns: ['/node_modules/', '/.next/'],

  // Coverage 제외 패턴
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/.next/',
    '/coverage/',
    'jest.config.ts',
    'jest.setup.ts',
  ],

  // Transform 설정
  transformIgnorePatterns: [
    '/node_modules/',
    '^.+\\.module\\.(css|sass|scss)$',
  ],
};

// createJestConfig는 비동기 함수이므로 export
export default createJestConfig(config);
