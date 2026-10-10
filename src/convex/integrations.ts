import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { getProfileByOwner, requireMyProfile } from "./helpers";
import { action, mutation, query } from "./_generated/server";

/**
 * Living Portfolio integrations (GitHub).
 *
 * Only PUBLIC repository data is read, and no external credentials or tokens are
 * ever stored — the user authorises by giving a public username. If GitHub is
 * unreachable (network, rate limit), the UI can fall back to clearly-labelled
 * SIMULATED sample repos: those rows carry the "simulated" status and every
 * imported project summary is prefixed so a simulated import can never be
 * mistaken for a real sync.
 */

const SAMPLE_NOTE = "[Simulated sample data — not fetched from GitHub] ";

const SAMPLE_REPOS = [
  {
    externalId: "simulated-cropsense",
    name: "crop-sense",
    description: "Offline-friendly crop disease detection demo (simulated sample entry).",
    url: "https://github.com",
    language: "Python",
    stars: 84,
    selected: false,
  },
  {
    externalId: "simulated-transitpulse",
    name: "transit-pulse",
    description: "Real-time transit dashboard experiments (simulated sample entry).",
    url: "https://github.com",
    language: "TypeScript",
    stars: 51,
    selected: false,
  },
  {
    externalId: "simulated-studysphere",
    name: "study-sphere",
    description: "Collaborative study rooms prototype (simulated sample entry).",
    url: "https://github.com",
    language: "TypeScript",
    stars: 23,
    selected: false,
  },
];

interface RepoItem {
  externalId: string;
  name: string;
  description: string;
  url: string;
  language: string;
  stars: number;
  selected: boolean;
}

function normaliseHandle(input: string): string {
  return input
    .trim()
    .replace(/^@/, "")
    .replace(/^https?:\/\/(www\.)?github\.com\//i, "")
    .split(/[/?#]/)[0]
    .trim();
}

export const mine = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    const profile = await getProfileByOwner(ctx, userId);
    if (!profile) return null;
    return await ctx.db
      .query("integrations")
      .withIndex("by_profile", (q) => q.eq("profileId", profile._id))
      .first();
  },
});

/** Fetches PUBLIC repos for a GitHub username. No credentials involved. */
export const syncGithub = action({
  args: { handle: v.string() },
  handler: async (
    _ctx,
    { handle },
  ): Promise<
    | { ok: true; mode: "live"; handle: string; items: RepoItem[] }
    | { ok: false; error: string; simulatedAvailable: true }
  > => {
    const login = normaliseHandle(handle);
    if (!login) {
      return {
        ok: false,
        error: "Enter a GitHub username.",
        simulatedAvailable: true,
      };
    }
    try {
      const response = await fetch(
        `https://api.github.com/users/${encodeURIComponent(login)}/repos?sort=updated&per_page=30&type=owner`,
        {
          headers: {
            Accept: "application/vnd.github+json",
            "User-Agent": "LinkSphereAI",
          },
        },
      );
      if (!response.ok) {
        return {
          ok: false,
          error:
            response.status === 404
              ? `GitHub has no user called "${login}".`
              : `GitHub returned ${response.status}. Public API limits may apply — try again later.`,
          simulatedAvailable: true,
        };
      }
      const repos = (await response.json()) as Array<{
        id: number;
        name: string;
        description: string | null;
        html_url: string;
        language: string | null;
        stargazers_count: number;
        fork: boolean;
      }>;
      const items: RepoItem[] = repos
        .filter((repo) => !repo.fork)
        .slice(0, 30)
        .map((repo) => ({
          externalId: String(repo.id),
          name: repo.name,
          description: repo.description ?? "",
          url: repo.html_url,
          language: repo.language ?? "",
          stars: repo.stargazers_count ?? 0,
          selected: false,
        }));
      if (items.length === 0) {
        return {
          ok: false,
          error: `No public repositories found for "${login}".`,
          simulatedAvailable: true,
        };
      }
      return { ok: true, mode: "live", handle: login, items };
    } catch {
      return {
        ok: false,
        error:
          "Could not reach GitHub from the server. You can load clearly-labelled simulated samples instead.",
        simulatedAvailable: true,
      };
    }
  },
});

