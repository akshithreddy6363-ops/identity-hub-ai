/**
 * Pure helpers for the AI actions: the prompts sent to the live model, and the
 * rule-based fallbacks used when no model is available. The fallbacks read only
 * the user's own published data, and callers label them as demo mode.
 */
import {
  ACHIEVEMENT_KIND_META,
  type BioDraftInput,
  type InterviewAnswer,
  type InterviewEvidence,
  type InterviewResult,
  type InterviewTrack,
  LOCALE_META,
  type Locale,
  type MatchResult,
  type ProjectSummaryInput,
  type RoadmapPractice,
  type RoadmapMilestone,
  type RoadmapResult,
  formatDate,
  normalizeSkill,
  tokenize,
} from "../lib/linksphere";
import type { Doc } from "./_generated/dataModel";
import type { PublicView } from "./helpers";

// Prompt builders

export function bioSystemPrompt(): string {
  return [
    "You write the About/bio paragraph for a public identity profile on LinkSphere AI.",
    "Return ONLY the bio text - no preamble, no quotes, no markdown.",
    '2-3 sentences, first person ("I ..."), confident but honest, at most 480 characters, single paragraph, no line breaks, no emoji.',
    "Use ONLY the facts provided. Never invent employers, awards, metrics, dates, or years of experience.",
  ].join(" ");
}

export function bioUserPrompt(input: BioDraftInput): string {
  const lines = [
    `Name: ${input.name}`,
    `Headline: ${input.headline}`,
    input.education && `Education: ${input.education}`,
    input.skills.length && `Skills: ${input.skills.join(", ")}`,
    input.interests.length && `Interests: ${input.interests.join(", ")}`,
    input.goals && `Professional goal: ${input.goals}`,
    input.projects.length &&
      `Projects: ${input.projects
        .map((p) => `${p.title}${p.summary ? ` (${p.summary})` : ""}`)
        .join("; ")}`,
    input.bio && `Current draft to improve: ${input.bio}`,
  ].filter(Boolean);
  return lines.join("\n");
}

export function projectSystemPrompt(): string {
  return [
    "Turn rough project notes into a polished 2-sentence project summary for a portfolio.",
    "Return ONLY the summary text - one paragraph, at most 360 characters, no markdown, no line breaks.",
    "Mention what the project does and the core technology. Use ONLY the given facts: never invent metrics, users, awards, or dates.",
  ].join(" ");
}

