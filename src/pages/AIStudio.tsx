import { AIModeBadge, AIModeNote } from "@/components/AIModeBadge";
import { EmptyState } from "@/components/EmptyState";
import { Panel } from "@/components/Panel";
import { TagInput } from "@/components/TagInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import {
  AI_NOTES,
  LOCALE_META,
  TRANSLATABLE_LOCALES,
  type AIMode,
  type TranslatableLocale,
} from "@/lib/linksphere";
import { cn } from "@/lib/utils";
import {
  CircleUserRound,
  Copy,
  Languages,
  Loader2,
  MessageSquare,
  Save,
  Send,
  Sparkles,
  Target,
  Trash2,
} from "lucide-react";
import { useAction, useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";

const SUGGESTED_QUESTIONS = (name: string) => [
  `What projects has ${name.split(" ")[0]} built?`,
  `What are ${name.split(" ")[0]}'s strongest skills?`,
  `Which projects demonstrate Python skills?`,
  `Why might this person be suitable for an AI internship?`,
];

function TwinTab() {
  const profile = useQuery(api.profiles.myProfile);
  const updateProfile = useMutation(api.profiles.updateProfile);
  const askTwin = useAction(api.ai.askTwin);

  const [intro, setIntro] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [answer, setAnswer] = useState<{
    text: string;
    mode: AIMode;
    note?: string;
  } | null>(null);

  if (!profile) return null;

  const twinIntro = intro ?? profile.twinIntro ?? "";

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({
        twinEnabled: profile.twinEnabled,
        twinIntro,
      });
      toast.success("Twin settings saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  };

  const handleAsk = async (text: string) => {
    const q = text.trim();
    if (!q) return;
    setAsking(true);
    setAnswer(null);
    try {
      const result = await askTwin({ slug: profile.slug, question: q });
      if (result.ok) {
        setAnswer({
          text: result.answer,
          mode: result.mode,
          note: result.note,
        });
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "The twin is unavailable.",
      );
    } finally {
      setAsking(false);
    }
  };

  return (
    <div className="grid gap-6">
      <Panel
        icon={MessageSquare}
        title="Personal Twin"
        description="Your twin answers visitor questions using only the published sections of your profile. Private dashboard data never reaches it."
        actions={
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {profile.twinEnabled ? "Enabled" : "Disabled"}
            </span>
            <Switch
              checked={profile.twinEnabled}
              onCheckedChange={async (checked) => {
                try {
                  await updateProfile({ twinEnabled: checked });
                  toast.success(
                    checked
                      ? "Twin enabled"
                      : "Twin disabled on your public page",
                  );
                } catch (error) {
                  toast.error(
                    error instanceof Error
                      ? error.message
                      : "Could not update.",
                  );
                }
              }}
            />
          </div>
        }
      >
        <div className="grid gap-2">
          <Label htmlFor="twin-intro">Answering style (optional)</Label>
          <Textarea
            id="twin-intro"
            rows={2}
            maxLength={600}
            value={twinIntro}
            onChange={(e) => setIntro(e.target.value)}
            placeholder="Answer only from my published profile. Prefer concrete projects as evidence."
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {twinIntro.length}/600 - style only; the twin still refuses to
              invent facts.
            </p>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              Save
            </Button>
          </div>
        </div>
      </Panel>

      <Panel
        icon={CircleUserRound}
        title="Test your twin"
        description={
          profile.published
            ? "Ask exactly what a visitor would ask - this runs against your published profile."
            : "Your profile is still a draft. As the owner you can preview the twin; visitors cannot see it until you publish."
        }
      >
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_QUESTIONS(profile.displayName).map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => {
                setQuestion(q);
                handleAsk(q);
              }}
              disabled={asking}
              className="rounded-full border bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>

        <form
          className="mt-4 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            handleAsk(question);
          }}
        >
          <Input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask anything about this profile..."
            maxLength={400}
          />
          <Button type="submit" disabled={asking || !question.trim()}>
            {asking ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            Ask
          </Button>
        </form>

        {asking && (
          <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Thinking...
          </p>
        )}

        {answer && (
          <div className="mt-4 rounded-xl border bg-muted/30 p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-muted-foreground">
                You asked: {question}
              </p>
              <AIModeBadge mode={answer.mode} />
            </div>
            <p className="text-sm leading-6">{answer.text}</p>
            {answer.note && (
              <div className="mt-3">
                <AIModeNote mode={answer.mode} note={answer.note} />
              </div>
            )}
          </div>
        )}
      </Panel>
    </div>
  );
}

