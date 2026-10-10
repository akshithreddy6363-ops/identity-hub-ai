import { CopyButton } from "@/components/CopyButton";
import { EmptyState } from "@/components/EmptyState";
import { Panel } from "@/components/Panel";
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
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { initials } from "@/lib/linksphere";
import { cn } from "@/lib/utils";
import {
  Eye,
  Link2,
  LogOut,
  Monitor,
  Moon,
  Settings,
  ShieldCheck,
  Sun,
  Trash2,
} from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";

const emptySubscribe = () => () => {};

const SECTION_ROWS = [
  {
    key: "about",
    label: "About section",
    note: "Bio, location, education, interests and goals.",
  },
  {
    key: "skills",
    label: "Skills",
    note: "Your skill list and its evidence links.",
  },
  {
    key: "projects",
    label: "Projects",
    note: "Published project cards.",
  },
  {
    key: "achievements",
    label: "Achievement Passport",
    note: "Published passport entries.",
  },
  {
    key: "contact",
    label: "Contact & links",
    note: "Social links, resume (when enabled).",
  },
] as const;

function ThemePicker() {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  const options = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ] as const;

  return (
    <div className="flex gap-2">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => setTheme(option.value)}
          className={cn(
            "flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm transition-colors",
            mounted && theme === option.value
              ? "border-primary/40 bg-primary/10 text-primary"
              : "bg-muted/30 text-muted-foreground hover:bg-muted",
          )}
        >
          <option.icon className="size-4" />
          {option.label}
        </button>
      ))}
    </div>
  );
}

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const profile = useQuery(api.profiles.myProfile);
  const updateProfile = useMutation(api.profiles.updateProfile);
  const deleteMyData = useMutation(api.profiles.deleteMyData);
  const navigate = useNavigate();

  if (profile === undefined) {
    return (
      <div className="flex flex-col gap-4">
        <div className="h-8 w-56 animate-pulse rounded-lg bg-muted" />
        <div className="h-64 w-full animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }

  if (profile === null) {
    return (
      <EmptyState
        icon={Settings}
        title="Nothing to configure yet"
        description="Create your profile from the Overview page, then privacy controls appear here."
      />
    );
  }

  const publicUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/p/${profile.slug}`
      : "";

  const setVisibility = async (
    key: (typeof SECTION_ROWS)[number]["key"],
    value: boolean,
  ) => {
    try {
      await updateProfile({
        visibility: { ...profile.visibility, [key]: value },
      });
      toast.success(
        value
          ? `"${SECTION_ROWS.find((r) => r.key === key)?.label}" is now public`
          : `"${SECTION_ROWS.find((r) => r.key === key)?.label}" is now hidden`,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update visibility.");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="text-sm font-medium text-muted-foreground">Account</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          Settings & privacy
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Private dashboard data never leaves your account — only what you mark
          public here appears on your profile URL.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel icon={Eye} title="Public sections" description="Choose exactly what visitors see.">
          <div className="grid gap-1">
            {SECTION_ROWS.map((row) => (
              <div
                key={row.key}
                className="flex items-center justify-between gap-4 rounded-lg px-1 py-2.5"
              >
                <div>
                  <Label htmlFor={`vis-${row.key}`} className="text-sm font-medium">
                    {row.label}
                  </Label>
                  <p className="text-xs text-muted-foreground">{row.note}</p>
                </div>
                <Switch
                  id={`vis-${row.key}`}
                  checked={profile.visibility[row.key]}
                  onCheckedChange={(checked) => setVisibility(row.key, checked)}
                />
              </div>
            ))}
            <div className="mt-2 flex items-center justify-between gap-4 rounded-lg border bg-muted/30 px-3.5 py-3">
              <div>
                <Label htmlFor="vis-resume" className="text-sm font-medium">
                  Resume link
                </Label>
                <p className="text-xs text-muted-foreground">
                  Hidden from the public page until you enable it.
                </p>
              </div>
              <Switch
                id="vis-resume"
                checked={profile.resumePublic}
                onCheckedChange={async (checked) => {
                  try {
                    await updateProfile({ resumePublic: checked });
                    toast.success(
                      checked ? "Resume link is public" : "Resume link is private",
                    );
                  } catch (error) {
                    toast.error(
                      error instanceof Error ? error.message : "Could not update.",
                    );
                  }
                }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between gap-4 rounded-lg border bg-muted/30 px-3.5 py-3">
              <div>
                <Label htmlFor="vis-publish" className="text-sm font-medium">
                  Profile published
                </Label>
                <p className="text-xs text-muted-foreground">
                  When off, your URL shows nothing to visitors.
                </p>
              </div>
              <Switch
                id="vis-publish"
                checked={profile.published}
                onCheckedChange={async (checked) => {
                  try {
                    await updateProfile({ published: checked });
                    toast.success(checked ? "Profile published" : "Profile unpublished");
                  } catch (error) {
                    toast.error(
                      error instanceof Error ? error.message : "Could not update.",
                    );
                  }
                }}
              />
            </div>
          </div>
        </Panel>

        <div className="flex flex-col gap-6">
          <Panel icon={Link2} title="Your public link" description="Permanent URL for sharing.">
            <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2.5">
              <Link2 className="size-4 shrink-0 text-muted-foreground" />
              <span className="truncate text-[13px] font-medium">{publicUrl}</span>
              <CopyButton value={publicUrl} className="ml-auto" />
            </div>
          </Panel>

          <Panel icon={ShieldCheck} title="Appearance" description="Light, dark or follow your system.">
            <ThemePicker />
          </Panel>

          <Panel
            icon={Settings}
            title="Account"
            description="Signed in with email authentication."
          >
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
                {initials(user?.name || user?.email || "?")}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {user?.name || "Unnamed account"}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {user?.email || "Signed in locally"}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="ml-auto"
                onClick={async () => {
                  await signOut();
                  navigate("/");
                }}
              >
                <LogOut className="size-4" />
                Sign out
              </Button>
            </div>
          </Panel>
        </div>
      </div>

      {/* Danger zone */}
      <Panel
        icon={Trash2}
        title="Delete my data"
        description="Removes your profile, projects and achievements permanently."
        className="border-destructive/30"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="max-w-xl text-sm leading-6 text-muted-foreground">
            This erases everything you have added to LinkSphere: profile fields,
            projects, achievements and privacy settings. The public URL stops
            working immediately. This cannot be undone.
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="size-4" />
                Delete everything
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete all of your data?</AlertDialogTitle>
                <AlertDialogDescription>
                  Your profile, projects and achievements will be permanently
                  removed, and your public link will go offline.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={async () => {
                    try {
                      await deleteMyData();
                      await signOut();
                      toast.success("Your data has been deleted");
                      navigate("/");
                    } catch (error) {
                      toast.error(
                        error instanceof Error
                          ? error.message
                          : "Could not delete your data.",
                      );
                    }
                  }}
                >
                  Yes, delete everything
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </Panel>
    </div>
  );
}