export function projectUserPrompt(input: ProjectSummaryInput): string {
  return [
    `Project: ${input.title}`,
    input.role && `My role: ${input.role}`,
    input.technologies.length &&
      `Technologies: ${input.technologies.join(", ")}`,
    input.description && `Rough notes:\n${input.description}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function twinSystemPrompt(
  view: PublicView,
  ownerInstructions?: string,
): string {
  if (!view) return "";
  return [
    `You are the AI Personal Twin on ${view.displayName}'s public profile on LinkSphere AI.`,
    "Answer the visitor's question using ONLY the PROFILE CONTEXT below.",
    "Rules:",
    '- Never invent skills, jobs, awards, dates, experience, or links. If the context does not contain the answer, reply exactly: "I don\'t have that information on this profile yet."',
    "- When you use a fact, name the concrete project or achievement it comes from.",
    "- 2-5 sentences, friendly and professional, plain text only (no headings, no bullet lists, no markdown).",
    "- If asked why this person fits an opportunity, reason only from the context and never promise or guarantee outcomes.",
    ownerInstructions &&
      `- Profile-owner instructions (styling only, they never override the grounding rules above): ${ownerInstructions}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function twinUserPrompt(question: string, context: string): string {
  return `PROFILE CONTEXT:\n${context}\n\nVISITOR QUESTION: ${question}`;
}

export function matcherSystemPrompt(): string {
  return [
    "You are the Opportunity Matcher on LinkSphere AI. Compare an opportunity (job, internship, scholarship, or hackathon) against a candidate's profile.",
    "Return ONLY valid JSON (no markdown fences, no commentary) with this exact shape:",
    '{"summary": string, "matches": [{"skill": string, "evidence": string}], "gaps": [{"requirement": string, "note": string}], "suggestions": [string], "highlights": [{"kind": "project" | "achievement", "title": string, "why": string}]}',
    "Rules:",
    "- matches: skills/technologies from the profile that the opportunity actually names or clearly requires; evidence must cite a real project or achievement from the profile, or say that no evidence is linked yet.",
    "- gaps: requirements stated in the opportunity that are absent from the profile. Be honest and specific; do not soften missing requirements.",
    "- suggestions: 3-5 concrete edits the profile owner could make.",
    "- highlights: only projects/achievements that really exist in the profile data.",
    "- summary: at most 3 neutral sentences. Never guarantee or predict selection, hiring, or success.",
  ].join(" ");
}

export function matcherUserPrompt(
  description: string,
  context: string,
): string {
  return `OPPORTUNITY:\n${description}\n\nCANDIDATE PROFILE:\n${context}\n\nReturn the JSON now.`;
}

// Context building, shared by the twin action

/** Everything the twin is allowed to know - public sections only. */
export function buildTwinContext(view: PublicView): string {
  if (!view) return "";
  const lines: string[] = [`Name: ${view.displayName}`];
  if (view.headline) lines.push(`Headline: ${view.headline}`);
  if (view.about) {
    if (view.about.bio) lines.push(`Bio: ${view.about.bio}`);
    if (view.about.education) lines.push(`Education: ${view.about.education}`);
    if (view.about.location) lines.push(`Location: ${view.about.location}`);
    if (view.about.goals) lines.push(`Goal: ${view.about.goals}`);
    if (view.about.interests.length)
      lines.push(`Interests: ${view.about.interests.join(", ")}`);
  }
  if (view.skills.length)
    lines.push(`Skills: ${view.skills.map((s) => s.name).join(", ")}`);
  for (const p of view.projects) {
    lines.push(
      `Project "${p.title}" (${p.status}${p.role ? `, role: ${p.role}` : ""}): ${
        p.summary ?? ""
      }${p.problem ? ` Problem: ${p.problem}` : ""}${
        p.solution ? ` Solution: ${p.solution}` : ""
      } Technologies: ${p.technologies.join(", ") || "n/a"}. Links: ${
        [p.demoUrl, p.repoUrl].filter(Boolean).join(", ") || "none"
      }`,
    );
  }
  for (const a of view.achievements) {
    lines.push(
      `Achievement "${a.title}" (${ACHIEVEMENT_KIND_META[a.kind]}${
        a.issuer ? `, ${a.issuer}` : ""
      }, ${formatDate(a.occurredAt)}, verification: ${a.verification}): ${
        a.description ?? ""
      } Linked skills: ${a.skillLinks.join(", ") || "none"}.`,
    );
  }
  if (view.contact) {
    lines.push(
      `Contact links: ${view.contact.socials.map((s) => s.platform).join(", ") || "none listed"}.`,
    );
  }
  return lines.join("\n");
}

// Deterministic fallbacks, labelled as demo mode

function cleanSentence(text: string): string {
  const flat = text.replace(/\s+/g, " ").trim();
  if (!flat) return "";
  const first = flat.match(/^.*?[.!?](\s|$)/);
  const sentence = first ? first[0].trim() : flat;
  const capped = sentence.charAt(0).toUpperCase() + sentence.slice(1);
  return /[.!?]$/.test(capped) ? capped : `${capped}.`;
}

function withPeriod(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

export function demoBio(input: BioDraftInput): string {
  const parts: string[] = [];
  const headline = input.headline.trim();
  if (headline) {
    parts.push(
      headline
        .replace(/[\s·|\u2014-]+$/, "")
        .replace(/^./, (c) => c.toUpperCase()) + ".",
    );
  }
  if (input.skills.length) {
    const shown = input.skills.slice(0, 5);
    const list =
      shown.length > 1
        ? `${shown.slice(0, -1).join(", ")} and ${shown[shown.length - 1]}`
        : shown[0];
    parts.push(`Hands-on experience with ${list}.`);
  }
  if (input.projects.length) {
    const titles = input.projects.slice(0, 3).map((p) => p.title);
    parts.push(
      titles.length === 1
        ? `Recent work includes ${titles[0]}.`
        : `Recent work includes ${titles.slice(0, -1).join(", ")}, and ${titles[titles.length - 1]}.`,
    );
  }
  if (input.education) parts.push(`${input.education}.`);
  if (input.goals) parts.push(withPeriod(input.goals));
  if (parts.length === 0) {
    return `${input.name} is building out this profile.`;
  }
  const text = parts.join(" ");
  return text.length > 700 ? `${text.slice(0, 697).trimEnd()}...` : text;
}

export function demoProjectSummary(input: ProjectSummaryInput): string {
  const sentences: string[] = [];
  const notes = input.description.trim();
  if (notes) sentences.push(cleanSentence(notes));
  const tech = input.technologies.filter(Boolean);
  if (tech.length) {
    sentences.push(
      `Built with ${tech.slice(0, 4).join(", ")}${input.role ? `, serving the ${input.role} role` : ""}.`,
    );
  }
  if (sentences.length === 0) {
    return `${input.title} - add project notes and this draft will summarise them.`;
  }
  return sentences.join(" ").slice(0, 400);
}

interface Fact {
  text: string;
  weight: number;
}

function twinFacts(view: PublicView): Fact[] {
  if (!view) return [];
  const facts: Fact[] = [];
  if (view.headline)
    facts.push({ text: `${view.displayName}: ${view.headline}.`, weight: 1 });
  if (view.about?.bio) {
    for (const sentence of view.about.bio.split(/(?<=[.!?])\s+/)) {
      if (sentence.trim()) facts.push({ text: sentence.trim(), weight: 1 });
    }
  }
  if (view.about?.education)
    facts.push({ text: `Education: ${view.about.education}.`, weight: 1.2 });
  if (view.about?.goals)
    facts.push({ text: `Professional goal: ${view.about.goals}`, weight: 1.2 });
  if (view.skills.length)
    facts.push({
      text: `Listed skills: ${view.skills.map((s) => s.name).join(", ")}.`,
      weight: 1.5,
    });
  for (const p of view.projects) {
    facts.push({
      text: `Project ${p.title}: ${p.summary ?? ""}${
        p.technologies.length ? ` Built with ${p.technologies.join(", ")}.` : ""
      }`.trim(),
      weight: 1.5,
    });
  }
  for (const a of view.achievements) {
    facts.push({
      text: `Achievement ${a.title} (${ACHIEVEMENT_KIND_META[a.kind]}${
        a.issuer ? `, ${a.issuer}` : ""
      }, ${formatDate(a.occurredAt)}): ${a.description ?? ""}`.trim(),
      weight: 1.5,
    });
  }
  if (view.about?.interests.length)
    facts.push({
      text: `Interests: ${view.about.interests.join(", ")}.`,
      weight: 0.8,
    });
  return facts;
}

/** Extractive, keyword-grounded answer used when no AI model is reachable. */
export function demoTwinAnswer(question: string, view: PublicView): string {
  if (!view) return "This profile is not available.";
  const questionTokens = tokenize(question);
  if (questionTokens.length === 0) {
    return "Ask me about the projects, skills, or achievements published on this profile.";
  }
  // Short tokens need word-boundary matches so "win" does not hit "winner".
  const matchers = questionTokens.map((token) => {
    if (token.length >= 5) {
      return (text: string) => text.includes(token);
    }
    const boundary = new RegExp(
      `\\b${token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
    );
    return (text: string) => boundary.test(text);
  });
  const scored = twinFacts(view)
    .map((fact) => {
      const lower = fact.text.toLowerCase();
      let score = 0;
      for (const matches of matchers) {
        if (matches(lower)) score += fact.weight;
      }
      return { fact, score };
    })
    .filter((f) => f.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  if (scored.length === 0) {
    return "I don't have that information on this profile yet - it isn't part of the published profile.";
  }
  const answer = scored.map((s) => s.fact.text).join(" ");
  return answer.length > 700 ? `${answer.slice(0, 697).trimEnd()}...` : answer;
}