function BioTab() {
  const profile = useQuery(api.profiles.myProfile);
  const projects = useQuery(api.projects.listMine);
  const updateProfile = useMutation(api.profiles.updateProfile);
  const draftBio = useAction(api.ai.draftBio);

  const [text, setText] = useState<string | null>(null);
  const [mode, setMode] = useState<AIMode | undefined>();
  const [note, setNote] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);

  if (!profile) return null;

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const result = await draftBio({
        input: {
          name: profile.displayName,
          headline: profile.headline ?? "",
          bio: profile.bio ?? "",
          skills: profile.skills.map((s) => s.name),
          interests: profile.interests,
          education: profile.education ?? "",
          goals: profile.goals ?? "",
          projects: (projects ?? []).map((p) => ({
            title: p.title,
            summary: p.summary ?? "",
          })),
        },
      });
      if (result.ok) {
        setText(result.text);
        setMode(result.mode);
        setNote(result.note);
        toast.success(
          result.mode === "live" ? "Draft generated" : "Demo draft generated",
        );
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Drafting failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (!text) return;
    setApplying(true);
    try {
      await updateProfile({ bio: text });
      toast.success("Bio saved to your profile");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save.");
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="grid gap-6">
      <Panel
        icon={Sparkles}
        title="AI bio & summary writer"
        description="The core v1 AI feature: turn your facts into a polished first-person bio. Nothing is saved until you apply it."
        actions={
          <div className="flex items-center gap-2">
            <AIModeBadge mode={mode} />
            <Button size="sm" onClick={handleGenerate} disabled={loading}>
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              {loading ? "Writing..." : "Generate draft"}
            </Button>
          </div>
        }
      >
        <div className="rounded-lg border bg-muted/30 p-3.5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Facts the writer uses
          </p>
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <li>Name: {profile.displayName}</li>
            <li>Headline: {profile.headline || "-"}</li>
            <li>
              Skills: {profile.skills.map((s) => s.name).join(", ") || "-"}
            </li>
            <li>
              Projects: {(projects ?? []).map((p) => p.title).join(", ") || "-"}
            </li>
            <li>Education: {profile.education || "-"}</li>
          </ul>
        </div>

        <Textarea
          rows={5}
          className="mt-4 leading-6"
          value={text ?? profile.bio ?? ""}
          onChange={(e) => setText(e.target.value)}
          placeholder="Your draft appears here - edit it freely."
          maxLength={2000}
        />

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                if (!text) return;
                try {
                  await navigator.clipboard.writeText(text);
                  toast.success("Copied");
                } catch {
                  toast.error("Could not copy.");
                }
              }}
              disabled={!text}
            >
              <Copy className="size-4" />
              Copy
            </Button>
            <Button
              size="sm"
              onClick={handleApply}
              disabled={!text || applying || text === profile.bio}
            >
              {applying && <Loader2 className="size-4 animate-spin" />}
              Apply to profile
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Review every draft before publishing.
          </p>
        </div>
        <div className="mt-3">
          <AIModeNote
            mode={mode}
            note={note ?? (mode === "demo" ? AI_NOTES.bio : undefined)}
          />
        </div>
      </Panel>
    </div>
  );
}

