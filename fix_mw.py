import os
os.chdir(r"D:\ClaudeWorkSpace\my_project\sports-injury-platform")

path = r"src\__tests__\middleware.test.ts"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Replace old spy on NextResponse.redirect with global Response.redirect spy
# The old code: const spyRedirect = jest.fn();
# Replace spyRedirect usage: mock NextResponse.redirect to also track via spy

# Actually the test mocks next/server entirely. Let me just replace to check Response.redirect
old_import = """jest.mock("next/server", () => {
  const actual = jest.requireActual("next/server");"""
new_import = """jest.mock("next/server", () => {
  const actual = jest.requireActual("next/server");"""

# Instead of complex rewriting, let me just add a global spy on Response.redirect
# before the middleware import
mock_insert = """
// ---- spy on global Response.redirect (used by Supabase middleware) ----
const spyRedirect = jest.fn();
const originalRedirect = Response.redirect.bind(Response);
Response.redirect = (...args) => { spyRedirect(...args); return originalRedirect(...args); };
"""
content = content.replace("// ---- spy NextResponse 方法 ----", mock_insert + "\n// ---- spy NextResponse 方法 ----")

# Remove the old spyRedirect declaration from next/server mock
content = content.replace("const spyRedirect = jest.fn();\n", "")
content = content.replace("spyRedirect.mockReset();\n", "")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
print("Done middleware test")