// Opportunity matcher.

const OPPORTUNITY_VOCAB = [
  "python",
  "javascript",
  "typescript",
  "react",
  "node",
  "node.js",
  "sql",
  "postgresql",
  "mysql",
  "mongodb",
  "docker",
  "kubernetes",
  "aws",
  "gcp",
  "azure",
  "java",
  "c++",
  "golang",
  "rust",
  "figma",
  "android",
  "flutter",
  "graphql",
  "redis",
  "pandas",
  "tensorflow",
  "pytorch",
  "scikit-learn",
  "nlp",
  "computer vision",
  "machine learning",
  "deep learning",
  "llm",
  "data analysis",
  "next.js",
  "vue",
  "git",
  "linux",
  "rest api",
  "tailwind",
  "excel",
  "tableau",
  "power bi",
  "statistics",
  "a/b testing",
  "seo",
  "communication",
  "leadership",
  "teamwork",
  "presentation",
  "research",
  "cloud",
  "devops",
  "testing",
  "ci/cd",
  "agile",
];

export function demoMatch(
  profile: {
    displayName: string;
    headline?: string;
    bio?: string;
    skills: string[];
    goals?: string;
    education?: string;
  },
  projects: Doc<"projects">[],
  achievements: Doc<"achievements">[],
  description: string,
): MatchResult {
  const lower = description.toLowerCase();
  const profileSkills = profile.skills.map(normalizeSkill).filter(Boolean);
  const techSet = new Set(
    projects.flatMap((p) => p.technologies.map(normalizeSkill)),
  );
  const skillSet = new Set(profileSkills);
  const covered = new Set([...skillSet, ...techSet]);

  // What the opportunity asks for.
  const requested = new Set<string>();
  for (const item of OPPORTUNITY_VOCAB) {
    if (lower.includes(item)) requested.add(item);
  }
  for (const skill of profileSkills) {
    if (skill.length >= 3 && lower.includes(skill)) requested.add(skill);
  }

  const matches: MatchResult["matches"] = [];
  for (const req of requested) {
    if (!covered.has(req)) continue;
    const evidenceProjects = projects.filter(
      (p) =>
        p.technologies.map(normalizeSkill).includes(req) ||
        p.skillLinks.map(normalizeSkill).includes(req),
    );
    const evidenceAchievements = achievements.filter((a) =>
      a.skillLinks.map(normalizeSkill).includes(req),
    );
    const sources = [
      ...evidenceProjects.map((p) => `project ${p.title}`),
      ...evidenceAchievements.map((a) => `achievement ${a.title}`),
    ];
    matches.push({
      skill: req,
      evidence:
        sources.length > 0
          ? `Shown by ${sources.slice(0, 2).join(" and ")}.`
          : "Claimed as a skill, but no project or achievement links to it yet.",
    });
  }

  const gaps: MatchResult["gaps"] = [];
  for (const req of requested) {
    if (covered.has(req)) continue;
    gaps.push({
      requirement: req,
      note: "Named in this opportunity but not present anywhere in your profile.",
    });
  }

  const suggestions: string[] = [];
  if (!profile.headline)
    suggestions.push(
      "Add a headline that mirrors the opportunity's role title.",
    );
  if (!profile.bio)
    suggestions.push(
      "Write a 2-3 sentence bio summarising your fit for this kind of role.",
    );
  const unevidenced = profileSkills.filter(
    (s) =>
      requested.has(s) &&
      !projects.some(
        (p) =>
          p.skillLinks.map(normalizeSkill).includes(s) ||
          p.technologies.map(normalizeSkill).includes(s),
      ) &&
      !achievements.some((a) => a.skillLinks.map(normalizeSkill).includes(s)),
  );
  for (const skill of unevidenced.slice(0, 3)) {
    suggestions.push(
      `Link evidence to "${skill}" - it is relevant here but no project or achievement backs it up.`,
    );
  }
  if (gaps.length) {
    suggestions.push(
      `Add or highlight work using ${gaps
        .slice(0, 3)
        .map((g) => g.requirement)
        .join(", ")} to cover the missing requirements.`,
    );
  }
  if (projects.length > 0 && !projects.some((p) => p.demoUrl)) {
    suggestions.push(
      "Add a live demo link to your strongest project - opportunities like visible, working output.",
    );
  }
  if (achievements.length < 2) {
    suggestions.push(
      "Grow your Achievement Passport: add certificates, hackathons, or internships relevant to this opportunity.",
    );
  }
  if (suggestions.length === 0) {
    suggestions.push(
      "Reorder your public profile so the most relevant projects appear first.",
    );
  }

  const highlights: MatchResult["highlights"] = projects
    .map((p) => {
      const overlap = p.technologies
        .map(normalizeSkill)
        .filter((t) => lower.includes(t) || requested.has(t));
      const skillOverlap = p.skillLinks
        .map(normalizeSkill)
        .filter((s) => requested.has(s));
      const overlapSet = [...new Set([...overlap, ...skillOverlap])];
      return { p, overlapSet };
    })
    .filter((x) => x.overlapSet.length > 0)
    .sort((a, b) => b.overlapSet.length - a.overlapSet.length)
    .slice(0, 3)
    .map(({ p, overlapSet }) => ({
      kind: "project" as const,
      title: p.title,
      why: `Uses ${overlapSet.slice(0, 4).join(", ")}, which this opportunity asks for.`,
    }));

  for (const a of achievements.slice(0, 2)) {
    const hit = tokenize(
      `${a.title} ${a.description ?? ""} ${a.skillLinks.join(" ")}`,
    ).filter((t) => lower.includes(t));
    if (hit.length > 0) {
      highlights.push({
        kind: "achievement",
        title: a.title,
        why: `Shares ground with the opportunity (${hit.slice(0, 4).join(", ")}).`,
      });
    }
  }

  const summary = `Rule-based comparison: ${matches.length} skills you list are named in this opportunity, ${gaps.length} requirement${gaps.length === 1 ? "" : "s"} in the posting ${gaps.length === 1 ? "is" : "are"} not covered by your profile. This is a keyword comparison of your published data, not an AI judgement, and it says nothing about selection chances.`;

  return {
    summary,
    matches: matches.slice(0, 12),
    gaps: gaps.slice(0, 10),
    suggestions: suggestions.slice(0, 6),
    highlights: highlights.slice(0, 5),
  };
}

