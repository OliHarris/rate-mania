/** @type {import('jest').Config} */
export default {
  testEnvironment: "jsdom",
  roots: ["<rootDir>/src"],
  testMatch: ["**/*.test.{ts,tsx}"],
  setupFilesAfterEnv: ["<rootDir>/src/setupTests.ts"],
  transform: {
    "^.+\\.(t|j)sx?$": [
      "@swc/jest",
      {
        jsc: {
          parser: { syntax: "typescript", tsx: true },
          transform: { react: { runtime: "automatic" } },
        },
      },
    ],
  },
  moduleNameMapper: {
    "^sweetalert2/src/sweetalert2\\.js$": "<rootDir>/src/test/sweetalert2Mock.ts",
    "\\.(css|less|scss)$": "identity-obj-proxy",
    "\\.(svg|png|jpg|jpeg|gif|webp|eot|ttf|woff|woff2)$":
      "<rootDir>/src/test/fileMock.ts",
  },
  collectCoverageFrom: ["src/**/*.{ts,tsx}", "!src/**/*.d.ts", "!src/**/*.test.{ts,tsx}", "!src/test/**", "!src/setupTests.ts"],
  coverageThreshold: {
    global: { statements: 100, branches: 100, functions: 100, lines: 100 },
  },
  clearMocks: true,
  restoreMocks: true,
};
