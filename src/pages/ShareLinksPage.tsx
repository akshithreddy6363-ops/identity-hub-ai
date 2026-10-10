import { CopyButton } from "@/components/CopyButton";
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
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { SHARE_AUDIENCE_META, type ShareAudience } from "@/lib/linksphere";
import { cn } from "@/lib/utils";
import {
  Award,
  EyeOff,
  FolderGit2,
  Link2,
  Loader2,
  Plus,
  ShieldCheck,
  Swords,
  Trash2,
  UserRound,
  UsersRound,
  Waypoints,
} from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";

type Sections = {
  about: boolean;
  skills: boolean;
  projects: boolean;
  achievements: boolean;
  challenges: boolean;
  contact: boolean;
};

const SECTION_META: {
  key: keyof Sections;
  label: string;
  description: string;
  icon: typeof Award;
}[] = [
  {
    key: "about",
    label: "About",
    description: "Bio, education, goals and interests.",
    icon: UserRound,
  },
  {
    key: "skills",
    label: "Skills",
    description: "Skills with linked evidence.",
    icon: Waypoints,
  },
  {
    key: "projects",
    label: "Projects",
    description: "Published projects and their stack.",
    icon: FolderGit2,
  },
  {
    key: "achievements",
    label: "Achievement passport",
    description: "Awards, certificates and internships.",
    icon: Award,
  },
  {
    key: "challenges",
    label: "Proof-of-Skill challenges",
    description: "Challenges, submissions and outcomes.",
    icon: Swords,
  },
  {
    key: "contact",
    label: "Contact & links",
    description: "Social links and public resume.",
    icon: Link2,
  },
];

function presetSections(audience: ShareAudience): Sections {
  switch (audience) {
    case "recruiter":
      return {
        about: true,
        skills: true,
        projects: true,
        achievements: true,
        challenges: true,
        contact: false,
      };
    case "mentor":
      return {
        about: true,
        skills: true,
        projects: true,
        achievements: false,
        challenges: false,
        contact: false,
      };
    case "collaborator":
      return {
        about: false,
        skills: true,
        projects: true,
        achievements: false,
        challenges: true,
        contact: true,
      };
    default:
      return {
        about: true,
        skills: true,
        projects: true,
        achievements: false,
        challenges: false,
        contact: false,
      };
  }
}

const ALL_SECTIONS: Sections = {
  about: true,
  skills: true,
  projects: true,
  achievements: true,
  challenges: true,
  contact: true,
};

