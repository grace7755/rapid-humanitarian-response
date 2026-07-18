export default function PrototypeBanner() {
  return (
    <div className="border-amber-300 border-b bg-amber-50 px-4 py-3 text-amber-950 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
      <p className="mx-auto max-w-6xl text-sm leading-6">
        <strong>Demo Mode — coordination prototype.</strong> This service does
        not dispatch rescue, guarantee aid, or confirm that a report is true.
        Contact local emergency services when immediate help is available.
      </p>
    </div>
  );
}
