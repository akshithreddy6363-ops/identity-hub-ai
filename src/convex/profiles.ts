import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { sanitizeSlug } from "../lib/linksphere";
import {
  getProfileByOwner,
  requireMyProfile,
  validateOptionalUrl,
} from "./helpers";
import { skillValidator, socialValidator, visibilityValidator } from "./schema";
import { mutation, query } from "./_generated/server";

/** The signed-in user's profile, or null before onboarding. */
export const myProfile = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    return await getProfileByOwner(ctx, userId);
  },
});

/** True when a public slug is unused (or is the user's own slug). */
export const slugAvailable = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const clean = sanitizeSlug(slug);
    if (clean.length < 3) return false;
    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_slug", (q) => q.eq("slug", clean))
      .first();
    if (!existing) return true;
    const userId = await getAuthUserId(ctx);
    return existing.ownerId === userId;
  },
});

function uniqueSlug(
  base: string,
  taken: (clean: string) => Promise<{ ownerId?: string } | null>,
  ownerId?: string,
): Promise<string> {
  return (async () => {
    const root = sanitizeSlug(base) || "profile";
    let candidate = root;
    for (let i = 0; i < 50; i++) {
      const existing = await taken(candidate);
      if (!existing || existing.ownerId === ownerId) return candidate;
      candidate = `${root}-${Math.random().toString(36).slice(2, 6)}`;
    }
    return `${root}-${Date.now().toString(36)}`;
  })();
}

/** Creates the signed-in user's profile on first visit to the dashboard. */
export const ensureProfile = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("You must be signed in.");
    const existing = await getProfileByOwner(ctx, userId);
    if (existing) return existing;

    const user = await ctx.db.get(userId);
    const baseName = user?.name || user?.email?.split("@")[0] || "my-profile";
    const slug = await uniqueSlug(
      baseName,
      (clean) =>
        ctx.db
          .query("profiles")
          .withIndex("by_slug", (q) => q.eq("slug", clean))
          .first(),
      userId,
    );
    const now = Date.now();
    const profileId = await ctx.db.insert("profiles", {
      ownerId: userId,
      slug,
      displayName: user?.name || user?.email?.split("@")[0] || "New profile",
      interests: [],
      skills: [],
      socials: [],
      resumePublic: false,
      published: false,
      visibility: {
        about: true,
        skills: true,
        projects: true,
        achievements: true,
        challenges: true,
        contact: true,
      },
      twinEnabled: true,
      openToTeams: false,
      teamLookingFor: [],
      contactPolicy: "hidden",
      createdAt: now,
      updatedAt: now,
    });
    return (await ctx.db.get(profileId))!;
  },
});