/** Explicitly-labelled simulated fallback for offline/rate-limited demos. */
export const loadSimulated = action({
  args: { handle: v.optional(v.string()) },
  handler: async (
    _ctx,
    { handle },
  ): Promise<{ ok: true; mode: "simulated"; handle: string; items: RepoItem[] }> => {
    const login = normaliseHandle(handle ?? "") || "sample-user";
    return {
      ok: true,
      mode: "simulated",
      handle: login,
      items: SAMPLE_REPOS.map((repo) => ({ ...repo })),
    };
  },
});

export const saveSync = mutation({
  args: {
    handle: v.string(),
    status: v.union(
      v.literal("connected"),
      v.literal("simulated"),
      v.literal("error"),
    ),
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
    lastError: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const profile = await requireMyProfile(ctx);
    const handle = normaliseHandle(args.handle);
    if (!handle) throw new Error("A GitHub username is required.");
    const existing = await ctx.db
      .query("integrations")
      .withIndex("by_profile", (q) => q.eq("profileId", profile._id))
      .first();
    const now = Date.now();
    const payload = {
      provider: "github" as const,
      status: args.status,
      handle,
      lastSyncedAt: now,
      lastError: args.lastError,
      items: args.items.slice(0, 40),
      updatedAt: now,
    };
    if (existing) {
      await ctx.db.patch(existing._id, payload);
      return existing._id;
    }
    return await ctx.db.insert("integrations", {
      profileId: profile._id,
      createdAt: now,
      ...payload,
    });
  },
});

export const toggleItem = mutation({
  args: { externalId: v.string(), selected: v.boolean() },
  handler: async (ctx, { externalId, selected }) => {
    const profile = await requireMyProfile(ctx);
    const row = await ctx.db
      .query("integrations")
      .withIndex("by_profile", (q) => q.eq("profileId", profile._id))
      .first();
    if (!row) throw new Error("No integration is connected yet.");
    await ctx.db.patch(row._id, {
      items: row.items.map((item) =>
        item.externalId === externalId ? { ...item, selected } : item,
      ),
      updatedAt: Date.now(),
    });
  },
});

export const disconnect = mutation({
  args: {},
  handler: async (ctx) => {
    const profile = await requireMyProfile(ctx);
    const row = await ctx.db
      .query("integrations")
      .withIndex("by_profile", (q) => q.eq("profileId", profile._id))
      .first();
    if (row) await ctx.db.delete(row._id);
  },
});

export const addSelectedToProjects = mutation({
  args: { published: v.boolean() },
  handler: async (ctx, { published }) => {
    const profile = await requireMyProfile(ctx);
    const row = await ctx.db
      .query("integrations")
      .withIndex("by_profile", (q) => q.eq("profileId", profile._id))
      .first();
    if (!row) throw new Error("No integration is connected yet.");

    const existing = await ctx.db
      .query("projects")
      .withIndex("by_profile", (q) => q.eq("profileId", profile._id))
      .collect();
    const importedIds = new Set(
      existing
        .filter((p) => p.sourceProvider === "github" && p.sourceExternalId)
        .map((p) => p.sourceExternalId as string),
    );

    const now = Date.now();
    let added = 0;
    for (const [index, item] of row.items.entries()) {
      if (!item.selected) continue;
      if (importedIds.has(item.externalId)) continue;
      const simulated = row.status === "simulated";
      const base =
        item.description ||
        `Imported from GitHub${item.language ? ` · ${item.language}` : ""}.`;
      await ctx.db.insert("projects", {
        profileId: profile._id,
        title: item.name,
        summary: simulated ? `${SAMPLE_NOTE}${base}` : base,
        technologies: item.language ? [item.language] : [],
        repoUrl: item.url,
        status: "live",
        skillLinks: [],
        published,
        order: -now - index,
        sourceProvider: "github",
        sourceExternalId: item.externalId,
        sourceUpdatedAt: now,
        createdAt: now,
        updatedAt: now,
      });
      added += 1;
    }
    return { added };
  },
});
