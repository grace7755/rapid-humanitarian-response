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
        <p className="font-semibold text-primary text-sm uppercase tracking-wide">
          {eyebrow}
        </p>
      ) : null}
      <h1 className="max-w-4xl font-bold text-3xl tracking-tight sm:text-4xl">
        {title}
      </h1>
      {description ? (
        <p className="max-w-2xl text-base text-muted-foreground leading-7">
          {description}
        </p>
      ) : null}
    </header>
  );
}
