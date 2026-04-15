import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";

// Helper to format Hydra error
const getHydraError = (description: string) => ({
  "@context": "/contexts/ConstraintViolationList",
  "@type": "ConstraintViolationList",
  "hydra:title": "An error occurred",
  "hydra:description": description,
  "violations": []
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    if (!body.address || !body.password) {
      return NextResponse.json(
        getHydraError("address: This value should not be blank."),
        { status: 422 }
      );
    }

    let { address, password } = body;
    address = address.toLowerCase();

    // Verify domain is allowed
    const DOMAIN = process.env.DOMAIN || "thelol.me";
    if (!address.endsWith(`@${DOMAIN}`)) {
      return NextResponse.json(
        getHydraError(`address: Domain must be ${DOMAIN}`), 
        { status: 422 }
      );
    }

    // Check if account already exists
    const exists = await redis.exists(`user:${address}`);
    if (exists) {
      return NextResponse.json(
         getHydraError("address: This value is already used."), 
         { status: 422 }
      );
    }

    // Hash password and prepare data
    const hashedPassword = await bcrypt.hash(password, 10);
    const id = uuidv4();
    const createdAt = new Date().toISOString();
    
    const accountData = {
      "@context": "/contexts/Account",
      "@id": `/accounts/${id}`,
      "@type": "Account",
      "id": id,
      "address": address,
      "password": hashedPassword, // Private to redis
      "quota": parseInt(process.env.DEFAULT_QUOTA || "41943040"),
      "used": 0,
      "isDisabled": false,
      "isDeleted": false,
      "createdAt": createdAt,
      "updatedAt": createdAt
    };

    // Save to redis (No TTL/Expiration, Account is Permanent)
    await redis.set(`user:${address}`, JSON.stringify(accountData));
    // Link ID to address for lookup queries
    await redis.set(`account:${id}`, address);

    // Filter password out before responding
    const { password: _, ...returnObj } = accountData;

    return NextResponse.json(returnObj, { status: 201 });
    
  } catch (err) {
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