function ShareLinkDialog({
  open,
  onOpenChange,
  link,
  alreadyShared,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  link: Doc<"shareLinks"> | null;
  alreadyShared: Sections;
}) {
  const createLink = useMutation(api.shareLinks.create);
  const updateLink = useMutation(api.shareLinks.update);
  const [saving, setSaving] = useState(false);

  const [label, setLabel] = useState(link?.label ?? "");
  const [audience, setAudience] = useState<ShareAudience>(
    link?.audience ?? "recruiter",
  );
  const [sections, setSections] = useState<Sections>(
    link?.sections ?? presetSections("recruiter"),
  );

  const handleAudience = (next: ShareAudience) => {
    setAudience(next);
    if (next !== "custom") setSections(presetSections(next));
  };

  const handleSave = async () => {
    if (!label.trim()) {
      toast.error("Give this link a label so you can recognise it.");
      return;
    }
    if (!Object.values(sections).some(Boolean)) {
      toast.error("Select at least one section to share.");
      return;
    }
    setSaving(true);
    try {
      if (link) {
        await updateLink({ id: link._id, label, audience, sections });
        toast.success("Share link updated");
      } else {
        await createLink({ label, audience, sections });
        toast.success("Share link created");
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not save the share link.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {link ? "Edit share link" : "New share link"}
          </DialogTitle>
          <DialogDescription>
            Choose who it's for and which sections they see. A link can only
            ever show what your public profile already shows.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="share-label">Label</Label>
            <Input
              id="share-label"
              value={label}
              maxLength={60}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Recruiter - backend roles"
            />
          </div>

          <div className="grid gap-2">
            <Label>Audience</Label>
            <Select
              value={audience}
              onValueChange={(value) => handleAudience(value as ShareAudience)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(SHARE_AUDIENCE_META) as ShareAudience[]).map(
                  (key) => (
                    <SelectItem key={key} value={key}>
                      {SHARE_AUDIENCE_META[key].label}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {SHARE_AUDIENCE_META[audience].note}
            </p>
          </div>

          <div className="grid gap-2">
            <Label>Sections in this view</Label>
            <div className="grid gap-2">
              {SECTION_META.map((section) => {
                const Icon = section.icon;
                const hiddenOnPublic = alreadyShared[section.key] === false;
                const active = sections[section.key];
                return (
                  <div
                    key={section.key}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border px-3.5 py-3",
                      hiddenOnPublic && "opacity-70",
                    )}
                  >
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="size-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{section.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {hiddenOnPublic
                          ? "Hidden on your public profile - cannot be shared."
                          : section.description}
                      </p>
                    </div>
                    <Switch
                      checked={active && !hiddenOnPublic}
                      disabled={hiddenOnPublic}
                      onCheckedChange={(checked) =>
                        setSections((prev) => ({
                          ...prev,
                          [section.key]: checked,
                        }))
                      }
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="size-4 animate-spin" />}
            {link ? "Save changes" : "Create share link"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ShareLinksPage() {
  const links = useQuery(api.shareLinks.listMine);
  const profile = useQuery(api.profiles.myProfile);
  const updateLink = useMutation(api.shareLinks.update);
  const removeLink = useMutation(api.shareLinks.remove);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Doc<"shareLinks"> | null>(null);

  const publicSections: Sections = profile
    ? (profile.visibility as Sections)
    : ALL_SECTIONS;

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  if (profile === null) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title="Create your profile first"
        description="Share links point at your published profile, so set that up before tailoring a view."
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            Intelligence
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            Smart Share Profiles
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            One profile, several tailored views. Send a recruiter your projects
            and achievements, a mentor your goals and current work, a
            collaborator your stack and contact links - without exposing the
            rest.
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
          New share link
        </Button>
      </header>

      <Panel
        icon={ShieldCheck}
        title="Narrowing, never widening"
        description="Every share link is an intersection with your public profile."
        bodyClassName="text-sm leading-6 text-muted-foreground"
      >
        A share link can hide sections, but it can never reveal something your
        public profile hides. Turn a link off at any time and the URL stops
        resolving immediately.
      </Panel>

      {links === undefined ? (
        <Panel>
          <div className="flex flex-col gap-3">
            {[0, 1].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        </Panel>
      ) : links.length === 0 ? (
        <EmptyState
          icon={Link2}
          title="No share links yet"
          description="Create a tailored view for a recruiter, mentor or collaborator and send it as a single link."
          action={
            <Button
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="size-4" />
              Create share link
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3">
          {links.map((link) => {
            const sharedCount = Object.values(link.sections).filter(
              Boolean,
            ).length;
            const url = `${origin}/s/${link.token}`;
            return (
              <div
                key={link._id}
                className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <UsersRound className="size-4" />
                      </span>
                      <h2 className="text-[15px] font-semibold tracking-tight">
                        {link.label}
                      </h2>
                      <Badge variant="outline" className="text-[11px]">
                        {SHARE_AUDIENCE_META[link.audience].label}
                      </Badge>
                      {!link.isActive && (
                        <Badge variant="secondary" className="text-[11px]">
                          Turned off
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      {sharedCount} of 6 sections ·{" "}
                      {SHARE_AUDIENCE_META[link.audience].note}
                    </p>
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {SECTION_META.filter(
                        (section) => link.sections[section.key],
                      ).map((section) => (
                        <Badge
                          key={section.key}
                          variant="outline"
                          className="border-primary/30 bg-primary/10 text-primary"
                        >
                          {section.label}
                        </Badge>
                      ))}
                      {SECTION_META.filter(
                        (section) => !link.sections[section.key],
                      ).map((section) => (
                        <Badge
                          key={section.key}
                          variant="outline"
                          className="text-muted-foreground/70"
                        >
                          <EyeOff className="size-3" />
                          {section.label} hidden
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2">
                      <span className="text-xs text-muted-foreground">
                        Active
                      </span>
                      <Switch
                        checked={link.isActive}
                        onCheckedChange={async (checked) => {
                          try {
                            await updateLink({
                              id: link._id,
                              isActive: checked,
                            });
                            toast.success(
                              checked
                                ? "Share link enabled"
                                : "Share link turned off",
                            );
                          } catch (error) {
                            toast.error(
                              error instanceof Error
                                ? error.message
                                : "Could not update the link.",
                            );
                          }
                        }}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditing(link);
                        setDialogOpen(true);
                      }}
                    >
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
                            Delete '{link.label}'?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            This URL will stop working immediately. Your public
                            profile is not affected.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={async () => {
                              try {
                                await removeLink({ id: link._id });
                                toast.success("Share link deleted");
                              } catch (error) {
                                toast.error(
                                  error instanceof Error
                                    ? error.message
                                    : "Could not delete the link.",
                                );
                              }
                            }}
                          >
                            Delete link
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3">
                  <code className="min-w-0 flex-1 truncate rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                    {url}
                  </code>
                  <CopyButton value={url} label="Copy link" />
                  <Button size="sm" variant="ghost" asChild>
                    <a href={url} target="_blank" rel="noreferrer">
                      Open
                    </a>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {dialogOpen && (
        <ShareLinkDialog
          key={editing?._id ?? "new"}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          link={editing}
          alreadyShared={publicSections}
        />
      )}
    </div>
  );
}
