import { readFile } from "node:fs/promises";

import { NextRequest, NextResponse } from "next/server";

import { contentTypeForFileName, resolveAssetPath } from "@/lib/jobs";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    path: string[];
  }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const { path } = await context.params;

  try {
    const filePath = await resolveAssetPath(path);
    const file = await readFile(filePath);

    return new Response(file, {
      headers: {
        "Content-Type": contentTypeForFileName(filePath),
        "Cache-Control": "private, max-age=31536000, immutable"
      }
    });
  } catch {
    return NextResponse.json({ error: "资源不存在。" }, { status: 404 });
  }
}
