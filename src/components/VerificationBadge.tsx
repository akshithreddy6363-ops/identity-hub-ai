import { Badge } from "@/components/ui/badge";
import { VERIFICATION_META, type Verification } from "@/lib/linksphere";
import { cn } from "@/lib/utils";
import { BadgeCheck, Clock, User } from "lucide-react";

const ICONS = {
  verified: BadgeCheck,
  pending: Clock,
  self_reported: User,
} as const;

/** Verification state of an achievement. We never set "verified" ourselves. */
export function VerificationBadge({
  verification,
  className,
}: {
  verification: Verification;
  className?: string;
}) {
  const meta = VERIFICATION_META[verification];
  const Icon = ICONS[verification];
  return (
    <Badge
      variant="outline"
      title={meta.hint}
      className={cn(
        "gap-1 px-2 py-0.5 text-[11px] font-medium",
        meta.badge,
        className,
      )}
    >
      <Icon className="size-3" />
      {meta.label}
    </Badge>
  );
}
