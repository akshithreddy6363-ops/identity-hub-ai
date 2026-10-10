import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// default user roles. can add / remove based on the project as needed
export const ROLES = {
  ADMIN: "admin",
  USER: "user",
  MEMBER: "member",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.USER),
  v.literal(ROLES.MEMBER),
);
export type Role = Infer<typeof roleValidator>;

/** Which sections of a profile are visible on the public page. */
export const visibilityValidator = v.object({
  about: v.boolean(),
  skills: v.boolean(),
  projects: v.boolean(),
  achievements: v.boolean(),
  challenges: v.boolean(),
  contact: v.boolean(),
});
export type Visibility = Infer<typeof visibilityValidator>;

export const skillValidator = v.object({
  id: v.string(),
  name: v.string(),
});

export const socialValidator = v.object({
  id: v.string(),
  platform: v.string(),
  url: v.string(),
});

export const evidenceValidator = v.object({
  id: v.string(),
  label: v.string(),
  url: v.string(),
});

export const projectStatusValidator = v.union(
  v.literal("live"),
  v.literal("building"),
  v.literal("archived"),
);
export type ProjectStatus = Infer<typeof projectStatusValidator>;

export const achievementKindValidator = v.union(
  v.literal("hackathon"),
  v.literal("certificate"),
  v.literal("award"),
  v.literal("internship"),
  v.literal("course"),
  v.literal("milestone"),
);
export type AchievementKind = Infer<typeof achievementKindValidator>;

/** Set "verified" only after a real verification, never automatically. */
export const verificationValidator = v.union(
  v.literal("verified"),
  v.literal("pending"),
  v.literal("self_reported"),
);
export type Verification = Infer<typeof verificationValidator>;

/** Proof-of-Skill challenge provenance - never upgraded without real verification. */
export const challengeKindValidator = v.union(
  v.literal("coding"),
  v.literal("design"),
  v.literal("problem_solving"),
);
export const provenanceValidator = v.union(
  v.literal("user_submitted"),
  v.literal("platform_verified"),
);
export type Provenance = Infer<typeof provenanceValidator>;

export const LOCALES = ["en", "te", "hi"] as const;
export const localeValidator = v.union(
  v.literal("en"),
  v.literal("te"),
  v.literal("hi"),
);
export type Locale = Infer<typeof localeValidator>;

export const shareAudienceValidator = v.union(
  v.literal("recruiter"),
  v.literal("mentor"),
  v.literal("collaborator"),
  v.literal("custom"),
);
export type ShareAudience = Infer<typeof shareAudienceValidator>;

/** How an AI/tool result was produced - surfaced in the UI everywhere. */
export const resultModeValidator = v.union(
  v.literal("live"),
  v.literal("demo"),
);

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

