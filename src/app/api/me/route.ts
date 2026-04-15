import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { getAuthUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const accountStr = await redis.get(`user:${user.address}`);
    if (!accountStr) return NextResponse.json({ message: "Account mapping not found in redis" }, { status: 404 });

    const accountData = JSON.parse(accountStr);
    
    // Remote sensitive hash data
    const { password, ...accountSanitized } = accountData;

    return NextResponse.json(accountSanitized);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
