import { getAuthUserId } from "@convex-dev/auth/server";
import { isHttpUrl } from "../lib/linksphere";
import type { Doc } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

type Ctx = QueryCtx | MutationCtx;

/** The profile owned by the signed-in user, or null when none exists yet. */
export async function getProfileByOwner(ctx: Ctx, userId: Doc<"users">["_id"]) {
  return await ctx.db
    .query("profiles")
    .withIndex("by_owner", (q) => q.eq("ownerId", userId))
    .first();
}

/** Signed-in user's profile, or a helpful error when it does not exist yet. */
export async function requireMyProfile(
  ctx: MutationCtx,
): Promise<Doc<"profiles">> {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new Error("You must be signed in.");
  const profile = await getProfileByOwner(ctx, userId);
  if (!profile) throw new Error("No profile found. Create your profile first.");
  return profile;
}

/**
 * Confirms a project/achievement belongs to the signed-in user's profile
 * before any mutation touches it.
 */
export async function requireOwnedProfile(
  ctx: MutationCtx,
  profileId: Doc<"profiles">["_id"],
): Promise<Doc<"profiles">> {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new Error("You must be signed in.");
  const profile = await ctx.db.get(profileId);
  if (!profile) throw new Error("Profile not found.");
  if (profile.ownerId !== userId)
    throw new Error("You do not own this profile.");
  return profile;
}

/** Empty string is allowed (field cleared); anything else must be a URL. */
export function validateOptionalUrl(value: string | undefined, field: string) {
  if (value && value.trim() && !isHttpUrl(value)) {
    throw new Error(`${field} must start with http:// or https://`);
  }
}

/**
The shape of a profile as the public (and the AI twin) may see it.
Hidden sections come back as null / []. `null` means unpublished.
 */
export type PublicView = {
  slug: string;
  displayName: string;
  headline?: string;
  avatarUrl?: string;
  isSample: boolean;
  twinEnabled: boolean;
  about: {
    bio?: string;
    location?: string;
    education?: string;
    interests: string[];
    goals?: string;
  } | null;
  skills: { id: string; name: string }[];
  projects: Doc<"projects">[];
  achievements: Doc<"achievements">[];
  challenges: Doc<"challenges">[];
  /**
   *Owner-reviewed translations of the prose fields. Only the public
   * profile query attaches these; the twin reads English only, so the field is
   * absent everywhere else.
   */
  translations?: {
    locale: "en" | "te" | "hi";
    headline?: string;
    bio?: string;
    goals?: string;
    education?: string;
    interests: string[];
    mode: "live" | "demo";
  }[];
  contact: {
    socials: { id: string; platform: string; url: string }[];
    resumeUrl?: string;
  } | null;
} | null;

/**
 * Single source of truth for what is public, shared by the public profile query
 * and the twin, so neither can see more than a visitor can.
 */
export function buildPublicView(
  profile: Doc<"profiles">,
  projects: Doc<"projects">[],
  achievements: Doc<"achievements">[],
  challenges: Doc<"challenges">[] = [],
  /**
   * Optional section override used by Smart Share Profiles. Callers must pass an
   * intersection with the profile's own visibility, never a widening.
   */
  sectionsOverride?: {
    about: boolean;
    skills: boolean;
    projects: boolean;
    achievements: boolean;
    challenges: boolean;
    contact: boolean;
  },
): PublicView {
  if (!profile.published) return null;
  const vis = sectionsOverride ?? profile.visibility;
  // `challenges` may be missing on profiles stored before the Proof-of-Skill
  // feature shipped - treat "not explicitly hidden" as visible.
  const showChallenges = vis.challenges !== false;
  return {
    slug: profile.slug,
    displayName: profile.displayName,
    headline: profile.headline,
    avatarUrl: profile.avatarUrl,
    isSample: profile.isSample === true,
    twinEnabled: profile.twinEnabled,
    about: vis.about
      ? {
          bio: profile.bio,
          location: profile.location,
          education: profile.education,
          interests: profile.interests,
          goals: profile.goals,
        }
      : null,
    skills: vis.skills ? profile.skills : [],
    projects: vis.projects
      ? projects
          .filter((p) => p.published)
          .sort((a, b) => a.order - b.order || b.createdAt - a.createdAt)
      : [],
    achievements: vis.achievements
      ? achievements
          .filter((a) => a.published)
          .sort((a, b) => b.occurredAt - a.occurredAt)
      : [],
    challenges: showChallenges
      ? challenges
          .filter((c) => c.published)
          .sort((a, b) => b.createdAt - a.createdAt)
      : [],
    contact: vis.contact
      ? {
          socials: profile.socials,
          resumeUrl: profile.resumePublic ? profile.resumeUrl : undefined,
        }
      : null,
  };
}
