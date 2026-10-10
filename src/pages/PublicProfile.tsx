import { AIModeBadge, AIModeNote } from "@/components/AIModeBadge";
import { Brand } from "@/components/Brand";
import { CopyButton } from "@/components/CopyButton";
import { VerificationBadge } from "@/components/VerificationBadge";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import {
  ACHIEVEMENT_KIND_META,
  CHALLENGE_KIND_META,
  INTERVIEW_TRACK_META,
  LOCALE_META,
  PROJECT_STATUS_META,
  PROVENANCE_META,
  SAMPLE_SHARE_TOKEN,
  SAMPLE_SLUG,
  TRANSLATABLE_LOCALES,
  formatDate,
  initials,
  normalizeSkill,
  type AIMode,
  type InterviewResult,
  type InterviewTrack,
  type Locale,
} from "@/lib/linksphere";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  Award,
  BadgeCheck,
  FileText,
  ExternalLink,
  FolderGit2,
  Github,
  Globe,
  Instagram,
  Languages,
  Lightbulb,
  Link2,
  Linkedin,
  Loader2,
  Mail,
  MapPin,
  MessageSquare,
  Send,
  ShieldQuestion,
  Sparkles,
  Swords,
  Trophy,
  Twitter,
  UserRound,
  Waypoints,
  Youtube,
} from "lucide-react";
import { useAction, useMutation, useQuery } from "convex/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router";
import type { PublicView } from "@/convex/helpers";

export type PublicProfile = NonNullable<PublicView>;
type Translation = NonNullable<PublicProfile["translations"]>[number];

const PLATFORM_ICON: Record<string, typeof Github> = {
  GitHub: Github,
  LinkedIn: Linkedin,
  Instagram: Instagram,
  YouTube: Youtube,
  X: Twitter,
  Website: Globe,
  Email: Mail,
};

