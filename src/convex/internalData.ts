import { v } from "convex/values";
import { internalQuery } from "./_generated/server";

/**
 * Server-only data loading for the AI actions (actions cannot read the
 * database directly). Internal — never callable from the client, so raw
 * profile documents (including private fields) never leave the backend.
 */
export const loadProfileBundle = internalQuery({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
    if (!profile) return null;
    const [projects, achievements] = await Promise.all([
      ctx.db
        .query("projects")
        .withIndex("by_profile", (q) => q.eq("profileId", profile._id))
        .collect(),
      ctx.db
        .query("achievements")
        .withIndex("by_profile", (q) => q.eq("profileId", profile._id))
        .collect(),
    ]);
    return { profile, projects, achievements };
  },
});
