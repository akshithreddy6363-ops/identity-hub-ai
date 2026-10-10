/**
 * Shared constants and pure helpers used by both the React app and Convex
 * functions. Keep this module dependency-free (no runtime imports).
 */

/** Slug of the clearly-labelled demonstration profile shipped with the app. */
export const SAMPLE_SLUG = "aarav-mehta";

/**
 * Stable token for the sample profile's tailored share view, so the Smart Share
 * feature can be tried without an account. It resolves to sample data only.
 */
export const SAMPLE_SHARE_TOKEN = "aaravrecruiter";

export const SOCIAL_PLATFORMS = [
  "GitHub",
  "LinkedIn",
  "Instagram",
  "YouTube",
  "X",
  "Website",
  "Email",
] as const;
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

export type ProjectStatus = "live" | "building" | "archived";

export const PROJECT_STATUS_META: Record<
  ProjectStatus,
  { label: string; dot: string }
> = {
  live: { label: "Live", dot: "bg-emerald-500" },
  building: { label: "In progress", dot: "bg-amber-500" },
  archived: { label: "Archived", dot: "bg-zinc-400" },
};

export type AchievementKind =
  | "hackathon"
  | "certificate"
  | "award"
  | "internship"
  | "course"
  | "milestone";

export const ACHIEVEMENT_KIND_META: Record<AchievementKind, string> = {
  hackathon: "Hackathon",
  certificate: "Certificate",
  award: "Award",
  internship: "Internship",
  course: "Course",
  milestone: "Milestone",
};

export type Verification = "verified" | "pending" | "self_reported";

/**
 * Verified is a real claim — the UI copy makes clear it must come from an
 * actual verification, and the app never assigns it automatically.
 */
export const VERIFICATION_META: Record<
  Verification,
  { label: string; badge: string; hint: string }
> = {
  verified: {
    label: "Verified",
    badge: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    hint: "Confirmed through a reliable verification method (issuer check, credential ID, or trusted document).",
  },
  pending: {
    label: "Verification pending",
    badge: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
    hint: "Evidence attached, verification not completed yet.",
  },
  self_reported: {
    label: "Self-reported",
    badge: "border-border bg-muted text-muted-foreground",
    hint: "Stated by the profile owner and not independently checked.",
  },
};

/** Lowercase + trim so skill ↔ evidence matching is case-insensitive. */
export function normalizeSkill(name: string): string {
  return name.trim().toLowerCase();
}

/** URL-friendly slug: lowercase alphanumerics separated by single dashes. */
export function sanitizeSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