const schema = defineSchema(
  {
    // default auth tables using convex auth.
    ...authTables, // do not remove or modify

    // the users table is the default users table that is brought in by the authTables
    users: defineTable({
      name: v.optional(v.string()), // name of the user. do not remove
      image: v.optional(v.string()), // image of the user. do not remove
      email: v.optional(v.string()), // email of the user. do not remove
      emailVerificationTime: v.optional(v.number()), // email verification time. do not remove
      isAnonymous: v.optional(v.boolean()), // is the user anonymous. do not remove

      role: v.optional(roleValidator), // role of the user. do not remove
    }).index("email", ["email"]), // index for the email. do not remove or modify

    /**
     * Proof-of-Skill challenges. provenance is "platform_verified" only when the
     * owner attached a platform result link, which we never re-verify.
     */
    challenges: defineTable({
      profileId: v.id("profiles"),
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
      createdAt: v.number(),
      updatedAt: v.number(),
    }).index("by_profile", ["profileId"]),

    /**
     * Smart Share Profiles: a token URL with its own section visibility. Effective
     * visibility is always the intersection with the profile's public sections.
     */
    shareLinks: defineTable({
      profileId: v.id("profiles"),
      token: v.string(),
      label: v.string(),
      audience: shareAudienceValidator,
      sections: visibilityValidator,
      isActive: v.boolean(),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_profile", ["profileId"])
      .index("by_token", ["token"]),

    /** AI-generated, owner-reviewed translations of the prose profile fields. */
    profileTranslations: defineTable({
      profileId: v.id("profiles"),
      locale: localeValidator,
      headline: v.optional(v.string()),
      bio: v.optional(v.string()),
      goals: v.optional(v.string()),
      education: v.optional(v.string()),
      interests: v.array(v.string()),
      mode: resultModeValidator,
      reviewed: v.boolean(),
      createdAt: v.number(),
      updatedAt: v.number(),
    }).index("by_profile_locale", ["profileId", "locale"]),

    /** Latest personalized skills roadmap (persisted so it survives reloads). */
    roadmaps: defineTable({
      profileId: v.id("profiles"),
      targetRole: v.string(),
      mode: resultModeValidator,
      summary: v.string(),
      gaps: v.array(v.string()),
      milestones: v.array(milestoneValidator),
      createdAt: v.number(),
    }).index("by_profile", ["profileId"]),

    /**
     * Living Portfolio integrations. Only public data is read and no credentials
     * are stored; "simulated" marks the labelled sample fallback.
     */
    integrations: defineTable({
      profileId: v.id("profiles"),
      provider: v.literal("github"),
      status: v.union(
        v.literal("connected"),
        v.literal("simulated"),
        v.literal("error"),
      ),
      handle: v.string(),
      lastSyncedAt: v.optional(v.number()),
      lastError: v.optional(v.string()),
      items: v.array(
        v.object({
          externalId: v.string(),
          name: v.string(),
          description: v.string(),
          url: v.string(),
          language: v.string(),
          stars: v.number(),
          selected: v.boolean(),
        }),
      ),
      createdAt: v.number(),
      updatedAt: v.number(),
    }).index("by_profile", ["profileId"]),

    /** One identity hub per account. ownerId is optional only for the seeded sample profile. */
    profiles: defineTable({
      ownerId: v.optional(v.id("users")),
      slug: v.string(),
      isSample: v.optional(v.boolean()),
      displayName: v.string(),
      headline: v.optional(v.string()),
      bio: v.optional(v.string()),
      location: v.optional(v.string()),
      avatarUrl: v.optional(v.string()),
      education: v.optional(v.string()),
      interests: v.array(v.string()),
      goals: v.optional(v.string()),
      skills: v.array(skillValidator),
      socials: v.array(socialValidator),
      resumeUrl: v.optional(v.string()),
      resumePublic: v.boolean(),
      published: v.boolean(),
      visibility: visibilityValidator,
      twinEnabled: v.boolean(),
      twinIntro: v.optional(v.string()),
      /** Team Finder opt-in. Optional so profiles created earlier still validate. */
      openToTeams: v.optional(v.boolean()),
      teamAvailability: v.optional(v.string()),
      teamLookingFor: v.optional(v.array(v.string())),
      /**
       * Consent for showing contact details to signed-in Team Finder members.
       * "hidden" means contact details are never served to other members.
       */
      contactPolicy: v.optional(
        v.union(v.literal("hidden"), v.literal("signed_in_members")),
      ),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_slug", ["slug"])
      .index("by_owner", ["ownerId"]),

    projects: defineTable({
      profileId: v.id("profiles"),
      title: v.string(),
      summary: v.optional(v.string()),
      problem: v.optional(v.string()),
      solution: v.optional(v.string()),
      technologies: v.array(v.string()),
      repoUrl: v.optional(v.string()),
      demoUrl: v.optional(v.string()),
      coverUrl: v.optional(v.string()),
      status: projectStatusValidator,
      role: v.optional(v.string()),
      skillLinks: v.array(v.string()),
      published: v.boolean(),
      order: v.number(),
      /** Set when the project was imported from an external provider. */
      sourceProvider: v.optional(v.string()),
      sourceExternalId: v.optional(v.string()),
      sourceUpdatedAt: v.optional(v.number()),
      createdAt: v.number(),
      updatedAt: v.number(),
    }).index("by_profile", ["profileId"]),

    achievements: defineTable({
      profileId: v.id("profiles"),
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
      createdAt: v.number(),
      updatedAt: v.number(),
    }).index("by_profile", ["profileId"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;
