type ScoreBadgeProps = {
  label: string;
  score: number;
};

export default function ScoreBadge({ label, score }: ScoreBadgeProps) {
  const level = score >= 70 ? "High" : score >= 40 ? "Medium" : "Low";

  return (
    <span className="inline-flex min-h-9 items-center gap-2 rounded-full border bg-card px-3 py-1 text-sm">
      <span className="font-medium">{label}</span>
      <span aria-label={`${level}, ${score} out of 100`} className="font-bold">
        {score}
      </span>
      <span className="text-muted-foreground">{level}</span>
    </span>
  );
}
