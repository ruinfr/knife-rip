import { DocArticle } from "@/components/docs/doc-article";
import { DocsToc } from "@/components/docs/docs-toc";
import type { DocPageDefinition } from "@/lib/docs/types";

export function DocsPageView({ doc }: { doc: DocPageDefinition }) {
  return (
    <>
      <header className="mb-10 space-y-3 border-b border-blue-950/30 pb-8">
        <span
          className="block h-1 w-10 rounded-full bg-gradient-to-r from-edge/70 via-edge/35 to-transparent"
          aria-hidden
        />
        <h1 className="font-display text-3xl font-bold tracking-tight text-accent-strong sm:text-4xl">
          {doc.title}
        </h1>
        {doc.description ? (
          <p className="max-w-3xl text-base leading-relaxed text-muted">{doc.description}</p>
        ) : null}
      </header>

      <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_11.5rem] xl:gap-12 2xl:grid-cols-[minmax(0,1fr)_13rem]">
        <DocArticle doc={doc} />
        <DocsToc sections={doc.sections} />
      </div>
    </>
  );
}
