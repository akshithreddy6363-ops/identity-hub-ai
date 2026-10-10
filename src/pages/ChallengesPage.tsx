import { EmptyState } from "@/components/EmptyState";
import { Panel } from "@/components/Panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import {
  CHALLENGE_KIND_META,
  PROVENANCE_META,
  type ChallengeKind,
  type Provenance,
} from "@/lib/linksphere";
import { cn } from "@/lib/utils";
import {
  BadgeCheck,
  CirclePlus,
  Code2,
  ExternalLink,
  Loader2,
  Palette,
  Pencil,
  Plus,
  Puzzle,
  ShieldQuestion,
  Swords,
  Trash2,
} from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";

const KIND_ICON: Record<ChallengeKind, typeof Code2> = {
  coding: Code2,
  design: Palette,
  problem_solving: Puzzle,
};

interface EvidenceDraft {
  id: string;
  label: string;
  url: string;
}

interface Draft {
  title: string;
  kind: ChallengeKind;
  platform: string;
  difficulty: string;
  description: string;
  submissionUrl: string;
  outcome: string;
  evidence: EvidenceDraft[];
  provenance: Provenance;
  provenanceNote: string;
  skillLinks: string[];
  published: boolean;
}

function ChallengeDialog({
  open,
  onOpenChange,
  challenge,
  skills,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  challenge: Doc<"challenges"> | null;
  skills: string[];
}) {
  const createChallenge = useMutation(api.challenges.create);
  const updateChallenge = useMutation(api.challenges.update);
  const [saving, setSaving] = useState(false);
  const [titleError, setTitleError] = useState<string | null>(null);

  const [draft, setDraft] = useState<Draft>(() =>
    challenge
      ? {
          title: challenge.title,
          kind: challenge.kind,
          platform: challenge.platform ?? "",
          difficulty: challenge.difficulty ?? "",
          description: challenge.description ?? "",
          submissionUrl: challenge.submissionUrl ?? "",
          outcome: challenge.outcome ?? "",
          evidence: challenge.evidence.map((e) => ({ ...e })),
          provenance: challenge.provenance,
          provenanceNote: challenge.provenanceNote ?? "",
          skillLinks: challenge.skillLinks,
          published: challenge.published,
        }
      : {
          title: "",
          kind: "coding",
          platform: "",
          difficulty: "",
          description: "",
          submissionUrl: "",
          outcome: "",
          evidence: [],
          provenance: "user_submitted",
          provenanceNote: "",
          skillLinks: [],
          published: true,
        },
  );

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    if (!draft.title.trim()) {
      setTitleError("A title is required.");
      return;
    }
    setTitleError(null);
    if (draft.provenance === "platform_verified") {
      if (!draft.submissionUrl.trim()) {
        toast.error(
          "A platform-verified challenge needs the platform submission link.",
        );
        return;
      }
      if (!draft.evidence.some((e) => e.url.trim())) {
        toast.error("A platform-verified challenge needs one evidence link.");
        return;
      }
    }
    setSaving(true);
    try {
      const args = {
        title: draft.title,
        kind: draft.kind,
        platform: draft.platform,
        difficulty: draft.difficulty,
        description: draft.description,
        submissionUrl: draft.submissionUrl,
        outcome: draft.outcome,
        evidence: draft.evidence.filter((e) => e.label.trim() || e.url.trim()),
        provenance: draft.provenance,
        provenanceNote: draft.provenanceNote,
        skillLinks: draft.skillLinks,
        published: draft.published,
      };
      if (challenge) {
        await updateChallenge({ id: challenge._id, ...args });
        toast.success("Challenge updated");
      } else {
        await createChallenge(args);
        toast.success("Challenge added to your profile");
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not save the challenge.",
      );
    } finally {
      setSaving(false);
    }
  };

  const provenanceMeta = PROVENANCE_META[draft.provenance];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {challenge ? "Edit challenge" : "Add challenge"}
          </DialogTitle>
          <DialogDescription>
            Show the challenge, your submission, the outcome and the evidence -
            and say honestly whether it is platform-verified or self-submitted.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="ch-title">Challenge title *</Label>
            <Input
              id="ch-title"
              value={draft.title}
              onChange={(e) => {
                set("title", e.target.value);
                if (titleError) setTitleError(null);
              }}
              placeholder="Two Sum - hash map solution"
            />
            {titleError && (
              <p className="text-xs text-destructive">{titleError}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label>Kind</Label>
              <Select
                value={draft.kind}
                onValueChange={(value) => set("kind", value as ChallengeKind)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(CHALLENGE_KIND_META) as ChallengeKind[]).map(
                    (kind) => (
                      <SelectItem key={kind} value={kind}>
                        {CHALLENGE_KIND_META[kind]}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ch-platform">Platform</Label>
              <Input
                id="ch-platform"
                value={draft.platform}
                onChange={(e) => set("platform", e.target.value)}
                placeholder="LeetCode, Figma Community..."
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ch-difficulty">Difficulty</Label>
              <Input
                id="ch-difficulty"
                value={draft.difficulty}
                onChange={(e) => set("difficulty", e.target.value)}
                placeholder="Easy / Intermediate"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="ch-description">The challenge</Label>
            <Textarea
              id="ch-description"
              rows={3}
              value={draft.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="What was asked of you, and what constraint made it hard?"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="ch-submission">Submission link</Label>
              <Input
                id="ch-submission"
                value={draft.submissionUrl}
                onChange={(e) => set("submissionUrl", e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ch-outcome">Outcome</Label>
              <Input
                id="ch-outcome"
                value={draft.outcome}
                onChange={(e) => set("outcome", e.target.value)}
                placeholder="Accepted · 52 ms runtime"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label>Provenance</Label>
              <Badge
                variant="outline"
                className={cn(
                  "gap-1 px-2 py-0.5 text-[11px]",
                  provenanceMeta.badge,
                )}
              >
                {draft.provenance === "platform_verified" ? (
                  <BadgeCheck className="size-3" />
                ) : (
                  <ShieldQuestion className="size-3" />
                )}
                {provenanceMeta.label}
              </Badge>
            </div>
            <Select
              value={draft.provenance}
              onValueChange={(value) => set("provenance", value as Provenance)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(PROVENANCE_META) as Provenance[]).map((state) => (
                  <SelectItem key={state} value={state}>
                    {PROVENANCE_META[state].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs leading-5 text-muted-foreground">
              {provenanceMeta.hint}
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="ch-provenance-note">Provenance note</Label>
            <Input
              id="ch-provenance-note"
              value={draft.provenanceNote}
              onChange={(e) => set("provenanceNote", e.target.value)}
              placeholder="e.g. Result link attached; LinkSphere has not re-verified it."
            />
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label>Supporting evidence</Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  set("evidence", [
                    ...draft.evidence,
                    { id: `cev${Date.now()}`, label: "", url: "" },
                  ])
                }
              >
                <Plus className="size-4" />
                Add evidence
              </Button>
            </div>
            {draft.evidence.length === 0 && (
              <p className="rounded-lg border border-dashed bg-muted/30 px-3 py-3 text-xs text-muted-foreground">
                Link the submission, test results or a walkthrough so a visitor
                can check the result themselves.
              </p>
            )}
            {draft.evidence.map((item, index) => (
              <div
                key={item.id}
                className="grid gap-2 sm:grid-cols-[180px_1fr]"
              >
                <Input
                  value={item.label}
                  placeholder="Label"
                  onChange={(e) => {
                    const next = [...draft.evidence];
                    next[index] = { ...next[index], label: e.target.value };
                    set("evidence", next);
                  }}
                />
                <div className="flex gap-2">
                  <Input
                    value={item.url}
                    placeholder="https://..."
                    onChange={(e) => {
                      const next = [...draft.evidence];
                      next[index] = { ...next[index], url: e.target.value };
                      set("evidence", next);
                    }}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    aria-label="Remove evidence"
                    onClick={() =>
                      set(
                        "evidence",
                        draft.evidence.filter((e) => e.id !== item.id),
                      )
                    }
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-2">
            <Label>Skills this proves</Label>
            {skills.length === 0 ? (
              <p className="rounded-lg border border-dashed bg-muted/30 px-3 py-3 text-xs text-muted-foreground">
                Add skills to your profile first to link them here.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {skills.map((skill) => {
                  const active = draft.skillLinks.includes(skill);
                  return (
                    <button
                      key={skill}
                      type="button"
                      onClick={() =>
                        set(
                          "skillLinks",
                          active
                            ? draft.skillLinks.filter((s) => s !== skill)
                            : [...draft.skillLinks, skill],
                        )
                      }
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                        active
                          ? "border-primary/40 bg-primary/10 text-primary"
                          : "bg-muted/40 text-muted-foreground hover:bg-muted",
                      )}
                    >
                      {skill}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3.5 py-3">
            <div>
              <p className="text-sm font-medium">Show on public profile</p>
              <p className="text-xs text-muted-foreground">
                Visible when your profile is published and the Challenges
                section is on.
              </p>
            </div>
            <Switch
              checked={draft.published}
              onCheckedChange={(checked) => set("published", checked)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="size-4 animate-spin" />}
            {challenge ? "Save changes" : "Add challenge"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ChallengesPage() {
  const challenges = useQuery(api.challenges.listMine);
  const profile = useQuery(api.profiles.myProfile);
  const removeChallenge = useMutation(api.challenges.remove);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Doc<"challenges"> | null>(null);

  const skills = (profile?.skills ?? []).map((s) => s.name);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Workspace</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            Proof-of-Skill Challenges
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Attach completed coding, design and problem-solving challenges -
            with your submission, the outcome and the evidence behind it.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="size-4" />
          New challenge
        </Button>
      </header>

      <Panel
        icon={Swords}
        title="Verified vs self-submitted"
        description="LinkSphere does not re-verify external results - the UI says so wherever a challenge appears."
        bodyClassName="text-sm leading-6 text-muted-foreground"
      >
        Mark a challenge{" "}
        <strong className="font-medium text-foreground">
          Platform-verified
        </strong>{" "}
        only when you are attaching the real platform result link. Everyone who
        views it will see that the result comes from that platform and that
        LinkSphere itself has not checked it. Everything else is labelled{" "}
        <strong className="font-medium text-foreground">Self-submitted</strong>.
      </Panel>

      {challenges === undefined ? (
        <Panel>
          <div className="flex flex-col gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        </Panel>
      ) : challenges.length === 0 ? (
        <EmptyState
          icon={CirclePlus}
          title="No challenges yet"
          description="Add a challenge you completed - a LeetCode problem, a design sprint, a debugging exercise - with a link to the submission and the result."
          action={
            <Button
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="size-4" />
              Add challenge
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3">
          {challenges.map((item) => {
            const Icon = KIND_ICON[item.kind];
            const meta = PROVENANCE_META[item.provenance];
            return (
              <div
                key={item._id}
                className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="size-4" />
                      </span>
                      <h2 className="text-[15px] font-semibold tracking-tight">
                        {item.title}
                      </h2>
                      <Badge variant="outline" className="text-[11px]">
                        {CHALLENGE_KIND_META[item.kind]}
                      </Badge>
                      {!item.published && (
                        <Badge variant="secondary" className="text-[11px]">
                          Draft
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      {[item.platform, item.difficulty]
                        .filter(Boolean)
                        .join(" · ") || "No platform recorded"}
                    </p>
                    {item.description && (
                      <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                        {item.description}
                      </p>
                    )}
                    {item.outcome && (
                      <p className="mt-2 text-sm">
                        <span className="text-muted-foreground">Outcome: </span>
                        {item.outcome}
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Badge
                        variant="outline"
                        title={meta.hint}
                        className={cn(
                          "gap-1 px-2 py-0.5 text-[11px]",
                          meta.badge,
                        )}
                      >
                        {item.provenance === "platform_verified" ? (
                          <BadgeCheck className="size-3" />
                        ) : (
                          <ShieldQuestion className="size-3" />
                        )}
                        {meta.label}
                      </Badge>
                      {item.skillLinks.map((skill) => (
                        <Badge
                          key={skill}
                          variant="outline"
                          className="border-primary/30 bg-primary/10 text-primary"
                        >
                          proves {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditing(item);
                        setDialogOpen(true);
                      }}
                    >
                      <Pencil className="size-3.5" />
                      Edit
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="size-3.5" />
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Delete '{item.title}'?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            The challenge and its evidence links will be removed
                            from your profile. This cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={async () => {
                              try {
                                await removeChallenge({ id: item._id });
                                toast.success("Challenge deleted");
                              } catch (error) {
                                toast.error(
                                  error instanceof Error
                                    ? error.message
                                    : "Could not delete the challenge.",
                                );
                              }
                            }}
                          >
                            Delete challenge
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>

                {(item.submissionUrl || item.evidence.length > 0) && (
                  <div className="mt-3 flex flex-wrap gap-4 border-t pt-3">
                    {item.submissionUrl && (
                      <a
                        href={item.submissionUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                      >
                        <ExternalLink className="size-3.5" />
                        Submission
                      </a>
                    )}
                    {item.evidence.map((link) => (
                      <a
                        key={link.id}
                        href={link.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                      >
                        <Swords className="size-3.5" />
                        {link.label || "Evidence"}
                      </a>
                    ))}
                  </div>
                )}
                {item.provenanceNote && (
                  <p className="mt-2 text-[11px] leading-5 text-muted-foreground/80">
                    {item.provenanceNote}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {dialogOpen && (
        <ChallengeDialog
          key={editing?._id ?? "new"}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          challenge={editing}
          skills={skills}
        />
      )}
    </div>
  );
}
