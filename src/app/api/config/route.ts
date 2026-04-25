import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import { hasApimartApiKey } from "@/lib/apimart";
import { getStorageRoot } from "@/lib/jobs";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    hasApiKey: hasApimartApiKey(),
    model: "gpt-image-2",
    storageDir: getStorageRoot()
  });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { apiKey?: unknown } | null;
  const apiKey = typeof body?.apiKey === "string" ? body.apiKey.trim() : "";

  if (!apiKey) {
    return NextResponse.json({ error: "请输入 APIMart API Key。" }, { status: 400 });
  }

  if (apiKey.length < 12) {
    return NextResponse.json({ error: "API Key 看起来太短，请检查后再保存。" }, { status: 400 });
  }

  process.env.APIMART_API_KEY = apiKey;
  await upsertEnvLocal("APIMART_API_KEY", apiKey);

  return NextResponse.json({
    hasApiKey: true,
    model: "gpt-image-2",
    storageDir: getStorageRoot()
  });
}

async function upsertEnvLocal(key: string, value: string) {
  const envPath = path.join(process.cwd(), ".env.local");
  const nextLine = `${key}=${quoteEnvValue(value)}`;
  let content = "";

  try {
    content = await readFile(envPath, "utf8");
  } catch {
    content = "";
  }

  const lines = content.split(/\r?\n/u);
  let replaced = false;
  const nextLines = lines.map((line) => {
    if (line.match(new RegExp(`^\\s*${key}\\s*=`))) {
      replaced = true;
      return nextLine;
    }

    return line;
  });

  if (!replaced) {
    if (nextLines.length > 0 && nextLines[nextLines.length - 1] !== "") {
      nextLines.push("");
    }

    nextLines.push(nextLine);
  }

  await writeFile(envPath, `${nextLines.filter((_, index) => index < nextLines.length - 1 || nextLines[index] !== "").join("\n")}\n`, "utf8");
}

function quoteEnvValue(value: string) {
  if (/^[A-Za-z0-9_.:/+=@-]+$/u.test(value)) {
    return value;
  }

  return JSON.stringify(value);
}
