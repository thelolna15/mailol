import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { verifyToken } from "@/lib/jwt";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string, index: string }> }) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const token = authHeader.split(" ")[1];
  const jwtPayload = verifyToken(token);
  if (!jwtPayload) {
    return NextResponse.json({ message: "Invalid token" }, { status: 401 });
  }

  const { id, index } = await params;
  
  // Verify ownership of the message
  const msgData = await redis.get(`message:${id}`);
  if (!msgData) {
     return NextResponse.json({ message: "Message not found" }, { status: 404 });
  }
  
  const message = JSON.parse(msgData);
  const isOwner = message.to.some((t: any) => t.address === jwtPayload.address);
  if (!isOwner) {
     return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  // Get raw Buffer attachment
  // ioredis provides getBuffer to explicitly request raw Buffer data
  const buffer = await redis.getBuffer(`attachment:${id}:${index}`);
  
  if (!buffer) {
     return NextResponse.json({ message: "Attachment not found or expired" }, { status: 404 });
  }
  
  const targetAttachment = message.attachments?.find((a: any) => a.index.toString() === index.toString());
  const contentType = targetAttachment?.contentType || "application/octet-stream";
  const filename = targetAttachment?.filename || "attachment";

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`
    }
  });
}
