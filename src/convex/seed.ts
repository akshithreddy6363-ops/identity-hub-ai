import { SAMPLE_SLUG } from "../lib/linksphere";
import { mutation, type MutationCtx } from "./_generated/server";

/**
 * Inserts the clearly-labelled demonstration profile (plus its sample
 * projects and achievements) the first time anyone loads the app.
 *
 * Honesty rules baked into this data:
 *  - every row is flagged `isSample` so the public page shows a sample badge;
 *  - no achievement is marked "verified" — sample items are self-reported or
 *    verification-pending only, because nothing here has been verified.
 */
export async function insertSampleData(ctx: MutationCtx) {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  const existing = await ctx.db
    .query("profiles")
    .withIndex("by_slug", (q) => q.eq("slug", SAMPLE_SLUG))
    .first();
  if (existing) return existing._id;

  const profileId = await ctx.db.insert("profiles", {
    slug: SAMPLE_SLUG,
    isSample: true,
    displayName: "Aarav Mehta",
    headline: "CS student · Full-stack & applied-AI builder",
    bio: "I build practical web and machine-learning tools — from crop-disease detection to real-time transit dashboards. I care about shipping things people actually use, and about showing the evidence behind what I claim to know.",
    location: "Bengaluru, India",
    education: "B.Tech Computer Science, 2023–2027",
    interests: ["Open source", "Applied ML", "Design systems", "Hackathons"],
    goals: "Land an applied-AI internship where I can ship models to production and learn from strong engineers.",
    skills: [
      { id: "s1", name: "Python" },
      { id: "s2", name: "TypeScript" },
      { id: "s3", name: "React" },
      { id: "s4", name: "Node.js" },
      { id: "s5", name: "PyTorch" },
      { id: "s6", name: "FastAPI" },
      { id: "s7", name: "PostgreSQL" },
      { id: "s8", name: "Figma" },
      { id: "s9", name: "Public speaking" },
    ],
    socials: [
      { id: "so1", platform: "GitHub", url: "https://github.com" },
      { id: "so2", platform: "LinkedIn", url: "https://www.linkedin.com" },
      { id: "so3", platform: "YouTube", url: "https://www.youtube.com" },
    ],
    resumeUrl: "",
    resumePublic: false,
    published: true,
    visibility: {
      about: true,
      skills: true,
      projects: true,
      achievements: true,
      contact: true,
    },
    twinEnabled: true,
    twinIntro:
      "Answer only from Aarav's published profile. Prefer concrete projects and achievements as evidence.",
    createdAt: now,
    updatedAt: now,
  });

  const projects: Array<{
    title: string;
    summary: string;
    problem: string;
    solution: string;
    technologies: string[];
    repoUrl: string;
    demoUrl?: string;
    status: "live" | "building" | "archived";
    role: string;
    skillLinks: string[];
  }> = [
    {
      title: "CropSense",
      summary:
        "A mobile-first tool that photographs crop leaves and flags disease risk for smallholder farmers, running an offline-friendly vision model behind a lightweight FastAPI service.",
      problem: "Smallholder farmers often lack fast access to agronomists, so crop diseases get spotted too late.",
      solution: "A CNN trained on public plant-village imagery serves predictions through a REST API, with a React front end that works on low-bandwidth connections.",
      technologies: ["Python", "PyTorch", "FastAPI", "React"],
      repoUrl: "https://github.com",
      demoUrl: "https://example.com",
      status: "live",
      role: "ML + backend",
      skillLinks: ["Python", "PyTorch", "FastAPI", "React"],
    },
    {
      title: "TransitPulse",
      summary:
        "A real-time city transit dashboard that blends live vehicle feeds with delay analytics so riders can see crowding and reliability at a glance.",
      problem: "Static transit schedules hide live delays and crowdedness, so riders make poor route choices.",
      solution: "Streaming GTFS updates are normalised in Node, stored in PostgreSQL, and rendered as an interactive Mapbox dashboard with per-route reliability trends.",
      technologies: ["TypeScript", "React", "Node.js", "PostgreSQL"],
      repoUrl: "https://github.com",
      status: "live",
      role: "Full-stack developer",
      skillLinks: ["TypeScript", "React", "Node.js", "PostgreSQL"],
    },
    {
      title: "StudySphere",
      summary: "Collaborative study rooms with shared notes, focus timers, and spaced-repetition quizzes for student groups.",
      problem: "Study groups struggle to coordinate sessions and share notes across scattered tools.",
      solution: "WebSockets power live shared notes and timers, with quiz progress stored per room and a clean, keyboard-first interface designed in Figma.",
      technologies: ["React", "Node.js", "WebSockets", "Figma"],
      repoUrl: "https://github.com",
      status: "building",
      role: "Creator & maintainer",
      skillLinks: ["React", "Node.js", "Figma"],
    },
  ];

  for (const [i, p] of projects.entries()) {
    await ctx.db.insert("projects", {
      profileId,
      title: p.title,
      summary: p.summary,
      problem: p.problem,
      solution: p.solution,
      technologies: p.technologies,
      repoUrl: p.repoUrl,
      demoUrl: p.demoUrl,
      status: p.status,
      role: p.role,
      skillLinks: p.skillLinks,
      published: true,
      order: i,
      createdAt: now - (i + 1) * day,
      updatedAt: now,
    });
  }

  const achievements: Array<{
    title: string;
    kind: "hackathon" | "certificate" | "award" | "internship" | "course" | "milestone";
    issuer: string;
    occurredAt: number;
    description: string;
    evidenceLabel: string;
    evidenceUrl: string;
    verification: "pending" | "self_reported";
    verificationNote: string;
    skillLinks: string[];
  }> = [
    {
      title: "Winner — AgriTech track, IndiaHack 2025",
      kind: "hackathon",
      issuer: "IndiaHack",
      occurredAt: now - 120 * day,
      description: "Built CropSense in 36 hours with a team of four; won the AgriTech track for offline-first design.",
      evidenceLabel: "Hackathon devpost page",
      evidenceUrl: "https://devpost.com",
      verification: "self_reported",
      verificationNote: "Award listed by the organiser; no third-party check performed by LinkSphere.",
      skillLinks: ["Python", "PyTorch"],
    },
    {
      title: "Deep Learning Specialization",
      kind: "certificate",
      issuer: "DeepLearning.AI",
      occurredAt: now - 210 * day,
      description: "Completed the five-course specialization covering CNNs, sequence models, and optimization.",
      evidenceLabel: "Certificate credential link",
      evidenceUrl: "https://www.coursera.org",
      verification: "pending",
      verificationNote: "Credential URL attached, awaiting verification.",
      skillLinks: ["PyTorch", "Python"],
    },
    {
      title: "Software Engineering Intern",
      kind: "internship",
      issuer: "Finlytics (startup)",
      occurredAt: now - 300 * day,
      description: "Shipped internal React dashboards and a FastAPI reporting service used by the analytics team.",
      evidenceLabel: "Internship offer letter (on request)",
      evidenceUrl: "https://www.linkedin.com",
      verification: "self_reported",
      verificationNote: "Self-reported by the profile owner.",
      skillLinks: ["React", "FastAPI", "TypeScript"],
    },
    {
      title: "Dean's List, 2024 & 2025",
      kind: "award",
      issuer: "College of Engineering",
      occurredAt: now - 150 * day,
      description: "Awarded for sustaining a top-5% GPA across four semesters.",
      evidenceLabel: "Result memo",
      evidenceUrl: "https://example.com",
      verification: "pending",
      verificationNote: "Document attached, verification not yet completed.",
      skillLinks: [],
    },
    {
      title: "1,000 GitHub stars across open-source projects",
      kind: "milestone",
      issuer: "GitHub",
      occurredAt: now - 40 * day,
      description: "Aggregate stars across three maintained repositories.",
      evidenceLabel: "GitHub profile",
      evidenceUrl: "https://github.com",
      verification: "self_reported",
      verificationNote: "Self-reported by the profile owner.",
      skillLinks: ["TypeScript", "Python"],
    },
  ];

  for (const a of achievements) {
    await ctx.db.insert("achievements", {
      profileId,
      title: a.title,
      kind: a.kind,
      issuer: a.issuer,
      occurredAt: a.occurredAt,
      description: a.description,
      evidence: [{ id: `ev-${a.title.slice(0, 8)}`, label: a.evidenceLabel, url: a.evidenceUrl }],
      verification: a.verification,
      verificationNote: a.verificationNote,
      skillLinks: a.skillLinks,
      published: true,
      createdAt: now,
      updatedAt: now,
    });
  }

  return profileId;
}

/**
 * Public, idempotent bootstrap for the demo profile. Frontend pages call this
 * on mount; it no-ops once the sample exists.
 */
export const ensureSample = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_slug", (q) => q.eq("slug", SAMPLE_SLUG))
      .first();
    if (existing) return false;
    await insertSampleData(ctx);
    return true;
  },
});
