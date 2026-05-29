import os
os.chdir(r"D:\ClaudeWorkSpace\my_project\sports-injury-platform")

# Create supabase-js mock file
mock_path = r"src\__tests__\__mocks__\supabase-js.ts"
with open(mock_path, "w", encoding="utf-8") as f:
    f.write('''// Mock @supabase/supabase-js — 避免测试环境导入真实 Supabase SDK
export const createClient = jest.fn(() => ({
  auth: {
    admin: {
      createUser: jest.fn().mockResolvedValue({
        data: { user: { id: "supa-mock-id", email: "mock@test.com" }, session: {} },
        error: null,
      }),
      updateUserById: jest.fn().mockResolvedValue({
        data: { user: {} },
        error: null,
      }),
    },
    signInWithPassword: jest.fn().mockResolvedValue({
      data: {
        user: { id: "supa-mock-id", email: "mock@test.com", app_metadata: { role: "ADMIN" } },
        session: { access_token: "mock-token", refresh_token: "mock-refresh", expires_at: 9999999999 },
      },
      error: null,
    }),
  },
  storage: {
    from: jest.fn(() => ({
      upload: jest.fn().mockResolvedValue({ data: {}, error: null }),
      remove: jest.fn().mockResolvedValue({ data: {}, error: null }),
      getPublicUrl: jest.fn(() => ({ data: { publicUrl: "https://mock.supabase.co/mock" } })),
    })),
  },
}));
''')

# Add moduleNameMapper
path = "jest.config.ts"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

insert_line = '''    "^@supabase/supabase-js$": "<rootDir>/src/__tests__/__mocks__/supabase-js.ts",
'''
old = '    "^@/lib/supabase-client$":'
content = content.replace(old, insert_line + '    "^@/lib/supabase-client$":')

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
print("Done")
