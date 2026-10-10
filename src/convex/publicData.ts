import { v } from "convex/values";
import { buildPublicView } from "./helpers";
import { query } from "./_generated/server";

/**
 * Public, unauthenticated read of a published profile. Delegates to
 * buildPublicView — the same function the AI Personal Twin uses — so the twin
 * can never surface information a visitor is not allowed to see.
 */
export const getPublishedProfile = query({
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

    return buildPublicView(profile, projects, achievements);
  },
});
