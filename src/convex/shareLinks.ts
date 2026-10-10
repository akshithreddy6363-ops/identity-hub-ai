import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { buildPublicView, getProfileByOwner, requireMyProfile } from "./helpers";
import { shareAudienceValidator, visibilityValidator } from "./schema";
import { mutation, query } from "./_generated/server";

/**
 * Smart Share Profiles.
 *
 * A share link is a *narrowing* of a profile: its effective visibility is the
 * intersection of the profile's own public sections and the link's sections, so
 * a share link can never reveal something the public profile hides. Because of
 * that, token secrecy is a convenience rather than a security boundary —
 * everything reachable through a link is already public.
 */
function token(): string {
  return Array.from({ length: 3 }, () =>
    Math.random().toString(36).slice(2, 8),
  ).join("");
}

type Sections = {
  about: boolean;
  skills: boolean;
  projects: boolean;
  achievements: boolean;
  challenges: boolean;
  contact: boolean;
};

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];
    const profile = await getProfileByOwner(ctx, userId);
    if (!profile) return [];
    const links = await ctx.db
      .query("shareLinks")
      .withIndex("by_profile", (q) => q.eq("profileId", profile._id))
      .collect();
    return links.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const create = mutation({
  args: {
    label: v.string(),
    audience: shareAudienceValidator,
    sections: visibilityValidator,
  },
  handler: async (ctx, args) => {
    const profile = await requireMyProfile(ctx);
    const label = args.label.trim();
    if (!label) throw new Error("Give this link a label so you can recognise it.");
    if (label.length > 60) throw new Error("Label must be 60 characters or fewer.");
    if (!Object.values(args.sections).some(Boolean)) {
      throw new Error("Select at least one section to share.");
    }
    const now = Date.now();
    return await ctx.db.insert("shareLinks", {
      profileId: profile._id,
      token: token(),
      label,
      audience: args.audience,
      sections: args.sections,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("shareLinks"),
    label: v.optional(v.string()),
    audience: v.optional(shareAudienceValidator),
    sections: v.optional(visibilityValidator),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, { id, ...patch }) => {
    const profile = await requireMyProfile(ctx);
    const link = await ctx.db.get(id);
    if (!link || link.profileId !== profile._id) {
      throw new Error("Share link not found.");
    }
    await ctx.db.patch(id, {
      ...(patch.label !== undefined ? { label: patch.label.trim().slice(0, 60) } : {}),
      ...(patch.audience !== undefined ? { audience: patch.audience } : {}),
      ...(patch.sections !== undefined ? { sections: patch.sections } : {}),
      ...(patch.isActive !== undefined ? { isActive: patch.isActive } : {}),
      updatedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("shareLinks") },
  handler: async (ctx, { id }) => {
    const profile = await requireMyProfile(ctx);
    const link = await ctx.db.get(id);
    if (!link || link.profileId !== profile._id) return;
    await ctx.db.delete(id);
  },
});

/**
 * Public resolution of a share link. Returns null for unknown/revoked links or
 * unpublished profiles, and only ever serves the intersection of the link's
 * sections with the profile's own public sections.
 */
export const getSharedProfile = query({
  args: { token: v.string() },
  handler: async (ctx, { token: rawToken }) => {
    const clean = rawToken.trim().toLowerCase();
    if (!clean) return null;
    const link = await ctx.db
      .query("shareLinks")
      .withIndex("by_token", (q) => q.eq("token", clean))
      .first();
    if (!link || !link.isActive) return null;

    const profile = await ctx.db.get(link.profileId);
    if (!profile || !profile.published) return null;

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

    const profileSections = profile.visibility as Sections;
    const linkSections = link.sections as Sections;
    const keys = Object.keys(linkSections) as (keyof Sections)[];
    const effective = keys.reduce((acc, key) => {
      // Intersection: the link can only narrow what the profile already shows.
      const profileAllows = profileSections[key] !== false;
      acc[key] = profileAllows && linkSections[key] === true;
      return acc;
    }, {} as Sections);

    const view = buildPublicView(
      profile,
      projects,
      achievements,
      challenges,
      effective,
    );
    if (!view) return null;

    return {
      label: link.label,
      audience: link.audience,
      sections: effective,
      view,
    };
  },
});