// Interview mode

const INTERVIEW_BANK: Record<InterviewTrack, string[]> = {
  recruiter: [
    "What is this person's strongest evidence-backed skill set?",
    "Which projects best show they can deliver real, working output?",
    "What achievements support the claims on this profile?",
    "What should a recruiter ask about because it is not published here?",
  ],
  developer: [
    "Which technologies have they actually used in published projects?",
    "Which project is the most technically substantial, and why?",
    "Which achievements or certificates back their technical skills?",
    "What technical evidence is missing from this profile?",
  ],
  student: [
    "What are they studying or learning right now?",
    "Which hackathons, competitions or courses have they taken part in?",
    "What skills are they actively building?",
    "What is not on this profile yet?",
  ],
};

export function interviewQuestions(track: InterviewTrack): string[] {
  return [...INTERVIEW_BANK[track]];
}

const GAP_QUESTION = /miss|not published|not on this profile|gap/i;

/** Every skill-linked item across projects, achievements and challenges. */
function skillHasEvidence(
  view: NonNullable<PublicView>,
  skill: string,
): boolean {
  const target = normalizeSkill(skill);
  return (
    view.projects.some(
      (p) =>
        p.skillLinks.some((s) => normalizeSkill(s) === target) ||
        p.technologies.some((t) => normalizeSkill(t) === target),
    ) ||
    view.achievements.some((a) =>
      a.skillLinks.some((s) => normalizeSkill(s) === target),
    ) ||
    view.challenges.some((c) =>
      c.skillLinks.some((s) => normalizeSkill(s) === target),
    )
  );
}

