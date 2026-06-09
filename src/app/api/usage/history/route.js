import { NextResponse } from "next/server";
import { getUsageHistory } from "@/lib/db/repos/usageRepo";

export async function GET() {
  try {
    const history = await getUsageHistory();
    return NextResponse.json({ history });
  } catch (error) {
    console.error("Error fetching usage stats:", error);
    return NextResponse.json({ error: "Failed to fetch usage stats" }, { status: 500 });
  }
}
