import { Link } from "@tanstack/react-router";
import { CheckSquare2 } from "lucide-react";

interface SiteHeaderProps {
  variant?: "landing" | "app";
}

export function SiteHeader({ variant = "landing" }: SiteHeaderProps) {
  const isApp = variant === "app";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <CheckSquare2 className="h-5 w-5" />
          </div>
          <span className="text-lg font-semibold tracking-tight">TaskFlow</span>
        </Link>

        <nav className="flex items-center gap-4">
          {isApp ? (
            <Link
              to="/"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Home
            </Link>
          ) : (
            <>
              <a
                href="#features"
                className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:block"
              >
                Features
              </a>
              <a
                href="#how-it-works"
                className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:block"
              >
                How it works
              </a>
            </>
          )}
          <Link
            to="/dashboard"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {isApp ? "Dashboard" : "Get started"}
          </Link>
        </nav>
      </div>
    </header>
  );
}
