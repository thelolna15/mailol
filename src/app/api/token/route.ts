import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import bcrypt from "bcryptjs";
import { signToken } from "@/lib/jwt";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    if (!body.address || !body.password) {
      return NextResponse.json({ code: 401, message: "Invalid credentials." }, { status: 401 });
    }

    const { address, password } = body;
    const lookupAddress = address.toLowerCase();
    
    // Fetch user from Redis
    const accountStr = await redis.get(`user:${lookupAddress}`);
    if (!accountStr) {
      return NextResponse.json({ code: 401, message: "Invalid credentials." }, { status: 401 });
    }

    const account = JSON.parse(accountStr);
    
    // Verify hash
    const isMatch = await bcrypt.compare(password, account.password);
    if (!isMatch) {
      return NextResponse.json({ code: 401, message: "Invalid credentials." }, { status: 401 });
    }

    // Generate JWT
    const token = signToken({ id: account.id, address: account.address });
    
    return NextResponse.json({
      token,
      "id": account.id
    });
    
  } catch (err) {
    return NextResponse.json({ message: "Internal Server error" }, { status: 500 });
  }
}
