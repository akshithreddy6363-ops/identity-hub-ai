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

    const [projects, achievements, challenges, translations] = await Promise.all([
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
      ctx.db
        .query("profileTranslations")
        .withIndex("by_profile_locale", (q) => q.eq("profileId", profile._id))
        .collect(),
    ]);

    const view = buildPublicView(profile, projects, achievements, challenges);
    if (!view) return null;

    // Reviewed translations of the prose fields, only while the About section
    // is public. Unreviewed drafts stay in the dashboard.
    const publicTranslations = view.about
      ? translations
          .filter((t) => t.reviewed)
          .map((t) => ({
            locale: t.locale,
            headline: t.headline,
            bio: t.bio,
            goals: t.goals,
            education: t.education,
            interests: t.interests,
            mode: t.mode,
          }))
      : [];

    return { ...view, translations: publicTranslations };
  },
});