export const updateProfile = mutation({
  args: {
    slug: v.optional(v.string()),
    displayName: v.optional(v.string()),
    headline: v.optional(v.string()),
    bio: v.optional(v.string()),
    location: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    education: v.optional(v.string()),
    goals: v.optional(v.string()),
    interests: v.optional(v.array(v.string())),
    skills: v.optional(v.array(skillValidator)),
    socials: v.optional(v.array(socialValidator)),
    resumeUrl: v.optional(v.string()),
    resumePublic: v.optional(v.boolean()),
    published: v.optional(v.boolean()),
    visibility: v.optional(visibilityValidator),
    twinEnabled: v.optional(v.boolean()),
    twinIntro: v.optional(v.string()),
    openToTeams: v.optional(v.boolean()),
    teamAvailability: v.optional(v.string()),
    teamLookingFor: v.optional(v.array(v.string())),
    contactPolicy: v.optional(
      v.union(v.literal("hidden"), v.literal("signed_in_members")),
    ),
  },
  handler: async (ctx, args) => {
    const profile = await requireMyProfile(ctx);
    const patch: Partial<typeof profile> = { updatedAt: Date.now() };

    if (args.slug !== undefined) {
      const clean = sanitizeSlug(args.slug);
      if (clean.length < 3) {
        throw new Error(
          "Public URL must be at least 3 characters (letters, numbers, dashes).",
        );
      }
      if (clean !== profile.slug) {
        const taken = await ctx.db
          .query("profiles")
          .withIndex("by_slug", (q) => q.eq("slug", clean))
          .first();
        if (taken) throw new Error("That public URL is already taken.");
        patch.slug = clean;
      }
    }
    if (args.displayName !== undefined) {
      const name = args.displayName.trim();
      if (!name) throw new Error("Name is required.");
      if (name.length > 80)
        throw new Error("Name must be 80 characters or fewer.");
      patch.displayName = name;
    }
    if (args.headline !== undefined) {
      if (args.headline.length > 160)
        throw new Error("Headline must be 160 characters or fewer.");
      patch.headline = args.headline.trim();
    }
    if (args.bio !== undefined) {
      if (args.bio.length > 2000)
        throw new Error("Bio must be 2,000 characters or fewer.");
      patch.bio = args.bio;
    }
    if (args.location !== undefined) patch.location = args.location.trim();
    if (args.education !== undefined) patch.education = args.education.trim();
    if (args.goals !== undefined) patch.goals = args.goals;
    if (args.interests !== undefined) {
      const interests = args.interests.map((i) => i.trim()).filter(Boolean);
      if (interests.length > 30) throw new Error("Too many interests.");
      patch.interests = interests;
    }
    if (args.skills !== undefined) {
      const skills = args.skills.filter((s) => s.name.trim());
      if (skills.length > 60) throw new Error("Too many skills.");
      patch.skills = skills;
    }
    if (args.socials !== undefined) {
      for (const s of args.socials)
        validateOptionalUrl(s.url, `${s.platform} link`);
      patch.socials = args.socials.filter((s) => s.url.trim());
    }
    if (args.resumeUrl !== undefined) {
      validateOptionalUrl(args.resumeUrl, "Resume link");
      patch.resumeUrl = args.resumeUrl.trim();
    }
    if (args.avatarUrl !== undefined) {
      validateOptionalUrl(args.avatarUrl, "Avatar image");
      patch.avatarUrl = args.avatarUrl.trim();
    }
    if (args.twinIntro !== undefined) {
      if (args.twinIntro.length > 600)
        throw new Error("Twin instructions must be 600 characters or fewer.");
      patch.twinIntro = args.twinIntro;
    }
    if (args.openToTeams !== undefined) patch.openToTeams = args.openToTeams;
    if (args.teamAvailability !== undefined) {
      if (args.teamAvailability.length > 120)
        throw new Error("Availability must be 120 characters or fewer.");
      patch.teamAvailability = args.teamAvailability.trim();
    }
    if (args.teamLookingFor !== undefined) {
      const looking = args.teamLookingFor.map((s) => s.trim()).filter(Boolean);
      if (looking.length > 20)
        throw new Error("Too many teammate preferences.");
      patch.teamLookingFor = looking;
    }
    if (args.contactPolicy !== undefined)
      patch.contactPolicy = args.contactPolicy;
    if (args.resumePublic !== undefined) patch.resumePublic = args.resumePublic;
    if (args.published !== undefined) patch.published = args.published;
    if (args.visibility !== undefined) patch.visibility = args.visibility;
    if (args.twinEnabled !== undefined) patch.twinEnabled = args.twinEnabled;

    await ctx.db.patch(profile._id, patch);
    return (await ctx.db.get(profile._id))!;
  },
});

/** Permanently removes the signed-in user's own profile and everything on it. */
export const deleteMyData = mutation({
  args: {},
  handler: async (ctx) => {
    const profile = await requireMyProfile(ctx);
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_profile", (q) => q.eq("profileId", profile._id))
      .collect();
    const achievements = await ctx.db
      .query("achievements")
      .withIndex("by_profile", (q) => q.eq("profileId", profile._id))
      .collect();
    for (const doc of [...projects, ...achievements]) {
      await ctx.db.delete(doc._id);
    }
    await ctx.db.delete(profile._id);
  },
});
