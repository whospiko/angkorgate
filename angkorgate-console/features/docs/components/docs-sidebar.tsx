"use client"

import { useMemo } from "react"
import { DocsCategory, DocArticle, DocsLanguage } from "../types/docs.types"
import { Input } from "@/components/ui/input"
import {
  RiSearchLine,
  RiRocketLine,
  RiShieldKeyholeLine,
  RiApps2Line,
  RiTestTubeLine,
  RiUserSharedLine,
  RiLockPasswordLine,
  RiTerminalBoxLine,
  RiAlertLine,
  RiBookOpenLine,
} from "@remixicon/react"
import { cn } from "cn"

interface DocsSidebarProps {
  categories: DocsCategory[]
  articles: DocArticle[]
  activeArticleId: string
  onSelectArticle: (articleId: string) => void
  language: DocsLanguage
  searchQuery: string
  onSearchChange: (query: string) => void
}

function getCategoryIcon(iconName: string) {
  switch (iconName) {
    case "RiRocketLine":
      return <RiRocketLine className="size-4 shrink-0 text-primary" />
    case "RiShieldKeyholeLine":
      return <RiShieldKeyholeLine className="size-4 shrink-0 text-primary" />
    case "RiApps2Line":
      return <RiApps2Line className="size-4 shrink-0 text-primary" />
    case "RiTestTubeLine":
      return <RiTestTubeLine className="size-4 shrink-0 text-primary" />
    case "RiUserSharedLine":
      return <RiUserSharedLine className="size-4 shrink-0 text-primary" />
    case "RiLockPasswordLine":
      return <RiLockPasswordLine className="size-4 shrink-0 text-primary" />
    case "RiTerminalBoxLine":
      return <RiTerminalBoxLine className="size-4 shrink-0 text-primary" />
    case "RiAlertLine":
      return <RiAlertLine className="size-4 shrink-0 text-amber-500" />
    default:
      return <RiBookOpenLine className="size-4 shrink-0 text-primary" />
  }
}

export function DocsSidebar({
  categories,
  articles,
  activeArticleId,
  onSelectArticle,
  language,
  searchQuery,
  onSearchChange,
}: DocsSidebarProps) {
  const filteredArticles = useMemo(() => {
    if (!searchQuery.trim()) return articles
    const q = searchQuery.toLowerCase()
    return articles.filter(
      (a) =>
        a.title.en.toLowerCase().includes(q) ||
        a.title.km.toLowerCase().includes(q) ||
        a.subtitle.en.toLowerCase().includes(q) ||
        a.subtitle.km.toLowerCase().includes(q)
    )
  }, [articles, searchQuery])

  return (
    <aside className="w-full flex flex-col gap-3">
      {/* Sticky Search Bar */}
      <div className="sticky top-0 z-10 bg-background/95 pt-0 pb-2 backdrop-blur-sm">
        <div className="relative">
          <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={language === "km" ? "ស្វែងរកឯកសារ... ⌘K" : "Search docs... ⌘K"}
            className="h-8 pl-8 text-xs font-mono bg-muted/30 border-border/50 rounded-lg placeholder:text-muted-foreground/70"
          />
        </div>
      </div>

      {/* Navigation Tree by Categories */}
      <nav className="flex flex-col gap-4 text-xs pr-1">
        {categories.map((category) => {
          const catArticles = filteredArticles.filter(
            (a) => a.categoryId === category.id
          )
          if (catArticles.length === 0) return null

          return (
            <div key={category.id} className="flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground font-mono">
                {getCategoryIcon(category.icon)}
                <span>
                  {language === "km" ? category.titleKm : category.titleEn}
                </span>
              </div>

              <div className="flex flex-col gap-0.5 pl-2 border-l border-border/30 ml-2.5">
                {catArticles.map((article) => {
                  const isActive = article.id === activeArticleId
                  return (
                    <button
                      key={article.id}
                      onClick={() => onSelectArticle(article.id)}
                      className={cn(
                        "group flex items-center justify-between text-left px-2.5 py-1.5 rounded-md font-mono text-xs transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                          : "text-foreground/80 hover:bg-muted/60 hover:text-foreground"
                      )}
                    >
                      <span className="truncate">
                        {language === "km" ? article.title.km : article.title.en}
                      </span>
                      {article.badge && !isActive && (
                        <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-muted text-muted-foreground/90 border border-border/40 font-mono scale-90">
                          {article.badge}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}

        {filteredArticles.length === 0 && (
          <div className="p-4 text-center text-xs font-mono text-muted-foreground">
            {language === "km"
              ? "រកមិនឃើញឯកសារត្រូវនឹងពាក្យស្វែងរកឡើយ"
              : "No documentation matched your query."}
          </div>
        )}
      </nav>
    </aside>
  )
}
