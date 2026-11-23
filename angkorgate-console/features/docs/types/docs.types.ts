export type DocsLanguage = "en" | "km"

export interface DocsCategory {
  id: string
  titleEn: string
  titleKm: string
  icon: string
  order: number
}

export interface DocSectionStep {
  number: number
  title: {
    en: string
    km: string
  }
  description: {
    en: string
    km: string
  }
}

export interface DocSectionCodeSnippet {
  language: string
  title?: string
  code: string
}

export interface DocSectionAlert {
  type: "note" | "tip" | "important" | "warning"
  textEn: string
  textKm: string
}

export interface DocSection {
  id: string
  heading: {
    en: string
    km: string
  }
  content: {
    en: string
    km: string
  }
  codeSnippet?: DocSectionCodeSnippet
  alert?: DocSectionAlert
  steps?: DocSectionStep[]
}

export interface DocArticle {
  id: string
  categoryId: string
  title: {
    en: string
    km: string
  }
  subtitle: {
    en: string
    km: string
  }
  badge?: string
  lastUpdated: string
  version: string
  tableOfContents: {
    id: string
    titleEn: string
    titleKm: string
  }[]
  sections: DocSection[]
  prevArticleId?: string
  nextArticleId?: string
}
