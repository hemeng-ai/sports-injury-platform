import type { Config } from "jest";

const config: Config = {
  // 预置测试环境变量（在模块加载前执行）
  setupFiles: ["<rootDir>/jest.setup.ts"],

  // 使用 SWC 转译 TypeScript/TSX，启用 React 自动 JSX 运行时
  transform: {
    "^.+\\.(t|j)sx?$": [
      "@swc/jest",
      {
        jsc: {
          transform: {
            react: {
              runtime: "automatic",
            },
          },
        },
      },
    ],
  },

  // jsdom 环境（模拟浏览器 DOM，用于 React 组件测试）
  testEnvironment: "jsdom",

  // 测试文件匹配规则
  testMatch: [
    "<rootDir>/src/__tests__/**/*.test.{ts,tsx}",
    "<rootDir>/src/__tests__/**/*.spec.{ts,tsx}",
  ],

  // 路径映射（对齐 tsconfig paths：@/ → src/）
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    // 静态资源 mock
    "\\.(css|less|scss|sass)$": "identity-obj-proxy",
    "\\.(jpg|jpeg|png|gif|webp|svg)$":
      "<rootDir>/src/__tests__/__mocks__/fileMock.ts",
  },

  // 忽略路径
  testPathIgnorePatterns: ["<rootDir>/.next/", "<rootDir>/node_modules/"],

  // 覆盖率收集
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/__tests__/**",
  ],

  // 转换 node_modules 中的 ESM 包（NextAuth 及其依赖全部 ESM-only）
  transformIgnorePatterns: [
    "/node_modules/(?!(next-auth|@auth|@panva|jose|preact|preact-render-to-string|uuid|next)/)",
  ],
};

export default config;
