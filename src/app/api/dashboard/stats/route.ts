// Dashboard 统计 API — GET /api/dashboard/stats
import { handleGet } from "@/lib/dashboard-stats";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  return handleGet(request);
}
