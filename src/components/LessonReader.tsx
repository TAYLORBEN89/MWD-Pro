import React, { useMemo, isValidElement, Children, ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';

type LessonSection = {
  id: string;
  heading: string;
  /** e.g. "1.1" parsed from heading when present */
  number?: string;
  title?: string;
  body: string;
};

/** Split module markdown on ### headings into display bands. */
function splitLessonSections(markdown: string): LessonSection[] {
  const text = markdown.replace(/\r\n/g, '\n').trim();
  if (!text) return [];

  const parts = text.split(/(?=^### )/m);
  const sections: LessonSection[] = [];

  parts.forEach((part, index) => {
    const trimmed = part.trim();
    if (!trimmed) return;

    if (trimmed.startsWith('### ')) {
      const nl = trimmed.indexOf('\n');
      const headingLine = (nl === -1 ? trimmed : trimmed.slice(0, nl)).replace(/^###\s+/, '').trim();
      const body = nl === -1 ? '' : trimmed.slice(nl + 1).trim();
      // "1.1 What is MWD?" → number + title
      const match = headingLine.match(/^(\d+(?:\.\d+)*)\s+(.+)$/);
      sections.push({
        id: `sec-${index}`,
        heading: headingLine,
        number: match?.[1],
        title: match?.[2] ?? headingLine,
        body: body.replace(/^---\s*$/gm, '').trim(),
      });
    } else {
      // Content before first ### (rare)
      sections.push({
        id: `sec-pre-${index}`,
        heading: '',
        body: trimmed.replace(/^---\s*$/gm, '').trim(),
      });
    }
  });

  return sections.filter((s) => s.heading || s.body);
}

function flattenText(node: ReactNode): string {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(flattenText).join('');
  if (isValidElement(node)) {
    return flattenText((node.props as { children?: ReactNode }).children);
  }
  return '';
}

/** Render list items as open definition rows — no bullets. */
function DefinitionItem({ children }: { children?: ReactNode }) {
  const childArr = Children.toArray(children);
  // Common pattern: <strong>Term:</strong> rest...
  let term: ReactNode = null;
  let rest: ReactNode[] = childArr;

  if (childArr.length > 0 && isValidElement(childArr[0])) {
    const first = childArr[0];
    const tag = typeof first.type === 'string' ? first.type : '';
    if (tag === 'strong' || tag === 'b') {
      term = first;
      rest = childArr.slice(1);
    }
  }

  // Also handle "Term: body" as plain text when strong wraps only the term name
  if (!term && childArr.length >= 1) {
    const text = flattenText(children);
    const m = text.match(/^([^:]{1,80}):\s+([\s\S]+)$/);
    if (m) {
      return (
        <div className="lesson-def">
          <p className="lesson-def-term">{m[1].replace(/\*+/g, '').trim()}</p>
          <p className="lesson-def-body">{m[2].trim()}</p>
        </div>
      );
    }
  }

  if (term) {
    return (
      <div className="lesson-def">
        <p className="lesson-def-term">{term}</p>
        {rest.length > 0 && (
          <p className="lesson-def-body">
            {rest.map((r, i) => (
              <React.Fragment key={i}>{r}</React.Fragment>
            ))}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="lesson-def">
      <p className="lesson-def-body">{children}</p>
    </div>
  );
}

function StepItem({ index, children }: { index: number; children?: ReactNode }) {
  return (
    <div className="lesson-step">
      <span className="lesson-step-num" aria-hidden>
        {index}
      </span>
      <div className="lesson-step-body">{children}</div>
    </div>
  );
}

const markdownComponents = {
  h1: ({ children }: { children?: ReactNode }) => (
    <h3 className="lesson-inline-heading">{children}</h3>
  ),
  h2: ({ children }: { children?: ReactNode }) => (
    <h3 className="lesson-inline-heading">{children}</h3>
  ),
  h3: ({ children }: { children?: ReactNode }) => (
    <h3 className="lesson-inline-heading">{children}</h3>
  ),
  h4: ({ children }: { children?: ReactNode }) => (
    <h4 className="lesson-subheading">{children}</h4>
  ),
  p: ({ children }: { children?: ReactNode }) => (
    <p className="lesson-p">{children}</p>
  ),
  strong: ({ children }: { children?: ReactNode }) => (
    <strong className="lesson-strong">{children}</strong>
  ),
  em: ({ children }: { children?: ReactNode }) => (
    <em className="lesson-em">{children}</em>
  ),
  a: ({ href, children }: { href?: string; children?: ReactNode }) => (
    <a href={href} className="lesson-link" target="_blank" rel="noreferrer">
      {children}
    </a>
  ),
  blockquote: ({ children }: { children?: ReactNode }) => (
    <blockquote className="lesson-callout">{children}</blockquote>
  ),
  hr: () => <div className="lesson-spacer" role="separator" />,
  ul: ({ children }: { children?: ReactNode }) => (
    <div className="lesson-defs">{children}</div>
  ),
  ol: ({ children }: { children?: ReactNode }) => {
    const items = Children.toArray(children).filter(Boolean);
    let step = 0;
    return (
      <div className="lesson-steps">
        {items.map((child, i) => {
          if (!isValidElement(child)) return child;
          // react-markdown ol children are usually <li>
          step += 1;
          const liChildren = (child.props as { children?: ReactNode }).children;
          return (
            <StepItem key={i} index={step}>
              {liChildren}
            </StepItem>
          );
        })}
      </div>
    );
  },
  li: ({ children }: { children?: ReactNode }) => (
    <DefinitionItem>{children}</DefinitionItem>
  ),
  code: ({ children, className }: { children?: ReactNode; className?: string }) => {
    const isBlock = Boolean(className);
    if (isBlock) {
      return <pre className="lesson-code-block"><code>{children}</code></pre>;
    }
    return <code className="lesson-code">{children}</code>;
  },
};

type LessonReaderProps = {
  content: string;
  className?: string;
};

export function LessonReader({ content, className = '' }: LessonReaderProps) {
  const sections = useMemo(() => splitLessonSections(content), [content]);

  if (sections.length === 0) {
    return (
      <div className={`lesson-reader ${className}`.trim()}>
        <div className="lesson-band lesson-band-a">
          <ReactMarkdown components={markdownComponents as any}>{content}</ReactMarkdown>
        </div>
      </div>
    );
  }

  return (
    <div className={`lesson-reader ${className}`.trim()}>
      {sections.map((section, index) => {
        const band = index % 2 === 0 ? 'lesson-band-a' : 'lesson-band-b';
        return (
          <section
            key={section.id}
            className={`lesson-band ${band}`}
            aria-labelledby={section.heading ? section.id : undefined}
          >
            {section.heading && (
              <header className="lesson-band-header">
                {section.number ? (
                  <>
                    <span className="lesson-band-number">{section.number}</span>
                    <h3 id={section.id} className="lesson-band-title">
                      {section.title}
                    </h3>
                  </>
                ) : (
                  <h3 id={section.id} className="lesson-band-title">
                    {section.heading}
                  </h3>
                )}
              </header>
            )}
            {section.body && (
              <div className="lesson-band-body">
                <ReactMarkdown components={markdownComponents as any}>
                  {section.body}
                </ReactMarkdown>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

export default LessonReader;
