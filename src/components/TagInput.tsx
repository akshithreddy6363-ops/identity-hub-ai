import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { useState } from "react";

/**
 * Chip-style list editor (skills, technologies, interests).
 * Enter or comma commits the current draft; duplicates are ignored.
 */
export function TagInput({
  value,
  onChange,
  placeholder = "Type and press Enter",
  className,
  max = 60,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  className?: string;
  max?: number;
}) {
  const [draft, setDraft] = useState("");

  const commit = (raw?: string) => {
    const item = (raw ?? draft).trim().replace(/,+$/, "");
    if (!item) return;
    if (value.some((v) => v.toLowerCase() === item.toLowerCase())) {
      setDraft("");
      return;
    }
    if (value.length >= max) return;
    onChange([...value, item]);
    setDraft("");
  };

  return (
    <div
      className={cn(
        "flex flex-wrap gap-2 rounded-lg border border-input bg-background p-2 focus-within:ring-2 focus-within:ring-ring/40",
        className,
      )}
    >
      {value.map((item) => (
        <Badge
          key={item}
          variant="secondary"
          className="gap-1.5 px-2.5 py-1 text-xs font-medium"
        >
          {item}
          <button
            type="button"
            aria-label={`Remove ${item}`}
            className="rounded-full text-muted-foreground transition-colors hover:text-foreground"
            onClick={() => onChange(value.filter((v) => v !== item))}
          >
            <X className="size-3" />
          </button>
        </Badge>
      ))}
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            commit();
          } else if (e.key === "Backspace" && !draft && value.length) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={() => commit()}
        placeholder={value.length >= max ? "Limit reached" : placeholder}
        className="h-7 min-w-40 flex-1 border-0 bg-transparent px-1 shadow-none focus-visible:ring-0"
      />
    </div>
  );
}
