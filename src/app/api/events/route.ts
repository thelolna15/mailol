export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import Redis from "ioredis";

export async function GET(req: NextRequest) {
  const user = getAuthUser(req);
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // Must spin a dedicated connection for Blocking pub/sub subscription
      const subscriber = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
      
      const channel = `channel:${user.address}`;
      await subscriber.subscribe(channel);
      let isClosed = false;
      
      subscriber.on('message', (chan, message) => {
        if (chan === channel && !isClosed) {
          try {
             controller.enqueue(encoder.encode(`data: ${message}\n\n`));
          } catch(e) {
             isClosed = true;
             subscriber.quit();
          }
        }
      });
      
      // Ping keep-alive trick to keep proxy/gateway tunnels open stably
      const pingInterval = setInterval(() => {
         try {
            controller.enqueue(encoder.encode(`:\n\n`)); // EventStream Keep-Alive standard format
         } catch(e) {}
      }, 25000);

      req.signal.addEventListener('abort', () => {
         isClosed = true;
         clearInterval(pingInterval);
         subscriber.quit();
      });
    }
  });

  return new Response(stream, {
     headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive"
     }
  });
}
