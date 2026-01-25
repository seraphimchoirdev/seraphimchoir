import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier, // Prettier와 충돌하는 ESLint 규칙 비활성화
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // 추가 제외 경로
    "scripts/**",
    "ml-service/**",
    "jest.config.js",
    "jest.polyfills.ts",
    "jest.setup.ts",
  ]),
  // src/ 내 특정 규칙 완화
  {
    files: ["src/**/*.ts", "src/**/*.tsx"],
    rules: {
      // 언더스코어로 시작하는 미사용 변수는 허용 (의도적 무시)
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      // any 사용은 warning으로 (점진적 개선)
      "@typescript-eslint/no-explicit-any": "warn",
      // useEffect 내 setState 경고로 완화 (React 19 새 규칙, 클라이언트 환경 초기화에서 필요)
      "react-hooks/set-state-in-effect": "warn",
      // React Compiler의 수동 메모이제이션 보존 경고 (복잡한 의존성에서 발생)
      "react-hooks/preserve-manual-memoization": "warn",
    },
  },
  // 보안/Sentry 관련 파일은 any 허용 (외부 라이브러리 타입 호환성)
  {
    files: ["src/lib/security/**/*.ts", "src/lib/sentry/**/*.ts", "sentry.*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  // 테스트 파일 규칙 완화
  {
    files: ["**/*.test.ts", "**/*.test.tsx", "**/__tests__/**/*.ts", "**/__tests__/**/*.tsx"],
    rules: {
      // Jest 테스트에서 require() 허용
      "@typescript-eslint/no-require-imports": "off",
      // 테스트에서 미사용 변수 경고 완화
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
]);

export default eslintConfig;
