import Link from "next/link"
import { ArrowRight, Check, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"

export default function Page() {
  return (
    <main className="min-h-svh bg-linear-to-b from-background via-background to-muted">
      <div className="mx-auto flex w-full max-w-6xl flex-col px-6 pt-10 pb-16 md:pt-16 lg:flex-row lg:items-center lg:gap-16">
        {/* 左侧：Hero 文案 */}
        <section className="flex-1 space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
            <Badge
              variant="outline"
              className="border-primary/40 bg-primary/5 text-primary"
            >
              <Sparkles className="mr-1 h-3 w-3" />
              New
            </Badge>
            <span>Ship beautiful product pages in minutes.</span>
          </div>

          <div className="space-y-4">
            <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl lg:text-5xl">
              Launch landing pages
              <span className="block text-primary">that actually convert.</span>
            </h1>
            <p className="max-w-xl text-sm text-balance text-muted-foreground sm:text-base">
              A clean, opinionated starter built on shadcn/ui and Tailwind —
              wired for dark mode, responsive by default, and ready to plug into
              your product in minutes.
            </p>
          </div>

          {/* CTA 区域 */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button asChild size="lg" className="gap-2 px-6">
              <Link href="/dashboard">
                Get started
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="border-dashed"
            >
              <Link href="#preview">View live preview</Link>
            </Button>
          </div>

          {/* 信任 / 特性 */}
          <div className="space-y-2 text-xs text-muted-foreground">
            <p className="font-medium tracking-[0.16em] uppercase">
              Built-in essentials
            </p>
            <ul className="grid gap-1 text-xs sm:grid-cols-3 sm:gap-2">
              {[
                "Responsive layout",
                "Dark mode ready",
                "Type-safe routing",
                "shadcn/ui components",
                "Production-grade theming",
                "Accessible by default",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary/10">
                    <Check className="h-3 w-3 text-primary" />
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* 右侧：预览卡片 / 截图占位 */}
        <section
          id="preview"
          className="mt-10 flex flex-1 justify-center lg:mt-0"
          aria-label="Product preview"
        >
          <Card className="relative w-full max-w-md overflow-hidden border-border/60 bg-background/90 shadow-lg shadow-black/5 backdrop-blur">
            <div className="flex items-center gap-1 border-b px-4 py-2 text-xs text-muted-foreground">
              <span className="flex gap-1">
                <span className="h-2 w-2 rounded-full bg-red-400" />
                <span className="h-2 w-2 rounded-full bg-yellow-400" />
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              <span className="mx-auto truncate text-[11px]">
                localhost:3000/{`{locale}`}/dashboard
              </span>
            </div>
            <div className="space-y-4 px-4 py-4 sm:px-6 sm:py-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium tracking-[0.16em] text-primary uppercase">
                    Preview
                  </p>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                    Dark mode supported
                  </span>
                </div>
                <p className="text-sm font-medium">
                  Your dashboard is ready. Add sections, hook up data and ship.
                </p>
                <p className="text-xs text-muted-foreground">
                  This preview mirrors your actual app shell — navigation,
                  layout, and theming are already wired.
                </p>
              </div>

              <div className="h-40 rounded-md border border-dashed border-muted-foreground/40 bg-muted/60" />

              <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                <span>
                  Press{" "}
                  <kbd className="rounded border bg-muted/70 px-1 text-[10px]">
                    d
                  </kbd>{" "}
                  to toggle dark mode.
                </span>
                <span className="font-mono text-[10px]">pnpm dev</span>
              </div>
            </div>
          </Card>
        </section>
      </div>
    </main>
  )
}
