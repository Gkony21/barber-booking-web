import { privacyPolicy, termsOfUse } from '../legal/documents'
import type { LegalDocument } from '../legal/documents'

export function LegalPage({ document }: { document: LegalDocument }) {
  return (
    <article className="flex flex-col gap-6 pt-4 pb-8">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-5xl leading-none font-extrabold uppercase">{document.title}</h1>
        <p className="text-sm text-muted">Τελευταία ενημέρωση: {document.updated}</p>
      </header>
      {document.sections.map((section) => (
        <section key={section.heading} className="flex flex-col gap-2">
          <h2 className="font-display text-xl font-extrabold uppercase">{section.heading}</h2>
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph} className="max-w-prose leading-relaxed text-ink/85">
              {paragraph}
            </p>
          ))}
        </section>
      ))}
    </article>
  )
}

// One per route, so the legal texts load only when someone opens them.
export function TermsPage() {
  return <LegalPage document={termsOfUse} />
}

export function PrivacyPage() {
  return <LegalPage document={privacyPolicy} />
}
