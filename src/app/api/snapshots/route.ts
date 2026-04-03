import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export function GET(request: Request): NextResponse {
  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get("days") ?? "90", 10);

  const db = getDb();
  const snapshots = db
    .prepare("SELECT * FROM snapshots ORDER BY date DESC LIMIT ?")
    .all(days);

  return NextResponse.json(snapshots);
}
