import "@testing-library/jest-dom";
/**
 * @jest-environment jsdom
 */
import { render } from "@testing-library/react";
import DashboardPage from "@/app/(dashboard)/dashboard/page";

jest.mock("@/lib/supabase-client", () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: { app_metadata: { role: "ADMIN" }, email: "a@b.com" } } }),
      signOut: jest.fn(),
    },
  })),
}));
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => "/dashboard",
}));
jest.mock("next/link", () => ({ __esModule: true, default: ({ children }: { children: React.ReactNode }) => children }));
global.fetch = jest.fn().mockResolvedValue({ json: () => Promise.resolve({ totalFiles: 0, totalIndicators: 0, recentUploads: [], recentActivity: [], users: 0 }) });

describe("Dashboard", () => {
  it("renders without crashing", () => {
    expect(() => render(<DashboardPage />)).not.toThrow();
  });
});
