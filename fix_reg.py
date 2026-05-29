import os
os.chdir(r"D:\ClaudeWorkSpace\my_project\sports-injury-platform")

path = r"src\__tests__\api\auth\register.test.ts"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Fix mock to not use requireActual (avoids importing real supabase-js)
old = """jest.mock("@supabase/supabase-js", () => {
  const actual = jest.requireActual("@supabase/supabase-js");
  return {
    ...actual,
    createClient: jest.fn(() => ({
      auth: {
        admin: {
          createUser: jest.fn().mockResolvedValue({
            data: { user: { id: "supa-new-user", email: "new@test.com" } },
            error: null,
          }),
        },
      },
    })),
  };
});"""
new = """jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(() => ({
    auth: {
      admin: {
        createUser: jest.fn().mockResolvedValue({
          data: { user: { id: "supa-new-user", email: "new@test.com" } },
          error: null,
        }),
      },
    },
  })),
}));"""
content = content.replace(old, new)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
print("Done")
