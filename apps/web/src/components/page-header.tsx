type PageHeaderProps = {
  description?: string;
  eyebrow?: string;
  title: string;
};

export default function PageHeader({
  description,
  eyebrow,
  title,
}: PageHeaderProps) {
  return (
    <header className="space-y-3">
      {eyebrow ? (
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">
          {eyebrow}
        </p>
      ) : null}
      <h1 className="max-w-4xl text-3xl font-bold tracking-tight sm:text-4xl">
        {title}
      </h1>
      {description ? (
        <p className="max-w-2xl text-base leading-7 text-muted-foreground">
          {description}
        </p>
      ) : null}
    </header>
  );
}
