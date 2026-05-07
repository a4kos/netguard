import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.API_BASE ?? "https://netguard-api.noit.eu";
const API_TOKEN = process.env.NETGUARD_TOKEN ?? "";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const upstream = `${API_BASE}/api/${path.join("/")}`;

  const resp = await fetch(upstream, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_TOKEN}`
    }
  });

  const data = await resp.json();
  return NextResponse.json(data, { status: resp.status });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const upstream = `${API_BASE}/api/${path.join("/")}`;
  const body = await req.text();

  const resp = await fetch(upstream, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_TOKEN}`
    },
    body
  });

  const data = await resp.json();
  return NextResponse.json(data, { status: resp.status });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const upstream = `${API_BASE}/api/${path.join("/")}`;

  const resp = await fetch(upstream, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${API_TOKEN}`
    }
  });

  const data = await resp.json();
  return NextResponse.json(data, { status: resp.status });
}