function SectionHeading({
  icon: Icon,
  title,
  subtitle,
  id,
}: {
  icon: typeof Award;
  title: string;
  subtitle?: string;
  id?: string;
}) {
  return (
    <div id={id} className="mb-5 scroll-mt-24">
      <div className="flex items-center gap-2.5">
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-4" />
        </span>
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      </div>
      {subtitle && (
        <p className="mt-1 pl-[42px] text-sm text-muted-foreground">{subtitle}</p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Skills → evidence                                                   */
/* ------------------------------------------------------------------ */

function SkillEvidence({ profile }: { profile: PublicProfile }) {
  const [selected, setSelected] = useState<string | null>(null);

  const evidenceFor = (name: string) => {
    const target = normalizeSkill(name);
    const projects = profile.projects.filter(
      (p) =>
        p.skillLinks.some((s) => normalizeSkill(s) === target) ||
        p.technologies.some((t) => normalizeSkill(t) === target),
    );
    const achievements = profile.achievements.filter((a) =>
      a.skillLinks.some((s) => normalizeSkill(s) === target),
    );
    return { projects, achievements };
  };

  const activeEvidence = selected ? evidenceFor(selected) : null;
  const hasEvidence =
    activeEvidence &&
    (activeEvidence.projects.length > 0 || activeEvidence.achievements.length > 0);

  return (
    <section className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6">
      <SectionHeading
        id="skills"
        icon={Waypoints}
        title="Skills & evidence"
        subtitle="Click a skill to see the projects and achievements that back it."
      />
      <div className="flex flex-wrap gap-2">
        {profile.skills.map((skill) => {
          const isActive = selected === skill.name;
          const { projects, achievements } = evidenceFor(skill.name);
          const count = projects.length + achievements.length;
          return (
            <button
              key={skill.id}
              type="button"
              onClick={() => setSelected(isActive ? null : skill.name)}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors",
                isActive
                  ? "border-primary/50 bg-primary/10 text-primary"
                  : "bg-muted/40 text-foreground/90 hover:bg-muted",
              )}
            >
              {skill.name}
              <span
                className={cn(
                  "rounded-full px-1.5 text-[10px] font-semibold",
                  count > 0
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                    : "bg-muted text-muted-foreground",
                )}
                title={
                  count > 0
                    ? `${count} linked evidence item${count === 1 ? "" : "s"}`
                    : "No linked evidence yet"
                }
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {selected && (
        <div className="mt-4 rounded-xl border bg-muted/30 p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold">
              Evidence for <span className="text-primary">{selected}</span>
            </p>
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setSelected(null)}
            >
              Clear
            </button>
          </div>

          {!hasEvidence ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Lightbulb className="size-4" />
              Listed as a skill, but no published project or achievement links
              to it yet — treat it as a claim, not a proven one.
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {activeEvidence.projects.map((project) => (
                <div
                  key={project._id}
                  className="flex items-start gap-2.5 rounded-lg border bg-background px-3 py-2.5"
                >
                  <FolderGit2 className="mt-0.5 size-4 shrink-0 text-primary" />
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium">{project.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      Project · {PROJECT_STATUS_META[project.status].label}
                    </p>
                  </div>
                </div>
              ))}
              {activeEvidence.achievements.map((achievement) => (
                <div
                  key={achievement._id}
                  className="flex items-start gap-2.5 rounded-lg border bg-background px-3 py-2.5"
                >
                  <Trophy className="mt-0.5 size-4 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium">{achievement.title}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <p className="truncate text-xs text-muted-foreground">
                        {ACHIEVEMENT_KIND_META[achievement.kind]}
                      </p>
                      <VerificationBadge verification={achievement.verification} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Achievement passport                                                */
/* ------------------------------------------------------------------ */

function AchievementPassport({ profile }: { profile: PublicProfile }) {
  return (
    <section className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6">
      <SectionHeading
        id="passport"
        icon={BadgeCheck}
        title="Achievement Passport"
        subtitle="A timeline of accomplishments with supporting evidence and honest verification states."
      />
      <div className="relative flex flex-col gap-4 pl-5">
        <span className="absolute left-[7px] top-2 h-full w-px bg-border" />
        {profile.achievements.map((item) => {
          const Icon =
            item.kind === "hackathon" || item.kind === "award" || item.kind === "milestone"
              ? Trophy
              : item.kind === "internship"
                ? BriefcaseIcon
                : Award;
          return (
            <article
              key={item._id}
              className="relative rounded-xl border bg-muted/20 p-4"
            >
              <span className="absolute -left-5 top-5 size-3.5 rounded-full border-2 border-card bg-primary" />
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="flex size-6 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Icon className="size-3.5" />
                    </span>
                    <h3 className="text-sm font-semibold">{item.title}</h3>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {[item.issuer, formatDate(item.occurredAt)].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <VerificationBadge verification={item.verification} />
              </div>
              {item.description && (
                <p className="mt-2 text-[13px] leading-6 text-muted-foreground">
                  {item.description}
                </p>
              )}
              <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                {item.evidence.map((link) => (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-xs font-medium text-primary transition-opacity hover:opacity-80"
                  >
                    <FileText className="size-3.5" />
                    {link.label || "Supporting evidence"}
                  </a>
                ))}
                {item.skillLinks.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    Proves: {item.skillLinks.join(", ")}
                  </span>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function BriefcaseIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* AI twin chat                                                        */
/* ------------------------------------------------------------------ */

interface ChatMessage {
  role: "visitor" | "twin";
  text: string;
  mode?: "live" | "demo";
  note?: string;
}

function TwinChat({ profile }: { profile: PublicProfile }) {
  const askTwin = useAction(api.ai.askTwin);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, asking]);

  const suggestions = [
    `What projects has ${profile.displayName.split(" ")[0]} built?`,
    "What are their strongest skills?",
    "Which projects demonstrate Python skills?",
    "Why might this person be suitable for an AI internship?",
  ];

  const ask = async (text: string) => {
    const q = text.trim();
    if (!q || asking) return;
    setQuestion("");
    setMessages((prev) => [...prev, { role: "visitor", text: q }]);
    setAsking(true);
    try {
      const result = await askTwin({ slug: profile.slug, question: q });
      setMessages((prev) => [
        ...prev,
        result.ok
          ? { role: "twin", text: result.answer, mode: result.mode, note: result.note }
          : {
              role: "twin",
              text: `Sorry — ${result.error}`,
              mode: undefined,
            },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "twin", text: "The twin is temporarily unavailable. Try again in a moment." },
      ]);
    } finally {
      setAsking(false);
    }
  };

  return (
    <section
      id="twin"
      className="scroll-mt-24 rounded-2xl border border-primary/25 bg-card p-5 shadow-[0_0_0_1px_oklch(0.72_0.14_265/0.06)] sm:p-6"
    >
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Sparkles className="size-4" />
            </span>
            <h2 className="text-lg font-semibold tracking-tight">
              Ask {profile.displayName.split(" ")[0]}'s AI twin
            </h2>
          </div>
          <p className="mt-1 pl-[42px] text-sm text-muted-foreground">
            Answers only from this published profile — it will say so when
            something isn't there.
          </p>
        </div>
        <AIModeBadge
          mode={[...messages].reverse().find((m) => m.role === "twin" && m.mode)?.mode}
        />
      </div>

      <div
        ref={scrollRef}
        className="flex max-h-96 min-h-36 flex-col gap-3 overflow-y-auto rounded-xl border bg-muted/20 p-4"
      >
        {messages.length === 0 && !asking && (
          <div className="flex flex-col items-start gap-3">
            <div className="max-w-[90%] rounded-2xl rounded-bl-md border bg-background px-3.5 py-2.5 text-[13px] leading-5 text-muted-foreground">
              Hi — ask me anything about {profile.displayName.split(" ")[0]}'s
              projects, skills or achievements.
            </div>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => ask(s)}
                  className="rounded-full border bg-background px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message, index) =>
          message.role === "visitor" ? (
            <div
              key={index}
              className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-primary px-3.5 py-2 text-[13px] leading-5 text-primary-foreground"
            >
              {message.text}
            </div>
          ) : (
            <div key={index} className="max-w-[90%]">
              <div className="rounded-2xl rounded-bl-md border bg-background px-3.5 py-2.5 text-[13px] leading-5">
                {message.text}
              </div>
              <div className="mt-1 flex items-center gap-2">
                <AIModeBadge mode={message.mode} />
                {message.note && (
                  <span className="text-[11px] text-muted-foreground">demo answer</span>
                )}
              </div>
              {message.note && (
                <div className="mt-1">
                  <AIModeNote mode={message.mode} note={message.note} />
                </div>
              )}
            </div>
          ),
        )}

        {asking && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" />
            Thinking…
          </div>
        )}
      </div>

      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          ask(question);
        }}
      >
        <Input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={`Ask about ${profile.displayName.split(" ")[0]}'s profile…`}
          maxLength={400}
        />
        <Button type="submit" disabled={asking || !question.trim()}>
          {asking ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          Ask
        </Button>
      </form>
      <p className="mt-2 text-[11px] text-muted-foreground">
        The twin only knows what's on this page. It never invents jobs, awards
        or skills.
      </p>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Proof-of-Skill challenges                                           */
/* ------------------------------------------------------------------ */

function ProfileChallenges({ profile }: { profile: PublicProfile }) {
  return (
    <section className="mt-6 rounded-2xl border border-border/80 bg-card p-5 sm:p-6">
      <SectionHeading
        id="challenges"
        icon={Swords}
        title="Proof-of-Skill challenges"
        subtitle="Challenges completed, with the submission, the outcome and the evidence attached."
      />
      <div className="grid gap-3 md:grid-cols-2">
        {profile.challenges.map((challenge) => {
          const meta = PROVENANCE_META[challenge.provenance];
          return (
            <article key={challenge._id} className="rounded-xl border bg-muted/20 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h3 className="text-[15px] font-semibold">{challenge.title}</h3>
                <Badge
                  variant="outline"
                  title={meta.hint}
                  className={cn("gap-1 px-2 py-0.5 text-[11px]", meta.badge)}
                >
                  {challenge.provenance === "platform_verified" ? (
                    <BadgeCheck className="size-3" />
                  ) : (
                    <ShieldQuestion className="size-3" />
                  )}
                  {meta.label}
                </Badge>
              </div>
              <p className="mt-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
                {CHALLENGE_KIND_META[challenge.kind]}
                {challenge.platform ? ` · ${challenge.platform}` : ""}
                {challenge.difficulty ? ` · ${challenge.difficulty}` : ""}
              </p>
              {challenge.description && (
                <p className="mt-2 text-[13px] leading-6 text-muted-foreground">
                  {challenge.description}
                </p>
              )}
              {challenge.outcome && (
                <p className="mt-2 text-[13px]">
                  <span className="text-muted-foreground">Outcome: </span>
                  {challenge.outcome}
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {challenge.skillLinks.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[11px] text-primary"
                  >
                    {skill}
                  </span>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-4 border-t pt-3 text-xs font-medium">
                {challenge.submissionUrl && (
                  <a
                    href={challenge.submissionUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-primary transition-opacity hover:opacity-80"
                  >
                    <ExternalLink className="size-3.5" />
                    Submission
                  </a>
                )}
                {challenge.evidence.map((link) => (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-primary transition-opacity hover:opacity-80"
                  >
                    <Swords className="size-3.5" />
                    {link.label || "Evidence"}
                  </a>
                ))}
              </div>
              <p className="mt-2 text-[11px] leading-5 text-muted-foreground/80">
                {challenge.provenanceNote || meta.hint}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* AI Interview Mode                                                   */
/* ------------------------------------------------------------------ */

function InterviewMode({ profile }: { profile: PublicProfile }) {
  const runInterview = useAction(api.ai.runInterview);
  const [track, setTrack] = useState<InterviewTrack>("recruiter");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<{
    result: InterviewResult;
    mode: AIMode;
    note?: string;
  } | null>(null);

  const run = async (nextTrack: InterviewTrack) => {
    setTrack(nextTrack);
    setLoading(true);
    setOutcome(null);
    setError(null);
    try {
      const result = await runInterview({ slug: profile.slug, track: nextTrack });
      if (result.ok) {
        setOutcome({
          result: result.result,
          mode: result.mode,
          note: result.note,
        });
      } else {
        // Show why nothing happened instead of failing silently.
        setError(result.error);
      }
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The interview is unavailable right now.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <section
      id="interview"
      className="mt-6 scroll-mt-24 rounded-2xl border border-primary/25 bg-card p-5 sm:p-6"
    >
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <MessageSquare className="size-4" />
            </span>
            <h2 className="text-lg font-semibold tracking-tight">AI Interview Mode</h2>
          </div>
          <p className="mt-1 max-w-2xl pl-[42px] text-sm text-muted-foreground">
            Structured questions about {profile.displayName.split(" ")[0]}&apos;s
            published skills, projects and achievements — each answer links the
            evidence behind it, and anything missing is named instead of invented.
          </p>
        </div>
        {outcome && <AIModeBadge mode={outcome.mode} />}
      </div>

      <div className="flex flex-wrap gap-2">
        {(Object.keys(INTERVIEW_TRACK_META) as InterviewTrack[]).map((key) => (
          <button
            key={key}
            type="button"
            disabled={loading}
            onClick={() => run(key)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              track === key && outcome
                ? "border-primary/50 bg-primary/10 text-primary"
                : "bg-muted/40 text-muted-foreground hover:bg-muted",
            )}
            title={INTERVIEW_TRACK_META[key].blurb}
          >
            {INTERVIEW_TRACK_META[key].label} interview
          </button>
        ))}
      </div>

      {loading && (
        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" />
          Going through the published profile…
        </div>
      )}

      {!loading && !outcome && !error && (
        <p className="mt-4 rounded-xl border border-dashed bg-muted/30 px-4 py-4 text-[13px] leading-6 text-muted-foreground">
          Pick an interview track to see evidence-linked answers. Answers come
          only from this profile — questions it cannot answer are reported as
          missing information, never guessed.
        </p>
      )}

      {!loading && error && (
        <p className="mt-4 rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-3.5 text-[13px] leading-6 text-muted-foreground">
          {error}
        </p>
      )}

      {!loading && outcome && (
        <div className="mt-4 flex flex-col gap-3">
          {outcome.result.answers.map((answer, index) => (
            <div
              key={`${answer.question}-${index}`}
              className="rounded-xl border bg-muted/20 px-4 py-3.5"
            >
              <p className="text-[13px] font-semibold">{answer.question}</p>
              <p
                className={cn(
                  "mt-1.5 text-[13px] leading-6",
                  answer.answered ? "text-foreground/90" : "text-muted-foreground italic",
                )}
              >
                {answer.answer}
              </p>
              {answer.evidence.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {answer.evidence.map((item, evidenceIndex) =>
                    item.url ? (
                      <a
                        key={`${item.title}-${evidenceIndex}`}
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                      >
                        {item.kind === "project" ? (
                          <FolderGit2 className="size-3" />
                        ) : item.kind === "challenge" ? (
                          <Swords className="size-3" />
                        ) : (
                          <Trophy className="size-3" />
                        )}
                        {item.title}
                      </a>
                    ) : (
                      <span
                        key={`${item.title}-${evidenceIndex}`}
                        className="flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] text-muted-foreground"
                      >
                        {item.kind === "project" ? (
                          <FolderGit2 className="size-3" />
                        ) : item.kind === "challenge" ? (
                          <Swords className="size-3" />
                        ) : (
                          <Trophy className="size-3" />
                        )}
                        {item.title}
                      </span>
                    ),
                  )}
                </div>
              )}
            </div>
          ))}

          {outcome.result.gaps.length > 0 && (
            <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-3.5">
              <p className="text-[13px] font-semibold">
                Not on this profile yet
              </p>
              <ul className="mt-1.5 grid gap-1">
                {outcome.result.gaps.map((gap) => (
                  <li
                    key={gap}
                    className="flex items-start gap-2 text-[13px] leading-6 text-muted-foreground"
                  >
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-amber-500" />
                    {gap}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {outcome.note && <AIModeNote mode={outcome.mode} note={outcome.note} />}
          <p className="text-[11px] text-muted-foreground">
            Evidence is matched from the published profile — the wording is
            assisted, the proof is not.
          </p>
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

const SECTION_ANCHORS = [
  { href: "#about", label: "About", Icon: UserRound },
  { href: "#skills", label: "Skills", Icon: Waypoints },
  { href: "#projects", label: "Projects", Icon: FolderGit2 },
  { href: "#challenges", label: "Challenges", Icon: Swords },
  { href: "#passport", label: "Passport", Icon: BadgeCheck },
  { href: "#interview", label: "Interview", Icon: MessageSquare },
  { href: "#twin", label: "AI twin", Icon: Sparkles },
] as const;

/**
 * Renders a published profile. Shared by the public page and Smart Share
 * Profiles — `banner` lets the share view explain which tailored view you are
 * looking at, and translations only ever arrive from the public query.
 */
export function ProfileView({
  profile,
  banner,
}: {
  profile: PublicProfile;
  banner?: ReactNode;
}) {
  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}/p/${profile.slug}`
      : "";

  const translations = profile.translations ?? [];
  const [locale, setLocale] = useState<Locale>("en");
  const translation: Translation | null =
    locale === "en"
      ? null
      : translations.find((item) => item.locale === locale) ?? null;

  // A translation only ever substitutes the prose fields; project titles,
  // technology names and links always stay exactly as published.
  const headline = translation?.headline?.trim() || profile.headline;
  const about = profile.about
    ? {
        ...profile.about,
        bio: translation?.bio?.trim() || profile.about.bio,
        goals: translation?.goals?.trim() || profile.about.goals,
        education: translation?.education?.trim() || profile.about.education,
        interests: translation?.interests.length
          ? translation.interests
          : profile.about.interests,
      }
    : null;

  return (
    <>
      {banner}

      {/* Sample banner */}
      {profile.isSample && (
        <div className="mb-6 flex flex-col gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-[13px] leading-6 text-amber-700 dark:text-amber-300">
          <p>
            <strong className="font-semibold">Sample profile.</strong> All content
            on this page is clearly labelled demonstration data for LinkSphere AI
            — not a real person's verified history. No entry here is marked
            “Verified”.
          </p>
          <Link
            to={`/s/${SAMPLE_SHARE_TOKEN}`}
            className="flex items-center gap-1.5 text-xs font-medium underline decoration-amber-500/50 underline-offset-2 transition-opacity hover:opacity-80"
          >
            <ExternalLink className="size-3.5" />
            See a tailored recruiter view of this sample profile
          </Link>
        </div>
      )}

      {/* Header */}
      <header className="rounded-2xl border border-border/80 bg-card p-5 sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/15 text-xl font-semibold text-primary sm:size-20">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt=""
                  className="size-full rounded-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                initials(profile.displayName)
              )}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                  {profile.displayName}
                </h1>
                {profile.isSample && (
                  <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                    Sample
                  </span>
                )}
              </div>
              {headline && (
                <p className="mt-1 text-[15px] text-muted-foreground">{headline}</p>
              )}
              {translation && (
                <Badge
                  variant="outline"
                  className="mt-2 border-primary/30 bg-primary/10 text-primary"
                >
                  <Languages className="size-3" />
                  {LOCALE_META[translation.locale].label} · AI translated
                </Badge>
              )}
              {about?.location && (
                <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="size-3.5" />
                  {about.location}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {translations.length > 0 && (
              <div className="flex items-center gap-0.5 rounded-lg border bg-muted/30 p-1">
                <Languages className="mx-1.5 size-3.5 text-muted-foreground" />
                <button
                  type="button"
                  onClick={() => setLocale("en")}
                  className={cn(
                    "rounded-md px-2 py-1 text-xs font-medium transition-colors",
                    locale === "en"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {LOCALE_META.en.native}
                </button>
                {TRANSLATABLE_LOCALES.map((code) => {
                  const available = translations.some((item) => item.locale === code);
                  return (
                    <button
                      key={code}
                      type="button"
                      disabled={!available}
                      onClick={() => setLocale(code)}
                      title={
                        available
                          ? LOCALE_META[code].label
                          : `No ${LOCALE_META[code].label} version published`
                      }
                      className={cn(
                        "rounded-md px-2 py-1 text-xs font-medium transition-colors",
                        locale === code
                          ? "bg-background text-foreground shadow-sm"
                          : available
                            ? "text-muted-foreground hover:text-foreground"
                            : "cursor-not-allowed text-muted-foreground/40",
                      )}
                    >
                      {LOCALE_META[code].native}
                    </button>
                  );
                })}
              </div>
            )}
            <CopyButton value={url} />
            {profile.contact?.resumeUrl && (
              <Button size="sm" variant="outline" asChild>
                <a href={profile.contact.resumeUrl} target="_blank" rel="noreferrer">
                  <FileText className="size-4" />
                  Resume
                </a>
              </Button>
            )}
            {profile.twinEnabled && (
              <Button size="sm" asChild>
                <a href="#twin">
                  <Sparkles className="size-4" />
                  Ask AI twin
                </a>
              </Button>
            )}
          </div>
        </div>

        {/* Stats + socials */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t pt-4">
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {[
              [profile.projects.length, "Projects"],
              [profile.achievements.length, "Achievements"],
              [profile.challenges.length, "Challenges"],
              [profile.skills.length, "Skills"],
            ].map(([value, label]) => (
              <div key={String(label)} className="flex items-baseline gap-1.5">
                <span className="text-lg font-semibold">{value}</span>
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(profile.contact?.socials ?? []).map((social) => {
              const Icon = PLATFORM_ICON[social.platform] ?? Globe;
              return (
                <a
                  key={social.id}
                  href={social.url}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={social.platform}
                  title={social.platform}
                  className="flex size-9 items-center justify-center rounded-lg border bg-muted/40 text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                >
                  <Icon className="size-4" />
                </a>
              );
            })}
          </div>
        </div>

        {/* Section nav */}
        <nav className="mt-4 flex flex-wrap gap-2 border-t pt-4 text-xs">
          {SECTION_ANCHORS.map(({ href, label, Icon }) => (
            <a
              key={href}
              href={href}
              className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
            >
              <Icon className="size-3.5" />
              {label}
            </a>
          ))}
        </nav>
      </header>

      {/* About */}
      {about && (
        <section className="mt-6 rounded-2xl border border-border/80 bg-card p-5 sm:p-6">
          <SectionHeading id="about" icon={UserRound} title="About" />
          {translation && (
            <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-primary/25 bg-primary/5 px-3.5 py-2.5 text-xs leading-5">
              <Languages className="size-3.5 shrink-0 text-primary" />
              <span className="flex-1">
                Showing the {LOCALE_META[translation.locale].label} version of this
                profile. The owner reviewed the AI translation; project names,
                technologies and links stay exactly as published.
              </span>
              <AIModeBadge mode={translation.mode} />
            </div>
          )}
          {about.bio ? (
            <p className="max-w-3xl text-[15px] leading-7 text-foreground/90">
              {about.bio}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              This person hasn&apos;t added a bio yet.
            </p>
          )}
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {about.education && (
              <div className="rounded-xl border bg-muted/30 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Education
                </p>
                <p className="mt-1 text-sm">{about.education}</p>
              </div>
            )}
            {about.goals && (
              <div className="rounded-xl border bg-muted/30 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Goal
                </p>
                <p className="mt-1 text-sm">{about.goals}</p>
              </div>
            )}
          </div>
          {about.interests.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {about.interests.map((interest) => (
                <span
                  key={interest}
                  className="rounded-full border bg-muted/30 px-3 py-1 text-xs text-muted-foreground"
                >
                  {interest}
                </span>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Skills */}
      {profile.skills.length > 0 && (
        <div className="mt-6">
          <SkillEvidence profile={profile} />
        </div>
      )}

      {/* Projects */}
      {profile.projects.length > 0 && (
        <section className="mt-6 rounded-2xl border border-border/80 bg-card p-5 sm:p-6">
          <SectionHeading
            id="projects"
            icon={FolderGit2}
            title="Projects"
            subtitle="What they've actually built — with the stack behind each one."
          />
          <div className="grid gap-4 md:grid-cols-2">
            {profile.projects.map((project) => (
              <article
                key={project._id}
                className="flex flex-col rounded-xl border bg-muted/20 p-4 transition-shadow hover:shadow-[0_12px_32px_-24px_rgba(16,24,40,0.4)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-[15px] font-semibold">{project.title}</h3>
                  <span className="flex shrink-0 items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span
                      className={cn(
                        "size-1.5 rounded-full",
                        PROJECT_STATUS_META[project.status].dot,
                      )}
                    />
                    {PROJECT_STATUS_META[project.status].label}
                  </span>
                </div>
                {project.summary && (
                  <p className="mt-1.5 text-[13px] leading-6 text-muted-foreground">
                    {project.summary}
                  </p>
                )}
                {(project.problem || project.solution) && (
                  <div className="mt-3 grid gap-2">
                    {project.problem && (
                      <div className="rounded-lg bg-background px-3 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Problem
                        </p>
                        <p className="mt-0.5 text-xs leading-5">{project.problem}</p>
                      </div>
                    )}
                    {project.solution && (
                      <div className="rounded-lg bg-background px-3 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Solution
                        </p>
                        <p className="mt-0.5 text-xs leading-5">{project.solution}</p>
                      </div>
                    )}
                  </div>
                )}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {project.technologies.map((tech) => (
                    <span
                      key={tech}
                      className="rounded-full border bg-background px-2.5 py-0.5 text-[11px] text-muted-foreground"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
                <div className="mt-auto flex flex-wrap gap-4 border-t pt-3 text-xs font-medium">
                  {project.role && (
                    <span className="text-muted-foreground">Role: {project.role}</span>
                  )}
                  {project.repoUrl && (
                    <a
                      href={project.repoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 text-primary transition-opacity hover:opacity-80"
                    >
                      <Github className="size-3.5" />
                      Repository
                    </a>
                  )}
                  {project.demoUrl && (
                    <a
                      href={project.demoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 text-primary transition-opacity hover:opacity-80"
                    >
                      <Link2 className="size-3.5" />
                      Live demo
                    </a>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Passport */}
      {profile.achievements.length > 0 && (
        <div className="mt-6">
          <AchievementPassport profile={profile} />
        </div>
      )}

      {/* Proof-of-Skill challenges */}
      {profile.challenges.length > 0 && <ProfileChallenges profile={profile} />}

      {/* AI Interview Mode */}
      {profile.twinEnabled && (
        <InterviewMode profile={profile} />
      )}

      {/* Twin */}
      {profile.twinEnabled && (
        <div className="mt-6">
          <TwinChat profile={profile} />
        </div>
      )}

      {/* Nothing published */}
      {!about &&
        profile.skills.length === 0 &&
        profile.projects.length === 0 &&
        profile.achievements.length === 0 &&
        profile.challenges.length === 0 && (
          <div className="mt-6 rounded-2xl border border-dashed bg-muted/30 px-6 py-10 text-center text-sm text-muted-foreground">
            This profile hasn&apos;t published any sections yet.
          </div>
        )}

      {/* Footer CTA */}
      <footer className="mt-10 rounded-2xl border border-border/80 bg-card px-6 py-8 text-center">
        <h2 className="text-lg font-semibold tracking-tight">
          One link. Your entire journey.
        </h2>
        <p className="mx-auto mt-1.5 max-w-md text-sm text-muted-foreground">
          Build your own AI-powered identity hub with an achievement passport
          and an AI twin that answers for you.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link to="/auth">
              Create your hub
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/">Back to home</Link>
          </Button>
        </div>
      </footer>
    </>
  );
}

export default function PublicProfile({ slug }: { slug: string }) {
  const profile = useQuery(api.publicData.getPublishedProfile, { slug });
  const ensureSample = useMutation(api.seed.ensureSample);
  const seeded = useRef(false);

  const isSampleSlug = slug === SAMPLE_SLUG;
  useEffect(() => {
    if (isSampleSlug && profile === null && !seeded.current) {
      seeded.current = true;
      ensureSample().catch((error) =>
        console.error("Sample seed failed:", error),
      );
    }
  }, [isSampleSlug, profile, ensureSample]);

  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}/p/${slug}`
      : "";

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <Brand className="text-sm" />
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button size="sm" variant="outline" asChild>
              <Link to="/auth">Create yours</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
        {profile === undefined ? (
          <div className="flex flex-col gap-4">
            <Skeleton className="h-40 w-full rounded-2xl" />
            <Skeleton className="h-32 w-full rounded-2xl" />
            <Skeleton className="h-64 w-full rounded-2xl" />
          </div>
        ) : profile === null ? (
          <div className="mx-auto mt-16 max-w-md rounded-2xl border bg-card p-8 text-center">
            <div className="mx-auto mb-4 flex size-11 items-center justify-center rounded-full bg-muted">
              <UserRound className="size-5 text-muted-foreground" />
            </div>
            <h1 className="text-lg font-semibold">Profile not found</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              This link doesn&apos;t point to a published profile — it may have
              been unpublished, deleted, or never existed.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <Button size="sm" variant="outline" asChild>
                <Link to="/">Go home</Link>
              </Button>
              <Button size="sm" asChild>
                <Link to="/auth">Create your own profile</Link>
              </Button>
            </div>
            <p className="mt-4 break-all text-[11px] text-muted-foreground">
              {url}
            </p>
          </div>
        ) : (
          <ProfileView profile={profile} />
        )}
      </main>
    </div>
  );
}
