import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import {
  getProfileByOwner,
  requireMyProfile,
  requireOwnedProfile,
  validateOptionalUrl,
} from "./helpers";
import { projectStatusValidator } from "./schema";
import { mutation, query } from "./_generated/server";

/** All projects on the signed-in user's profile (drafts included). */
export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];
    const profile = await getProfileByOwner(ctx, userId);
    if (!profile) return [];
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_profile", (q) => q.eq("profileId", profile._id))
      .collect();
    return projects.sort(
      (a, b) => a.order - b.order || b.createdAt - a.createdAt,
    );
  },
});

export const create = mutation({
  args: {
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
  },
  handler: async (ctx, args) => {
    const profile = await requireMyProfile(ctx);
    const title = args.title.trim();
    if (!title) throw new Error("Project title is required.");
    if (title.length > 100)
      throw new Error("Title must be 100 characters or fewer.");
    validateOptionalUrl(args.repoUrl, "Repository link");
    validateOptionalUrl(args.demoUrl, "Live demo link");
    validateOptionalUrl(args.coverUrl, "Cover image");

    const now = Date.now();
    return await ctx.db.insert("projects", {
      profileId: profile._id,
      title,
      summary: args.summary?.trim() || undefined,
      problem: args.problem?.trim() || undefined,
      solution: args.solution?.trim() || undefined,
      technologies: args.technologies
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 20),
      repoUrl: args.repoUrl?.trim() || undefined,
      demoUrl: args.demoUrl?.trim() || undefined,
      coverUrl: args.coverUrl?.trim() || undefined,
      status: args.status,
      role: args.role?.trim() || undefined,
      skillLinks: args.skillLinks,
      published: args.published,
      order: -now,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("projects"),
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
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.id);
    if (!project) throw new Error("Project not found.");
    await requireOwnedProfile(ctx, project.profileId);
    const title = args.title.trim();
    if (!title) throw new Error("Project title is required.");
    if (title.length > 100)
      throw new Error("Title must be 100 characters or fewer.");
    validateOptionalUrl(args.repoUrl, "Repository link");
    validateOptionalUrl(args.demoUrl, "Live demo link");
    validateOptionalUrl(args.coverUrl, "Cover image");

    await ctx.db.patch(args.id, {
      title,
      summary: args.summary?.trim() || undefined,
      problem: args.problem?.trim() || undefined,
      solution: args.solution?.trim() || undefined,
      technologies: args.technologies
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 20),
      repoUrl: args.repoUrl?.trim() || undefined,
      demoUrl: args.demoUrl?.trim() || undefined,
      coverUrl: args.coverUrl?.trim() || undefined,
      status: args.status,
      role: args.role?.trim() || undefined,
      skillLinks: args.skillLinks,
      published: args.published,
      updatedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("projects") },
  handler: async (ctx, { id }) => {
    const project = await ctx.db.get(id);
    if (!project) return;
    await requireOwnedProfile(ctx, project.profileId);
    await ctx.db.delete(id);
  },
});
