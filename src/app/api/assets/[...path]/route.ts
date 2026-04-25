import { readFile } from "node:fs/promises";
import path from "node:path";

import { NextRequest, NextResponse } from "next/server";

import { contentTypeForFileName, resolveAssetPath } from "@/lib/jobs";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    path: string[];
  }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const { path: assetPath } = await context.params;

  try {
    const filePath = await resolveAssetPath(assetPath);
    const file = await readFile(filePath);
    const url = new URL(_request.url);
    const isDownload = url.searchParams.get("download") === "1";
    const headers = new Headers({
      "Content-Type": contentTypeForFileName(filePath),
      "Cache-Control": "private, max-age=31536000, immutable"
    });

    if (isDownload) {
      headers.set("Content-Disposition", `attachment; filename="${path.basename(filePath)}"`);
    }

    return new Response(file, { headers });
  } catch {
    return NextResponse.json({ error: "资源不存在。" }, { status: 404 });
  }
}
