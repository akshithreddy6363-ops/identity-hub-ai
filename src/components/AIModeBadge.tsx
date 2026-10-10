import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Sparkles, FlaskConical } from "lucide-react";
import type { AIMode } from "@/lib/linksphere";

/** Shows whether AI output came from a real model call or the demo fallback. */
export function AIModeBadge({
  mode,
  className,
}: {
  mode?: AIMode;
  className?: string;
}) {
  if (!mode) return null;
  if (mode === "live") {
    return (
      <Badge
        className={cn(
          "gap-1 border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400",
          className,
        )}
        variant="outline"
      >
        <Sparkles className="size-3" />
        AI · live
      </Badge>
    );
  }
  return (
    <Badge
      className={cn(
        "gap-1 border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400",
        className,
      )}
      variant="outline"
    >
      <FlaskConical className="size-3" />
      Demo mode
    </Badge>
  );
}

/** Explanation shown underneath demo-mode output. */
export function AIModeNote({ mode, note }: { mode?: AIMode; note?: string }) {
  if (mode !== "demo" || !note) return null;
  return (
    <p className="flex items-start gap-1.5 text-xs leading-5 text-amber-600 dark:text-amber-400/90">
      <FlaskConical className="mt-0.5 size-3.5 shrink-0" />
      <span>{note}</span>
    </p>
  );
}