/**
 * "What is missing" list, computed locally from the published data rather than
 * by the model, so the gaps it reports are always real.
 */
export function computeProfileGaps(view: PublicView): string[] {
  if (!view) return [];
  const gaps: string[] = [];
  if (!view.about?.bio) gaps.push("No bio is published.");
  if (!view.about?.goals) gaps.push("No professional goal is stated.");
  if (!view.about?.education)
    gaps.push("No education information is published.");
  if (view.skills.length === 0) gaps.push("No skills are listed.");
  const unevidenced = view.skills
    .filter((s) => !skillHasEvidence(view, s.name))
    .map((s) => s.name);
  if (unevidenced.length > 0) {
    gaps.push(
      `Skills with no linked evidence yet: ${unevidenced.slice(0, 5).join(", ")}${unevidenced.length > 5 ? ", ..." : ""}.`,
    );
  }
  if (view.projects.length === 0) {
    gaps.push("No projects are published.");
  } else {
    const noDemo = view.projects.filter((p) => !p.demoUrl).length;
    if (noDemo > 0)
      gaps.push(
        `${noDemo} published project${noDemo === 1 ? " has" : "s lack"} no live demo link.`,
      );
    if (!view.projects.some((p) => p.repoUrl))
      gaps.push("No repository link is attached to any published project.");
  }
  if (view.achievements.length === 0) {
    gaps.push("No achievements are published yet.");
  } else {
    const noEvidence = view.achievements.filter(
      (a) => a.evidence.length === 0,
    ).length;
    if (noEvidence > 0)
      gaps.push(
        `${noEvidence} passport entr${noEvidence === 1 ? "y has" : "ies have"} no supporting evidence attached.`,
      );
  }
  if (view.challenges.length === 0)
    gaps.push("No proof-of-skill challenges are attached.");
  if (view.contact && !view.contact.resumeUrl)
    gaps.push("No resume link is published.");
  if (view.contact && view.contact.socials.length === 0)
    gaps.push("No contact links are published.");
  return gaps.slice(0, 7);
}

/**
 * Maps model-suggested evidence names onto real published items. Anything that
 * does not match is dropped, so the interview can't cite invented proof.
 */
export function resolveEvidence(
  view: PublicView,
  titles: string[],
): InterviewEvidence[] {
  if (!view) return [];
  const out: InterviewEvidence[] = [];
  const seen = new Set<string>();
  for (const raw of titles) {
    const needle = raw.trim().toLowerCase();
    if (!needle) continue;
    const loosely = (candidate: string) => {
      const c = candidate.toLowerCase();
      return c === needle || c.includes(needle) || needle.includes(c);
    };
    const project = view.projects.find((p) => loosely(p.title));
    if (project) {
      const key = `project:${project._id}`;
      if (!seen.has(key)) {
        seen.add(key);
        out.push({
          kind: "project",
          title: project.title,
          url: project.demoUrl ?? project.repoUrl,
        });
      }
      continue;
    }
    const achievement = view.achievements.find((a) => loosely(a.title));
    if (achievement) {
      const key = `achievement:${achievement._id}`;
      if (!seen.has(key)) {
        seen.add(key);
        out.push({
          kind: "achievement",
          title: achievement.title,
          url: achievement.evidence[0]?.url,
        });
      }
      continue;
    }
    const challenge = view.challenges.find((c) => loosely(c.title));
    if (challenge) {
      const key = `challenge:${challenge._id}`;
      if (!seen.has(key)) {
        seen.add(key);
        out.push({
          kind: "challenge",
          title: challenge.title,
          url: challenge.submissionUrl ?? challenge.evidence[0]?.url,
        });
      }
    }
  }
  return out.slice(0, 4);
}

export function interviewSystemPrompt(view: PublicView): string {
  if (!view) return "";
  return [
    `You are running a structured interview about ${view.displayName}'s PUBLIC profile on LinkSphere AI.`,
    "Answer each question using ONLY the PROFILE CONTEXT. Return ONLY valid JSON, no markdown fences:",
    '{"answers": [{"question": string, "answer": string, "answered": boolean, "evidenceTitles": string[]}]}',
    "Rules:",
    "- evidenceTitles must list the exact titles of projects, achievements or challenges from the context that support the answer (empty array if none). Never invent titles.",
    "- If the context does not contain the answer, set answered=false and say plainly that it is not published on this profile. Never guess, never claim unverified things.",
    "- One question may ask what is missing: answer it from the MISSING INFORMATION list only.",
    "- 1-3 sentences per answer, plain text.",
  ].join("\n");
}

export function interviewUserPrompt(
  questions: string[],
  context: string,
  gaps: string[],
): string {
  return [
    "QUESTIONS:",
    ...questions.map((q, i) => `${i + 1}. ${q}`),
    "",
    "PROFILE CONTEXT:",
    context,
    "",
    "MISSING INFORMATION (computed from the profile, not by you):",
    gaps.length ? gaps.map((g) => `- ${g}`).join("\n") : "- none detected",
    "",
    "Return the JSON now, one entry per question in the same order.",
  ].join("\n");
}

