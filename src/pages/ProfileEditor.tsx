import { AIModeBadge, AIModeNote } from "@/components/AIModeBadge";
import { CopyButton } from "@/components/CopyButton";
import { EmptyState } from "@/components/EmptyState";
import { Panel } from "@/components/Panel";
import { TagInput } from "@/components/TagInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import {
  AI_NOTES,
  SOCIAL_PLATFORMS,
  type AIMode,
  initials,
} from "@/lib/linksphere";
import { cn } from "@/lib/utils";
import {
  CircleCheck,
  ExternalLink,
  Link2,
  Loader2,
  Plus,
  Save,
  Sparkles,
  TriangleAlert,
  UserRound,
  X,
} from "lucide-react";
import { useAction, useMutation, useQuery } from "convex/react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

function Field({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={htmlFor} className="text-[13px] font-medium">
        {label}
      </Label>
      {children}
      {hint && (
        <p className="text-xs leading-5 text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}

interface FormState {
  slug: string;
  displayName: string;
  headline: string;
  bio: string;
  location: string;
  avatarUrl: string;
  education: string;
  goals: string;
  interests: string[];
  skills: string[];
  socials: { id: string; platform: string; url: string }[];
  resumeUrl: string;
  resumePublic: boolean;
}

function toForm(profile: Doc<"profiles">): FormState {
  return {
    slug: profile.slug,
    displayName: profile.displayName,
    headline: profile.headline ?? "",
    bio: profile.bio ?? "",
    location: profile.location ?? "",
    avatarUrl: profile.avatarUrl ?? "",
    education: profile.education ?? "",
    goals: profile.goals ?? "",
    interests: profile.interests,
    skills: profile.skills.map((s) => s.name),
    socials: profile.socials.map((s) => ({ ...s })),
    resumeUrl: profile.resumeUrl ?? "",
    resumePublic: profile.resumePublic,
  };
}

export default function ProfileEditor() {
  const profile = useQuery(api.profiles.myProfile);
  const projects = useQuery(api.projects.listMine);
  const updateProfile = useMutation(api.profiles.updateProfile);
  const draftBio = useAction(api.ai.draftBio);

  const [saving, setSaving] = useState(false);
  const [bioLoading, setBioLoading] = useState(false);
  const [bioMode, setBioMode] = useState<AIMode | undefined>();
  const [bioNote, setBioNote] = useState<string | undefined>();
  const [slugDraft, setSlugDraft] = useState<string | null>(null);

  // Unsaved edits only: the visible form is always the stored profile merged
  // with this session's changes, so hydration needs no effect.
  const [edits, setEdits] = useState<Partial<FormState>>({});
  const form: FormState | null = profile
    ? { ...toForm(profile), ...edits }
    : null;

  // Debounced availability probe for the public URL.
  const [debouncedSlug, setDebouncedSlug] = useState("");
  useEffect(() => {
    const next = slugDraft ?? profile?.slug ?? "";
    const timer = setTimeout(() => setDebouncedSlug(next), 350);
    return () => clearTimeout(timer);
  }, [slugDraft, profile?.slug]);
  const slugAvailable = useQuery(api.profiles.slugAvailable, {
    slug: debouncedSlug ?? "",
  });
  const slugChanged = slugDraft !== null && slugDraft !== profile?.slug;

  const publicUrl = useMemo(
    () =>
      typeof window !== "undefined"
        ? `${window.location.origin}/p/${slugDraft ?? profile?.slug ?? ""}`
        : "",
    [slugDraft, profile?.slug],
  );

  if (profile === undefined || form === null) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (profile === null) {
    return (
      <EmptyState
        icon={UserRound}
        title="No profile yet"
        description="Your profile could not be created automatically. Reload the page or sign in again."
      />
    );
  }

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setEdits((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    if (!form) return;
    if (!form.displayName.trim()) {
      toast.error("Name is required.");
      return;
    }
    setSaving(true);
    try {
      await updateProfile({
        slug: form.slug,
        displayName: form.displayName,
        headline: form.headline,
        bio: form.bio,
        location: form.location,
        avatarUrl: form.avatarUrl,
        education: form.education,
        goals: form.goals,
        interests: form.interests,
        skills: form.skills.map((name, index) => ({
          id: `s${index}-${name.toLowerCase().replace(/\W+/g, "")}`,
          name,
        })),
        socials: form.socials,
        resumeUrl: form.resumeUrl,
        resumePublic: form.resumePublic,
      });
      toast.success("Profile saved");
      setSlugDraft(null);
      setEdits({});
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not save the profile.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDraftBio = async () => {
    if (!form) return;
    setBioLoading(true);
    try {
      const result = await draftBio({
        input: {
          name: form.displayName,
          headline: form.headline,
          bio: form.bio,
          skills: form.skills,
          interests: form.interests,
          education: form.education,
          goals: form.goals,
          projects: (projects ?? []).map((p) => ({
            title: p.title,
            summary: p.summary ?? "",
          })),
        },
      });
      if (result.ok) {
        set("bio", result.text);
        setBioMode(result.mode);
        setBioNote(result.note);
        toast.success(
          result.mode === "live"
            ? "AI draft ready - review it, then save"
            : "Demo draft ready - review it, then save",
        );
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Drafting failed.");
    } finally {
      setBioLoading(false);
    }
  };

  const slugState = !slugChanged
    ? "current"
    : (slugDraft ?? "").trim().length < 3
      ? "short"
      : slugAvailable === undefined
        ? "checking"
        : slugAvailable
          ? "available"
          : "taken";

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Workspace</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            Profile editor
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Everything here feeds your public profile, the AI twin and the
            opportunity matcher.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <a href={publicUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="size-4" />
              Preview
            </a>
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            Save changes
          </Button>
        </div>
      </header>

      {/* Identity */}
      <Panel
        icon={UserRound}
        title="Identity"
        description="The first thing every visitor sees."
      >
        <div className="grid gap-5 sm:grid-cols-[auto_1fr]">
          <div className="flex flex-col items-center gap-2">
            <div className="flex size-20 items-center justify-center rounded-full bg-primary/15 text-xl font-semibold text-primary overflow-hidden">
              {form.avatarUrl ? (
                <img
                  src={form.avatarUrl}
                  alt=""
                  className="size-20 rounded-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display =
                      "none";
                  }}
                />
              ) : (
                initials(form.displayName || "?")
              )}
            </div>
            <span className="text-[11px] text-muted-foreground">Photo URL</span>
          </div>
          <div className="grid gap-4">
            <Field label="Profile photo URL" htmlFor="avatarUrl">
              <Input
                id="avatarUrl"
                placeholder="https://.../photo.jpg"
                value={form.avatarUrl}
                onChange={(e) => set("avatarUrl", e.target.value)}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Display name" htmlFor="displayName">
                <Input
                  id="displayName"
                  value={form.displayName}
                  onChange={(e) => set("displayName", e.target.value)}
                  placeholder="Your name"
                />
              </Field>
              <Field label="Location (optional)" htmlFor="location">
                <Input
                  id="location"
                  value={form.location}
                  onChange={(e) => set("location", e.target.value)}
                  placeholder="City, Country"
                />
              </Field>
            </div>
            <Field
              label="Headline"
              htmlFor="headline"
              hint={`${form.headline.length}/160 characters`}
            >
              <Input
                id="headline"
                value={form.headline}
                maxLength={160}
                onChange={(e) => set("headline", e.target.value)}
                placeholder="CS student · Full-stack & applied-AI builder"
              />
            </Field>
          </div>
        </div>
      </Panel>

      {/* Bio with AI */}
      <Panel
        icon={Sparkles}
        title="Bio"
        description="Written in first person. Draft it with AI, then edit freely - nothing publishes without your save."
        actions={
          <div className="flex items-center gap-2">
            <AIModeBadge mode={bioMode} />
            <Button
              size="sm"
              variant="outline"
              onClick={handleDraftBio}
              disabled={bioLoading}
            >
              {bioLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              {bioLoading ? "Drafting..." : "Draft with AI"}
            </Button>
          </div>
        }
      >
        <Textarea
          value={form.bio}
          maxLength={2000}
          rows={5}
          onChange={(e) => set("bio", e.target.value)}
          placeholder="I build practical web and machine-learning tools..."
          className="leading-6"
        />
        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>{form.bio.length}/2000 characters</span>
          <span>AI drafts are suggestions - review before publishing.</span>
        </div>
        {bioNote && (
          <div className="mt-3">
            <AIModeNote mode={bioMode} note={bioNote} />
          </div>
        )}
        {bioMode === "demo" && !bioNote && (
          <div className="mt-3">
            <AIModeNote mode="demo" note={AI_NOTES.bio} />
          </div>
        )}
      </Panel>

      {/* Background */}
      <Panel
        icon={UserRound}
        title="Background"
        description="Education, goals and interests."
      >
        <div className="grid gap-5">
          <Field label="Education" htmlFor="education">
            <Input
              id="education"
              value={form.education}
              onChange={(e) => set("education", e.target.value)}
              placeholder="B.Tech Computer Science, 2023-2027"
            />
          </Field>
          <Field
            label="Professional goals"
            htmlFor="goals"
            hint="Used by the matcher to judge fit."
          >
            <Textarea
              id="goals"
              rows={2}
              value={form.goals}
              onChange={(e) => set("goals", e.target.value)}
              placeholder="Land an applied-AI internship where I can ship models to production."
            />
          </Field>
          <Field label="Interests" hint="Press Enter to add each interest.">
            <TagInput
              value={form.interests}
              onChange={(next) => set("interests", next)}
              placeholder="Open source, Design, Hackathons..."
            />
          </Field>
        </div>
      </Panel>

      {/* Skills */}
      <Panel
        icon={Sparkles}
        title="Skills & technology stack"
        description="Skills become evidence anchors: link them to projects and achievements so visitors can verify them."
      >
        <TagInput
          value={form.skills}
          onChange={(next) => set("skills", next)}
          placeholder="Python, React, Figma..."
        />
        <p className="mt-2 text-xs text-muted-foreground">
          {form.skills.length} skill{form.skills.length === 1 ? "" : "s"}{" "}
          listed.
        </p>
      </Panel>

      {/* Socials + resume */}
      <Panel
        icon={Link2}
        title="Links & socials"
        description="Shown in the contact section of your public profile."
        actions={
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              set("socials", [
                ...form.socials,
                { id: `so${Date.now()}`, platform: "GitHub", url: "" },
              ])
            }
          >
            <Plus className="size-4" />
            Add link
          </Button>
        }
      >
        <div className="grid gap-3">
          {form.socials.length === 0 && (
            <p className="rounded-lg border border-dashed bg-muted/30 px-3 py-4 text-center text-sm text-muted-foreground">
              No links yet - add GitHub, LinkedIn, Instagram or YouTube.
            </p>
          )}
          {form.socials.map((social, index) => (
            <div
              key={social.id}
              className="grid gap-3 sm:grid-cols-[160px_1fr_auto]"
            >
              <Select
                value={social.platform}
                onValueChange={(value) => {
                  const next = [...form.socials];
                  next[index] = { ...next[index], platform: value };
                  set("socials", next);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOCIAL_PLATFORMS.map((platform) => (
                    <SelectItem key={platform} value={platform}>
                      {platform}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={social.url}
                placeholder="https://..."
                onChange={(e) => {
                  const next = [...form.socials];
                  next[index] = { ...next[index], url: e.target.value };
                  set("socials", next);
                }}
              />
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-destructive"
                aria-label="Remove link"
                onClick={() =>
                  set(
                    "socials",
                    form.socials.filter((s) => s.id !== social.id),
                  )
                }
              >
                <X className="size-4" />
              </Button>
            </div>
          ))}

          <div className="mt-2 grid gap-4 border-t pt-4 sm:grid-cols-2">
            <Field
              label="Resume link"
              htmlFor="resumeUrl"
              hint="Direct URL to your PDF or portfolio."
            >
              <Input
                id="resumeUrl"
                value={form.resumeUrl}
                onChange={(e) => set("resumeUrl", e.target.value)}
                placeholder="https://.../resume.pdf"
              />
            </Field>
            <div className="flex items-end gap-3 pb-1">
              <Switch
                id="resumePublic"
                checked={form.resumePublic}
                onCheckedChange={(checked) => set("resumePublic", checked)}
              />
              <Label htmlFor="resumePublic" className="text-[13px] leading-5">
                Show resume on public profile
                <span className="block text-xs font-normal text-muted-foreground">
                  Keep private until you are ready.
                </span>
              </Label>
            </div>
          </div>
        </div>
      </Panel>

      {/* Public URL */}
      <Panel
        icon={Link2}
        title="Public URL"
        description="Permanent - you can change the handle once; the link you share should stay stable."
      >
        <div className="grid gap-4">
          <Field label="Handle" htmlFor="slug">
            <div className="flex items-center gap-2">
              <span className="hidden rounded-lg border bg-muted/50 px-3 py-2 text-sm text-muted-foreground sm:inline-block">
                /p/
              </span>
              <Input
                id="slug"
                value={slugDraft ?? profile.slug}
                onChange={(e) => setSlugDraft(e.target.value)}
                placeholder="your-name"
              />
            </div>
          </Field>
          <div className="flex items-center gap-2 text-xs">
            {slugState === "current" && (
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <CircleCheck className="size-3.5" />
                This is your public URL
              </span>
            )}
            {slugState === "short" && (
              <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                <TriangleAlert className="size-3.5" />
                Use at least 3 characters
              </span>
            )}
            {slugState === "checking" && (
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" />
                Checking availability...
              </span>
            )}
            {slugState === "available" && (
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <CircleCheck className="size-3.5" />
                Available - save to claim it
              </span>
            )}
            {slugState === "taken" && (
              <span className="flex items-center gap-1.5 text-destructive">
                <TriangleAlert className="size-3.5" />
                That handle is already taken
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2.5">
            <Link2 className="size-4 shrink-0 text-muted-foreground" />
            <span className="truncate text-[13px] font-medium">
              {publicUrl}
            </span>
            <CopyButton value={publicUrl} className="ml-auto" />
          </div>
        </div>
      </Panel>

      {/* Publishing */}
      <Panel
        icon={ExternalLink}
        title="Publishing"
        description="Your dashboard stays private until you publish. Sections can be hidden in Settings & privacy."
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <p
              className={cn(
                "text-sm font-medium",
                profile.published
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-muted-foreground",
              )}
            >
              {profile.published
                ? "Your profile is live"
                : "Your profile is a private draft"}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {profile.published
                ? `Anyone with ${publicUrl} can view it.`
                : "Only you can see it until you publish."}
            </p>
          </div>
          <Switch
            checked={profile.published}
            onCheckedChange={async (checked) => {
              try {
                await updateProfile({ published: checked });
                toast.success(
                  checked
                    ? "Published - your link is live"
                    : "Unpublished - the link now hides your profile",
                );
              } catch (error) {
                toast.error(
                  error instanceof Error
                    ? error.message
                    : "Could not update publishing.",
                );
              }
            }}
          />
        </div>
      </Panel>
    </div>
  );
}