/** "Aarav Mehta" → "AM" (used for avatar fallbacks). */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** Timestamp → "Mar 2025" (date inputs in the app send local timestamps). */
export function formatDate(ts: number): string {
  const date = new Date(ts);
  return `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

/**
 * "live" = a real model call succeeded. "demo" = AI credentials were
 * unavailable and a clearly-labelled deterministic fallback produced the
 * output. The UI must surface this distinction everywhere.
 */
export type AIMode = "live" | "demo";

/* ------------------------------------------------------------------ *
 * Proof-of-Skill challenges
 * ------------------------------------------------------------------ */

export type ChallengeKind = "coding" | "design" | "problem_solving";

export const CHALLENGE_KIND_META: Record<ChallengeKind, string> = {
  coding: "Coding challenge",
  design: "Design challenge",
  problem_solving: "Problem-solving challenge",
};

export type Provenance = "user_submitted" | "platform_verified";

export const PROVENANCE_META: Record<
  Provenance,
  { label: string; badge: string; hint: string }
> = {
  user_submitted: {
    label: "Self-submitted",
    badge: "border-border bg-muted text-muted-foreground",
    hint: "Stated by the profile owner. Not independently checked by LinkSphere.",
  },
  platform_verified: {
    label: "Platform-verified",
    badge: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    hint: "Owner attached a platform result link. LinkSphere has not re-verified this result.",
  },
};

/* ------------------------------------------------------------------ *
 * Multilingual profiles
 * ------------------------------------------------------------------ */

export type Locale = "en" | "te" | "hi";

export const LOCALE_META: Record<
  Locale,
  { label: string; native: string; promptName: string }
> = {
  en: { label: "English", native: "English", promptName: "English" },
  te: { label: "Telugu", native: "తెలుగు", promptName: "Telugu" },
  hi: { label: "Hindi", native: "हिन्दी", promptName: "Hindi" },
};

/** Locales the translator can produce (English is the original). */
export const TRANSLATABLE_LOCALES = ["te", "hi"] as const;
export type TranslatableLocale = (typeof TRANSLATABLE_LOCALES)[number];

/* ------------------------------------------------------------------ *
 * Smart Share Profiles
 * ------------------------------------------------------------------ */

export type ShareAudience = "recruiter" | "mentor" | "collaborator" | "custom";

export const SHARE_AUDIENCE_META: Record<
  ShareAudience,
  { label: string; note: string }
> = {
  recruiter: {
    label: "Recruiter",
    note: "Roles, head-line strengths, projects and achievements.",
  },
  mentor: {
    label: "Mentor",
    note: "Learning goals, skills in progress and current projects.",
  },
  collaborator: {
    label: "Collaborator",
    note: "Projects, stack, contact links and availability.",
  },
  custom: { label: "Custom", note: "You choose every section." },
};

/* ------------------------------------------------------------------ *
 * AI Interview Mode
 * ------------------------------------------------------------------ */

export type InterviewTrack = "recruiter" | "developer" | "student";

export const INTERVIEW_TRACK_META: Record<
  InterviewTrack,
  { label: string; blurb: string }
> = {
  recruiter: {
    label: "Recruiter",
    blurb: "Evidence-backed skills, delivery and achievements.",
  },
  developer: {
    label: "Developer",
    blurb: "Technologies actually used, deepest project, technical proof.",
  },
  student: {
    label: "Student",
    blurb: "Study, competitions and what is being learned right now.",
  },
};

export interface InterviewEvidence {
  kind: "project" | "achievement" | "challenge";
  title: string;
  url?: string;
}

export interface InterviewAnswer {
  question: string;
  answer: string;
  answered: boolean;
  evidence: InterviewEvidence[];
}

export interface InterviewResult {
  answers: InterviewAnswer[];
  /** Deterministically computed "what is not published yet" list. */
  gaps: string[];
}

/* ------------------------------------------------------------------ *
 * Personalized skills roadmap
 * ------------------------------------------------------------------ */

export interface RoadmapPractice {
  kind: "project" | "practice" | "course";
  title: string;
  detail: string;
}

export interface RoadmapMilestone {
  title: string;
  focus: string;
  why: string;
  skills: string[];
  practices: RoadmapPractice[];
}

export interface RoadmapResult {
  summary: string;
  gaps: string[];
  milestones: RoadmapMilestone[];
}

/**
 * Team Finder is deterministic matching, and the UI says exactly that — it is
 * never presented as an AI verdict.
 */
export const TEAM_FINDER_NOTE =
  "Rule-based matching over published profiles — complementary skills and shared interests, not an AI judgement.";

export interface BioDraftInput {
  name: string;
  headline: string;
  bio: string;
  skills: string[];
  interests: string[];
  education: string;
  goals: string;
  projects: { title: string; summary: string }[];
}

export interface ProjectSummaryInput {
  title: string;
  description: string;
  role: string;
  technologies: string[];
}

export interface MatchResult {
  summary: string;
  matches: { skill: string; evidence: string }[];
  gaps: { requirement: string; note: string }[];
  suggestions: string[];
  highlights: { kind: "project" | "achievement"; title: string; why: string }[];
}

export const AI_NOTES = {
  bio:
    "AI credentials unavailable — this draft was assembled from your profile fields with templates, not generated by a model.",
  project:
    "AI credentials unavailable — this summary was cleaned up from your notes with templates, not generated by a model.",
  twin: (
    name: string,
  ) => `AI credentials unavailable — this answer was keyword-matched from ${name}'s published profile, not written by a model.`,
  match:
    "AI credentials unavailable — this is a rule-based keyword comparison of the opportunity against your profile, not an AI analysis.",
  interview: (name: string) =>
    `AI credentials unavailable — these answers were extracted from ${name}'s published profile by rules, not written by a model.`,
  roadmap:
    "AI credentials unavailable — this roadmap was assembled from a built-in skill map and your published profile, not generated by a model.",
  translation:
    "AI credentials unavailable — translation needs a model, so the original English text is shown unchanged. Nothing was machine-translated.",
} as const;

/** Answer tokenization helper: lowercase words of 3+ chars without stopwords. */
const STOPWORDS = new Set([
  "the", "and", "for", "are", "but", "not", "you", "all", "can", "her", "was",
  "one", "our", "out", "who", "get", "has", "him", "his", "how", "its", "new",
  "now", "old", "see", "two", "way", "why", "does", "did", "what", "when",
  "where", "which", "this", "that", "these", "those", "with", "from", "they",
  "them", "than", "then", "have", "had", "about", "into", "over", "such",
  "some", "any", "may", "should", "would", "could", "will", "shall", "been",
  "being", "were", "very", "more", "also", "just", "like", "well", "much",
  "many", "make", "made", "take", "tell", "use", "used", "using", "who",
  "what", "s", "t", "re", "ve", "ll", "m",
]);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s-]/g, " ")
    .split(/\s+/)
    .map((w) => w.replace(/^[-.]+|[-.]+$/g, ""))
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w));
}
