"use node";

/**
 * AI features for LinkSphere AI.
 *
 * Every action first attempts a real model call through the VLY integration
 * (server-side only — no credentials ever reach the client). If the call
 * fails or credentials are unavailable, it falls back to a deterministic,
 * clearly-labelled "demo" answer built only from the user's own data, and the
 * UI displays that distinction.
 */
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { AI_NOTES, type MatchResult } from "../lib/linksphere";
import { vly } from "../lib/vly-integrations";
import {
  bioSystemPrompt,
  bioUserPrompt,
  buildTwinContext,
  demoBio,
  demoMatch,
  demoProjectSummary,
  demoTwinAnswer,
  matcherSystemPrompt,
  matcherUserPrompt,
  parseMatchJson,
  projectSystemPrompt,
  projectUserPrompt,
  twinSystemPrompt,
  twinUserPrompt,
} from "./aiHelpers";
import { buildPublicView } from "./helpers";
import { internal } from "./_generated/api";
import { action } from "./_generated/server";

const MODEL = "gpt-4o-mini";

type Completion = { text: string } | { error: string };

/** Real model call, server-side. Never throws — reports failure instead. */
async function complete(
  system: string,
  user: string,
  maxTokens: number,
): Promise<Completion> {
  if (!system) return { error: "Nothing to work with." };
  try {
    const response = await vly.ai.completion(
      {
        model: MODEL,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0.4,
        maxTokens,
      },
      { timeout: 30_000, retries: 1 },
    );
    const text = response.data?.choices?.[0]?.message?.content?.trim();
    if (response.success && text) return { text };
    return { error: response.error || "The model returned no content." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "AI call failed." };
  }
}

/* ------------------------------------------------------------------ *
 * Bio / summary writing — the core v1 AI feature
 * ------------------------------------------------------------------ */

export const draftBio = action({
  args: {
    input: v.object({
      name: v.string(),
      headline: v.string(),
      bio: v.string(),
      skills: v.array(v.string()),
      interests: v.array(v.string()),
      education: v.string(),
      goals: v.string(),
      projects: v.array(
        v.object({ title: v.string(), summary: v.string() }),
      ),
    }),
  },
  handler: async (_ctx, { input }): Promise<
    | { ok: true; text: string; mode: "live" | "demo"; note?: string }
    | { ok: false; error: string }
  > => {
    const result = await complete(
      bioSystemPrompt(),
      bioUserPrompt(input),
      400,
    );
    if ("text" in result) {
      return { ok: true, text: result.text, mode: "live" };
    }
    // Honest fallback: template assembly from the same facts, clearly labelled.
    return { ok: true, text: demoBio(input), mode: "demo", note: AI_NOTES.bio };
  },
});

export const draftProjectSummary = action({
  args: {
    input: v.object({
      title: v.string(),
      description: v.string(),
      role: v.string(),
      technologies: v.array(v.string()),
    }),
  },
  handler: async (_ctx, { input }): Promise<
    | { ok: true; text: string; mode: "live" | "demo"; note?: string }
    | { ok: false; error: string }
  > => {
    const result = await complete(
      projectSystemPrompt(),
      projectUserPrompt(input),
      300,
    );
    if ("text" in result) {
      return { ok: true, text: result.text, mode: "live" };
    }
    return {
      ok: true,
      text: demoProjectSummary(input),
      mode: "demo",
      note: AI_NOTES.project,
    };
  },
});

/* ------------------------------------------------------------------ *
 * AI Personal Twin — public visitor Q&A, grounded in published data only
 * ------------------------------------------------------------------ */

