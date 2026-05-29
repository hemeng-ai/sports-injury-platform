import os
os.chdir(r"D:\ClaudeWorkSpace\my_project\sports-injury-platform")

path = "jest.config.ts"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

insert = '''    // Mock Supabase 认证模块（测试不需要真实 Supabase）
    "^@/lib/session$": "<rootDir>/src/__tests__/__mocks__/lib/session.ts",
    "^@/lib/supabase-server$": "<rootDir>/src/__tests__/__mocks__/lib/supabase-server.ts",
    "^@/lib/supabase-client$": "<rootDir>/src/__tests__/__mocks__/lib/supabase-client.ts",
'''

old = '''    "\\.(jpg|jpeg|png|gif|webp|svg)$":
      "<rootDir>/src/__tests__/__mocks__/fileMock.ts",'''
new = insert + '''    "\\.(jpg|jpeg|png|gif|webp|svg)$":
      "<rootDir>/src/__tests__/__mocks__/fileMock.ts",'''

content = content.replace(old, new)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
print("Done")
