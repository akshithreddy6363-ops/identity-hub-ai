import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { TEAM_FINDER_NOTE, normalizeSkill } from "../lib/linksphere";
import { query } from "./_generated/server";

/**
 * AI Team Finder (deterministic matching — labelled as such in the UI).
 *
 * Privacy model:
 *  - only signed-in members can call this at all (returns `null` otherwise);
 *  - only profiles that are PUBLISHED and explicitly opted in (`openToTeams`)
 *    are ever returned;
 *  - contact details are included only when the owner set
 *    `contactPolicy: "signed_in_members"` — explicit consent, revocable in
 *    Settings, and never shown to signed-out visitors.
 */
export const candidates = query({
  args: { skillFilter: v.optional(v.string()) },
  handler: async (ctx, { skillFilter }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;

    const viewer = await ctx.db
      .query("profiles")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .first();

    const viewerSkills = new Set(
      (viewer?.skills ?? []).map((s) => normalizeSkill(s.name)),
    );
    const viewerNeeds = (viewer?.teamLookingFor ?? []).map(normalizeSkill);
    const viewerInterests = new Set(
      (viewer?.interests ?? []).map(normalizeSkill),
    );
    const filter = skillFilter?.trim() ? normalizeSkill(skillFilter) : null;

    const all = await ctx.db.query("profiles").collect();

    const results = [];
    for (const candidate of all) {
      if (!candidate.published) continue;
      if (candidate.openToTeams !== true) continue;
      if (candidate.ownerId === userId) continue;

      const skills = candidate.skills.map((s) => s.name);
      if (
        filter &&
        !skills.some((s) => normalizeSkill(s).includes(filter)) &&
        !normalizeSkill(candidate.headline ?? "").includes(filter)
      ) {
        continue;
      }

      const complementarySkills = skills.filter(
        (s) => !viewerSkills.has(normalizeSkill(s)),
      );
      const matchedNeeds = complementarySkills.filter((s) =>
        viewerNeeds.includes(normalizeSkill(s)),
      );
      const sharedInterests = candidate.interests.filter((i) =>
        viewerInterests.has(normalizeSkill(i)),
      );

      // Deterministic score: skills you asked for, shared interests, then
      // breadth of complementary skills.
      const score =
        matchedNeeds.length * 3 +
        sharedInterests.length * 2 +
        complementarySkills.length;

      const sharesContact = candidate.contactPolicy === "signed_in_members";

      results.push({
        slug: candidate.slug,
        displayName: candidate.displayName,
        headline: candidate.headline,
        avatarUrl: candidate.avatarUrl,
        skills,
        complementarySkills: complementarySkills.slice(0, 8),
        matchedNeeds,
        sharedInterests: sharedInterests.slice(0, 6),
        availability: candidate.teamAvailability,
        lookingFor: candidate.teamLookingFor ?? [],
        goals: candidate.goals,
        education: candidate.education,
        score,
        /** Contact details are only present with the owner's explicit consent. */
        contact: sharesContact ? candidate.socials : null,
        contactConsent: sharesContact,
      });
    }

    results.sort((a, b) => b.score - a.score || a.displayName.localeCompare(b.displayName));

    return {
      note: TEAM_FINDER_NOTE,
      hasViewerProfile: viewer !== null,
      viewerNeeds: viewer?.teamLookingFor ?? [],
      candidates: results.slice(0, 40),
    };
  },
});
