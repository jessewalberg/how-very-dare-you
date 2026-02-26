import { QueryCtx, MutationCtx } from "../_generated/server";

export async function requireAdmin(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
    .first();

  if (!user) throw new Error("User not found");
  if (!user.isAdmin) throw new Error("Admin access required");

  return user;
}
