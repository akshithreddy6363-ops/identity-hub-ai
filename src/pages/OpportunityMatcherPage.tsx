import { AIModeBadge, AIModeNote } from "@/components/AIModeBadge";
import { EmptyState } from "@/components/EmptyState";
import { Panel } from "@/components/Panel";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import type { MatchResult } from "@/lib/linksphere";
import { cn } from "@/lib/utils";
import {
  CircleCheck,
  CircleDashed,
  Lightbulb,
  Loader2,
  Send,
  Sparkles,
  Target,
  Trophy,
  FolderGit2,
} from "lucide-react";
import { useAction, useQuery } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";

const SAMPLE_BRIEF = `AI/ML Internship — Summer 2026 (remote, 6 months)

We are looking for a Computer Science student who can help our applied-AI team ship model-driven features. Requirements:
- Strong Python; experience with PyTorch or TensorFlow
- Comfortable building REST APIs (FastAPI or Flask) and writing SQL
- Familiarity with LLMs, embeddings or evaluation pipelines is a plus
- Git-based workflows and clear written communication
- Pursuing a degree in CS or a related field

You will fine-tune models, build evaluation dashboards, and work with product engineers to ship features to production.`;

interface Analysis {
  result: MatchResult;
  mode: "live" | "demo";
  note?: string;
}

export default function OpportunityMatcherPage() {
  const profile = useQuery(api.profiles.myProfile);
  const matchOpportunity = useAction(api.ai.matchOpportunity);

  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);

  const handleAnalyze = async () => {
    if (!profile) return;
    if (description.trim().length < 40) {
      toast.error("Paste at least a couple of sentences from the opportunity.");
      return;
    }
    setLoading(true);
    setAnalysis(null);
    try {
      const result = await matchOpportunity({
        slug: profile.slug,
        description,
      });
      if (result.ok) {
        setAnalysis({ result: result.result, mode: result.mode, note: result.note });
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "The matcher is unavailable right now.",
      );
    } finally {
      setLoading(false);
    }
  };

  if (profile === null) {
    return (
      <EmptyState
        icon={Target}
        title="Create your profile first"
        description="The matcher compares opportunities against your profile, so you need one first."
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="text-sm font-medium text-muted-foreground">Workspace</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          AI Opportunity Matcher
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Paste a job, internship, scholarship or hackathon description. You get
          matched skills with evidence, missing requirements stated honestly,
          and what to highlight — never a promise of selection.
        </p>
      </header>

      <Panel
        icon={Target}
        title="Opportunity description"
        description="Compared against your skills, projects and achievements."
        actions={
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setDescription(SAMPLE_BRIEF);
              setAnalysis(null);
            }}
          >
            Use sample brief
          </Button>
        }
      >
        <Textarea
          rows={9}
          value={description}
          maxLength={8000}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Paste the internship, job or hackathon description here…"
          className="leading-6"
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {description.length}/8000 characters · analyzed privately against
            your own profile
          </p>
          <Button onClick={handleAnalyze} disabled={loading || !description.trim()}>
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            {loading ? "Analyzing…" : "Analyze fit"}
          </Button>
        </div>
      </Panel>

      {loading && (
        <Panel icon={Sparkles} title="Comparing your profile with this opportunity…">
          <div className="flex flex-col gap-3">
            <div className="h-16 animate-pulse rounded-lg bg-muted" />
            <div className="h-32 animate-pulse rounded-lg bg-muted" />
            <div className="h-24 animate-pulse rounded-lg bg-muted" />
          </div>
        </Panel>
      )}

      {!loading && !analysis && (
        <EmptyState
          icon={Target}
          title="No analysis yet"
          description="Paste an opportunity above (or load the sample brief) to see matching skills, honest gaps, and profile suggestions."
        />
      )}

      {analysis && (
        <div className="flex flex-col gap-6">
          <Panel
            icon={Sparkles}
            title="Fit summary"
            actions={<AIModeBadge mode={analysis.mode} />}
            bodyClassName="text-sm leading-6"
          >
            <p>{analysis.result.summary}</p>
            {analysis.note && (
              <div className="mt-3">
                <AIModeNote mode={analysis.mode} note={analysis.note} />
              </div>
            )}
            <p className="mt-3 text-xs text-muted-foreground">
              Informational analysis only — LinkSphere does not guarantee
              selection, interviews, or employment.
            </p>
          </Panel>

          <div className="grid gap-6 lg:grid-cols-2">
            <Panel
              icon={CircleCheck}
              title="Matching skills"
              description="With the evidence behind each one"
              bodyClassName="grid gap-2.5"
            >
              {analysis.result.matches.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No profile skills were named in this opportunity — consider
                  whether your positioning matches the role.
                </p>
              ) : (
                analysis.result.matches.map((match) => (
                  <div
                    key={match.skill}
                    className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3.5 py-2.5"
                  >
                    <p className="text-sm font-medium capitalize">{match.skill}</p>
                    <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                      {match.evidence}
                    </p>
                  </div>
                ))
              )}
            </Panel>

            <Panel
              icon={CircleDashed}
              title="Missing requirements"
              description="Called out honestly — no softening"
              bodyClassName="grid gap-2.5"
            >
              {analysis.result.gaps.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nothing from the posting is obviously missing from your
                  profile.
                </p>
              ) : (
                analysis.result.gaps.map((gap) => (
                  <div
                    key={gap.requirement}
                    className="rounded-lg border border-amber-500/25 bg-amber-500/5 px-3.5 py-2.5"
                  >
                    <p className="text-sm font-medium capitalize">{gap.requirement}</p>
                    <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                      {gap.note}
                    </p>
                  </div>
                ))
              )}
            </Panel>

            <Panel
              icon={Lightbulb}
              title="Profile improvements"
              description="Actionable edits you can make now"
              bodyClassName="grid gap-2"
            >
              {analysis.result.suggestions.map((suggestion, index) => (
                <div
                  key={`${suggestion}-${index}`}
                  className="flex items-start gap-2.5 rounded-lg bg-muted/30 px-3.5 py-2.5 text-sm leading-6"
                >
                  <Lightbulb className="mt-1 size-3.5 shrink-0 text-primary" />
                  {suggestion}
                </div>
              ))}
            </Panel>

            <Panel
              icon={Trophy}
              title="Highlight these"
              description="Your projects and achievements that matter here"
              bodyClassName="grid gap-2.5"
            >
              {analysis.result.highlights.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Add projects or achievements that relate to this opportunity
                  to give the matcher something to surface.
                </p>
              ) : (
                analysis.result.highlights.map((highlight, index) => (
                  <div
                    key={`${highlight.title}-${index}`}
                    className="flex items-start gap-3 rounded-lg border bg-muted/30 px-3.5 py-2.5"
                  >
                    <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      {highlight.kind === "project" ? (
                        <FolderGit2 className="size-4" />
                      ) : (
                        <Trophy className="size-4" />
                      )}
                    </div>
                    <div>
                      <p className={cn("text-sm font-medium")}>{highlight.title}</p>
                      <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                        {highlight.why}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </Panel>
          </div>
        </div>
      )}
    </div>
  );
}
