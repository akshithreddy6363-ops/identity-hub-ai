import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { getProfileByOwner, requireMyProfile } from "./helpers";
import { resultModeValidator } from "./schema";
import { mutation, query } from "./_generated/server";

const practiceValidator = v.object({
  kind: v.union(
    v.literal("project"),
    v.literal("practice"),
    v.literal("course"),
  ),
  title: v.string(),
  detail: v.string(),
});

const milestoneValidator = v.object({
  title: v.string(),
  focus: v.string(),
  why: v.string(),
  skills: v.array(v.string()),
  practices: v.array(practiceValidator),
});

/** The signed-in user's most recent roadmap, or null. */
export const latest = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    const profile = await getProfileByOwner(ctx, userId);
    if (!profile) return null;
    const rows = await ctx.db
      .query("roadmaps")
      .withIndex("by_profile", (q) => q.eq("profileId", profile._id))
      .collect();
    return rows.sort((a, b) => b.createdAt - a.createdAt)[0] ?? null;
  },
});

/** Saves a roadmap (the owner reviews the result before it is stored here). */
export const save = mutation({
  args: {
    targetRole: v.string(),
    mode: resultModeValidator,
    summary: v.string(),
    gaps: v.array(v.string()),
    milestones: v.array(milestoneValidator),
  },
  handler: async (ctx, args) => {
    const profile = await requireMyProfile(ctx);
    const targetRole = args.targetRole.trim();
    if (!targetRole) throw new Error("A target role is required.");
    if (targetRole.length > 120)
      throw new Error("Target role must be 120 characters or fewer.");
    if (args.milestones.length === 0)
      throw new Error("A roadmap needs at least one milestone.");
    if (args.milestones.length > 6) throw new Error("Too many milestones.");

    const id = await ctx.db.insert("roadmaps", {
      profileId: profile._id,
      targetRole,
      mode: args.mode,
      summary: args.summary.trim().slice(0, 1200),
      gaps: args.gaps
        .map((g) => g.trim())
        .filter(Boolean)
        .slice(0, 8),
      milestones: args.milestones.slice(0, 6),
      createdAt: Date.now(),
    });

    // Keep only the three most recent roadmaps for this profile.
    const rows = await ctx.db
      .query("roadmaps")
      .withIndex("by_profile", (q) => q.eq("profileId", profile._id))
      .collect();
    const stale = rows.sort((a, b) => b.createdAt - a.createdAt).slice(3);
    for (const row of stale) await ctx.db.delete(row._id);
    return id;
  },
});
