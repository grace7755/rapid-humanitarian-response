import { Skeleton } from "@my-better-t-app/ui/components/skeleton";

export default function LoadingState({
  label = "Loading",
}: {
  label?: string;
}) {
  return (
    <div aria-label={label} className="space-y-4" role="status">
      <span className="sr-only">{label}</span>
      <Skeleton className="h-9 w-2/3" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
