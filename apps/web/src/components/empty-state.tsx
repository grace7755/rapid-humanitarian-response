import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@my-better-t-app/ui/components/empty";

export default function EmptyState({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <Empty className="rounded-xl border">
      <EmptyHeader>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
