import { Link } from "@tanstack/react-router";
import { ModeToggle } from "./mode-toggle";
import type { OperatorSession } from "./user-menu";
import UserMenu from "./user-menu";

export default function Header() {
  const links = [
    { to: "/", label: "Home" },
    { to: "/report", label: "Submit a report" },
    { to: "/sign-in", label: "Operator sign in" },
  ] as const;

  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-2 sm:px-6">
        <nav
          aria-label="Public navigation"
          className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm sm:text-base"
        >
          {links.map(({ to, label }) => {
            return (
              <Link
                className="inline-flex min-h-11 items-center underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                key={to}
                to={to}
              >
                {label}
              </Link>
            );
          })}
        </nav>
        <ModeToggle />
      </div>
    </header>
  );
}

export function OperatorHeader({ session }: { session: OperatorSession }) {
  const links = [
    { to: "/", label: "Home" },
    { to: "/dashboard", label: "Dashboard" },
    { to: "/organizations", label: "Organizations" },
  ] as const;

  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-2 sm:px-6">
        <nav
          aria-label="Operator navigation"
          className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm sm:text-base"
        >
          {links.map(({ to, label }) => (
            <Link
              className="inline-flex min-h-11 items-center underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              key={to}
              to={to}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <ModeToggle />
          <UserMenu session={session} />
        </div>
      </div>
    </header>
  );
}
