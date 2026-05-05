import { NextRequest, NextResponse } from "next/server";
import { redis, publisher } from "@/lib/redis";
import { v4 as uuidv4 } from "uuid";

// ONLY FOR DEVELOPMENT
export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ message: "Not allowed in production environment" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const address = searchParams.get("address");

  if (!address) {
    return NextResponse.json({ message: "address query param required (?address=user@xneine.site)" }, { status: 400 });
  }

  const id = uuidv4();
  const accountId = "mock-account-id"; 
  const timestamp = new Date().toISOString();
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();

  const message = {
    "@context": "/contexts/Message",
    "@id": `/messages/${id}`,
    "@type": "Message",
    "id": id,
    "accountId": accountId,
    "msgid": `<${uuidv4()}@mock.mailol>`,
    "from": {
      "address": "noreply@discord.com",
      "name": "Discord"
    },
    "to": [
      {
        "address": address,
        "name": ""
      }
    ],
    "subject": `Your Discord verification code is ${code}`,
    "intro": "Before we change the email on your account, we just need to confirm that this is you.",
    "seen": false,
    "isDeleted": false,
    "hasAttachments": true,
    "attachments": [
       { "filename": "discord-handbook.pdf", "size": 524288, "contentType": "application/pdf", "index": 0 }
    ],
    "size": 525788,
    "downloadUrl": `/messages/${id}/download`,
    "createdAt": timestamp,
    "updatedAt": timestamp
  };

  // 1. Add to Inbox List (Sorted Map by Timestamp / Simple List)
  await redis.zadd(`inbox:${address}`, Date.now(), id);

  // 1.5. Limit Inbox Size to 50 messages max for footprint safety
  const count = await redis.zcard(`inbox:${address}`);
  if (count > 50) {
      const evictedIds = await redis.zrange(`inbox:${address}`, 0, count - 51);
      if (evictedIds && evictedIds.length > 0) {
          for (const evictId of evictedIds) {
              await redis.del(`message:${evictId}`);
              await redis.del(`message_body:${evictId}`);
          }
          await redis.zremrangebyrank(`inbox:${address}`, 0, count - 51);
      }
  }
  
  // 2. Save actual raw message metadata mapping
  await redis.setex(`message:${id}`, 86400, JSON.stringify(message)); // 24 hours TTL
  
  // 3. Save mock HTML content
  const htmlContent = `
    <html>
      <body style="font-family: Arial, sans-serif; background-color: #f7f7f7; padding: 20px;">
        <div style="max-width: 500px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px;">
           <h2 style="color: #5865F2; text-align: center;">Discord</h2>
           <p style="color: #333">${message.intro}</p>
           <div style="background: #f0f0f0; padding: 15px; text-align: center; font-size: 24px; letter-spacing: 5px; font-weight: bold; margin: 30px 0; border-radius: 4px;">
              ${code}
           </div>
           <p style="color: #777; font-size: 12px;">Don't share this code with anyone.</p>
           <p style="color: #777; font-size: 12px;">If you didn't ask for this code, please ignore this email.</p>
        </div>
      </body>
    </html>
  `;
  await redis.setex(`message_body:${id}`, 86400, htmlContent);

  // 3.5. Mock Attachment Buffer
  const dummyPdfBuffer = Buffer.from("JVBERi0xLjQKJcOkw7zDtsOfCjIgMCBvYmoKPDwvTGVuZ3RoIDMgMCBSL0ZpbHRlci9GbGF0ZURlY29kZT4+CnN0cmVhbQp4nDPQM1Qo5ypUMFAwAAAqwwzD", "base64");
  await redis.setex(`attachment:${id}:0`, 86400, dummyPdfBuffer.toString('base64'));

  // 4. Trigger SSE Event Publisher for real-time frontend updates
  const eventPayload = JSON.stringify({
    type: "message_created",
    message: message
  });
  await publisher.publish(`channel:${address}`, eventPayload);

  return NextResponse.json({
    message: "Mock email injected successfully",
    eventSentTo: `channel:${address}`,
    data: message
  });
}
