import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { getAuthUser } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = getAuthUser(req);
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    
    // Get Head Metadata
    const messageStr = await redis.get(`message:${id}`);
    if (!messageStr) return NextResponse.json({ message: "Message not found" }, { status: 404 });
    const message = JSON.parse(messageStr);

    // Verify ownership (the "to" address must match logged in address)
    const addressMatched = message.to.some((t: any) => t.address === user.address);
    if (!addressMatched) {
       return NextResponse.json({ message: "Forbidden Access" }, { status: 403 });
    }

    // Mark as seen automatically on render
    if (!message.seen) {
        message.seen = true;
        // Keep previous TTL constraint string intact if possible, or just re-insert.
        await redis.set(`message:${id}`, JSON.stringify(message), "KEEPTTL");
    }

    // Fetch rich body HTML payload
    const bodyHtml = await redis.get(`message_body:${id}`) || "<i>No HTML Content Available</i>";
    
    // Embed cleanly for frontend DOMPurify parser
    message.html = [bodyHtml];
    message.text = "This instance prioritizes HTML contexts.";

    return NextResponse.json(message);

  } catch (err) {
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}


export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
   try {
    const user = getAuthUser(req);
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    
    const messageStr = await redis.get(`message:${id}`);
    if (!messageStr) return NextResponse.json({ message: "Message not found" }, { status: 404 });
    const message = JSON.parse(messageStr);

    // Verify ownership
    const addressMatched = message.to.some((t: any) => t.address === user.address);
    if (!addressMatched) {
       return NextResponse.json({ message: "Forbidden Access" }, { status: 403 });
    }

    // Nuke from infrastructure
    await redis.del(`message:${id}`);
    await redis.del(`message_body:${id}`);
    await redis.zrem(`inbox:${user.address}`, id);

    return NextResponse.json({}, { status: 204 });

  } catch (err) {
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
