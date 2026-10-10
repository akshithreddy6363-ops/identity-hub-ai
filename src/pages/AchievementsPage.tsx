import { VerificationBadge } from "@/components/VerificationBadge";
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
  ACHIEVEMENT_KIND_META,
  VERIFICATION_META,
  type AchievementKind,
  type Verification,
  formatDate,
} from "@/lib/linksphere";
import { cn } from "@/lib/utils";
import {
  Award,
  Calendar,
  CirclePlus,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Trophy,
} from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";

const KIND_ICON: Record<AchievementKind, typeof Trophy> = {
  hackathon: Trophy,
  certificate: Award,
  award: Trophy,
  internship: Calendar,
  course: Award,
  milestone: Calendar,
};

interface EvidenceDraft {
  id: string;
  label: string;
  url: string;
}

interface Draft {
  title: string;
  kind: AchievementKind;
  issuer: string;
  date: string; // yyyy-mm-dd
  description: string;
  evidence: EvidenceDraft[];
  verification: Verification;
  verificationNote: string;
  skillLinks: string[];
  published: boolean;
}

function toDateInput(ts: number): string {
  const d = new Date(ts);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

/** Evaluated once at module load - keeps Date.now() out of the render path. */
const DEFAULT_DATE = toDateInput(Date.now());

function AchievementDialog({
  open,
  onOpenChange,
  achievement,
  skills,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  achievement: Doc<"achievements"> | null;
  skills: string[];
}) {
  const createAchievement = useMutation(api.achievements.create);
  const updateAchievement = useMutation(api.achievements.update);
  const [saving, setSaving] = useState(false);
  const [titleError, setTitleError] = useState<string | null>(null);

  const [draft, setDraft] = useState<Draft>(() =>
    achievement
      ? {
          title: achievement.title,
          kind: achievement.kind,
          issuer: achievement.issuer ?? "",
          date: toDateInput(achievement.occurredAt),
          description: achievement.description ?? "",
          evidence: achievement.evidence.map((e) => ({ ...e })),
          verification: achievement.verification,
          verificationNote: achievement.verificationNote ?? "",
          skillLinks: achievement.skillLinks,
          published: achievement.published,
        }
      : {
          title: "",
          kind: "hackathon",
          issuer: "",
          date: DEFAULT_DATE,
          description: "",
          evidence: [],
          verification: "self_reported",
          verificationNote: "",
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
    const occurredAt = draft.date ? new Date(draft.date).getTime() : Date.now();
    if (!Number.isFinite(occurredAt)) {
      toast.error("Pick a valid date.");
      return;
    }
    setSaving(true);
    try {
      const args = {
        title: draft.title,
        kind: draft.kind,
        issuer: draft.issuer,
        occurredAt,
        description: draft.description,
        evidence: draft.evidence.filter((e) => e.label.trim() || e.url.trim()),
        verification: draft.verification,
        verificationNote: draft.verificationNote,
        skillLinks: draft.skillLinks,
        published: draft.published,
      };
      if (achievement) {
        await updateAchievement({ id: achievement._id, ...args });
        toast.success("Achievement updated");
      } else {
        await createAchievement(args);
        toast.success("Achievement added to your passport");
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not save the achievement.",
      );
    } finally {
      setSaving(false);
    }
  };

  const verificationMeta = VERIFICATION_META[draft.verification];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {achievement ? "Edit achievement" : "Add achievement"}
          </DialogTitle>
          <DialogDescription>
            Passport entries are only labelled Verified when verification
            actually happened.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="ach-title">Title *</Label>
            <Input
              id="ach-title"
              value={draft.title}
              onChange={(e) => {
                set("title", e.target.value);
                if (titleError) setTitleError(null);
              }}
              placeholder="Winner - AgriTech track, IndiaHack 2025"
            />
            {titleError && (
              <p className="text-xs text-destructive">{titleError}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label>Type</Label>
              <Select
                value={draft.kind}
                onValueChange={(value) => set("kind", value as AchievementKind)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(
                    Object.keys(ACHIEVEMENT_KIND_META) as AchievementKind[]
                  ).map((kind) => (
                    <SelectItem key={kind} value={kind}>
                      {ACHIEVEMENT_KIND_META[kind]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ach-issuer">Issuer / organisation</Label>
              <Input
                id="ach-issuer"
                value={draft.issuer}
                onChange={(e) => set("issuer", e.target.value)}
                placeholder="IndiaHack"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ach-date">Date</Label>
              <Input
                id="ach-date"
                type="date"
                value={draft.date}
                onChange={(e) => set("date", e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="ach-description">Description</Label>
            <Textarea
              id="ach-description"
              rows={3}
              value={draft.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="What you did and why it matters."
            />
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label>Verification state</Label>
              <VerificationBadge verification={draft.verification} />
            </div>
            <Select
              value={draft.verification}
              onValueChange={(value) =>
                set("verification", value as Verification)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(VERIFICATION_META) as Verification[]).map(
                  (state) => (
                    <SelectItem key={state} value={state}>
                      {VERIFICATION_META[state].label}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
            <p className="text-xs leading-5 text-muted-foreground">
              {verificationMeta.hint}
            </p>
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
                    { id: `ev${Date.now()}`, label: "", url: "" },
                  ])
                }
              >
                <Plus className="size-4" />
                Add evidence
              </Button>
            </div>
            {draft.evidence.length === 0 && (
              <p className="rounded-lg border border-dashed bg-muted/30 px-3 py-3 text-xs text-muted-foreground">
                Attach a credential link, certificate URL or document link so
                visitors can check the claim themselves.
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
              <p className="text-sm font-medium">Publish to passport</p>
              <p className="text-xs text-muted-foreground">
                Visible on your public profile when on.
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
            {achievement ? "Save changes" : "Add to passport"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AchievementsPage() {
  const achievements = useQuery(api.achievements.listMine);
  const profile = useQuery(api.profiles.myProfile);
  const removeAchievement = useMutation(api.achievements.remove);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Doc<"achievements"> | null>(null);

  const skills = (profile?.skills ?? []).map((s) => s.name);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Workspace</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            Achievement Passport
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Hackathons, certificates, awards, internships and milestones - with
            evidence attached.
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
          New achievement
        </Button>
      </header>

      <Panel
        icon={Trophy}
        title="Honest by design"
        description="LinkSphere never labels anything Verified on your behalf."
        bodyClassName="text-sm leading-6 text-muted-foreground"
      >
        Use{" "}
        <strong className="font-medium text-foreground">Self-reported</strong>{" "}
        for entries you state yourself,{" "}
        <strong className="font-medium text-foreground">
          Verification pending
        </strong>{" "}
        when evidence is attached but unchecked, and{" "}
        <strong className="font-medium text-foreground">Verified</strong> only
        after a reliable verification (issuer check, credential ID, trusted
        document).
      </Panel>

      {achievements === undefined ? (
        <Panel>
          <div className="flex flex-col gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        </Panel>
      ) : achievements.length === 0 ? (
        <EmptyState
          icon={CirclePlus}
          title="Your passport is empty"
          description="Add your first achievement - a hackathon, certificate or internship - with a supporting link."
          action={
            <Button
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="size-4" />
              Add achievement
            </Button>
          }
        />
      ) : (
        <div className="relative flex flex-col gap-3 pl-5">
          <span className="absolute left-[7px] top-2 h-full w-px bg-border" />
          {achievements.map((item) => {
            const Icon = KIND_ICON[item.kind];
            return (
              <div
                key={item._id}
                className="relative rounded-2xl border border-border/80 bg-card p-4 sm:p-5"
              >
                <span className="absolute -left-5 top-6 size-3.5 rounded-full border-2 border-background bg-primary" />
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
                        {ACHIEVEMENT_KIND_META[item.kind]}
                      </Badge>
                      {!item.published && (
                        <Badge variant="secondary" className="text-[11px]">
                          Draft
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      {[item.issuer, formatDate(item.occurredAt)]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    {item.description && (
                      <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                        {item.description}
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <VerificationBadge verification={item.verification} />
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
                            The entry and its evidence links will be removed
                            from your passport. This cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={async () => {
                              try {
                                await removeAchievement({ id: item._id });
                                toast.success("Achievement deleted");
                              } catch (error) {
                                toast.error(
                                  error instanceof Error
                                    ? error.message
                                    : "Could not delete the achievement.",
                                );
                              }
                            }}
                          >
                            Delete achievement
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>

                {item.evidence.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-3 border-t pt-3">
                    {item.evidence.map((link) => (
                      <a
                        key={link.id}
                        href={link.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                      >
                        <Award className="size-3.5" />
                        {link.label || "Evidence"}
                      </a>
                    ))}
                  </div>
                )}
                {item.verificationNote && (
                  <p className="mt-2 text-[11px] leading-5 text-muted-foreground/80">
                    {item.verificationNote}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {dialogOpen && (
        <AchievementDialog
          key={editing?._id ?? "new"}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          achievement={editing}
          skills={skills}
        />
      )}
    </div>
  );
}
