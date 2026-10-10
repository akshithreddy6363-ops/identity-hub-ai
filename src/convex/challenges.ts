import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import {
  getProfileByOwner,
  requireMyProfile,
  requireOwnedProfile,
  validateOptionalUrl,
} from "./helpers";
import {
  challengeKindValidator,
  evidenceValidator,
  provenanceValidator,
} from "./schema";
import { mutation, query } from "./_generated/server";

/**
 * Proof-of-Skill challenges.
 *
 * Provenance rules (enforced here and stated in the UI):
 *  - "platform_verified" requires a submission URL on the challenge, because the
 *    claim rests on a real platform result link the owner attached;
 *  - LinkSphere does NOT re-verify external results, so the badge copy always
 *    says the owner confirmed it and the app did not.
 */

/** All challenges on the signed-in user's profile (drafts included). */
export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];
    const profile = await getProfileByOwner(ctx, userId);
    if (!profile) return [];
    const challenges = await ctx.db
      .query("challenges")
      .withIndex("by_profile", (q) => q.eq("profileId", profile._id))
      .collect();
    return challenges.sort((a, b) => b.createdAt - a.createdAt);
  },
});

const args = {
  title: v.string(),
  kind: challengeKindValidator,
  platform: v.optional(v.string()),
  difficulty: v.optional(v.string()),
  description: v.optional(v.string()),
  submissionUrl: v.optional(v.string()),
  outcome: v.optional(v.string()),
  evidence: v.array(evidenceValidator),
  provenance: provenanceValidator,
  provenanceNote: v.optional(v.string()),
  skillLinks: v.array(v.string()),
  published: v.boolean(),
};

function validateChallenge(input: {
  title: string;
  kind: string;
  platform?: string;
  difficulty?: string;
  description?: string;
  submissionUrl?: string;
  outcome?: string;
  evidence: { id: string; label: string; url: string }[];
  provenance: string;
  provenanceNote?: string;
  skillLinks: string[];
}) {
  const title = input.title.trim();
  if (!title) throw new Error("Challenge title is required.");
  if (title.length > 120) throw new Error("Title must be 120 characters or fewer.");
  if (input.description && input.description.length > 1000)
    throw new Error("Description must be 1,000 characters or fewer.");
  validateOptionalUrl(input.submissionUrl, "Submission link");
  for (const e of input.evidence) validateOptionalUrl(e.url, `Evidence "${e.label}"`);
  if (input.provenance === "platform_verified") {
    if (!input.submissionUrl?.trim()) {
      throw new Error(
        "A platform-verified challenge needs the platform submission/result link.",
      );
    }
    if (input.evidence.filter((e) => e.url.trim()).length === 0) {
      throw new Error(
        "A platform-verified challenge needs at least one evidence link.",
      );
    }
  }
  return title;
}

export const create = mutation({
  args,
  handler: async (ctx, input) => {
    const profile = await requireMyProfile(ctx);
    const title = validateChallenge(input);
    const now = Date.now();
    return await ctx.db.insert("challenges", {
      profileId: profile._id,
      title,
      kind: input.kind as "coding" | "design" | "problem_solving",
      platform: input.platform?.trim() || undefined,
      difficulty: input.difficulty?.trim() || undefined,
      description: input.description?.trim() || undefined,
      submissionUrl: input.submissionUrl?.trim() || undefined,
      outcome: input.outcome?.trim() || undefined,
      evidence: input.evidence.filter((e) => e.url.trim()),
      provenance: input.provenance as "user_submitted" | "platform_verified",
      provenanceNote: input.provenanceNote?.trim() || undefined,
      skillLinks: input.skillLinks,
      published: input.published,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: { id: v.id("challenges"), ...args },
  handler: async (ctx, { id, ...input }) => {
    const challenge = await ctx.db.get(id);
    if (!challenge) throw new Error("Challenge not found.");
    await requireOwnedProfile(ctx, challenge.profileId);
    const title = validateChallenge(input);
    await ctx.db.patch(id, {
      title,
      kind: input.kind as "coding" | "design" | "problem_solving",
      platform: input.platform?.trim() || undefined,
      difficulty: input.difficulty?.trim() || undefined,
      description: input.description?.trim() || undefined,
      submissionUrl: input.submissionUrl?.trim() || undefined,
      outcome: input.outcome?.trim() || undefined,
      evidence: input.evidence.filter((e) => e.url.trim()),
      provenance: input.provenance as "user_submitted" | "platform_verified",
      provenanceNote: input.provenanceNote?.trim() || undefined,
      skillLinks: input.skillLinks,
      published: input.published,
      updatedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("challenges") },
  handler: async (ctx, { id }) => {
    const challenge = await ctx.db.get(id);
    if (!challenge) return;
    await requireOwnedProfile(ctx, challenge.profileId);
    await ctx.db.delete(id);
  },
});
