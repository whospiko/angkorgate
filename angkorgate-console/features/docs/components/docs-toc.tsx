"use client"

import { DocsLanguage } from "../types/docs.types"
import {
  RiGithubLine,
  RiEditLine,
  RiBookOpenLine,
  RiCodeSSlashLine,
  RiShieldCheckLine,
  RiCompass3Line,
} from "@remixicon/react"

interface DocsTocProps {
  tableOfContents: {
    id: string
    titleEn: string
    titleKm: string
  }[]
  language: DocsLanguage
  activeSectionId?: string
}

export function DocsToc({
  tableOfContents,
  language,
  activeSectionId,
}: DocsTocProps) {
  const scrollToSection = (id: string) => {
    const container = document.getElementById("docs-content-container")
    const el = document.getElementById(id)
    if (container && el) {
      const containerRect = container.getBoundingClientRect()
      const elRect = el.getBoundingClientRect()
      const scrollOffset = elRect.top - containerRect.top + container.scrollTop - 24
      container.scrollTo({ top: scrollOffset, behavior: "smooth" })
    } else if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }

  return (
    <aside className="flex flex-col gap-6 w-full text-xs">
      {/* Project & Community Links (Spring Boot Style) */}
      <div className="flex flex-col gap-2">
        <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {language === "km" ? "តំណភ្ជាប់គម្រោង" : "Project Links"}
        </span>
        <div className="flex flex-col gap-1 font-mono text-xs">
          <a
            href="https://github.com/hengkakada/angkorgate"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 py-1 text-muted-foreground hover:text-primary transition-colors"
          >
            <RiGithubLine className="size-4 shrink-0" />
            <span>GitHub Project</span>
          </a>
          <a
            href="http://localhost:8080/api#"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 py-1 text-muted-foreground hover:text-primary transition-colors"
          >
            <RiCodeSSlashLine className="size-4 shrink-0" />
            <span>Swagger Explorer</span>
          </a>
          <a
            href="http://localhost:8080/oidc/.well-known/openid-configuration"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 py-1 text-muted-foreground hover:text-primary transition-colors"
          >
            <RiShieldCheckLine className="size-4 shrink-0" />
            <span>OpenID Discovery</span>
          </a>
          <a
            href="https://oidcdebugger.com"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 py-1 text-muted-foreground hover:text-primary transition-colors"
          >
            <RiCompass3Line className="size-4 shrink-0" />
            <span>OIDC Debugger</span>
          </a>
          <a
            href="https://github.com/hengkakada/angkorgate/blob/main/document.md"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 py-1 text-muted-foreground hover:text-primary transition-colors"
          >
            <RiEditLine className="size-4 shrink-0" />
            <span>{language === "km" ? "កែសម្រួលឯកសារនេះ" : "Edit this Page"}</span>
          </a>
        </div>
      </div>

      <hr className="border-border/30" />

      {/* On This Page Table of Contents */}
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <RiBookOpenLine className="size-3.5 text-primary" />
          <span>{language === "km" ? "នៅលើទំព័រនេះ" : "On this Page"}</span>
        </div>

        <nav className="flex flex-col gap-1 pl-1">
          {tableOfContents.map((item) => {
            const isActive = activeSectionId === item.id
            return (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className={`text-left py-1 text-xs font-mono transition-colors border-l-2 pl-2.5 ${
                  isActive
                    ? "border-primary text-primary font-semibold"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                }`}
              >
                {language === "km" ? item.titleKm : item.titleEn}
              </button>
            )
          })}
        </nav>
      </div>
    </aside>
  )
}
