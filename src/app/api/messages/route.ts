import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { getAuthUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    // 1. Fetch message IDs from Sorted Set (newest first based on Time score)
    // ZREVRANGE fetches descending. Index 0 to 49 = 50 Items.
    const msgIds = await redis.zrevrange(`inbox:${user.address}`, 0, 49); 

    if (msgIds.length === 0) {
      return NextResponse.json({
        "@context": "/contexts/Message",
        "@id": "/messages",
        "@type": "hydra:Collection",
        "hydra:member": [],
        "hydra:totalItems": 0
      });
    }

    // 2. Fetch the actual message JSON objects using Pipeline to avoid blocking & optimize RTT
    const pipeline = redis.pipeline();
    msgIds.forEach(id => pipeline.get(`message:${id}`));
    const results = await pipeline.exec();
    
    const messages = [];
    if (results) {
       for (const [err, val] of results) {
          if (!err && val) {
             messages.push(JSON.parse(val as string));
          }
       }
    }

    return NextResponse.json({
        "@context": "/contexts/Message",
        "@id": "/messages",
        "@type": "hydra:Collection",
        "hydra:member": messages,
        "hydra:totalItems": messages.length
    });

  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