/** Rule-based interview used when no model is reachable (labelled demo mode). */
export function demoInterview(
  track: InterviewTrack,
  view: NonNullable<PublicView>,
): InterviewResult {
  const gaps = computeProfileGaps(view);
  const answers: InterviewAnswer[] = interviewQuestions(track).map(
    (question) => {
      if (GAP_QUESTION.test(question)) {
        return {
          question,
          answered: true,
          answer:
            gaps.length > 0
              ? `Not published on this profile yet: ${gaps.join(" ")}`
              : "Everything this check looks for is present on the profile.",
          evidence: [],
        };
      }
      const answer = demoTwinAnswer(question, view);
      const notPublished = answer.startsWith("I don't have that information");
      const tokens = tokenize(question);
      const titles = [
        ...view.projects.map((p) => p.title),
        ...view.achievements.map((a) => a.title),
        ...view.challenges.map((c) => c.title),
      ].filter((title) =>
        tokens.some((token) => title.toLowerCase().includes(token)),
      );
      const evidence = resolveEvidence(view, titles);
      return {
        question,
        answered: !notPublished,
        answer: notPublished
          ? "I don't have that information on this profile yet - it isn't published here."
          : answer,
        evidence: notPublished ? [] : evidence,
      };
    },
  );
  return { answers, gaps };
}

export function parseInterviewJson(
  text: string,
  view: PublicView,
  questions: string[],
  gaps: string[],
): InterviewResult | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(raw.slice(start, end + 1)) as {
      answers?: unknown;
    };
    const rawAnswers: unknown = parsed.answers;
    if (!Array.isArray(rawAnswers)) return null;
    const byQuestion = new Map<string, Record<string, unknown>>();
    for (const item of rawAnswers as unknown[]) {
      const entry = item as Record<string, unknown>;
      const q = typeof entry?.question === "string" ? entry.question : "";
      if (q) byQuestion.set(q.trim().toLowerCase(), entry);
    }
    const answers: InterviewAnswer[] = questions.map((question, index) => {
      const entry =
        byQuestion.get(question.trim().toLowerCase()) ??
        ((rawAnswers as unknown[])[index] as
          | Record<string, unknown>
          | undefined);
      const answerText =
        typeof entry?.answer === "string" ? entry.answer.trim() : "";
      const titles = Array.isArray(entry?.evidenceTitles)
        ? entry.evidenceTitles.filter((t): t is string => typeof t === "string")
        : [];
      const notPublished =
        !answerText ||
        /not (published|available|listed|on this profile)/i.test(answerText);
      return {
        question,
        answered: !notPublished,
        answer: notPublished
          ? "I don't have that information on this profile yet - it isn't published here."
          : answerText,
        // Evidence is resolved against real items, so nothing can be invented.
        evidence: notPublished ? [] : resolveEvidence(view, titles),
      };
    });
    if (answers.every((a) => !a.answered)) return null;
    return { answers, gaps };
  } catch {
    return null;
  }
}

// Skills roadmap

export function roadmapSystemPrompt(): string {
  return [
    "You build a realistic, project-based learning roadmap for a student or early-career developer on LinkSphere AI.",
    "Return ONLY valid JSON, no markdown fences:",
    '{"summary": string, "gaps": string[], "milestones": [{"title": string, "focus": string, "why": string, "skills": string[], "practices": [{"kind": "project"|"practice"|"course", "title": string, "detail": string}]}]}',
    "Rules:",
    "- 3 or 4 milestones, ordered from foundation to proof-of-work; each with 1-3 practices.",
    "- Build on what the person ALREADY has: reference their existing projects and skills in `why` and reuse them as stepping stones.",
    "- gaps: skills the target role needs that are genuinely absent from the profile. Be honest; keep each one short.",
    "- Practices must be concrete and doable in weeks, favouring small shipped projects over vague advice.",
    "- Never promise jobs, salaries or outcomes. No invented courses with fake URLs.",
  ].join("\n");
}

export function roadmapUserPrompt(targetRole: string, context: string): string {
  return `TARGET ROLE:\n${targetRole}\n\nCURRENT PROFILE:\n${context}\n\nReturn the JSON now.`;
}

interface RoleCluster {
  match: string[];
  label: string;
  core: string[];
  firstProject: string;
}

