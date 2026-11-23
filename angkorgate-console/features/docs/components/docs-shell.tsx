"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { DOCS_ARTICLES, DOCS_CATEGORIES, getDocArticleById } from "../data/docs-content"
import { DocsLanguage } from "../types/docs.types"
import { DocsSidebar } from "./docs-sidebar"
import { DocsContentView } from "./docs-content-view"
import { DocsToc } from "./docs-toc"
import { Badge } from "@/components/ui/badge"
import {
  RiCommandLine,
  RiArrowLeftLine,
  RiTranslate2,
  RiGithubLine,
  RiCodeSSlashLine,
  RiShieldCheckLine,
  RiCompass3Line,
} from "@remixicon/react"
import { cn } from "cn"

interface DocsShellProps {
  initialArticleId?: string
}

export function DocsShell({ initialArticleId = "overview" }: DocsShellProps) {
  const [activeArticleId, setActiveArticleId] = useState<string>(initialArticleId)
  const [language, setLanguage] = useState<DocsLanguage>("en")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [activeSectionId, setActiveSectionId] = useState<string>("")

  const currentArticle = getDocArticleById(activeArticleId) || DOCS_ARTICLES[0]
  const currentCategory = DOCS_CATEGORIES.find(
    (c) => c.id === currentArticle.categoryId
  )

  const handleSelectArticle = (id: string) => {
    setActiveArticleId(id)
    const container = document.getElementById("docs-content-container")
    if (container) {
      container.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  // Active section scroll spy within the middle container
  useEffect(() => {
    const container = document.getElementById("docs-content-container")
    if (!container) return

    const handleScroll = () => {
      const sections = container.querySelectorAll("section[id]")
      if (sections.length === 0) return

      const containerRect = container.getBoundingClientRect()
      let currentSection = ""

      sections.forEach((sec) => {
        const rect = sec.getBoundingClientRect()
        // If section top is within 150px of the container's visible top
        if (rect.top - containerRect.top <= 150) {
          currentSection = sec.id
        }
      })

      if (currentSection) {
        setActiveSectionId(currentSection)
      } else if (sections[0]) {
        setActiveSectionId(sections[0].id)
      }
    }

    container.addEventListener("scroll", handleScroll, { passive: true })
    handleScroll()
    return () => container.removeEventListener("scroll", handleScroll)
  }, [activeArticleId])

  return (
    <div className="fixed inset-0 h-screen h-[100dvh] w-screen overflow-hidden bg-background text-foreground flex flex-col z-0 select-auto selection:bg-primary/20 selection:text-primary">
      {/* ─── Top Documentation Header Bar (Fixed / No Window Scroll) ─── */}
      <header className="h-14 shrink-0 w-full border-b border-border/40 bg-background/95 backdrop-blur-md px-4 lg:px-6 flex items-center justify-between gap-4 z-40">
        {/* Left: Brand + Back to Console */}
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-2 group">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
              <RiCommandLine className="size-4" />
            </div>
            <div className="flex items-center gap-1.5 font-heading font-bold text-sm tracking-wide">
              <span>AngkorGate</span>
              <span className="text-primary">Docs</span>
            </div>
          </Link>

          <Badge
            variant="outline"
            className="font-mono text-[10px] bg-primary/10 text-primary border-primary/30 font-semibold px-1.5 py-0.5 hidden sm:inline-flex"
          >
            v1.0.0
          </Badge>

          <div className="h-4 w-px bg-border/40 mx-1 hidden sm:block" />

          {/* Back to Console Button */}
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border/50 bg-muted/40 hover:bg-muted text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
          >
            <RiArrowLeftLine className="size-3.5" />
            <span>{language === "km" ? "ត្រឡប់ទៅ Console" : "Back to Console"}</span>
          </Link>
        </div>

        {/* Right: Language Switcher + Social / Swagger links */}
        <div className="flex items-center gap-2.5">
          {/* Language Switcher */}
          <div className="flex items-center gap-1 p-0.5 bg-muted/60 rounded-lg border border-border/40 font-mono text-xs">
            <RiTranslate2 className="size-3.5 ml-1 text-muted-foreground" />
            <button
              onClick={() => setLanguage("en")}
              className={cn(
                "px-2 py-0.5 rounded-md transition-colors text-xs",
                language === "en"
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              EN
            </button>
            <button
              onClick={() => setLanguage("km")}
              className={cn(
                "px-2 py-0.5 rounded-md transition-colors text-xs",
                language === "km"
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              ខ្មែរ
            </button>
          </div>

          <div className="h-4 w-px bg-border/40 hidden md:block" />

          {/* Quick Outbound Links */}
          <div className="hidden md:flex items-center gap-1 font-mono text-xs text-muted-foreground">
            <a
              href="https://github.com/hengkakada/angkorgate"
              target="_blank"
              rel="noreferrer"
              className="p-1.5 rounded-md hover:bg-muted hover:text-foreground transition-colors"
              title="GitHub Repository"
            >
              <RiGithubLine className="size-4" />
            </a>
            <a
              href="http://localhost:8080/api#"
              target="_blank"
              rel="noreferrer"
              className="p-1.5 rounded-md hover:bg-muted hover:text-foreground transition-colors"
              title="Swagger API Explorer"
            >
              <RiCodeSSlashLine className="size-4" />
            </a>
            <a
              href="http://localhost:8080/oidc/.well-known/openid-configuration"
              target="_blank"
              rel="noreferrer"
              className="p-1.5 rounded-md hover:bg-muted hover:text-foreground transition-colors"
              title="OIDC Discovery JSON"
            >
              <RiShieldCheckLine className="size-4" />
            </a>
            <a
              href="https://oidcdebugger.com"
              target="_blank"
              rel="noreferrer"
              className="p-1.5 rounded-md hover:bg-muted hover:text-foreground transition-colors"
              title="OIDC Debugger Tool"
            >
              <RiCompass3Line className="size-4" />
            </a>
          </div>
        </div>
      </header>

      {/* ─── Main 3-Column Docs Shell (Independent Column Scrolling) ─── */}
      <div className="flex-1 flex w-full h-[calc(100dvh-3.5rem)] overflow-hidden">
        {/* 1. Left Sidebar: Independent Scroll, Frozen when Reading */}
        <aside className="w-72 lg:w-80 shrink-0 border-r border-border/40 bg-card/20 overflow-y-auto h-full p-4 scrollbar-thin">
          <DocsSidebar
            categories={DOCS_CATEGORIES}
            articles={DOCS_ARTICLES}
            activeArticleId={activeArticleId}
            onSelectArticle={handleSelectArticle}
            language={language}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        </aside>

        {/* 2. Middle Column: Primary Scroll Container */}
        <main
          id="docs-content-container"
          className="flex-1 min-w-0 overflow-y-auto h-full scroll-smooth py-8 px-6 lg:px-12"
        >
          <div className="max-w-4xl mx-auto">
            <DocsContentView
              article={currentArticle}
              category={currentCategory}
              language={language}
              onToggleLanguage={setLanguage}
              onSelectArticle={handleSelectArticle}
              allArticles={DOCS_ARTICLES}
            />
          </div>
        </main>

        {/* 3. Right Sidebar: Table of Contents & Links, Statically Frozen */}
        <aside className="w-64 xl:w-72 shrink-0 border-l border-border/40 overflow-y-auto h-full p-6 hidden xl:block">
          <DocsToc
            tableOfContents={currentArticle.tableOfContents}
            language={language}
            activeSectionId={activeSectionId}
          />
        </aside>
      </div>
    </div>
  )
}
