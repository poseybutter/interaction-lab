import React, { useEffect, useRef, useState } from "react";
import { CodeBlock } from "../../components/CodeBlock.jsx";

const BASE = "/content/patterns/fade";

async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return await res.text();
}

export function PatternsBasicsFadePage() {
  const [loading, setLoading] = useState(true);
  const docsIframeRef = useRef(null);
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

  const resizeDocsIframe = () => {
    const iframe = docsIframeRef.current;
    if (!iframe) return;
    try {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!doc) return;

      const body = doc.body;
      const html = doc.documentElement;
      const next =
        Math.max(
          body?.scrollHeight || 0,
          html?.scrollHeight || 0,
          body?.offsetHeight || 0,
          html?.offsetHeight || 0
        ) + 8; // 여백(테두리/반올림 등)

      if (Number.isFinite(next) && next > 0) {
        iframe.style.height = `${next}px`;
      }
    } catch {
      // cross-origin이면 접근 불가(현재 프로젝트는 same-origin이라 정상 동작)
    }
  };

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
              ref={docsIframeRef}
              title="Fade Docs"
              src={`${BASE}/docs.html`}
              className="pattern-iframe"
              onLoad={() => {
                resizeDocsIframe();
                // 폰트/이미지 로드로 높이가 늦게 변하는 케이스 보정
                window.setTimeout(resizeDocsIframe, 60);
                window.setTimeout(resizeDocsIframe, 240);
              }}
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

