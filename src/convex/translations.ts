import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { getProfileByOwner, requireMyProfile } from "./helpers";
import { localeValidator, resultModeValidator } from "./schema";
import { mutation, query } from "./_generated/server";

/**
 * Multilingual profiles.
 *
 * Translations are produced by the AI action, then the owner reviews them here.
 * `reviewed` records whether the owner has looked at the text before it is
 * shown publicly, and `mode` preserves whether a model or the demo fallback
 * produced it — the public page labels both.
 */
export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];
    const profile = await getProfileByOwner(ctx, userId);
    if (!profile) return [];
    return await ctx.db
      .query("profileTranslations")
      .withIndex("by_profile_locale", (q) => q.eq("profileId", profile._id))
      .collect();
  },
});

export const save = mutation({
  args: {
    locale: localeValidator,
    headline: v.optional(v.string()),
    bio: v.optional(v.string()),
    goals: v.optional(v.string()),
    education: v.optional(v.string()),
    interests: v.array(v.string()),
    mode: resultModeValidator,
    reviewed: v.boolean(),
  },
  handler: async (ctx, args) => {
    const profile = await requireMyProfile(ctx);
    if (args.locale === "en") {
      throw new Error("English is the original profile language.");
    }
    if ((args.bio?.length ?? 0) > 2400) {
      throw new Error("Translated bio must be 2,400 characters or fewer.");
    }
    const existing = await ctx.db
      .query("profileTranslations")
      .withIndex("by_profile_locale", (q) =>
        q.eq("profileId", profile._id).eq("locale", args.locale),
      )
      .first();
    const now = Date.now();
    const payload = {
      headline: args.headline?.trim() || undefined,
      bio: args.bio?.trim() || undefined,
      goals: args.goals?.trim() || undefined,
      education: args.education?.trim() || undefined,
      interests: args.interests.map((i) => i.trim()).filter(Boolean).slice(0, 30),
      mode: args.mode,
      reviewed: args.reviewed,
      updatedAt: now,
    };
    if (existing) {
      await ctx.db.patch(existing._id, payload);
      return existing._id;
    }
    return await ctx.db.insert("profileTranslations", {
      profileId: profile._id,
      locale: args.locale,
      createdAt: now,
      ...payload,
    });
  },
});

export const remove = mutation({
  args: { locale: localeValidator },
  handler: async (ctx, { locale }) => {
    const profile = await requireMyProfile(ctx);
    const existing = await ctx.db
      .query("profileTranslations")
      .withIndex("by_profile_locale", (q) =>
        q.eq("profileId", profile._id).eq("locale", locale),
      )
      .first();
    if (existing) await ctx.db.delete(existing._id);
  },
});
