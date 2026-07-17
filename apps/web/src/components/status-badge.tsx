import { cn } from "@my-better-t-app/ui/lib/utils";

type StatusBadgeProps = {
  className?: string;
  label?: string;
  status: string;
};

export default function StatusBadge({
  className,
  label,
  status,
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex min-h-7 items-center rounded-full border bg-muted px-2.5 py-1 text-xs font-semibold",
        className,
      )}
    >
      {label ?? status.replaceAll("_", " ")}
    </span>
  );
}
