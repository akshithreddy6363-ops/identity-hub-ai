import { AIModeBadge, AIModeNote } from "@/components/AIModeBadge";
import { EmptyState } from "@/components/EmptyState";
import { Panel } from "@/components/Panel";
import { TagInput } from "@/components/TagInput";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  AI_NOTES,
  PROJECT_STATUS_META,
  type AIMode,
  type ProjectStatus,
} from "@/lib/linksphere";
import { cn } from "@/lib/utils";
import {
  ExternalLink,
  FolderGit2,
  Github,
  Loader2,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useAction, useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";

interface Draft {
  title: string;
  summary: string;
  problem: string;
  solution: string;
  technologies: string[];
  repoUrl: string;
  demoUrl: string;
  coverUrl: string;
  status: ProjectStatus;
  role: string;
  skillLinks: string[];
  published: boolean;
}

const EMPTY_DRAFT: Draft = {
  title: "",
  summary: "",
  problem: "",
  solution: "",
  technologies: [],
  repoUrl: "",
  demoUrl: "",
  coverUrl: "",
  status: "live",
  role: "",
  skillLinks: [],
  published: true,
};

function ProjectDialog({
  open,
  onOpenChange,
  project,
  skills,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Doc<"projects"> | null;
  skills: string[];
  onSaved: () => void;
}) {
  const createProject = useMutation(api.projects.create);
  const updateProject = useMutation(api.projects.update);
  const draftProjectSummary = useAction(api.ai.draftProjectSummary);

  const [draft, setDraft] = useState<Draft>(
    project
      ? {
          title: project.title,
          summary: project.summary ?? "",
          problem: project.problem ?? "",
          solution: project.solution ?? "",
          technologies: project.technologies,
          repoUrl: project.repoUrl ?? "",
          demoUrl: project.demoUrl ?? "",
          coverUrl: project.coverUrl ?? "",
          status: project.status,
          role: project.role ?? "",
          skillLinks: project.skillLinks,
          published: project.published,
        }
      : EMPTY_DRAFT,
  );
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMode, setAiMode] = useState<AIMode | undefined>();
  const [aiNote, setAiNote] = useState<string | undefined>();
  const [titleError, setTitleError] = useState<string | null>(null);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    if (!draft.title.trim()) {
      setTitleError("A project title is required.");
      return;
    }
    setTitleError(null);
    setSaving(true);
    try {
      const args = {
        title: draft.title,
        summary: draft.summary,
        problem: draft.problem,
        solution: draft.solution,
        technologies: draft.technologies,
        repoUrl: draft.repoUrl,
        demoUrl: draft.demoUrl,
        coverUrl: draft.coverUrl,
        status: draft.status,
        role: draft.role,
        skillLinks: draft.skillLinks,
        published: draft.published,
      };
      if (project) {
        await updateProject({ id: project._id, ...args });
        toast.success("Project updated");
      } else {
        await createProject(args);
        toast.success("Project added");
      }
      onSaved();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the project.");
    } finally {
      setSaving(false);
    }
  };

  const handleDraftSummary = async () => {
    if (!draft.title.trim()) {
      setTitleError("Add a title first, then draft the summary.");
      return;
    }
    setAiLoading(true);
    try {
      const result = await draftProjectSummary({
        input: {
          title: draft.title,
          description: draft.summary || draft.problem || draft.solution,
          role: draft.role,
          technologies: draft.technologies,
        },
      });
      if (result.ok) {
        set("summary", result.text);
        setAiMode(result.mode);
        setAiNote(result.note);
        toast.success("Summary drafted — review before publishing");
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Drafting failed.");
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{project ? "Edit project" : "New project"}</DialogTitle>
          <DialogDescription>
            Projects are the evidence behind your skills. Drafts stay private
            until you switch them on.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="project-title">Title *</Label>
            <Input
              id="project-title"
              value={draft.title}
              onChange={(e) => {
                set("title", e.target.value);
                if (titleError) setTitleError(null);
              }}
              placeholder="CropSense"
            />
            {titleError && <p className="text-xs text-destructive">{titleError}</p>}
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="project-summary">Short summary</Label>
              <div className="flex items-center gap-2">
                <AIModeBadge mode={aiMode} />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleDraftSummary}
                  disabled={aiLoading}
                >
                  {aiLoading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Sparkles className="size-4" />
                  )}
                  Draft with AI
                </Button>
              </div>
            </div>
            <Textarea
              id="project-summary"
              rows={3}
              value={draft.summary}
              onChange={(e) => set("summary", e.target.value)}
              placeholder="One crisp paragraph: what it does and how."
            />
            {aiNote && <AIModeNote mode={aiMode} note={aiNote} />}
            {aiMode === "demo" && !aiNote && (
              <AIModeNote mode="demo" note={AI_NOTES.project} />
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="project-problem">Problem solved</Label>
              <Textarea
                id="project-problem"
                rows={3}
                value={draft.problem}
                onChange={(e) => set("problem", e.target.value)}
                placeholder="What pain does this address?"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="project-solution">Solution provided</Label>
              <Textarea
                id="project-solution"
                rows={3}
                value={draft.solution}
                onChange={(e) => set("solution", e.target.value)}
                placeholder="How does your build solve it?"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Technologies used</Label>
            <TagInput
              value={draft.technologies}
              onChange={(next) => set("technologies", next)}
              placeholder="Python, PyTorch…"
            />
          </div>

          <div className="grid gap-2">
            <Label>Skills this project proves</Label>
            {skills.length === 0 ? (
              <p className="rounded-lg border border-dashed bg-muted/30 px-3 py-3 text-xs text-muted-foreground">
                Add skills to your profile first — then link them here to build
                your evidence chain.
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

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="project-repo">GitHub repository</Label>
              <Input
                id="project-repo"
                value={draft.repoUrl}
                onChange={(e) => set("repoUrl", e.target.value)}
                placeholder="https://github.com/…"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="project-demo">Live demo</Label>
              <Input
                id="project-demo"
                value={draft.demoUrl}
                onChange={(e) => set("demoUrl", e.target.value)}
                placeholder="https://…"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="project-cover">Cover image URL</Label>
              <Input
                id="project-cover"
                value={draft.coverUrl}
                onChange={(e) => set("coverUrl", e.target.value)}
                placeholder="https://…"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="project-role">Your role</Label>
              <Input
                id="project-role"
                value={draft.role}
                onChange={(e) => set("role", e.target.value)}
                placeholder="Solo builder"
              />
            </div>
            <div className="grid gap-2">
              <Label>Status</Label>
              <Select
                value={draft.status}
                onValueChange={(value) => set("status", value as ProjectStatus)}
              >
                <SelectTrigger id="project-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(PROJECT_STATUS_META) as ProjectStatus[]).map(
                    (status) => (
                      <SelectItem key={status} value={status}>
                        {PROJECT_STATUS_META[status].label}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3.5 py-3">
            <div>
              <p className="text-sm font-medium">Publish this project</p>
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
            {project ? "Save project" : "Add project"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ProjectsPage() {
  const projects = useQuery(api.projects.listMine);
  const profile = useQuery(api.profiles.myProfile);
  const removeProject = useMutation(api.projects.remove);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Doc<"projects"> | null>(null);

  const skills = (profile?.skills ?? []).map((s) => s.name);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Workspace</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            Projects
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Each project is evidence: link it to the skills it proves.
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
          New project
        </Button>
      </header>

      {projects === undefined ? (
        <Panel>
          <div className="flex flex-col gap-3">
            {[0, 1].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        </Panel>
      ) : projects.length === 0 ? (
        <EmptyState
          icon={FolderGit2}
          title="No projects yet"
          description="Add a project, draft its summary with AI, and link it to a skill — that link becomes proof on your public profile."
          action={
            <Button
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="size-4" />
              Add your first project
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4">
          {projects.map((project) => (
            <div
              key={project._id}
              className="rounded-2xl border border-border/80 bg-card p-5 transition-shadow hover:shadow-[0_12px_32px_-24px_rgba(16,24,40,0.45)]"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-[15px] font-semibold tracking-tight">
                      {project.title}
                    </h2>
                    <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <span
                        className={cn(
                          "size-1.5 rounded-full",
                          PROJECT_STATUS_META[project.status].dot,
                        )}
                      />
                      {PROJECT_STATUS_META[project.status].label}
                    </span>
                    {!project.published && (
                      <Badge variant="secondary" className="text-[11px]">
                        Draft
                      </Badge>
                    )}
                  </div>
                  {project.summary && (
                    <p className="mt-1.5 max-w-3xl text-sm leading-6 text-muted-foreground">
                      {project.summary}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditing(project);
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
                        <AlertDialogTitle>Delete “{project.title}”?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This removes the project and its evidence links from
                          your profile. This cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={async () => {
                            try {
                              await removeProject({ id: project._id });
                              toast.success("Project deleted");
                            } catch (error) {
                              toast.error(
                                error instanceof Error
                                  ? error.message
                                  : "Could not delete the project.",
                              );
                            }
                          }}
                        >
                          Delete project
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {project.technologies.map((tech) => (
                  <Badge key={tech} variant="secondary" className="font-normal">
                    {tech}
                  </Badge>
                ))}
                {project.skillLinks.map((skill) => (
                  <Badge
                    key={`skill-${skill}`}
                    className="border border-primary/30 bg-primary/10 font-normal text-primary"
                    variant="outline"
                  >
                    proves {skill}
                  </Badge>
                ))}
              </div>

              {(project.repoUrl || project.demoUrl) && (
                <div className="mt-3 flex flex-wrap gap-3 border-t pt-3 text-xs text-muted-foreground">
                  {project.repoUrl && (
                    <a
                      href={project.repoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 transition-colors hover:text-foreground"
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
                      className="flex items-center gap-1.5 transition-colors hover:text-foreground"
                    >
                      <ExternalLink className="size-3.5" />
                      Live demo
                    </a>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {dialogOpen && (
        <ProjectDialog
          key={editing?._id ?? "new"}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          project={editing}
          skills={skills}
          onSaved={() => undefined}
        />
      )}
    </div>
  );
}