const ROLE_CLUSTERS: RoleCluster[] = [
  {
    match: ["ai", "ml", "machine learning", "data scien", "deep learning"],
    label: "applied AI / ML",
    core: [
      "Python",
      "PyTorch or TensorFlow",
      "SQL",
      "model evaluation",
      "REST API deployment",
    ],
    firstProject:
      "an end-to-end model with a small web UI and an evaluation report",
  },
  {
    match: ["front", "react", "web", "ui", "full stack", "fullstack"],
    label: "frontend / full-stack",
    core: ["TypeScript", "React", "accessibility", "testing", "performance"],
    firstProject:
      "a small product with real user flows, keyboard access and tests",
  },
  {
    match: ["back", "server", "api", "node", "platform", "systems"],
    label: "backend / platform",
    core: ["Node.js", "SQL", "auth", "caching", "observability"],
    firstProject: "an authenticated API with migrations, rate limits and logs",
  },
  {
    match: ["data", "analyst", "analytics", "bi", "reporting"],
    label: "data analysis",
    core: ["SQL", "Python", "statistics", "visualisation", "data cleaning"],
    firstProject:
      "a public dataset analysis with a reproducible notebook and a one-page summary",
  },
  {
    match: ["mobile", "android", "ios", "flutter", "app"],
    label: "mobile",
    core: [
      "React Native or Flutter",
      "offline storage",
      "REST APIs",
      "app store release",
    ],
    firstProject: "an app shipped to a real device with offline support",
  },
  {
    match: ["design", "ux", "product design", "ui/ux"],
    label: "product design",
    core: [
      "Figma",
      "user research",
      "design systems",
      "prototyping",
      "handoff",
    ],
    firstProject:
      "a redesign case study with research notes and before/after evidence",
  },
  {
    match: ["devops", "cloud", "sre", "infrastructure"],
    label: "cloud / DevOps",
    core: ["Docker", "CI/CD", "infrastructure as code", "monitoring", "Linux"],
    firstProject:
      "a deployed service with automated tests, pipeline and alerts",
  },
];

const GENERIC_CLUSTER: RoleCluster = {
  match: [],
  label: "software engineering",
  core: [
    "one language deeply",
    "Git workflows",
    "testing",
    "data structures",
    "system design basics",
  ],
  firstProject: "a small tool you use yourself, with tests and a README",
};

/** Deterministic roadmap when no model is reachable (labelled demo mode). */
export function demoRoadmap(
  view: PublicView,
  targetRole: string,
): RoadmapResult {
  const role = targetRole.toLowerCase();
  const cluster =
    ROLE_CLUSTERS.find((c) => c.match.some((m) => role.includes(m))) ??
    GENERIC_CLUSTER;

  const owned = new Set<string>();
  if (view) {
    for (const skill of view.skills) owned.add(normalizeSkill(skill.name));
    for (const project of view.projects) {
      for (const tech of project.technologies) owned.add(normalizeSkill(tech));
    }
  }
  const gaps = cluster.core.filter(
    (skill) => !owned.has(normalizeSkill(skill)),
  );
  const strengths = cluster.core.filter((skill) =>
    owned.has(normalizeSkill(skill)),
  );
  const projectTitles = (view?.projects ?? []).map((p) => p.title);
  const existing = projectTitles.length
    ? `Your existing work (${projectTitles.slice(0, 3).join(", ")}) already gives you a base to extend.`
    : "You have not published a project yet, so the first milestone starts there.";

  return {
    summary: `A step-by-step path toward ${targetRole.trim() || cluster.label}. ${existing}${
      strengths.length
        ? ` You already cover ${strengths.slice(0, 3).join(", ")}, so the plan focuses on what is missing.`
        : ""
    }`,
    gaps: gaps.slice(0, 5),
    milestones: [
      {
        title: "Milestone 1 - Close the foundation gap",
        focus: gaps[0] ?? cluster.core[0],
        why: `This is the most common first filter for ${cluster.label} roles and it is not visible in your profile yet.`,
        skills: gaps.slice(0, 2).length
          ? gaps.slice(0, 2)
          : cluster.core.slice(0, 2),
        practices: [
          {
            kind: "course" as const,
            title: `Focused fundamentals for ${gaps[0] ?? cluster.core[0]}`,
            detail:
              "Pick one reputable course or book and finish it end to end rather than sampling several.",
          },
          {
            kind: "practice" as const,
            title: "Build the smallest possible exercise set",
            detail: `Write 5-10 small exercises using ${gaps[0] ?? cluster.core[0]} so the skill is applied, not just read.`,
          },
        ],
      },
      {
        title: "Milestone 2 - Ship a portfolio project",
        focus: cluster.firstProject,
        why: `A single complete, published project answers more ${cluster.label} questions than a list of skills.`,
        skills: cluster.core.slice(0, 3),
        practices: [
          {
            kind: "project" as const,
            title: `Build ${cluster.firstProject}`,
            detail:
              "Keep the scope to a few weeks. Publish it here with a live demo link, a repository and a short write-up of what you learned.",
          },
          {
            kind: "practice" as const,
            title: "Link the project to the skills it proves",
            detail:
              "Use the skill links on your project so each claim traces to real evidence on your profile.",
          },
        ],
      },
      {
        title: "Milestone 3 - Prove it in public",
        focus: "External validation",
        why: "Competitions, contributions and shared work move you from self-reported to demonstrated.",
        skills: cluster.core.slice(1, 4),
        practices: [
          {
            kind: "practice" as const,
            title: `Enter one ${cluster.label} competition or team project`,
            detail:
              "A hackathon or open-source contribution adds an Achievement Passport entry with a result you can attach evidence to.",
          },
          {
            kind: "practice" as const,
            title: "Attach evidence to your weakest entries",
            detail:
              "Use the gaps list on this page: add demo links, evidence links and a resume so nothing is left as an unevidenced claim.",
          },
        ],
      },
    ],
  };
}

