import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.API_BASE ?? "https://netguard-api.noit.eu";

// Forward the user's own Bearer token from the incoming request to the Flask API.
// The token is auto-generated per-user by the extension (background.js) and
// stored in chrome.storage.sync — it is never a shared secret.
function forwardAuth(req: NextRequest): string {
  return req.headers.get("Authorization") ?? "";
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const upstream = `${API_BASE}/api/${path.join("/")}`;

  const resp = await fetch(upstream, {
    headers: {
      "Content-Type": "application/json",
      Authorization: forwardAuth(req),
    },
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
      Authorization: forwardAuth(req),
    },
    body,
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
      Authorization: forwardAuth(req),
    },
  });

  const data = await resp.json();
  return NextResponse.json(data, { status: resp.status });
}
