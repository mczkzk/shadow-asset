import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export function GET(request: Request): NextResponse {
  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get("account_id");

  const db = getDb();

  if (accountId) {
    const holdings = db
      .prepare("SELECT * FROM holdings WHERE account_id = ? ORDER BY id")
      .all(Number(accountId));
    return NextResponse.json(holdings);
  }

  const holdings = db.prepare("SELECT * FROM holdings ORDER BY id").all();
  return NextResponse.json(holdings);
}

export async function POST(request: Request): Promise<NextResponse> {
  const body = await request.json();
  const {
    account_id,
    ticker,
    name,
    quantity,
    holding_type,
    as_of = null,
    monthly_amount = null,
  } = body;

  if (!account_id || !ticker || !name || quantity == null || !holding_type) {
    return NextResponse.json(
      { error: "account_id, ticker, name, quantity, holding_type are required" },
      { status: 400 }
    );
  }

  const db = getDb();
  const result = db
    .prepare(
      "INSERT INTO holdings (account_id, ticker, name, quantity, holding_type, as_of, monthly_amount) VALUES (?, ?, ?, ?, ?, ?, ?)"
    )
    .run(account_id, ticker, name, quantity, holding_type, as_of, monthly_amount);

  const holding = db.prepare("SELECT * FROM holdings WHERE id = ?").get(result.lastInsertRowid);
  return NextResponse.json(holding, { status: 201 });
}

export async function PUT(request: Request): Promise<NextResponse> {
  const body = await request.json();
  const { id, ticker, name, quantity, holding_type, as_of, monthly_amount } = body;

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const db = getDb();
  db.prepare(
    `UPDATE holdings SET
      ticker = COALESCE(?, ticker),
      name = COALESCE(?, name),
      quantity = COALESCE(?, quantity),
      holding_type = COALESCE(?, holding_type),
      as_of = ?,
      monthly_amount = ?
    WHERE id = ?`
  ).run(
    ticker ?? null,
    name ?? null,
    quantity ?? null,
    holding_type ?? null,
    as_of ?? null,
    monthly_amount ?? null,
    id
  );

  const holding = db.prepare("SELECT * FROM holdings WHERE id = ?").get(id);
  return NextResponse.json(holding);
}

export async function DELETE(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const db = getDb();
  db.prepare("DELETE FROM holdings WHERE id = ?").run(Number(id));
  return NextResponse.json({ ok: true });
}
