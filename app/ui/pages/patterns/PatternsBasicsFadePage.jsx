import React, { useEffect, useState } from "react";
import { CodeBlock } from "../../components/CodeBlock.jsx";

const BASE = "/content/patterns/fade";

async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return await res.text();
}

export function PatternsBasicsFadePage() {
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState({
    docsHtml: "",
    previewHtml: "",
    css: "",
    js: "",
    exportJs: "",
    schema: ""
  });

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const [docsHtml, previewHtml, css, js, exportJs, schema] = await Promise.all([
          fetchText(`${BASE}/docs.html`),
          fetchText(`${BASE}/preview.html`),
          fetchText(`${BASE}/pattern.css`),
          fetchText(`${BASE}/pattern.js`),
          fetchText(`${BASE}/export.js`),
          fetchText(`${BASE}/export.schema.json`)
        ]);
        if (!cancelled) setFiles({ docsHtml, previewHtml, css, js, exportJs, schema });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="app-page">
      <div className="page-title-wrap">
        <h1 className="h-tit">
          Fade <span className="badge-text">Patterns</span>
        </h1>
        <div className="g-info-box">
          <p className="g-desc">
            Patterns는 <strong>Docs + Export</strong>가 한 페이지에 통합됩니다. 실제 발췌 코드는
            `/content`의 순수 HTML/CSS/JS 파일입니다.
          </p>
        </div>
      </div>

      {loading ? (
        <p className="g-desc">불러오는 중…</p>
      ) : (
        <>
          <h2 className="sec-tit">Docs</h2>
          <div className="pattern-frame">
            <iframe
              title="Fade Docs"
              src={`${BASE}/docs.html`}
              className="pattern-iframe"
            />
          </div>

          <h2 className="sec-tit is-spaced">
            Export
          </h2>
          <CodeBlock lang="js" code={files.exportJs} />
          <CodeBlock lang="json" code={files.schema} />

          <h2 className="sec-tit is-spaced">
            Code (원문)
          </h2>
          <CodeBlock lang="html" code={files.previewHtml} />
          <CodeBlock lang="css" code={files.css} />
          <CodeBlock lang="js" code={files.js} />
        </>
      )}
    </div>
  );
}

