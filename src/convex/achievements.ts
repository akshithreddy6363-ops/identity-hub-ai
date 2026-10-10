import { v } from "convex/values";
import {
  getProfileByOwner,
  requireMyProfile,
  requireOwnedProfile,
  validateOptionalUrl,
} from "./helpers";
import { getAuthUserId } from "@convex-dev/auth/server";
import { achievementKindValidator, evidenceValidator, verificationValidator } from "./schema";
import { mutation, query } from "./_generated/server";

/** All achievements on the signed-in user's profile (drafts included). */
export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];
    const profile = await getProfileByOwner(ctx, userId);
    if (!profile) return [];
    const achievements = await ctx.db
      .query("achievements")
      .withIndex("by_profile", (q) => q.eq("profileId", profile._id))
      .collect();
    return achievements.sort((a, b) => b.occurredAt - a.occurredAt);
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    kind: achievementKindValidator,
    issuer: v.optional(v.string()),
    occurredAt: v.number(),
    description: v.optional(v.string()),
    evidence: v.array(evidenceValidator),
    verification: verificationValidator,
    verificationNote: v.optional(v.string()),
    skillLinks: v.array(v.string()),
    published: v.boolean(),
  },
  handler: async (ctx, args) => {
    const profile = await requireMyProfile(ctx);
    const title = args.title.trim();
    if (!title) throw new Error("Achievement title is required.");
    if (title.length > 120) throw new Error("Title must be 120 characters or fewer.");
    if (!Number.isFinite(args.occurredAt)) throw new Error("A valid date is required.");
    for (const e of args.evidence) validateOptionalUrl(e.url, `Evidence "${e.label}"`);
    if (args.verification === "verified" && args.evidence.length === 0) {
      throw new Error(
        "Verified achievements need at least one supporting evidence link.",
      );
    }

    const now = Date.now();
    return await ctx.db.insert("achievements", {
      profileId: profile._id,
      title,
      kind: args.kind,
      issuer: args.issuer?.trim() || undefined,
      occurredAt: args.occurredAt,
      description: args.description?.trim() || undefined,
      evidence: args.evidence.filter((e) => e.url.trim()),
      verification: args.verification,
      verificationNote: args.verificationNote?.trim() || undefined,
      skillLinks: args.skillLinks,
      published: args.published,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("achievements"),
    title: v.string(),
    kind: achievementKindValidator,
    issuer: v.optional(v.string()),
    occurredAt: v.number(),
    description: v.optional(v.string()),
    evidence: v.array(evidenceValidator),
    verification: verificationValidator,
    verificationNote: v.optional(v.string()),
    skillLinks: v.array(v.string()),
    published: v.boolean(),
  },
  handler: async (ctx, args) => {
    const achievement = await ctx.db.get(args.id);
    if (!achievement) throw new Error("Achievement not found.");
    await requireOwnedProfile(ctx, achievement.profileId);
    const title = args.title.trim();
    if (!title) throw new Error("Achievement title is required.");
    if (title.length > 120) throw new Error("Title must be 120 characters or fewer.");
    if (!Number.isFinite(args.occurredAt)) throw new Error("A valid date is required.");
    for (const e of args.evidence) validateOptionalUrl(e.url, `Evidence "${e.label}"`);
    if (args.verification === "verified" && args.evidence.length === 0) {
      throw new Error(
        "Verified achievements need at least one supporting evidence link.",
      );
    }

    await ctx.db.patch(args.id, {
      title,
      kind: args.kind,
      issuer: args.issuer?.trim() || undefined,
      occurredAt: args.occurredAt,
      description: args.description?.trim() || undefined,
      evidence: args.evidence.filter((e) => e.url.trim()),
      verification: args.verification,
      verificationNote: args.verificationNote?.trim() || undefined,
      skillLinks: args.skillLinks,
      published: args.published,
      updatedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("achievements") },
  handler: async (ctx, { id }) => {
    const achievement = await ctx.db.get(id);
    if (!achievement) return;
    await requireOwnedProfile(ctx, achievement.profileId);
    await ctx.db.delete(id);
  },
});
