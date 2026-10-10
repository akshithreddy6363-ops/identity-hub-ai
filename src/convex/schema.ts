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

/**
 * "verified" must only ever be set after a real verification through a
 * reliable method — never automatically, never for seeded sample data.
 */
export const verificationValidator = v.union(
  v.literal("verified"),
  v.literal("pending"),
  v.literal("self_reported"),
);
export type Verification = Infer<typeof verificationValidator>;

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
