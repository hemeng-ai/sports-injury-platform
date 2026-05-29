import os
os.chdir(r"D:\ClaudeWorkSpace\my_project\sports-injury-platform")

path = "jest.config.ts"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Find the moduleNameMapper block and insert new entries
old_mapper = '''  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    // 静态资源 mock
    "\\\\.(css|less|scss|sass)$": "identity-obj-proxy",
    "\\\\.(jpg|jpeg|png|gif|webp|svg)$":
      "<rootDir>/src/__tests__/__mocks__/fileMock.ts",
  },'''

new_mapper = '''  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    // Mock Supabase SDK 和认证模块（测试不需要真实连接）
    "^@supabase/supabase-js$": "<rootDir>/src/__tests__/__mocks__/supabase-js.ts",
    "^@/lib/session$": "<rootDir>/src/__tests__/__mocks__/lib/session.ts",
    "^@/lib/supabase-server$": "<rootDir>/src/__tests__/__mocks__/lib/supabase-server.ts",
    "^@/lib/supabase-client$": "<rootDir>/src/__tests__/__mocks__/lib/supabase-client.ts",
    // 静态资源 mock
    "\\\\.(css|less|scss|sass)$": "identity-obj-proxy",
    "\\\\.(jpg|jpeg|png|gif|webp|svg)$":
      "<rootDir>/src/__tests__/__mocks__/fileMock.ts",
  },'''

content = content.replace(old_mapper, new_mapper)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
print("Done")
