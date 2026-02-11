import React, { useMemo, useRef, useState } from "react";
import hljs from "highlight.js";

function escapeHtml(input) {
  // 의도: highlight.js 실패/미적용 시에도 XSS 없이 안전하게 렌더링
  return String(input ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function CodeBlock({ lang, code }) {
  const [copied, setCopied] = useState(false);
  const btnRef = useRef(null);

  const normalizedLang = (lang || "").toLowerCase();
  const hljsLang =
    normalizedLang === "js"
      ? "javascript"
      : normalizedLang === "html"
        ? "xml"
        : normalizedLang;

  const highlightedHtml = useMemo(() => {
    const source = code ?? "";
    if (!source) return "";

    try {
      if (hljsLang && hljs.getLanguage(hljsLang)) {
        return hljs.highlight(source, { language: hljsLang }).value;
      }
      return hljs.highlightAuto(source).value;
    } catch {
      // 의도: 하이라이트 실패 시에도 “텍스트 그대로” 안전하게 표시
      return escapeHtml(source);
    }
  }, [code, hljsLang]);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
      btnRef.current?.focus();
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = code;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.top = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    }
  };

  return (
    <div className="g-codeblock">
      <div className="g-codeblock-header">
        <span className="g-codeblock-lang" aria-label="코드 종류">
          {lang}
        </span>
        <button
          ref={btnRef}
          type="button"
          className={`g-codeblock-copy${copied ? " is-copied" : ""}`}
          onClick={onCopy}
          aria-label={copied ? "복사 완료" : "코드 복사"}
        >
          <i className="ri-file-copy-line g-codeblock-copy-ico" aria-hidden="true" />
          {copied ? "복사됨" : "Copy"}
        </button>
      </div>
      <pre className="g-codeblock-pre" tabIndex={0}>
        <code
          className={`g-codeblock-code hljs${hljsLang ? ` language-${hljsLang}` : ""}`}
          dangerouslySetInnerHTML={{ __html: highlightedHtml || escapeHtml(code ?? "") }}
        />
      </pre>
    </div>
  );
}

