import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export function GET(): NextResponse {
  const db = getDb();
  const accounts = db.prepare("SELECT * FROM accounts ORDER BY sort_order, id").all();
  return NextResponse.json(accounts);
}

export async function POST(request: Request): Promise<NextResponse> {
  const body = await request.json();
  const { name, type, sort_order = 0 } = body;

  if (!name || !type) {
    return NextResponse.json({ error: "name and type are required" }, { status: 400 });
  }

  const db = getDb();
  const result = db
    .prepare("INSERT INTO accounts (name, type, sort_order) VALUES (?, ?, ?)")
    .run(name, type, sort_order);

  const account = db.prepare("SELECT * FROM accounts WHERE id = ?").get(result.lastInsertRowid);
  return NextResponse.json(account, { status: 201 });
}

export async function PUT(request: Request): Promise<NextResponse> {
  const body = await request.json();
  const { id, name, type, sort_order } = body;

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const db = getDb();
  db.prepare(
    "UPDATE accounts SET name = COALESCE(?, name), type = COALESCE(?, type), sort_order = COALESCE(?, sort_order) WHERE id = ?"
  ).run(name ?? null, type ?? null, sort_order ?? null, id);

  const account = db.prepare("SELECT * FROM accounts WHERE id = ?").get(id);
  return NextResponse.json(account);
}

export async function DELETE(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const db = getDb();
  db.prepare("DELETE FROM holdings WHERE account_id = ?").run(Number(id));
  db.prepare("DELETE FROM accounts WHERE id = ?").run(Number(id));
  return NextResponse.json({ ok: true });
}
