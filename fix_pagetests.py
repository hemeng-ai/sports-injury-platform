import os
os.chdir(r"D:\ClaudeWorkSpace\my_project\sports-injury-platform")

# Update login page test
path = r"src\__tests__\app\login\page.test.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Replace next-auth mock with supabase-client mock
old_mock = """jest.mock("next-auth/react", () => {
  const signIn = jest.fn().mockResolvedValue({ ok: true, error: null });
  return { signIn, useSession: jest.fn(() => ({ data: null })) };
});"""
new_mock = """jest.mock("@/lib/supabase-client", () => ({
  createClient: jest.fn(() => ({
    auth: {
      signInWithPassword: jest.fn().mockResolvedValue({ data: { user: {} }, error: null }),
      getUser: jest.fn().mockResolvedValue({ data: { user: { app_metadata: { role: "VISITOR" } } } }),
    },
  })),
}));"""
content = content.replace(old_mock, new_mock)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
print("Done login test")

# Update dashboard page test 
path = r"src\__tests__\app\dashboard\page.test.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old_mock = """jest.mock("next-auth/react", () => ({
  useSession: jest.fn(),
}));"""
new_mock = """jest.mock("@/lib/supabase-client", () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: { app_metadata: { role: "ADMIN" } } } }),
    },
  })),
}));"""
content = content.replace(old_mock, new_mock)

# Also replace remaining next-auth imports
content = content.replace('import { useSession } from "next-auth/react";\n', "")
content = content.replace("const mockUseSession = useSession as jest.Mock;\n", "")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
print("Done dashboard test")
