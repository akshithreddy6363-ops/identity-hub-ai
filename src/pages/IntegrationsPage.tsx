import { EmptyState } from "@/components/EmptyState";
import { Panel } from "@/components/Panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  CircleCheck,
  FlaskConical,
  Github,
  Loader2,
  Plus,
  RefreshCw,
  Star,
  Unplug,
  Upload,
} from "lucide-react";
import { useAction, useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";

interface RepoItem {
  externalId: string;
  name: string;
  description: string;
  url: string;
  language: string;
  stars: number;
  selected: boolean;
}

export default function IntegrationsPage() {
  const integration = useQuery(api.integrations.mine);
  const syncGithub = useAction(api.integrations.syncGithub);
  const loadSimulated = useAction(api.integrations.loadSimulated);
  const saveSync = useMutation(api.integrations.saveSync);
  const toggleItem = useMutation(api.integrations.toggleItem);
  const disconnect = useMutation(api.integrations.disconnect);
  const addSelected = useMutation(api.integrations.addSelectedToProjects);

  const [handle, setHandle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [publishImported, setPublishImported] = useState(true);

  /** Selection is kept by externalId so a refresh never loses your choices. */
  const mergeSelection = (items: RepoItem[], previous: RepoItem[] = []) =>
    items.map((item) => ({
      ...item,
      selected:
        previous.find((p) => p.externalId === item.externalId)?.selected ??
        item.selected,
    }));

  const runSync = async (username: string, previous: RepoItem[] = []) => {
    const login = username.trim();
    if (!login) {
      toast.error("Enter your GitHub username first.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await syncGithub({ handle: login });
      if (result.ok) {
        await saveSync({
          handle: result.handle,
          status: "connected",
          items: mergeSelection(result.items, previous),
        });
        toast.success(
          `Synced public repositories from GitHub (@${result.handle})`,
        );
      } else {
        setError(result.error);
        toast.error(result.error);
      }
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : "GitHub sync failed.";
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  const runSimulated = async () => {
    setBusy(true);
    try {
      const result = await loadSimulated({ handle });
      await saveSync({
        handle: result.handle,
        status: "simulated",
        items: mergeSelection(result.items, integration?.items),
        lastError: error ?? "Simulated samples loaded instead of a live sync.",
      });
      toast.success("Loaded clearly-labelled simulated sample repositories");
    } catch (caught) {
      toast.error(
        caught instanceof Error ? caught.message : "Could not load samples.",
      );
    } finally {
      setBusy(false);
    }
  };

  const handleImport = async () => {
    const selected = (integration?.items ?? []).filter((item) => item.selected);
    if (selected.length === 0) {
      toast.error("Select at least one repository to add.");
      return;
    }
    try {
      const result = await addSelected({ published: publishImported });
      toast.success(
        result.added === 0
          ? "Those repositories are already in your projects."
          : `Added ${result.added} project${result.added === 1 ? "" : "s"}${
              publishImported ? " and published" : " as drafts"
            }`,
      );
    } catch (caught) {
      toast.error(
        caught instanceof Error
          ? caught.message
          : "Could not add the projects.",
      );
    }
  };

  const selectedCount = (integration?.items ?? []).filter(
    (i) => i.selected,
  ).length;
  const isSimulated = integration?.status === "simulated";

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="text-sm font-medium text-muted-foreground">Workspace</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          Living Portfolio Integrations
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Keep your portfolio alive by syncing selected project information from
          GitHub. You choose which repositories to import and when to refresh.
        </p>
      </header>

      <Panel
        icon={Github}
        title="Connect a GitHub account"
        description="Public repositories only - no tokens, no passwords, nothing private."
        bodyClassName="flex flex-col gap-4"
      >
        <div className="grid gap-2">
          <Label htmlFor="github-handle">GitHub username</Label>
          <div className="flex flex-wrap gap-2">
            <Input
              id="github-handle"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              placeholder="octocat"
              className="min-w-48 flex-1"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !busy)
                  runSync(handle, integration?.items);
              }}
            />
            <Button
              onClick={() => runSync(handle, integration?.items)}
              disabled={busy || !handle.trim()}
            >
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              {busy ? "Syncing..." : "Sync repositories"}
            </Button>
          </div>
          <p className="text-xs leading-5 text-muted-foreground">
            We read the public GitHub REST API with your username only.
            LinkSphere stores the repository metadata you select - never
            credentials.
          </p>
        </div>

        {error && (
          <div className="flex flex-col gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
            <p className="flex items-start gap-2 text-[13px] leading-6 text-amber-700 dark:text-amber-300">
              <AlertTriangle className="mt-1 size-4 shrink-0" />
              {error}
            </p>
            <div>
              <Button
                size="sm"
                variant="outline"
                onClick={runSimulated}
                disabled={busy}
              >
                <FlaskConical className="size-3.5" />
                Load simulated sample repositories
              </Button>
            </div>
          </div>
        )}
      </Panel>

      {integration === undefined ? (
        <Panel>
          <div className="h-32 animate-pulse rounded-lg bg-muted" />
        </Panel>
      ) : integration === null ? (
        <EmptyState
          icon={Github}
          title="No integration connected"
          description="Enter your GitHub username above to pull in your public repositories, or load simulated samples to see how the flow works."
          action={
            <Button variant="outline" onClick={runSimulated} disabled={busy}>
              <FlaskConical className="size-4" />
              Load simulated samples
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-6">
          <Panel
            icon={
              integration.status === "connected"
                ? CircleCheck
                : integration.status === "simulated"
                  ? FlaskConical
                  : AlertTriangle
            }
            title={`@${integration.handle}`}
            actions={
              <>
                {integration.status === "connected" && (
                  <Badge
                    variant="outline"
                    className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  >
                    Live GitHub sync
                  </Badge>
                )}
                {integration.status === "simulated" && (
                  <Badge
                    variant="outline"
                    className="border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  >
                    Simulated sample data
                  </Badge>
                )}
                {integration.status === "error" && (
                  <Badge variant="outline" className="text-muted-foreground">
                    Last sync failed
                  </Badge>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => runSync(integration.handle, integration.items)}
                  disabled={busy}
                >
                  {busy ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="size-3.5" />
                  )}
                  Refresh now
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={async () => {
                    try {
                      await disconnect();
                      toast.success("Integration disconnected");
                    } catch (caught) {
                      toast.error(
                        caught instanceof Error
                          ? caught.message
                          : "Could not disconnect.",
                      );
                    }
                  }}
                >
                  <Unplug className="size-3.5" />
                  Disconnect
                </Button>
              </>
            }
            bodyClassName="flex flex-col gap-4"
          >
            {isSimulated && (
              <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-[13px] leading-6 text-amber-700 dark:text-amber-300">
                These repositories are{" "}
                <strong className="font-semibold">simulated sample data</strong>
                , not fetched from GitHub. Anything you import is labelled as
                simulated in your project summary.
              </p>
            )}
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground">
              <span>
                {integration.items.length} repositor
                {integration.items.length === 1 ? "y" : "ies"} available
              </span>
              <span>{selectedCount} selected</span>
              {integration.lastSyncedAt && (
                <span>
                  Last synced{" "}
                  {new Date(integration.lastSyncedAt).toLocaleString(
                    undefined,
                    {
                      dateStyle: "medium",
                      timeStyle: "short",
                    },
                  )}
                </span>
              )}
            </div>

            <div className="grid gap-2">
              {integration.items.map((item) => (
                <label
                  key={item.externalId}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-lg border px-3.5 py-3 transition-colors",
                    item.selected
                      ? "border-primary/40 bg-primary/5"
                      : "bg-muted/20",
                  )}
                >
                  <Checkbox
                    checked={item.selected}
                    onCheckedChange={async (checked) => {
                      try {
                        await toggleItem({
                          externalId: item.externalId,
                          selected: checked === true,
                        });
                      } catch (caught) {
                        toast.error(
                          caught instanceof Error
                            ? caught.message
                            : "Could not update the selection.",
                        );
                      }
                    }}
                    className="mt-0.5"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium">{item.name}</p>
                      {item.language && (
                        <Badge variant="outline" className="text-[11px]">
                          {item.language}
                        </Badge>
                      )}
                      {item.stars > 0 && (
                        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Star className="size-3" />
                          {item.stars}
                        </span>
                      )}
                    </div>
                    {item.description && (
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        {item.description}
                      </p>
                    )}
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-block text-[11px] text-primary hover:opacity-80"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {item.url}
                    </a>
                  </div>
                </label>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
              <div className="flex items-center gap-3">
                <Switch
                  checked={publishImported}
                  onCheckedChange={setPublishImported}
                  id="publish-imported"
                />
                <Label
                  htmlFor="publish-imported"
                  className="text-sm font-normal"
                >
                  Publish imported projects immediately
                </Label>
              </div>
              <Button onClick={handleImport} disabled={selectedCount === 0}>
                <Upload className="size-4" />
                Add {selectedCount > 0 ? selectedCount : ""} selected to
                projects
              </Button>
            </div>
          </Panel>
        </div>
      )}

      <Panel
        icon={Plus}
        title="What happens when you import"
        bodyClassName="text-sm leading-6 text-muted-foreground"
      >
        Imported repositories become projects on your profile with their
        description, language and repository link. They are marked as coming
        from GitHub, so it is always clear that the text came from an external
        source - and you can edit or remove them like any other project.
      </Panel>
    </div>
  );
}
