import { CopyButton } from "@/components/CopyButton";
import { EmptyState } from "@/components/EmptyState";
import { Panel } from "@/components/Panel";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { PROJECT_STATUS_META } from "@/lib/linksphere";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  Award,
  CircleCheck,
  ExternalLink,
  FolderGit2,
  Link2,
  MessagesSquare,
  Plus,
  Sparkles,
  Target,
  Trophy,
  UserRound,
  Waypoints,
} from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { Link } from "react-router";
import type { Doc } from "@/convex/_generated/dataModel";

function useCompleteness(
  profile: Doc<"profiles"> | null | undefined,
  projects: Doc<"projects">[] | undefined,
  achievements: Doc<"achievements">[] | undefined,
) {
  const checks = [
    { label: "Name and headline added", done: !!profile?.headline, to: "/dashboard/profile" },
    { label: "Profile photo set", done: !!profile?.avatarUrl, to: "/dashboard/profile" },
    { label: "Bio written", done: (profile?.bio?.length ?? 0) > 40, to: "/dashboard/profile" },
    { label: "At least 3 skills listed", done: (profile?.skills.length ?? 0) >= 3, to: "/dashboard/profile" },
    { label: "2+ social links", done: (profile?.socials.length ?? 0) >= 2, to: "/dashboard/profile" },
    { label: "Education or goals added", done: !!profile?.education || !!profile?.goals, to: "/dashboard/profile" },
    { label: "One published project", done: (projects ?? []).some((p) => p.published), to: "/dashboard/projects" },
    { label: "One achievement added", done: (achievements ?? []).length > 0, to: "/dashboard/achievements" },
    { label: "Profile published", done: !!profile?.published, to: "/dashboard/profile" },
  ];
  const done = checks.filter((c) => c.done).length;
  return { checks, percent: Math.round((done / checks.length) * 100) };
}