export function parseRoadmapJson(text: string): RoadmapResult | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(raw.slice(start, end + 1)) as Record<
      string,
      unknown
    >;
    const str = (value: unknown) =>
      typeof value === "string" ? value.trim() : "";
    const milestones = (
      Array.isArray(parsed.milestones) ? parsed.milestones : []
    )
      .slice(0, 5)
      .map((raw): RoadmapMilestone => {
        const m = raw as Record<string, unknown>;
        return {
          title: str(m.title),
          focus: str(m.focus),
          why: str(m.why),
          skills: (Array.isArray(m.skills) ? m.skills : [])
            .map(str)
            .filter(Boolean)
            .slice(0, 6),
          practices: (Array.isArray(m.practices) ? m.practices : [])
            .slice(0, 4)
            .map((rawPractice): RoadmapPractice => {
              const p = rawPractice as Record<string, unknown>;
              const kind: RoadmapPractice["kind"] =
                p.kind === "project" || p.kind === "course"
                  ? p.kind
                  : "practice";
              return { kind, title: str(p.title), detail: str(p.detail) };
            })
            .filter((p) => p.title),
        };
      })
      .filter((m) => m.title);
    if (milestones.length === 0) return null;
    return {
      summary: str(parsed.summary),
      gaps: (Array.isArray(parsed.gaps) ? parsed.gaps : [])
        .map(str)
        .filter(Boolean)
        .slice(0, 6),
      milestones,
    };
  } catch {
    return null;
  }
}

// Multilingual profiles

export function translationSystemPrompt(locale: Locale): string {
  return [
    `You translate public profile text into ${LOCALE_META[locale].promptName} for LinkSphere AI.`,
    "Return ONLY valid JSON with the same keys as the input:",
    '{"headline": string, "bio": string, "goals": string, "education": string, "interests": string[]}',
    "Rules:",
    "- Translate meaning and tone faithfully. Add no new claims, credentials or details, and remove nothing.",
    "- Keep technical terms, technology names, company names, project names, people's names and URLs exactly as written in Latin script.",
    "- Keep the first-person voice for the bio.",
    "- Use natural, everyday " +
      LOCALE_META[locale].promptName +
      " phrasing, not stilted literal translation.",
    "- Empty input fields must stay empty strings.",
  ].join("\n");
}

export function translationUserPrompt(fields: {
  headline: string;
  bio: string;
  goals: string;
  education: string;
  interests: string[];
}): string {
  return JSON.stringify(fields, null, 2);
}

export function parseTranslationJson(text: string): {
  headline: string;
  bio: string;
  goals: string;
  education: string;
  interests: string[];
} | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(raw.slice(start, end + 1)) as Record<
      string,
      unknown
    >;
    const str = (value: unknown) =>
      typeof value === "string" ? value.trim() : "";
    const result = {
      headline: str(parsed.headline),
      bio: str(parsed.bio),
      goals: str(parsed.goals),
      education: str(parsed.education),
      interests: (Array.isArray(parsed.interests) ? parsed.interests : [])
        .map(str)
        .filter(Boolean)
        .slice(0, 30),
    };
    if (!result.headline && !result.bio && !result.goals) return null;
    return result;
  } catch {
    return null;
  }
}

// JSON parsing for the live matcher.

export function parseMatchJson(text: string): MatchResult | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(raw.slice(start, end + 1));
    if (!parsed || typeof parsed !== "object") return null;
    const str = (value: unknown): string =>
      typeof value === "string" ? value.trim() : "";
    const result: MatchResult = {
      summary: str(parsed.summary),
      matches: (Array.isArray(parsed.matches) ? parsed.matches : [])
        .map((m: unknown) => ({
          skill: str((m as Record<string, unknown>)?.skill),
          evidence: str((m as Record<string, unknown>)?.evidence),
        }))
        .filter((m: { skill: string }) => m.skill)
        .slice(0, 15),
      gaps: (Array.isArray(parsed.gaps) ? parsed.gaps : [])
        .map((g: unknown) => ({
          requirement: str((g as Record<string, unknown>)?.requirement),
          note: str((g as Record<string, unknown>)?.note),
        }))
        .filter((g: { requirement: string }) => g.requirement)
        .slice(0, 12),
      suggestions: (Array.isArray(parsed.suggestions) ? parsed.suggestions : [])
        .map(str)
        .filter(Boolean)
        .slice(0, 8),
      highlights: (Array.isArray(parsed.highlights) ? parsed.highlights : [])
        .map((h: unknown) => {
          const item = h as Record<string, unknown>;
          const kind = item?.kind === "achievement" ? "achievement" : "project";
          return { kind, title: str(item?.title), why: str(item?.why) };
        })
        .filter((h: { title: string }) => h.title)
        .slice(0, 8),
    };
    if (
      !result.summary &&
      result.matches.length === 0 &&
      result.gaps.length === 0
    ) {
      return null;
    }
    return result;
  } catch {
    return null;
  }
}
