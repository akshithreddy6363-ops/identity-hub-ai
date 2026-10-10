import { AIModeBadge, AIModeNote } from "@/components/AIModeBadge";
import { EmptyState } from "@/components/EmptyState";
import { Panel } from "@/components/Panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/convex/_generated/api";
import {
  type AIMode,
  type RoadmapPractice,
  type RoadmapResult,
} from "@/lib/linksphere";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  CircleDashed,
  Dumbbell,
  FolderGit2,
  Loader2,
  Milestone,
  RefreshCw,
  Route,
  Save,
  Sparkles,
  Wand2,
} from "lucide-react";
import { useAction, useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";

const PRACTICE_META: Record<
  RoadmapPractice["kind"],
  { label: string; icon: typeof FolderGit2 }
> = {
  project: { label: "Build", icon: FolderGit2 },
  practice: { label: "Practise", icon: Dumbbell },
  course: { label: "Study", icon: BookOpen },
};

const ROLE_SUGGESTIONS = [
  "Applied AI / ML internship",
  "Frontend developer internship",
  "Full-stack developer role",
  "Data analyst role",
  "Hackathon team lead",
];

interface Generated {
  targetRole: string;
  result: RoadmapResult;
  mode: AIMode;
  note?: string;
}

export default function RoadmapPage() {
  const profile = useQuery(api.profiles.myProfile);
  const latest = useQuery(api.roadmaps.latest);
  const generateRoadmap = useAction(api.ai.generateRoadmap);
  const saveRoadmap = useMutation(api.roadmaps.save);

  const [targetRole, setTargetRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generated, setGenerated] = useState<Generated | null>(null);

  // Show the freshly generated roadmap if there is one, otherwise the saved one.
  const shown: Generated | null =
    generated ??
    (latest
      ? {
          targetRole: latest.targetRole,
          result: {
            summary: latest.summary,
            gaps: latest.gaps,
            milestones: latest.milestones,
          },
          mode: latest.mode,
        }
      : null);

  const handleGenerate = async () => {
    if (targetRole.trim().length < 2) {
      toast.error('Enter a target role, for example "applied AI internship".');
      return;
    }
    setLoading(true);
    setGenerated(null);
    try {
      const result = await generateRoadmap({ targetRole });
      if (result.ok) {
        setGenerated({
          targetRole: targetRole.trim(),
          result: result.result,
          mode: result.mode,
          note: result.note,
        });
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not generate a roadmap right now.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!shown) return;
    setSaving(true);
    try {
      await saveRoadmap({
        targetRole: shown.targetRole,
        mode: shown.mode,
        summary: shown.result.summary,
        gaps: shown.result.gaps,
        milestones: shown.result.milestones,
      });
      toast.success("Roadmap saved to your workspace");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not save the roadmap.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (profile === null) {
    return (
      <EmptyState
        icon={Route}
        title="Create your profile first"
        description="The roadmap is built from your skills, projects and goals, so fill in your profile before generating one."
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="text-sm font-medium text-muted-foreground">
          Intelligence
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          Personalized Skills Roadmap
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Pick a target role and get a milestone plan built from what you have
          already published - with project-based practice for each step, and an
          honest list of what is missing today.
        </p>
      </header>

      <Panel
        icon={Wand2}
        title="Target role"
        description="Be specific - 'applied AI internship' beats 'AI'."
      >
        <div className="flex flex-col gap-3">
          <div className="grid gap-2">
            <Label htmlFor="roadmap-role">Target role</Label>
            <Input
              id="roadmap-role"
              value={targetRole}
              maxLength={120}
              onChange={(e) => setTargetRole(e.target.value)}
              placeholder="Applied AI / ML internship"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !loading) handleGenerate();
              }}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {ROLE_SUGGESTIONS.map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => setTargetRole(role)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  targetRole === role
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "bg-muted/40 text-muted-foreground hover:bg-muted",
                )}
              >
                {role}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Built from your own profile data. Nothing is shared publicly.
            </p>
            <div className="flex items-center gap-2">
              {shown && (
                <Button
                  variant="outline"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Save className="size-4" />
                  )}
                  {saving ? "Saving..." : "Save roadmap"}
                </Button>
              )}
              <Button onClick={handleGenerate} disabled={loading}>
                {loading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Sparkles className="size-4" />
                )}
                {loading
                  ? "Planning..."
                  : shown
                    ? "Regenerate"
                    : "Generate roadmap"}
              </Button>
            </div>
          </div>
        </div>
      </Panel>

      {loading && (
        <Panel icon={Sparkles} title="Building your milestones...">
          <div className="flex flex-col gap-3">
            <div className="h-16 animate-pulse rounded-lg bg-muted" />
            <div className="h-40 animate-pulse rounded-lg bg-muted" />
          </div>
        </Panel>
      )}

      {!loading && !shown && (
        <EmptyState
          icon={Route}
          title="No roadmap yet"
          description="Enter a target role above (or pick a suggestion) to get a milestone plan with project-based practice for each step."
        />
      )}

      {!loading && shown && (
        <div className="flex flex-col gap-6">
          <Panel
            icon={Sparkles}
            title={`Roadmap for ${shown.targetRole}`}
            actions={
              <>
                <AIModeBadge mode={shown.mode} />
                {generated && (
                  <Button variant="ghost" size="sm" onClick={handleGenerate}>
                    <RefreshCw className="size-3.5" />
                    Try again
                  </Button>
                )}
              </>
            }
            bodyClassName="text-sm leading-6"
          >
            <p>{shown.result.summary}</p>
            {shown.note && (
              <div className="mt-3">
                <AIModeNote mode={shown.mode} note={shown.note} />
              </div>
            )}
            {!generated && (
              <p className="mt-3 text-xs text-muted-foreground">
                This is your saved roadmap. Regenerate it any time as your
                profile changes.
              </p>
            )}
          </Panel>

          {shown.result.gaps.length > 0 && (
            <Panel
              icon={CircleDashed}
              title="What is missing today"
              description="Stated plainly - these are the gaps between your profile and the role"
              bodyClassName="flex flex-wrap gap-2"
            >
              {shown.result.gaps.map((gap) => (
                <Badge
                  key={gap}
                  variant="outline"
                  className="border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-600 dark:text-amber-400"
                >
                  {gap}
                </Badge>
              ))}
            </Panel>
          )}

          <div className="grid gap-4">
            {shown.result.milestones.map((milestone, index) => (
              <Panel
                key={`${milestone.title}-${index}`}
                icon={Milestone}
                title={
                  <span className="flex items-center gap-2">
                    <span className="text-muted-foreground">
                      Milestone {index + 1}
                    </span>
                    <span>{milestone.title}</span>
                  </span>
                }
                description={milestone.focus}
              >
                <div className="flex flex-col gap-4">
                  {milestone.why && (
                    <p className="text-sm leading-6 text-muted-foreground">
                      {milestone.why}
                    </p>
                  )}

                  {milestone.skills.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {milestone.skills.map((skill) => (
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

                  {milestone.practices.length > 0 && (
                    <div className="grid gap-2.5">
                      {milestone.practices.map((practice, practiceIndex) => {
                        const meta = PRACTICE_META[practice.kind];
                        const Icon = meta.icon;
                        return (
                          <div
                            key={`${practice.title}-${practiceIndex}`}
                            className="flex items-start gap-3 rounded-lg border bg-muted/30 px-3.5 py-3"
                          >
                            <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                              <Icon className="size-3.5" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium">
                                <span className="text-muted-foreground">
                                  {meta.label} ·{" "}
                                </span>
                                {practice.title}
                              </p>
                              {practice.detail && (
                                <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                                  {practice.detail}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </Panel>
            ))}
          </div>

          <p className="text-xs text-muted-foreground">
            A plan, not a promise - LinkSphere does not guarantee interviews,
            offers or outcomes.
          </p>
        </div>
      )}
    </div>
  );
}