export default function Dashboard() {
  const { user } = useAuth();
  const profile = useQuery(api.profiles.myProfile);
  const projects = useQuery(api.projects.listMine);
  const achievements = useQuery(api.achievements.listMine);
  const updateProfile = useMutation(api.profiles.updateProfile);

  const { checks, percent } = useCompleteness(profile, projects, achievements);
  const publicUrl =
    typeof window !== "undefined" && profile
      ? `${window.location.origin}/p/${profile.slug}`
      : "";
  const recentProjects = (projects ?? []).slice(0, 3);
  const recentAchievements = (achievements ?? []).slice(0, 3);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Workspace</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            Welcome{user?.name ? `, ${user.name}` : ""}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/dashboard/profile">
              <UserRound className="size-4" />
              Edit profile
            </Link>
          </Button>
          {profile && (
            <Button size="sm" asChild>
              <a href={`/p/${profile.slug}`} target="_blank" rel="noreferrer">
                <ExternalLink className="size-4" />
                {profile.published ? "View public profile" : "Preview profile"}
              </a>
            </Button>
          )}
        </div>
      </header>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            icon: FolderGit2,
            label: "Projects",
            value: `${(projects ?? []).filter((p) => p.published).length}/${(projects ?? []).length ?? 0}`,
            hint: "published / total",
          },
          {
            icon: Trophy,
            label: "Achievements",
            value: String((achievements ?? []).length),
            hint: "in your passport",
          },
          {
            icon: Waypoints,
            label: "Skills",
            value: String(profile?.skills.length ?? 0),
            hint: "with linked evidence",
          },
          {
            icon: MessagesSquare,
            label: "AI Twin",
            value: profile?.twinEnabled ? "On" : "Off",
            hint: "answers visitor questions",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-border/80 bg-card p-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <stat.icon className="size-4" />
              </div>
            </div>
            <p className="mt-3 text-2xl font-semibold tracking-tight">{stat.value}</p>
            <p className="text-sm font-medium">{stat.label}</p>
            <p className="text-xs text-muted-foreground">{stat.hint}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        {/* Completeness */}
        <Panel
          icon={Sparkles}
          title="Profile completeness"
          description={`${checks.filter((c) => c.done).length} of ${checks.length} steps done`}
          actions={
            <span className="text-sm font-semibold text-primary">{percent}%</span>
          }
        >
          <Progress value={percent} className="mb-5 h-2" />
          <ul className="grid gap-2 sm:grid-cols-2">
            {checks.map((check) => (
              <li key={check.label}>
                <Link
                  to={check.to}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg border px-3 py-2 text-[13px] transition-colors",
                    check.done
                      ? "border-emerald-500/20 bg-emerald-500/5 text-foreground"
                      : "bg-muted/30 text-muted-foreground hover:bg-muted",
                  )}
                >
                  <CircleCheck
                    className={cn(
                      "size-4 shrink-0",
                      check.done ? "text-emerald-500" : "text-muted-foreground/50",
                    )}
                  />
                  <span className={check.done ? "" : ""}>{check.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>

        {/* Public URL + actions */}
        <div className="flex flex-col gap-6">
          <Panel icon={Link2} title="Your public link" description="Permanent — updates never change it.">
            <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2.5">
              <Link2 className="size-4 shrink-0 text-muted-foreground" />
              <span className="truncate text-[13px] font-medium">{publicUrl}</span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <CopyButton value={publicUrl} />
              {profile && !profile.published && (
                <Button
                  size="sm"
                  onClick={async () => {
                    await updateProfile({ published: true });
                  }}
                >
                  Publish now
                </Button>
              )}
              {profile?.published && (
                <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                  <CircleCheck className="size-3.5" />
                  Published
                </span>
              )}
            </div>
          </Panel>

          <Panel
            icon={Target}
            title="Quick actions"
            bodyClassName="grid gap-2"
          >
            {[
              { to: "/dashboard/ai", icon: Sparkles, label: "Draft my bio with AI" },
              { to: "/dashboard/matcher", icon: Target, label: "Analyze an opportunity" },
              { to: "/dashboard/projects", icon: Plus, label: "Add a project" },
            ].map((action) => (
              <Link
                key={action.to}
                to={action.to}
                className="flex items-center justify-between rounded-lg border bg-muted/30 px-3.5 py-2.5 text-[13px] font-medium transition-colors hover:bg-muted"
              >
                <span className="flex items-center gap-2.5">
                  <action.icon className="size-4 text-primary" />
                  {action.label}
                </span>
                <ArrowRight className="size-3.5 text-muted-foreground" />
              </Link>
            ))}
          </Panel>
        </div>
      </div>

      {/* Recent content */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel
          icon={FolderGit2}
          title="Recent projects"
          actions={
            <Button variant="ghost" size="sm" asChild>
              <Link to="/dashboard/projects">Manage</Link>
            </Button>
          }
        >
          {recentProjects.length === 0 ? (
            <EmptyState
              icon={FolderGit2}
              title="No projects yet"
              description="Add your first project to start linking skills to real evidence."
              action={
                <Button size="sm" asChild>
                  <Link to="/dashboard/projects">
                    <Plus className="size-4" />
                    Add project
                  </Link>
                </Button>
              }
            />
          ) : (
            <ul className="flex flex-col gap-2.5">
              {recentProjects.map((project) => (
                <li
                  key={project._id}
                  className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3.5 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{project.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {project.technologies.join(" · ") || "No stack listed"}
                    </p>
                  </div>
                  <span className="flex shrink-0 items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span
                      className={cn(
                        "size-1.5 rounded-full",
                        PROJECT_STATUS_META[project.status].dot,
                      )}
                    />
                    {PROJECT_STATUS_META[project.status].label}
                    {!project.published && " · draft"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          icon={Trophy}
          title="Achievement Passport"
          actions={
            <Button variant="ghost" size="sm" asChild>
              <Link to="/dashboard/achievements">Manage</Link>
            </Button>
          }
        >
          {recentAchievements.length === 0 ? (
            <EmptyState
              icon={Award}
              title="Your passport is empty"
              description="Add hackathons, certificates, internships and milestones with supporting evidence."
              action={
                <Button size="sm" asChild>
                  <Link to="/dashboard/achievements">
                    <Plus className="size-4" />
                    Add achievement
                  </Link>
                </Button>
              }
            />
          ) : (
            <ul className="flex flex-col gap-2.5">
              {recentAchievements.map((item) => (
                <li
                  key={item._id}
                  className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3.5 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{item.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {item.issuer ?? item.kind}
                      {!item.published && " · draft"}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
