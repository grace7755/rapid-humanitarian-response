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
    <div>
      <div className="flex flex-row items-center justify-between px-2 py-1">
        <nav className="flex gap-4 text-lg">
          {links.map(({ to, label }) => {
            return (
              <Link key={to} to={to}>
                {label}
              </Link>
            );
          })}
        </nav>
        <ModeToggle />
      </div>
      <hr />
    </div>
  );
}

export function OperatorHeader({ session }: { session: OperatorSession }) {
  const links = [
    { to: "/", label: "Home" },
    { to: "/dashboard", label: "Dashboard" },
  ] as const;

  return (
    <div>
      <div className="flex flex-row items-center justify-between px-2 py-1">
        <nav className="flex gap-4 text-lg">
          {links.map(({ to, label }) => (
            <Link key={to} to={to}>
              {label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <ModeToggle />
          <UserMenu session={session} />
        </div>
      </div>
      <hr />
    </div>
  );
}
