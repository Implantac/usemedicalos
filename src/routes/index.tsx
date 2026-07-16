import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { CheckCircle2, Layers, Zap, Shield, ArrowRight } from "lucide-react";
import heroImage from "@/assets/hero-tasks.jpg";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "TaskFlow — Focus on what matters" },
      { name: "description", content: "Organize your tasks, track progress, and focus on what matters with TaskFlow." },
      { property: "og:title", content: "TaskFlow — Focus on what matters" },
      { property: "og:description", content: "Organize your tasks, track progress, and focus on what matters with TaskFlow." },
      { property: "og:image", content: "https://cdn.gpteng.co/blank-app-v1.svg" },
    ],
  }),
});

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader variant="landing" />

      <main>
        <section className="gradient-hero px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="grid items-center gap-12 lg:grid-cols-2">
              <div className="max-w-2xl">
                <div className="inline-flex items-center rounded-full border border-border bg-background/60 px-3 py-1 text-sm text-muted-foreground">
                  <Zap className="mr-2 h-3.5 w-3.5 text-primary" />
                  Simple task management, finally done right
                </div>
                <h1 className="mt-6 text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                  Focus on what matters
                </h1>
                <p className="mt-6 text-lg text-muted-foreground">
                  TaskFlow helps you organize your work, track progress, and stay on top of your priorities — all in a calm, minimal interface.
                </p>
                <div className="mt-8 flex flex-wrap gap-4">
                  <Link to="/dashboard">
                    <Button size="lg" className="h-12 px-6">
                      Start organizing
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                  <a href="#how-it-works">
                    <Button size="lg" variant="outline" className="h-12 px-6">
                      See how it works
                    </Button>
                  </a>
                </div>
                <div className="mt-8 flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    Free to use
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    No signup required
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    Data stays in your browser
                  </div>
                </div>
              </div>
              <div className="relative">
                <div className="absolute -inset-4 rounded-3xl bg-primary/5 blur-2xl" />
                <img
                  src={heroImage}
                  alt="TaskFlow abstract task flow illustration"
                  width={1200}
                  height={800}
                  className="relative rounded-2xl card-shadow"
                />
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Everything you need to stay organized
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
                A focused set of features designed to remove friction and help you finish more.
              </p>
            </div>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  icon: Layers,
                  title: "Smart organization",
                  description: "Group tasks by status and priority so you always know what to do next.",
                },
                {
                  icon: Zap,
                  title: "Fast and minimal",
                  description: "No clutter, no distractions. Add, edit, and complete tasks in seconds.",
                },
                {
                  icon: Shield,
                  title: "Privacy first",
                  description: "Your tasks are stored locally in your browser. Nothing leaves your device.",
                },
              ].map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-2xl border border-border bg-card p-6 card-shadow transition-all hover:card-shadow-hover"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <feature.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-foreground">{feature.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="border-t border-border px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                How it works
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
                Three simple steps to a clearer day.
              </p>
            </div>
            <div className="mt-12 grid gap-8 sm:grid-cols-3">
              {[
                { step: "01", title: "Add tasks", description: "Capture everything you need to do in one place." },
                { step: "02", title: "Set priorities", description: "Mark what's urgent and plan due dates." },
                { step: "03", title: "Track progress", description: "Watch your completion rate grow as you finish." },
              ].map((item) => (
                <div key={item.step} className="text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                    {item.step}
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-foreground">{item.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
                </div>
              ))}
            </div>
            <div className="mt-12 text-center">
              <Link to="/dashboard">
                <Button size="lg" className="h-12 px-6">
                  Open your dashboard
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} TaskFlow. Built for focus.
          </p>
          <div className="flex gap-6">
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground">
              Privacy
            </a>
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground">
              Terms
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
