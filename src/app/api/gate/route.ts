import { NextResponse } from "next/server";
import { checkGatePassword, setGateCookie, isGateUnlocked } from "@/lib/gate";

export const revalidate = 0;

export async function GET() {
  try {
    const unlocked = await isGateUnlocked();
    return NextResponse.json({ unlocked });
  } catch (err: any) {
    return NextResponse.json({ unlocked: false, error: err.message });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { password } = body;

    const valid = await checkGatePassword(password);
    if (!valid) {
      return NextResponse.json(
        { error: "Incorrect password." },
        { status: 401 }
      );
    }

    await setGateCookie();
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to verify password." },
      { status: 500 }
    );
  }
}
