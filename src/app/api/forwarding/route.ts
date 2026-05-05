import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { getAuthUser } from "@/lib/auth";

const configuredMaxForwardRecipients = parseInt(process.env.MAX_FORWARD_RECIPIENTS || "10", 10);
const MAX_FORWARD_RECIPIENTS = Number.isFinite(configuredMaxForwardRecipients)
  ? configuredMaxForwardRecipients
  : 10;
const GMAIL_ADDRESS_REGEX = /^[^\s@]+@gmail\.com$/i;

function getHydraError(description: string) {
  return {
    "@context": "/contexts/ConstraintViolationList",
    "@type": "ConstraintViolationList",
    "hydra:title": "An error occurred",
    "hydra:description": description,
    "violations": []
  };
}

function normalizeRecipients(input: unknown): string[] {
  if (!Array.isArray(input)) {
    throw new Error("recipients: This value should be an array.");
  }

  const recipients = Array.from(
    new Set(
      input
        .filter((recipient): recipient is string => typeof recipient === "string")
        .map((recipient) => recipient.trim().toLowerCase())
        .filter(Boolean)
    )
  );

  if (recipients.length > MAX_FORWARD_RECIPIENTS) {
    throw new Error(`recipients: Maximum ${MAX_FORWARD_RECIPIENTS} Gmail addresses allowed.`);
  }

  const invalid = recipients.find((recipient) => !GMAIL_ADDRESS_REGEX.test(recipient));
  if (invalid) {
    throw new Error(`recipients: ${invalid} must be a valid gmail.com address.`);
  }

  return recipients;
}

export async function GET(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const forwardingStr = await redis.get(`forward:${user.address}`);
    const forwarding = forwardingStr ? JSON.parse(forwardingStr) : { recipients: [] };

    return NextResponse.json({
      recipients: Array.isArray(forwarding.recipients) ? forwarding.recipients : [],
      updatedAt: forwarding.updatedAt || null
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const accountExists = await redis.exists(`user:${user.address}`);
    if (!accountExists) {
      return NextResponse.json({ message: "Account mapping not found in redis" }, { status: 404 });
    }

    const body = await req.json() as { recipients?: unknown };
    let recipients: string[];

    try {
      recipients = normalizeRecipients(body.recipients);
    } catch (err) {
      const message = err instanceof Error ? err.message : "recipients: Invalid value.";
      return NextResponse.json(getHydraError(message), { status: 422 });
    }

    const now = new Date().toISOString();

    if (recipients.length === 0) {
      await redis.del(`forward:${user.address}`);
      return NextResponse.json({ recipients: [], updatedAt: now });
    }

    await redis.set(
      `forward:${user.address}`,
      JSON.stringify({
        accountId: user.id,
        address: user.address,
        recipients,
        updatedAt: now
      })
    );

    return NextResponse.json({ recipients, updatedAt: now });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
