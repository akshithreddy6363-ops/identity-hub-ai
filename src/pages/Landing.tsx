import { AIModeBadge } from "@/components/AIModeBadge";
import { Brand, BrandMark } from "@/components/Brand";
import { ThemeToggle } from "@/components/ThemeToggle";
import { VerificationBadge } from "@/components/VerificationBadge";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { SAMPLE_SLUG } from "@/lib/linksphere";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  ChevronRight,
  CircleCheck,
  ExternalLink,
  FolderGit2,
  Link2,
  MessagesSquare,
  PenLine,
  ShieldCheck,
  Sparkles,
  SunMoon,
  Target,
  Waypoints,
} from "lucide-react";
import { useMutation } from "convex/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router";

/* ------------------------------------------------------------------ */
/* Shared bits                                                         */
/* ------------------------------------------------------------------ */

const SAMPLE_URL = `/p/${SAMPLE_SLUG}`;

function Section({
  id,
  children,
  className,
}: {
  id?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={cn("mx-auto w-full max-w-6xl scroll-mt-24 px-5 sm:px-8", className)}
    >
      {children}
    </section>
  );
}

function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
}: {
  eyebrow: string;
  title: string;
  description?: string;
  align?: "center" | "left";
}) {
  return (
    <Reveal
      className={cn(
        "max-w-2xl",
        align === "center" ? "mx-auto text-center" : "text-left",
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
        {eyebrow}
      </p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
        {title}
      </h2>
      {description && (
        <p className="mt-4 text-[15px] leading-7 text-muted-foreground">
          {description}
        </p>
      )}
    </Reveal>
  );
}

/* ------------------------------------------------------------------ */
/* Header                                                              */
/* ------------------------------------------------------------------ */

function SiteHeader() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link to="/" aria-label="LinkSphere AI home">
          <Brand />
        </Link>

        <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
          <a href="#chain" className="transition-colors hover:text-foreground">
            Evidence chain
          </a>
          <a href="#features" className="transition-colors hover:text-foreground">
            Features
          </a>
          <a href="#sample" className="transition-colors hover:text-foreground">
            Sample profile
          </a>
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {!isLoading && isAuthenticated ? (
            <Button size="sm" asChild>
              <Link to="/dashboard">Open dashboard</Link>
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" className="hidden sm:inline-flex" asChild>
                <Link to="/auth">Sign in</Link>
              </Button>
              <Button size="sm" asChild>
                <Link to="/auth">Get started</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Hero preview card                                                   */
/* ------------------------------------------------------------------ */

type PreviewTab = "profile" | "passport" | "twin";

function HeroPreview() {
  const [tab, setTab] = useState<PreviewTab>("profile");

  const tabs: { id: PreviewTab; label: string }[] = [
    { id: "profile", label: "Profile" },
    { id: "passport", label: "Passport" },
    { id: "twin", label: "AI Twin" },
  ];

  return (
    <div className="relative">
      <div
        aria-hidden
        className="absolute -inset-6 rounded-[2rem] bg-[radial-gradient(60%_60%_at_50%_0%,oklch(0.72_0.14_265/0.14),transparent_70%)]"
      />
      <div className="relative rounded-2xl border border-border/80 bg-card p-4 shadow-[0_24px_60px_-24px_rgba(16,24,40,0.35)] sm:p-5">
        {/* Browser-ish top row */}
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 rounded-full border bg-muted/50 px-3 py-1 text-[11px] font-medium text-muted-foreground">
            <Link2 className="size-3" />
            linksphere.app{SAMPLE_URL}
          </div>
          <div className="flex rounded-lg border bg-muted/40 p-0.5">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors",
                  tab === t.id
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28 }}
          className="min-h-[266px]"
        >
          {tab === "profile" && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3.5">
                <div className="flex size-14 items-center justify-center rounded-full bg-primary/15 text-lg font-semibold text-primary">
                  AM
                </div>
                <div>
                  <p className="text-[15px] font-semibold tracking-tight">
                    Aarav Mehta
                  </p>
                  <p className="text-[13px] text-muted-foreground">
                    CS student · Full-stack & applied-AI builder
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground/80">
                    Bengaluru, India
                  </p>
                </div>
              </div>
              <p className="text-[13px] leading-6 text-muted-foreground">
                I build practical web and machine-learning tools — from
                crop-disease detection to real-time transit dashboards.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {["Python", "React", "PyTorch", "FastAPI", "PostgreSQL"].map((s) => (
                  <span
                    key={s}
                    className="rounded-full border bg-muted/50 px-2.5 py-1 text-[11px] font-medium"
                  >
                    {s}
                  </span>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  ["3", "Projects"],
                  ["5", "Achievements"],
                  ["9", "Skills"],
                ].map(([value, label]) => (
                  <div key={label} className="rounded-lg border bg-muted/30 py-2">
                    <p className="text-sm font-semibold">{value}</p>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      {label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "passport" && (
            <div className="flex flex-col gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Achievement Passport
              </p>
              {[
                {
                  title: "Winner — AgriTech track, IndiaHack 2025",
                  meta: "Hackathon · Mar 2025",
                  verification: "self_reported" as const,
                },
                {
                  title: "Deep Learning Specialization",
                  meta: "DeepLearning.AI · Mar 2025",
                  verification: "pending" as const,
                },
                {
                  title: "Software Engineering Intern",
                  meta: "Finlytics · Dec 2024",
                  verification: "self_reported" as const,
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium">{item.title}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {item.meta}
                    </p>
                  </div>
                  <VerificationBadge verification={item.verification} />
                </div>
              ))}
              <p className="text-[11px] leading-5 text-muted-foreground">
                Every entry carries supporting evidence — nothing is labelled
                “Verified” unless it actually was.
              </p>
            </div>
          )}

          {tab === "twin" && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  AI Personal Twin
                </p>
                <AIModeBadge mode="live" />
              </div>
              <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-primary px-3.5 py-2 text-[13px] leading-5 text-primary-foreground">
                Which projects demonstrate their Python skills?
              </div>
              <div className="max-w-[92%] rounded-2xl rounded-bl-md border bg-muted/40 px-3.5 py-2.5 text-[13px] leading-5">
                CropSense uses Python and PyTorch for crop-disease detection, and
                their internship shipped a FastAPI reporting service.
              </div>
              <div className="max-w-[92%] rounded-2xl rounded-bl-md border bg-muted/40 px-3.5 py-2.5 text-[13px] leading-5 text-muted-foreground">
                I don&apos;t have that information on this profile yet.
              </div>
              <div className="mt-1 flex items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-[12px] text-muted-foreground">
                <Sparkles className="size-3.5 text-primary" />
                Answers only from published profile data
              </div>
            </div>
          )}
        </motion.div>

        <Link
          to={SAMPLE_URL}
          className="mt-4 flex items-center justify-center gap-1.5 rounded-lg border py-2 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          Open the live sample profile
          <ArrowUpRight className="size-3.5" />
        </Link>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Evidence chain                                                      */
/* ------------------------------------------------------------------ */

const CHAIN = [
  { icon: Waypoints, label: "Skills", note: "What you claim" },
  { icon: FolderGit2, label: "Projects", note: "What you built" },
  { icon: ShieldCheck, label: "Evidence", note: "Proof attached" },
  { icon: BadgeCheck, label: "Achievements", note: "What you earned" },
  { icon: Target, label: "Opportunities", note: "What matches" },
];

function EvidenceChain() {
  return (
    <Section id="chain" className="py-20 sm:py-24">
      <SectionHeading
        eyebrow="The differentiator"
        title="Skills → Projects → Evidence → Achievements → Opportunities"
        description="Most link pages stop at claims. LinkSphere connects every skill to the projects that prove it and the achievements that back it, so visitors see not just what someone knows — but how they've shown it."
      />
      <Reveal delay={0.1} className="mt-12">
        <div className="flex flex-col items-stretch gap-3 md:flex-row md:items-center">
          {CHAIN.map((node, index) => (
            <div key={node.label} className="flex flex-1 items-center gap-3">
              <div className="flex flex-1 flex-col items-center rounded-xl border border-border/80 bg-card px-3 py-5 text-center transition-transform hover:-translate-y-0.5">
                <div className="mb-2.5 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <node.icon className="size-5" />
                </div>
                <p className="text-sm font-semibold">{node.label}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{node.note}</p>
              </div>
              {index < CHAIN.length - 1 && (
                <ChevronRight className="hidden size-4 shrink-0 text-muted-foreground/60 md:block" />
              )}
            </div>
          ))}
        </div>
      </Reveal>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* Spotlight features                                                  */
/* ------------------------------------------------------------------ */

const SPOTLIGHTS = [
  {
    icon: MessagesSquare,
    title: "AI Personal Twin",
    description:
      "Visitors ask a profile questions in plain language. The twin answers only from what the owner published — and says so plainly when something isn't there.",
    points: ["Grounded in published data only", "Never invents credentials", "Works on every public profile"],
    mock: "twin" as const,
  },
  {
    icon: BadgeCheck,
    title: "Achievement Passport",
    description:
      "Hackathons, certificates, internships, awards and milestones as a timeline — each entry with supporting links and an honest verification state.",
    points: ["Evidence link per entry", "Self-reported vs verified", "Filter-free, no inflated claims"],
    mock: "passport" as const,
  },
  {
    icon: Target,
    title: "AI Opportunity Matcher",
    description:
      "Paste a job, internship, scholarship or hackathon brief. Get matched skills with evidence, missing requirements stated honestly, and what to highlight.",
    points: ["Real matches from your data", "Gaps called out, not hidden", "No selection guarantees"],
    mock: "matcher" as const,
  },
];

function SpotlightMock({ kind }: { kind: "twin" | "passport" | "matcher" }) {
  if (kind === "twin") {
    return (
      <div className="flex flex-col gap-2.5">
        <div className="ml-auto max-w-[80%] rounded-xl rounded-br-sm bg-primary px-3 py-2 text-[12px] leading-5 text-primary-foreground">
          Why is this person a good fit for an AI internship?
        </div>
        <div className="max-w-[90%] rounded-xl rounded-bl-sm border bg-muted/40 px-3 py-2 text-[12px] leading-5">
          Their CropSense project applies PyTorch in production and they hold a
          Deep Learning certificate — both published on this profile.
        </div>
        <AIModeBadge mode="live" className="self-start" />
      </div>
    );
  }
  if (kind === "passport") {
    return (
      <div className="relative flex flex-col gap-3 pl-4">
        <span className="absolute left-[3px] top-1 h-full w-px bg-border" />
        {[
          { t: "AgriTech winner, IndiaHack 2025", v: "self_reported" as const },
          { t: "Deep Learning Specialization", v: "pending" as const },
          { t: "SWE Intern, Finlytics", v: "self_reported" as const },
        ].map((row) => (
          <div key={row.t} className="relative flex items-center justify-between gap-2">
            <span className="absolute -left-4 top-2 size-[7px] rounded-full bg-primary" />
            <p className="truncate text-[12px] font-medium">{row.t}</p>
            <VerificationBadge verification={row.v} />
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2.5">
      {[
        { ok: true, text: "Python — shown by project CropSense" },
        { ok: true, text: "React — shown by TransitPulse" },
        { ok: false, text: "Docker — not in your profile" },
      ].map((row) => (
        <div
          key={row.text}
          className={cn(
            "flex items-center gap-2 rounded-lg border px-3 py-2 text-[12px]",
            row.ok ? "border-emerald-500/25 bg-emerald-500/5" : "border-border bg-muted/30",
          )}
        >
          <CircleCheck
            className={cn("size-3.5", row.ok ? "text-emerald-500" : "text-muted-foreground/50")}
          />
          <span className={row.ok ? "" : "text-muted-foreground line-through decoration-border"}>
            {row.text}
          </span>
        </div>
      ))}
      <p className="text-[11px] text-muted-foreground">
        Missing requirements are shown as-is — never softened.
      </p>
    </div>
  );
}

function SpotlightFeatures() {
  return (
    <Section id="features" className="py-20 sm:py-24">
      <SectionHeading
        eyebrow="Built for the demo"
        title="Three features that do real work"
        description="Not mockups: the Personal Twin, the Achievement Passport and the Opportunity Matcher are live on every profile in this app."
      />
      <div className="mt-12 grid gap-5 md:grid-cols-3">
        {SPOTLIGHTS.map((feature, index) => (
          <Reveal key={feature.title} delay={index * 0.08}>
            <div className="flex h-full flex-col rounded-2xl border border-border/80 bg-card p-5 transition-shadow hover:shadow-[0_16px_40px_-24px_rgba(16,24,40,0.4)]">
              <div className="mb-4 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <feature.icon className="size-5" />
              </div>
              <h3 className="text-base font-semibold tracking-tight">{feature.title}</h3>
              <p className="mt-2 text-[13px] leading-6 text-muted-foreground">
                {feature.description}
              </p>
              <div className="my-4 rounded-xl border bg-muted/20 p-3.5">
                <SpotlightMock kind={feature.mock} />
              </div>
              <ul className="mt-auto flex flex-col gap-1.5">
                {feature.points.map((point) => (
                  <li
                    key={point}
                    className="flex items-start gap-2 text-[12px] leading-5 text-muted-foreground"
                  >
                    <CircleCheck className="mt-0.5 size-3.5 shrink-0 text-primary/80" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* Secondary features                                                  */
/* ------------------------------------------------------------------ */

const SECONDARY = [
  { icon: PenLine, title: "AI bio & summary drafts", note: "Turn rough notes into a polished bio — review before publishing." },
  { icon: FolderGit2, title: "Project showcase", note: "Problem, solution, stack, repo and live demo in one card." },
  { icon: Waypoints, title: "Skills with evidence", note: "Click a skill to see the projects and achievements behind it." },
  { icon: Link2, title: "One shareable URL", note: "A permanent link that keeps working as your profile evolves." },
  { icon: ShieldCheck, title: "Privacy controls", note: "Choose which sections are public — drafts stay in your dashboard." },
  { icon: SunMoon, title: "Light & dark, any screen", note: "Crisp, responsive and readable from phone to desktop." },
];

function SecondaryFeatures() {
  return (
    <Section className="py-20 sm:py-24">
      <SectionHeading
        eyebrow="Everything else"
        title="A complete identity hub, not just a link list"
      />
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SECONDARY.map((item, index) => (
          <Reveal key={item.title} delay={(index % 3) * 0.06}>
            <div className="h-full rounded-xl border border-border/80 bg-card p-4 transition-colors hover:border-primary/40">
              <div className="mb-3 flex size-9 items-center justify-center rounded-lg bg-muted text-foreground">
                <item.icon className="size-4" />
              </div>
              <p className="text-sm font-semibold">{item.title}</p>
              <p className="mt-1 text-[13px] leading-6 text-muted-foreground">
                {item.note}
              </p>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* Sample preview (live iframe)                                        */
/* ------------------------------------------------------------------ */

function SamplePreview() {
  return (
    <Section id="sample" className="py-20 sm:py-24">
      <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.4fr]">
        <Reveal>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Sample profile
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            A full profile, clearly labelled as demo data
          </h2>
          <p className="mt-4 text-[15px] leading-7 text-muted-foreground">
            Explore a complete identity hub: the Achievement Passport with
            evidence links, skills that open their proof, and an AI twin you can
            question right on the page. Sample entries are badged — and no
            sample achievement pretends to be verified.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild>
              <Link to={SAMPLE_URL}>
                Open sample profile
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/auth">Create your own</Link>
            </Button>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-[0_24px_60px_-30px_rgba(16,24,40,0.5)]">
            <div className="flex items-center gap-2 border-b bg-muted/40 px-4 py-2.5">
              <span className="size-2.5 rounded-full bg-muted-foreground/30" />
              <span className="size-2.5 rounded-full bg-muted-foreground/30" />
              <span className="size-2.5 rounded-full bg-muted-foreground/30" />
              <span className="ml-2 flex-1 truncate rounded-md bg-background px-2.5 py-1 text-[11px] text-muted-foreground">
                linksphere.app{SAMPLE_URL}
              </span>
            </div>
            <iframe
              src={SAMPLE_URL}
              title="LinkSphere AI sample public profile"
              loading="lazy"
              className="h-[520px] w-full bg-background"
            />
          </div>
        </Reveal>
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* How it works + CTA + footer                                         */
/* ------------------------------------------------------------------ */

const STEPS = [
  {
    title: "Build your hub",
    note: "Name, headline, skills and links — draft the bio with AI and edit before saving.",
  },
  {
    title: "Attach the evidence",
    note: "Add projects and passport entries, then link each one to the skills it proves.",
  },
  {
    title: "Share one link",
    note: "Publish your URL. The AI twin answers questions and the matcher preps you for openings.",
  },
];

function HowItWorks() {
  return (
    <Section className="py-20 sm:py-24">
      <SectionHeading eyebrow="How it works" title="Live in three steps" />
      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {STEPS.map((step, index) => (
          <Reveal key={step.title} delay={index * 0.08}>
            <div className="h-full rounded-2xl border border-border/80 bg-card p-5">
              <span className="text-xs font-semibold text-primary">
                Step {index + 1}
              </span>
              <p className="mt-2 text-base font-semibold tracking-tight">{step.title}</p>
              <p className="mt-2 text-[13px] leading-6 text-muted-foreground">
                {step.note}
              </p>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

function FinalCTA() {
  const { isAuthenticated } = useAuth();
  return (
    <Section className="pb-24">
      <Reveal>
        <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-card px-6 py-14 text-center sm:px-12">
          <div
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(70%_100%_at_50%_0%,oklch(0.72_0.14_265/0.12),transparent_70%)]"
          />
          <div className="relative">
            <BrandMark className="mx-auto size-10 text-primary" />
            <h2 className="mx-auto mt-5 max-w-xl text-3xl font-semibold tracking-tight sm:text-4xl">
              One link. Your entire journey. Your next opportunity.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-[15px] leading-7 text-muted-foreground">
              Set up your identity hub in minutes — then let the evidence do the
              talking.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button size="lg" asChild>
                <Link to={isAuthenticated ? "/dashboard" : "/auth"}>
                  {isAuthenticated ? "Open your dashboard" : "Claim your link"}
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to={SAMPLE_URL}>
                  Explore a sample
                  <ExternalLink className="size-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </Reveal>
    </Section>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-border/70">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-12 sm:px-8 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Brand />
          <p className="mt-3 max-w-xs text-sm leading-6 text-muted-foreground">
            Your AI-powered personal identity hub. Skills connected to projects,
            projects connected to proof.
          </p>
          <p className="mt-4 text-xs leading-5 text-muted-foreground/70">
            Sample content is clearly labelled. Verification states are honest
            by design: nothing shows “Verified” unless it was verified.
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Explore
          </p>
          <ul className="mt-3 flex flex-col gap-2 text-sm text-muted-foreground">
            <li><a href="#features" className="hover:text-foreground">Features</a></li>
            <li><a href="#chain" className="hover:text-foreground">Evidence chain</a></li>
            <li><Link to={SAMPLE_URL} className="hover:text-foreground">Sample profile</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Account
          </p>
          <ul className="mt-3 flex flex-col gap-2 text-sm text-muted-foreground">
            <li><Link to="/auth" className="hover:text-foreground">Sign in</Link></li>
            <li><Link to="/auth" className="hover:text-foreground">Create account</Link></li>
            <li><Link to="/dashboard" className="hover:text-foreground">Dashboard</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/70 py-5 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} LinkSphere AI — built for creators, students
        and professionals.
      </div>
    </footer>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function Landing() {
  const ensureSample = useMutation(api.seed.ensureSample);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    // Idempotent: creates the clearly-labelled demo profile on first load.
    ensureSample().catch((error) => console.error("Sample seed failed:", error));
  }, [ensureSample]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="min-h-screen bg-background text-foreground"
    >
      <SiteHeader />
      <main>
        {/* Hero */}
        <Section className="grid items-center gap-12 pb-20 pt-16 lg:grid-cols-2 lg:pb-24 lg:pt-24">
          <div>
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground">
                <span className="size-1.5 animate-pulse rounded-full bg-primary" />
                AI-powered personal identity hub
              </span>
            </Reveal>
            <Reveal delay={0.05}>
              <h1 className="mt-5 text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-[3.4rem]">
                One link. Your entire journey.{" "}
                <span className="text-primary">Your next opportunity.</span>
              </h1>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="mt-5 max-w-xl text-[15px] leading-7 text-muted-foreground">
                LinkSphere AI turns a single URL into proof of who you are:
                skills backed by projects, projects backed by achievements, and
                an AI twin that answers questions about you using only what you
                publish.
              </p>
            </Reveal>
            <Reveal delay={0.15}>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button size="lg" asChild>
                  <Link to="/auth">
                    Create your free hub
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link to={SAMPLE_URL}>Explore a sample profile</Link>
                </Button>
              </div>
            </Reveal>
            <Reveal delay={0.2}>
              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <MessagesSquare className="size-3.5 text-primary" /> AI Personal Twin
                </span>
                <span className="flex items-center gap-1.5">
                  <BadgeCheck className="size-3.5 text-primary" /> Achievement Passport
                </span>
                <span className="flex items-center gap-1.5">
                  <Target className="size-3.5 text-primary" /> Opportunity Matcher
                </span>
              </div>
            </Reveal>
          </div>

          <Reveal delay={0.12}>
            <HeroPreview />
          </Reveal>
        </Section>

        <div className="border-t border-border/60" />
        <EvidenceChain />
        <div className="border-t border-border/60" />
        <SpotlightFeatures />
        <SecondaryFeatures />
        <div className="border-t border-border/60" />
        <SamplePreview />
        <HowItWorks />
        <FinalCTA />
      </main>
      <SiteFooter />
    </motion.div>
  );
}
