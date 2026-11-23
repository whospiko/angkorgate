"use client"

import { useState } from "react"
import { DocArticle, DocsCategory, DocsLanguage, DocSection } from "../types/docs.types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  RiFileCopyLine,
  RiCheckLine,
  RiInformationLine,
  RiLightbulbLine,
  RiAlertLine,
  RiShieldCheckLine,
  RiArrowRightLine,
  RiArrowLeftLine,
  RiTranslate2,
  RiHashtag,
} from "@remixicon/react"
import { cn } from "cn"

interface DocsContentViewProps {
  article: DocArticle
  category?: DocsCategory
  language: DocsLanguage
  onToggleLanguage: (lang: DocsLanguage) => void
  onSelectArticle: (articleId: string) => void
  allArticles: DocArticle[]
}

function CodeBlock({
  language,
  title,
  code,
}: {
  language: string
  title?: string
  code: string
}) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col rounded-lg border border-border/50 bg-[#16171a] overflow-hidden my-3 shadow-xs">
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-[#1f2024] border-b border-border/40 text-[11px] font-mono">
        <span className="text-muted-foreground uppercase tracking-wider font-semibold">
          {title || language}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
        >
          {copied ? (
            <>
              <RiCheckLine className="size-3.5 text-emerald-400" />
              <span className="text-emerald-400 font-semibold">Copied!</span>
            </>
          ) : (
            <>
              <RiFileCopyLine className="size-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-xs font-mono text-zinc-200 leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  )
}

function AlertCard({
  type,
  text,
}: {
  type: "note" | "tip" | "important" | "warning"
  text: string
}) {
  switch (type) {
    case "tip":
      return (
        <div className="flex items-start gap-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3.5 text-xs font-mono text-emerald-900 dark:text-emerald-300 shadow-xs my-3">
          <RiLightbulbLine className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
          <div className="flex-1 leading-relaxed">{text}</div>
        </div>
      )
    case "important":
      return (
        <div className="flex items-start gap-3 rounded-lg border border-primary/40 bg-primary/10 p-3.5 text-xs font-mono text-primary shadow-xs my-3">
          <RiShieldCheckLine className="size-4 shrink-0 text-primary mt-0.5" />
          <div className="flex-1 leading-relaxed">{text}</div>
        </div>
      )
    case "warning":
      return (
        <div className="flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3.5 text-xs font-mono text-amber-900 dark:text-amber-300 shadow-xs my-3">
          <RiAlertLine className="size-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
          <div className="flex-1 leading-relaxed">{text}</div>
        </div>
      )
    default:
      return (
        <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-3.5 text-xs font-mono text-muted-foreground shadow-xs my-3">
          <RiInformationLine className="size-4 shrink-0 text-primary mt-0.5" />
          <div className="flex-1 leading-relaxed">{text}</div>
        </div>
      )
  }
}

export function DocsContentView({
  article,
  category,
  language,
  onToggleLanguage,
  onSelectArticle,
  allArticles,
}: DocsContentViewProps) {
  const prevArticle = allArticles.find((a) => a.id === article.prevArticleId)
  const nextArticle = allArticles.find((a) => a.id === article.nextArticleId)

  return (
    <article className="flex-1 flex flex-col gap-8 min-w-0 px-2 lg:px-6">
      {/* Top Header: Breadcrumbs */}
      <div className="flex items-center justify-between gap-3 border-b border-border/40 pb-3">
        {/* Breadcrumb Trail */}
        <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
          <span>Docs</span>
          <span>/</span>
          <span>{language === "km" ? category?.titleKm : category?.titleEn}</span>
          <span>/</span>
          <span className="text-foreground font-semibold">
            {language === "km" ? article.title.km : article.title.en}
          </span>
        </div>
      </div>

      {/* Main Title & Lead */}
      <header className="flex flex-col gap-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          {article.badge && (
            <Badge variant="outline" className="font-mono text-xs bg-primary/10 text-primary border-primary/30">
              {article.badge}
            </Badge>
          )}
          <span className="text-xs font-mono text-muted-foreground">
            Version {article.version} · Updated {article.lastUpdated}
          </span>
        </div>

        <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
          {language === "km" ? article.title.km : article.title.en}
        </h1>

        <p className="font-mono text-sm text-muted-foreground leading-relaxed">
          {language === "km" ? article.subtitle.km : article.subtitle.en}
        </p>
      </header>

      {/* Content Sections */}
      <div className="flex flex-col gap-10">
        {article.sections.map((section: DocSection) => (
          <section key={section.id} id={section.id} className="flex flex-col gap-3 scroll-mt-24">
            <h2 className="group flex items-center gap-2 font-heading text-xl font-semibold text-foreground border-b border-border/30 pb-1.5">
              <span>{language === "km" ? section.heading.km : section.heading.en}</span>
              <a
                href={`#${section.id}`}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary transition-opacity"
                aria-label="Direct anchor link"
              >
                <RiHashtag className="size-4" />
              </a>
            </h2>

            <div className="font-mono text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
              {language === "km" ? section.content.km : section.content.en}
            </div>

            {section.codeSnippet && (
              <CodeBlock
                language={section.codeSnippet.language}
                title={section.codeSnippet.title}
                code={section.codeSnippet.code}
              />
            )}

            {section.alert && (
              <AlertCard
                type={section.alert.type}
                text={language === "km" ? section.alert.textKm : section.alert.textEn}
              />
            )}

            {section.steps && section.steps.length > 0 && (
              <div className="flex flex-col gap-3 my-2">
                {section.steps.map((step) => (
                  <div key={step.number} className="flex items-start gap-3 p-3 rounded-lg border border-border/40 bg-card/60">
                    <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary font-mono text-xs font-bold border border-primary/30">
                      {step.number}
                    </div>
                    <div className="flex flex-col gap-1 text-xs font-mono">
                      <span className="font-semibold text-foreground">
                        {language === "km" ? step.title.km : step.title.en}
                      </span>
                      <span className="text-muted-foreground leading-relaxed">
                        {language === "km" ? step.description.km : step.description.en}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>

      {/* Bottom Sequential Navigation (Spring Boot Style) */}
      <footer className="flex items-center justify-between gap-4 border-t border-border/40 pt-6 mt-8">
        {prevArticle ? (
          <button
            onClick={() => onSelectArticle(prevArticle.id)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border/50 hover:bg-muted font-mono text-xs text-muted-foreground hover:text-foreground transition-colors group"
          >
            <RiArrowLeftLine className="size-4 group-hover:-translate-x-0.5 transition-transform" />
            <div className="text-left">
              <div className="text-[10px] text-muted-foreground/70 uppercase">
                {language === "km" ? "មុន" : "Previous"}
              </div>
              <div className="font-semibold text-foreground">
                {language === "km" ? prevArticle.title.km : prevArticle.title.en}
              </div>
            </div>
          </button>
        ) : (
          <div />
        )}

        {nextArticle && (
          <button
            onClick={() => onSelectArticle(nextArticle.id)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-primary/40 bg-primary/10 hover:bg-primary/20 font-mono text-xs text-primary transition-colors group"
          >
            <div className="text-right">
              <div className="text-[10px] text-primary/70 uppercase">
                {language === "km" ? "បន្ទាប់" : "Next"}
              </div>
              <div className="font-semibold text-foreground">
                {language === "km" ? nextArticle.title.km : nextArticle.title.en}
              </div>
            </div>
            <RiArrowRightLine className="size-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
        )}
      </footer>
    </article>
  )
}
