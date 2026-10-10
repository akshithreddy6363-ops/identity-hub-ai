import { Brand } from "@/components/Brand";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import { SHARE_AUDIENCE_META, type ShareAudience } from "@/lib/linksphere";
import { EyeOff, Link2, ShieldCheck, UsersRound } from "lucide-react";
import { useQuery } from "convex/react";
import { Link } from "react-router";
import { ProfileView } from "./PublicProfile";

const SECTION_LABELS: Record<string, string> = {
  about: "About",
  skills: "Skills",
  projects: "Projects",
  achievements: "Achievement passport",
  challenges: "Proof-of-Skill challenges",
  contact: "Contact & links",
};

export default function SharedProfile({ token }: { token: string }) {
  const shared = useQuery(api.shareLinks.getSharedProfile, { token });

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
        {shared === undefined ? (
          <div className="flex flex-col gap-4">
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-40 w-full rounded-2xl" />
            <Skeleton className="h-64 w-full rounded-2xl" />
          </div>
        ) : shared === null ? (
          <div className="mx-auto mt-16 max-w-md rounded-2xl border bg-card p-8 text-center">
            <div className="mx-auto mb-4 flex size-11 items-center justify-center rounded-full bg-muted">
              <Link2 className="size-5 text-muted-foreground" />
            </div>
            <h1 className="text-lg font-semibold">This share link is not active</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              The link may have been turned off, deleted, or never existed. Ask
              the person who sent it for an updated link.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <Button size="sm" variant="outline" asChild>
                <Link to="/">Go home</Link>
              </Button>
              <Button size="sm" asChild>
                <Link to="/auth">Create your own profile</Link>
              </Button>
            </div>
          </div>
        ) : (
          <ProfileView
            profile={shared.view}
            banner={
              <div className="mb-6 rounded-xl border border-primary/25 bg-primary/5 px-4 py-3.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex size-7 items-center justify-center rounded-lg bg-primary/15 text-primary">
                    <UsersRound className="size-3.5" />
                  </span>
                  <p className="text-[13px] font-semibold">{shared.label}</p>
                  <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                    {SHARE_AUDIENCE_META[shared.audience as ShareAudience].label}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  A tailored view of{" "}
                  <span className="font-medium text-foreground">
                    {shared.view.displayName}
                  </span>
                  &apos;s profile, prepared for a{" "}
                  {SHARE_AUDIENCE_META[shared.audience as ShareAudience].label.toLowerCase()}
                  .
                </p>
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  <ShieldCheck className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                  {Object.entries(SECTION_LABELS).map(([key, label]) =>
                    shared.sections[key as keyof typeof shared.sections] ? (
                      <span
                        key={key}
                        className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-700 dark:text-emerald-300"
                      >
                        {label}
                      </span>
                    ) : (
                      <span
                        key={key}
                        className="flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground/70"
                      >
                        <EyeOff className="size-3" />
                        {label}
                      </span>
                    ),
                  )}
                </div>
                <p className="mt-2 text-[11px] leading-5 text-muted-foreground/80">
                  Only the sections marked green are part of this view — the rest
                  of the profile is not included here.
                </p>
              </div>
            }
          />
        )}
      </main>
    </div>
  );
}
