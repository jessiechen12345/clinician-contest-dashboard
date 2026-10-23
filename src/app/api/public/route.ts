import { NextResponse } from "next/server";
import { getPublicData } from "@/lib/data";

export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month") || undefined;
    const data = await getPublicData(month);
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch public data." },
      { status: 500 }
    );
  }
}
