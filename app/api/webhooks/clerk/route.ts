import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

interface ClerkEmailAddress {
  id: string;
  email_address: string;
}

interface ClerkUserEvent {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email_addresses: ClerkEmailAddress[];
  primary_email_address_id: string | null;
}

function getPrimaryEmail(data: ClerkUserEvent): string | undefined {
  if (!data.primary_email_address_id) return data.email_addresses[0]?.email_address;
  return data.email_addresses.find(
    (e) => e.id === data.primary_email_address_id
  )?.email_address;
}

function getFullName(data: ClerkUserEvent): string | undefined {
  const parts = [data.first_name, data.last_name].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : undefined;
}

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[ClerkWebhook] CLERK_WEBHOOK_SECRET not set");
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  // Verify signature
  const svixId = req.headers.get("svix-id");
  const svixTimestamp = req.headers.get("svix-timestamp");
  const svixSignature = req.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json(
      { error: "Missing svix headers" },
      { status: 400 }
    );
  }

  const body = await req.text();

  let event: { type: string; data: ClerkUserEvent };
  try {
    const wh = new Webhook(webhookSecret);
    event = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as typeof event;
  } catch (err) {
    console.error("[ClerkWebhook] Signature verification failed:", err);
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
  }

  // Handle events
  try {
    switch (event.type) {
      case "user.created": {
        const { id, ...rest } = event.data;
        await convex.mutation(api.users.getOrCreateUser, {
          clerkId: id,
          email: getPrimaryEmail(event.data),
          name: getFullName(rest as ClerkUserEvent),
        });
        console.log(`[ClerkWebhook] User created: ${id}`);
        break;
      }

      case "user.updated": {
        const { id, ...rest } = event.data;
        await convex.mutation(api.users.getOrCreateUser, {
          clerkId: id,
          email: getPrimaryEmail(event.data),
          name: getFullName(rest as ClerkUserEvent),
        });
        console.log(`[ClerkWebhook] User updated: ${id}`);
        break;
      }

      case "user.deleted": {
        const { id } = event.data;
        if (id) {
          await convex.mutation(api.users.deleteUser, { clerkId: id });
          console.log(`[ClerkWebhook] User deleted: ${id}`);
        }
        break;
      }

      default:
        console.log(`[ClerkWebhook] Unhandled event: ${event.type}`);
    }
  } catch (err) {
    console.error(`[ClerkWebhook] Error handling ${event.type}:`, err);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}