function ProjectTab() {
  const [title, setTitle] = useState("");
  const [role, setRole] = useState("");
  const [technologies, setTechnologies] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [text, setText] = useState<string | null>(null);
  const [mode, setMode] = useState<AIMode | undefined>();
  const [note, setNote] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const draftProjectSummary = useAction(api.ai.draftProjectSummary);

  const handleGenerate = async () => {
    if (!title.trim()) {
      toast.error("Add a project title first.");
      return;
    }
    setLoading(true);
    try {
      const result = await draftProjectSummary({
        input: { title, description: notes, role, technologies },
      });
      if (result.ok) {
        setText(result.text);
        setMode(result.mode);
        setNote(result.note);
        toast.success("Summary drafted");
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Drafting failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-6">
      <Panel
        icon={Target}
        title="Project description generator"
        description="Turn rough project notes into a crisp 2-sentence summary, then paste it into the project editor."
        actions={
          <div className="flex items-center gap-2">
            <AIModeBadge mode={mode} />
            <Button size="sm" onClick={handleGenerate} disabled={loading}>
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              {loading ? "Writing..." : "Draft summary"}
            </Button>
          </div>
        }
      >
        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="gen-title">Project title</Label>
              <Input
                id="gen-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="TransitPulse"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="gen-role">Your role</Label>
              <Input
                id="gen-role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="Full-stack developer"
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Technologies</Label>
            <TagInput
              value={technologies}
              onChange={setTechnologies}
              placeholder="React, Node.js..."
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="gen-notes">Rough notes</Label>
            <Textarea
              id="gen-notes"
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Real-time transit dashboard; blends live vehicle feeds with delay analytics; built with Mapbox..."
            />
          </div>

          {text !== null && (
            <div className="rounded-xl border bg-muted/30 p-4">
              <Textarea
                rows={3}
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="bg-background"
              />
              <div className="mt-3 flex items-center justify-between gap-3">
                <AIModeNote
                  mode={mode}
                  note={
                    note ?? (mode === "demo" ? AI_NOTES.project : undefined)
                  }
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(text);
                      toast.success("Copied - paste it into your project");
                    } catch {
                      toast.error("Could not copy.");
                    }
                  }}
                >
                  <Copy className="size-4" />
                  Copy
                </Button>
              </div>
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
}

// Multilingual profiles

interface TranslationDraft {
  headline: string;
  bio: string;
  goals: string;
  education: string;
  interests: string[];
}

function TranslationTab() {
  const profile = useQuery(api.profiles.myProfile);
  const saved = useQuery(api.translations.listMine);
  const translateProfile = useAction(api.ai.translateProfile);
  const saveTranslation = useMutation(api.translations.save);
  const removeTranslation = useMutation(api.translations.remove);

  const [locale, setLocale] = useState<TranslatableLocale>("te");
  const [draft, setDraft] = useState<TranslationDraft | null>(null);
  const [mode, setMode] = useState<AIMode | undefined>();
  const [note, setNote] = useState<string | undefined>();
  const [reviewed, setReviewed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!profile) return null;

  const existing = (saved ?? []).find((item) => item.locale === locale) ?? null;

  const selectLocale = (next: TranslatableLocale) => {
    setLocale(next);
    const row = (saved ?? []).find((item) => item.locale === next);
    setDraft(
      row
        ? {
            headline: row.headline ?? "",
            bio: row.bio ?? "",
            goals: row.goals ?? "",
            education: row.education ?? "",
            interests: row.interests,
          }
        : null,
    );
    setReviewed(row?.reviewed ?? false);
    setMode(row?.mode);
    setNote(undefined);
  };

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const result = await translateProfile({ locale });
      if (result.ok) {
        setDraft({
          headline: result.fields.headline,
          bio: result.fields.bio,
          goals: result.fields.goals,
          education: result.fields.education,
          interests: result.fields.interests,
        });
        setMode(result.mode);
        setNote(result.note);
        // Review starts unchecked: nothing is published until you say so.
        setReviewed(false);
        toast.success(
          result.mode === "live"
            ? "Translation generated - review it before publishing"
            : "No model available - nothing was translated",
        );
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Translation failed.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      await saveTranslation({
        locale,
        ...draft,
        mode: mode ?? "demo",
        reviewed,
      });
      toast.success(
        reviewed
          ? `Saved and published in ${LOCALE_META[locale].label}`
          : `Saved as a draft in ${LOCALE_META[locale].label}`,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  };

  const set = <K extends keyof TranslationDraft>(
    key: K,
    value: TranslationDraft[K],
  ) => setDraft((prev) => (prev ? { ...prev, [key]: value } : prev));

  return (
    <div className="grid gap-6">
      <Panel
        icon={Languages}
        title="Multilingual profile"
        description="Generate your profile in Telugu or Hindi, review it, then decide whether to publish it. Technical terms, project names and links are never translated."
        actions={
          <div className="flex items-center gap-2">
            <AIModeBadge mode={mode} />
            <Button size="sm" onClick={handleGenerate} disabled={loading}>
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              {loading
                ? "Translating..."
                : draft
                  ? "Regenerate"
                  : "Generate translation"}
            </Button>
          </div>
        }
      >
        <div className="flex flex-wrap gap-2">
          {TRANSLATABLE_LOCALES.map((code) => {
            const row = (saved ?? []).find((item) => item.locale === code);
            return (
              <button
                key={code}
                type="button"
                onClick={() => selectLocale(code)}
                className={cn(
                  "flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                  locale === code
                    ? "border-primary/50 bg-primary/10 text-primary"
                    : "bg-muted/40 text-muted-foreground hover:bg-muted",
                )}
              >
                {LOCALE_META[code].native}
                <span className="text-[11px] text-muted-foreground">
                  {row ? (row.reviewed ? "published" : "draft") : "not added"}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-4 rounded-lg border bg-muted/30 p-3.5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Original (English)
          </p>
          <ul className="mt-2 grid gap-1 text-xs text-muted-foreground">
            <li>Headline: {profile.headline || "-"}</li>
            <li className="line-clamp-2">Bio: {profile.bio || "-"}</li>
            <li>Goals: {profile.goals || "-"}</li>
            <li>Education: {profile.education || "-"}</li>
          </ul>
        </div>

        {!draft && (
          <p className="mt-4 rounded-lg border border-dashed bg-muted/30 px-3.5 py-3 text-xs leading-5 text-muted-foreground">
            No {LOCALE_META[locale].label} version yet. Generate one, review
            every field, then publish it when you are happy.
          </p>
        )}

        {draft && (
          <div className="mt-4 grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="tr-headline">Headline</Label>
              <Input
                id="tr-headline"
                value={draft.headline}
                onChange={(e) => set("headline", e.target.value)}
                maxLength={160}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tr-bio">Bio</Label>
              <Textarea
                id="tr-bio"
                rows={5}
                className="leading-6"
                value={draft.bio}
                onChange={(e) => set("bio", e.target.value)}
                maxLength={2400}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="tr-goals">Goal</Label>
                <Textarea
                  id="tr-goals"
                  rows={3}
                  value={draft.goals}
                  onChange={(e) => set("goals", e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tr-education">Education</Label>
                <Textarea
                  id="tr-education"
                  rows={3}
                  value={draft.education}
                  onChange={(e) => set("education", e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Interests</Label>
              <TagInput
                value={draft.interests}
                onChange={(next) => set("interests", next)}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3.5 py-3">
              <div>
                <p className="text-sm font-medium">
                  Reviewed - show on my public profile
                </p>
                <p className="text-xs text-muted-foreground">
                  Unreviewed translations stay private in the dashboard.
                </p>
              </div>
              <Switch checked={reviewed} onCheckedChange={setReviewed} />
            </div>

            <AIModeNote
              mode={mode}
              note={
                note ?? (mode === "demo" ? AI_NOTES.translation : undefined)
              }
            />

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                {mode === "demo"
                  ? "These fields still hold your original English text."
                  : "Check names, numbers and links before publishing."}
              </p>
              <div className="flex items-center gap-2">
                {existing && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={async () => {
                      try {
                        await removeTranslation({ locale });
                        setDraft(null);
                        setReviewed(false);
                        toast.success(
                          `${LOCALE_META[locale].label} version removed`,
                        );
                      } catch (error) {
                        toast.error(
                          error instanceof Error
                            ? error.message
                            : "Could not remove.",
                        );
                      }
                    }}
                  >
                    <Trash2 className="size-4" />
                    Remove
                  </Button>
                )}
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Save className="size-4" />
                  )}
                  {reviewed ? "Save & publish" : "Save draft"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Panel>
    </div>
  );
}

export default function AIStudio() {
  const profile = useQuery(api.profiles.myProfile);

  if (profile === null) {
    return (
      <EmptyState
        icon={Sparkles}
        title="Create your profile first"
        description="AI Studio works with your profile data - set one up from the Overview page."
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="text-sm font-medium text-muted-foreground">Workspace</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          AI Studio
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Twin configuration, bio writing and project summaries. Every result is
          labelled live or demo - we never pass templates off as AI.
        </p>
      </header>

      <Tabs defaultValue="twin" className="gap-6">
        <TabsList>
          <TabsTrigger value="twin">
            <MessageSquare className="size-4" />
            Personal Twin
          </TabsTrigger>
          <TabsTrigger value="bio">
            <Sparkles className="size-4" />
            Bio writer
          </TabsTrigger>
          <TabsTrigger value="project">
            <Target className="size-4" />
            Project summaries
          </TabsTrigger>
          <TabsTrigger value="languages">
            <Languages className="size-4" />
            Languages
          </TabsTrigger>
        </TabsList>

        <TabsContent value="twin">
          <TwinTab />
        </TabsContent>
        <TabsContent value="bio">
          <BioTab />
        </TabsContent>
        <TabsContent value="project">
          <ProjectTab />
        </TabsContent>
        <TabsContent value="languages">
          <TranslationTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
