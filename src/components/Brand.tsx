import { cn } from "@/lib/utils";

/** Orbiting-sphere mark: a link hub that holds a whole identity together. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={cn("size-8", className)}
    >
      <circle
        cx="16"
        cy="16"
        r="11.5"
        stroke="currentColor"
        strokeWidth="2"
        opacity="0.9"
      />
      <ellipse
        cx="16"
        cy="16"
        rx="13"
        ry="5.5"
        transform="rotate(-28 16 16)"
        stroke="currentColor"
        strokeWidth="1.6"
        opacity="0.55"
      />
      <circle cx="25.6" cy="9.6" r="3" fill="currentColor" />
      <circle cx="16" cy="16" r="3.4" fill="currentColor" opacity="0.9" />
    </svg>
  );
}

export function Brand({
  className,
  markClassName,
}: {
  className?: string;
  markClassName?: string;
}) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <BrandMark className={cn("text-primary", markClassName)} />
      <span className="text-[15px] font-semibold tracking-tight">
        LinkSphere<span className="text-primary"> AI</span>
      </span>
    </span>
  );
}
