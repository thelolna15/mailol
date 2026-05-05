import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { getAuthUser } from "@/lib/auth";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = getAuthUser(req);
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    // Verify ownership security correctly matching current logged-in user
    if (user.id !== id) {
       return NextResponse.json({ message: "Forbidden - Cannot delete other account instances." }, { status: 403 });
    }

    // 1. Wipe Redis Core User Indexes
    await redis.del(`user:${user.address}`);
    await redis.del(`account:${id}`);
    await redis.del(`forward:${user.address}`);
    
    // 2. Wipe Entire Sandbox Email Messages to prevent Redis orphan memleaks
    const msgIds = await redis.zrange(`inbox:${user.address}`, 0, -1);
    if (msgIds && msgIds.length > 0) {
        const pipeline = redis.pipeline();
        msgIds.forEach(msgId => {
           pipeline.del(`message:${msgId}`);
           pipeline.del(`message_body:${msgId}`);
        });
        pipeline.del(`inbox:${user.address}`);
        await pipeline.exec();
    }

    return new NextResponse(null, { status: 204 });

  } catch (err) {
    return NextResponse.json({ message: "Internal server error during deletion cascade" }, { status: 500 });
  }
}
