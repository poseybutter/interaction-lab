import React, { useRef, useState } from "react";

export function CodeBlock({ lang, code }) {
  const [copied, setCopied] = useState(false);
  const btnRef = useRef(null);

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
        <code className="g-codeblock-code">{code}</code>
      </pre>
    </div>
  );
}

