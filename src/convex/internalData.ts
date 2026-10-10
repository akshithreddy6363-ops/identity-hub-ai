import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { internalQuery } from "./_generated/server";

/**
 * Server-only data loading for the AI actions, which can't query the database
 * directly. These are internal functions, so raw profile documents never reach
 * the client.
 */
export const loadProfileBundle = internalQuery({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
    if (!profile) return null;
    const [projects, achievements, challenges] = await Promise.all([
      ctx.db
        .query("projects")
        .withIndex("by_profile", (q) => q.eq("profileId", profile._id))
        .collect(),
      ctx.db
        .query("achievements")
        .withIndex("by_profile", (q) => q.eq("profileId", profile._id))
        .collect(),
      ctx.db
        .query("challenges")
        .withIndex("by_profile", (q) => q.eq("profileId", profile._id))
        .collect(),
    ]);
    return { profile, projects, achievements, challenges };
  },
});

/** The signed-in owner's own bundle (used by AI features that read drafts). */
export const loadMyBundle = internalQuery({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .first();
    if (!profile) return null;
    const [projects, achievements, challenges] = await Promise.all([
      ctx.db
        .query("projects")
        .withIndex("by_profile", (q) => q.eq("profileId", profile._id))
        .collect(),
      ctx.db
        .query("achievements")
        .withIndex("by_profile", (q) => q.eq("profileId", profile._id))
        .collect(),
      ctx.db
        .query("challenges")
        .withIndex("by_profile", (q) => q.eq("profileId", profile._id))
        .collect(),
    ]);
    return { profile, projects, achievements, challenges };
  },
});
