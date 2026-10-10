import { EmptyState } from "@/components/EmptyState";
import { Panel } from "@/components/Panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/convex/_generated/api";
import { initials } from "@/lib/linksphere";
import {
  CalendarClock,
  Globe,
  GraduationCap,
  Link2,
  Loader2,
  Lock,
  Mail,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  UsersRound,
} from "lucide-react";
import { useQuery } from "convex/react";
import { useState } from "react";
import { Link } from "react-router";

export default function TeamFinderPage() {
  const profile = useQuery(api.profiles.myProfile);
  const [skillFilter, setSkillFilter] = useState("");
  const [submitted, setSubmitted] = useState("");

  const result = useQuery(api.teamFinder.candidates, {
    skillFilter: submitted,
  });
  const loading = result === undefined;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="text-sm font-medium text-muted-foreground">
          Intelligence
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          AI Team Finder
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Find hackathon teammates whose skills complement yours - matched on
          what you are looking for, shared interests and availability.
        </p>
      </header>

      <Panel
        icon={ShieldCheck}
        title="Consent-first matching"
        description="Nothing here is shared without the member's explicit permission."
        bodyClassName="flex flex-col gap-3 text-sm leading-6 text-muted-foreground"
      >
        <p>{result?.note ?? "Rule-based matching over published profiles."}</p>
        <ul className="grid gap-1.5">
          {[
            "Only members who switched on 'Open to teams' are ever listed.",
            "Contact details appear only for members who chose to share them with signed-in members.",
            "Signed-out visitors cannot see this page at all.",
          ].map((line) => (
            <li key={line} className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-primary" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </Panel>

      {!profile ? null : !profile.openToTeams ||
        profile.contactPolicy !== "signed_in_members" ? (
        <Panel
          icon={Sparkles}
          title="Be discoverable"
          description="You can match with others even while hidden, but you will only appear in their results if you opt in."
          bodyClassName="flex flex-wrap items-center gap-3"
        >
          <div className="flex flex-1 flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {!profile.openToTeams ? (
              <Badge variant="outline" className="text-[11px]">
                Open to teams: off
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[11px]">
                Open to teams: on
              </Badge>
            )}
            {profile.contactPolicy === "signed_in_members" ? (
              <Badge variant="outline" className="text-[11px]">
                Contact: shared with members
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[11px]">
                Contact: hidden
              </Badge>
            )}
          </div>
          <Button size="sm" variant="outline" asChild>
            <Link to="/dashboard/settings">Manage in Settings</Link>
          </Button>
        </Panel>
      ) : null}

      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(skillFilter.trim());
        }}
      >
        <div className="relative min-w-56 flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={skillFilter}
            onChange={(e) => setSkillFilter(e.target.value)}
            placeholder="Filter by a skill or role, e.g. Flutter or backend"
            className="pl-9"
          />
        </div>
        <Button type="submit" disabled={loading}>
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Search className="size-4" />
          )}
          Search members
        </Button>
        {submitted && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setSkillFilter("");
              setSubmitted("");
            }}
          >
            Clear
          </Button>
        )}
      </form>

      {result?.viewerNeeds && result.viewerNeeds.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Target className="size-4" />
          You said you are looking for:
          {result.viewerNeeds.map((need) => (
            <Badge
              key={need}
              variant="outline"
              className="border-primary/30 bg-primary/10 text-primary"
            >
              {need}
            </Badge>
          ))}
        </div>
      )}

      {loading ? (
        <Panel>
          <div className="flex flex-col gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        </Panel>
      ) : result === null ? (
        <EmptyState
          icon={Lock}
          title="Sign in to use Team Finder"
          description="Member matching is only available to signed-in members, so contact consent can be enforced per person."
          action={
            <Button asChild>
              <Link to="/auth">Sign in</Link>
            </Button>
          }
        />
      ) : result.candidates.length === 0 ? (
        <EmptyState
          icon={UsersRound}
          title="No matching members yet"
          description={
            submitted
              ? `Nobody opted in matches '${submitted}'. Try a broader skill or role.`
              : "No members have opted into team finding yet. You can still prepare your own opt-in in Settings."
          }
        />
      ) : (
        <div className="grid gap-3">
          {result.candidates.map((candidate) => (
            <div
              key={candidate.slug}
              className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/15 text-sm font-semibold text-primary">
                    {candidate.avatarUrl ? (
                      <img
                        src={candidate.avatarUrl}
                        alt=""
                        className="size-full object-cover"
                      />
                    ) : (
                      initials(candidate.displayName)
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-[15px] font-semibold tracking-tight">
                        {candidate.displayName}
                      </h2>
                      {candidate.matchedNeeds.length > 0 && (
                        <Badge
                          variant="outline"
                          className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        >
                          {candidate.matchedNeeds.length} skill
                          {candidate.matchedNeeds.length === 1 ? "" : "s"} you
                          want
                        </Badge>
                      )}
                      {candidate.sharedInterests.length > 0 && (
                        <Badge variant="outline">
                          {candidate.sharedInterests.length} shared interest
                          {candidate.sharedInterests.length === 1 ? "" : "s"}
                        </Badge>
                      )}
                    </div>
                    {candidate.headline && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {candidate.headline}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {candidate.education && (
                        <span className="flex items-center gap-1.5">
                          <GraduationCap className="size-3.5" />
                          {candidate.education}
                        </span>
                      )}
                      {candidate.availability && (
                        <span className="flex items-center gap-1.5">
                          <CalendarClock className="size-3.5" />
                          {candidate.availability}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <Button size="sm" variant="outline" asChild>
                  <a
                    href={`/p/${candidate.slug}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View profile
                  </a>
                </Button>
              </div>

              {candidate.complementarySkills.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t pt-3">
                  <span className="text-xs text-muted-foreground">
                    Skills you don&apos;t have:
                  </span>
                  {candidate.complementarySkills.map((skill) => (
                    <Badge
                      key={skill}
                      variant="outline"
                      className="border-primary/30 bg-primary/10 text-primary"
                    >
                      {skill}
                    </Badge>
                  ))}
                </div>
              )}

              {candidate.lookingFor.length > 0 && (
                <p className="mt-2.5 text-xs leading-5 text-muted-foreground">
                  <span className="font-medium text-foreground">
                    Looking for:
                  </span>{" "}
                  {candidate.lookingFor.join(", ")}
                </p>
              )}
              {candidate.goals && (
                <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
                  <span className="font-medium text-foreground">Goal:</span>{" "}
                  {candidate.goals}
                </p>
              )}

              <div className="mt-3 border-t pt-3">
                {candidate.contactConsent && candidate.contact?.length ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      Shared contact details:
                    </span>
                    {candidate.contact.map((social) => (
                      <a
                        key={social.id}
                        href={social.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                      >
                        {social.platform === "Email" ? (
                          <Mail className="size-3.5" />
                        ) : social.platform === "Website" ? (
                          <Globe className="size-3.5" />
                        ) : (
                          <Link2 className="size-3.5" />
                        )}
                        {social.platform}
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Lock className="size-3.5" />
                    Contact details are hidden - this member has not shared them
                    with other members.
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