export const askTwin = action({
  args: {
    slug: v.string(),
    question: v.string(),
  },
  handler: async (ctx, { slug, question }): Promise<
    | { ok: true; answer: string; mode: "live" | "demo"; note?: string }
    | { ok: false; error: string }
  > => {
    const trimmed = question.trim();
    if (trimmed.length < 2) return { ok: false, error: "Ask a question first." };
    if (trimmed.length > 400)
      return { ok: false, error: "Questions are limited to 400 characters." };

    const bundle = await ctx.runQuery(internal.internalData.loadProfileBundle, {
      slug,
    });
    if (!bundle) return { ok: false, error: "This profile does not exist." };
    const { profile, projects, achievements } = bundle;

    // Unpublished profiles are answerable by their owner only (preview mode).
    const viewerId = await getAuthUserId(ctx);
    if (!profile.published && profile.ownerId !== viewerId) {
      return { ok: false, error: "This profile is not published." };
    }
    if (!profile.twinEnabled && profile.ownerId !== viewerId) {
      return {
        ok: false,
        error: "The AI twin is turned off for this profile.",
      };
    }

    const view = buildPublicView(profile, projects, achievements);
    if (!view) return { ok: false, error: "This profile is not published." };

    const context = buildTwinContext(view);
    if (!context || context.split("\n").length <= 1) {
      return {
        ok: false,
        error: "This profile has no published information to answer from yet.",
      };
    }

    const result = await complete(
      twinSystemPrompt(view, profile.twinIntro),
      twinUserPrompt(trimmed, context),
      450,
    );
    if ("text" in result) {
      return { ok: true, answer: result.text, mode: "live" };
    }
    return {
      ok: true,
      answer: demoTwinAnswer(trimmed, view),
      mode: "demo",
      note: AI_NOTES.twin(view.displayName),
    };
  },
});

/* ------------------------------------------------------------------ *
 * AI Opportunity Matcher — compare a posting against the owner's profile
 * ------------------------------------------------------------------ */

export const matchOpportunity = action({
  args: {
    slug: v.string(),
    description: v.string(),
  },
  handler: async (ctx, { slug, description }): Promise<
    | { ok: true; result: MatchResult; mode: "live" | "demo"; note?: string }
    | { ok: false; error: string }
  > => {
    const trimmed = description.trim();
    if (trimmed.length < 40)
      return {
        ok: false,
        error: "Paste at least a couple of sentences from the opportunity.",
      };
    if (trimmed.length > 8000)
      return { ok: false, error: "Opportunity text is limited to 8,000 characters." };

    const userId = await getAuthUserId(ctx);
    if (userId === null)
      return { ok: false, error: "Sign in to analyse opportunities against your profile." };

    const bundle = await ctx.runQuery(internal.internalData.loadProfileBundle, {
      slug,
    });
    if (!bundle || bundle.profile.ownerId !== userId)
      return { ok: false, error: "You can only analyse your own profile." };
    const { profile, projects, achievements } = bundle;

    const context = [
      `Name: ${profile.displayName}`,
      profile.headline && `Headline: ${profile.headline}`,
      profile.bio && `Bio: ${profile.bio}`,
      profile.education && `Education: ${profile.education}`,
      profile.goals && `Goal: ${profile.goals}`,
      profile.skills.length && `Skills: ${profile.skills.map((s) => s.name).join(", ")}`,
      profile.interests.length && `Interests: ${profile.interests.join(", ")}`,
      ...projects.map(
        (p) =>
          `Project "${p.title}" (${p.status}): ${p.summary ?? ""} Tech: ${p.technologies.join(", ")}. Linked skills: ${p.skillLinks.join(", ") || "none"}.`,
      ),
      ...achievements.map(
        (a) =>
          `Achievement "${a.title}" (${a.kind}${a.issuer ? `, ${a.issuer}` : ""}, verification: ${a.verification}): ${a.description ?? ""} Linked skills: ${a.skillLinks.join(", ") || "none"}.`,
      ),
    ]
      .filter(Boolean)
      .join("\n");

    const result = await complete(
      matcherSystemPrompt(),
      matcherUserPrompt(trimmed, context),
      1400,
    );
    if ("text" in result) {
      const parsed = parseMatchJson(result.text);
      if (parsed) return { ok: true, result: parsed, mode: "live" };
      // Malformed model output — fall through to the labelled rule-based path.
    }

    return {
      ok: true,
      result: demoMatch(
        {
          displayName: profile.displayName,
          headline: profile.headline,
          bio: profile.bio,
          skills: profile.skills.map((s) => s.name),
          goals: profile.goals,
          education: profile.education,
        },
        projects,
        achievements,
        trimmed,
      ),
      mode: "demo",
      note: AI_NOTES.match,
    };
  },
});
