import React, { useEffect, useMemo, useRef, useState } from "react";
import { INTERACTION_LAB_MENU } from "./interactionLabMenu.js";

const CONTENT_BASE = "/content/patterns";

const ROUTES = {
  patterns: "patterns",
  demo: "demo"
};

const IMPLEMENTED_DEMO_IDS = new Set(["fade"]);

function clampNumber(n, min, max) {
  const v = Number.isFinite(n) ? n : min;
  return Math.min(max, Math.max(min, v));
}

function parseHash() {
  const hash = window.location.hash || "";
  const m = hash.match(/^#\/(patterns|demo)(?:\/([^?#]+))?/);
  const route = m?.[1] || ROUTES.patterns;
  const key = m?.[2] ? decodeURIComponent(m[2]) : "";
  return { route, key };
}

function setHash(route, key) {
  const safeKey = key ? encodeURIComponent(key) : "";
  window.location.hash = safeKey ? `#/${route}/${safeKey}` : `#/${route}`;
}

function flattenSection(section) {
  const leaves = [];

  const walkItems = (items, idPath, titlePath, groupIdPath, groupTitlePath) => {
    for (const item of items || []) {
      const nextIdPath = [...idPath, item.id];
      const nextTitlePath = [...titlePath, item.title];
      if (item.items && item.items.length > 0) {
        walkItems(item.items, nextIdPath, nextTitlePath, groupIdPath, groupTitlePath);
      } else {
        const ids = [...groupIdPath, ...nextIdPath];
        const titles = [...groupTitlePath, ...nextTitlePath];
        const key = ids.join(".");
        leaves.push({ key, ids, titles, leafId: item.id, leafTitle: item.title });
      }
    }
  };

  for (const group of section?.groups || []) {
    walkItems(group.items, [], [], [group.id], [group.title]);
  }

  return leaves;
}

function buildLeafIndex(section) {
  const leaves = flattenSection(section);
  const byKey = new Map(leaves.map((x) => [x.key, x]));
  const firstKey = leaves[0]?.key || "";
  return { leaves, byKey, firstKey };
}

const MENU_ROOT = INTERACTION_LAB_MENU.interactionLab;
const MENU_PATTERNS = MENU_ROOT.depth2.find((x) => x.id === ROUTES.patterns);
const MENU_DEMO = MENU_ROOT.depth2.find((x) => x.id === ROUTES.demo);
const PATTERNS_INDEX = buildLeafIndex(MENU_PATTERNS);
const DEMO_INDEX = buildLeafIndex(MENU_DEMO);

function getFadeDefaults() {
  return {
    duration: 600,
    delay: 0,
    easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
    fromOpacity: 0
  };
}

function buildExportJson(patternId, options) {
  return {
    patternId,
    engine: "vanilla",
    options,
    exportedAt: new Date().toISOString()
  };
}

function buildExportJs(patternId, options) {
  // 퍼블리셔가 “복사해서 붙이기” 쉽게: 옵션이 이미 들어간 호출 코드 형태
  return `// Interaction Lab Export JS (Vanilla)\n// patternId: ${patternId}\n\n(function(){\n  var options = ${JSON.stringify(options, null, 2)};\n\n  // 예시: 특정 대상 1개를 잡아 실행\n  var target = document.querySelector('[data-interaction-target=\"${patternId}\"]');\n  if(!target){\n    console.warn('[InteractionLab] 대상 요소를 찾지 못했습니다:', '${patternId}');\n    return;\n  }\n\n  // pattern.js가 전역에 노출하는 인스턴스(패턴별) 사용\n  var api = window.InteractionLabPatterns && window.InteractionLabPatterns['${patternId}'];\n  if(!api){\n    console.warn('[InteractionLab] 패턴 API를 찾지 못했습니다:', '${patternId}');\n    return;\n  }\n\n  api.attach(target);\n  api.setOptions(options);\n  api.play();\n})();\n`;
}

function CodeBlock({ lang, code }) {
  const [copied, setCopied] = useState(false);
  const btnRef = useRef(null);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
      btnRef.current?.focus();
    } catch (e) {
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

function Tabs({ active, onChange, items }) {
  return (
    <div className="krds-tabs" role="tablist" aria-label="패턴 탭">
      <ul className="krds-tabs-list">
        {items.map((t) => (
          <li key={t.id}>
            <a
              href="#"
              className="krds-tabs-link"
              role="tab"
              aria-selected={active === t.id ? "true" : "false"}
              onClick={(e) => {
                e.preventDefault();
                onChange(t.id);
              }}
              style={
                active === t.id
                  ? { color: "var(--color-text)", borderBottomColor: "var(--color-primary)" }
                  : undefined
              }
            >
              {t.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Header({ onToggleNav, route, breadcrumbTitles }) {
  const routeLabel = route === ROUTES.demo ? "Demo" : "Patterns";

  return (
    <header className="app-header">
      <div className="app-header-inner">
        <div className="app-header-left">
          <button
            type="button"
            className="krds-btn small app-header-menu"
            onClick={onToggleNav}
            aria-label="좌측 메뉴 열기/닫기"
          >
            <i className="ri-menu-line" aria-hidden="true" />
          </button>
          <div className="app-header-context">
            <div className="krds-breadcrumb-wrap" aria-label="현재 위치">
              <ol className="breadcrumb">
                <li>
                  <span className="txt">Interaction Lab</span>
                </li>
                <li aria-hidden="true">
                  <i className="ri-arrow-right-s-line krds-breadcrumb-sep" />
                </li>
                <li>
                  <span className="txt" aria-current="page">
                    {routeLabel}
                  </span>
                </li>
                {breadcrumbTitles.map((t) => (
                  <React.Fragment key={t}>
                    <li aria-hidden="true">
                      <i className="ri-arrow-right-s-line krds-breadcrumb-sep" />
                    </li>
                    <li>
                      <span className="txt" aria-current="page">
                        {t}
                      </span>
                    </li>
                  </React.Fragment>
                ))}
              </ol>
            </div>
          </div>
        </div>
        <div className="app-header-actions">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

function ThemeToggle() {
  const [theme, setTheme] = useState(
    () => document.documentElement.getAttribute("data-theme") || "light"
  );

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("theme", next);
    } catch (e) {
      // noop
    }
  };

  return (
    <button type="button" className="krds-btn small" onClick={toggle} aria-label="테마 토글">
      <i
        className={`app-header-theme-icon ${theme === "dark" ? "ri-moon-line" : "ri-sun-line"}`}
        aria-hidden="true"
      />
      <span className="sr-only">테마 변경</span>
    </button>
  );
}

function NavItemLink({ href, active, disabled, title, badge, onClick }) {
  return (
    <a
      href={href}
      className={`nav-link${disabled ? " is-disabled" : ""}`}
      aria-current={active ? "page" : undefined}
      onClick={(e) => {
        if (disabled) {
          e.preventDefault();
          return;
        }
        onClick?.(e);
      }}
      style={
        active
          ? { background: "rgba(37,99,235,.08)", borderColor: "rgba(37,99,235,.20)" }
          : undefined
      }
    >
      <span>{title}</span>
      <span className="nav-link-badge">{badge}</span>
    </a>
  );
}

function SideNav({ route, activeKey }) {
  const [open, setOpen] = useState(() => ({
    patterns: true,
    demo: true
  }));

  const [openGroups, setOpenGroups] = useState(() => {
    const init = {};
    for (const g of MENU_PATTERNS?.groups || []) init[`patterns.${g.id}`] = true;
    for (const g of MENU_DEMO?.groups || []) init[`demo.${g.id}`] = true;
    return init;
  });

  const [openNodes, setOpenNodes] = useState(() => ({}));

  const isPatterns = route === ROUTES.patterns;
  const isDemo = route === ROUTES.demo;

  const renderSection = (section, sectionId) => {
    return (
      <li className="nav-subgroup">
        <button
          type="button"
          className="nav-subgroup-toggle"
          aria-expanded={open[sectionId] ? "true" : "false"}
          aria-controls={`nav-section-${sectionId}`}
          onClick={() => setOpen((m) => ({ ...m, [sectionId]: !m[sectionId] }))}
        >
          <h3 className="nav-subgroup-title">{section.title}</h3>
          <i className="ri-arrow-down-s-line nav-subgroup-chevron" aria-hidden="true" />
        </button>

        {open[sectionId] && (
          <div id={`nav-section-${sectionId}`} className="nav-panel is-tight">
            <p className="nav-group-desc">
              {section.description}
            </p>

            <ul className="nav-group-list">
              {(section.groups || []).map((group) => {
                const groupKey = `${sectionId}.${group.id}`;
                const groupOpen = openGroups[groupKey] ?? true;

                const renderItems = (items, idPath, titlePath) => {
                  return (
                    <ul className="nav-group-list is-spaced-top">
                      {(items || []).map((item) => {
                        const nextIdPath = [...idPath, item.id];
                        const nextTitlePath = [...titlePath, item.title];
                        if (item.items && item.items.length > 0) {
                          const nodeKey = `${sectionId}.${group.id}.${nextIdPath.join(".")}`;
                          const nodeOpen = openNodes[nodeKey] ?? true;
                          return (
                            <li key={nodeKey} className="nav-subgroup">
                              <button
                                type="button"
                                className="nav-subgroup-toggle"
                                aria-expanded={nodeOpen ? "true" : "false"}
                                aria-controls={`nav-node-${encodeURIComponent(nodeKey)}`}
                                onClick={() => setOpenNodes((m) => ({ ...m, [nodeKey]: !nodeOpen }))}
                              >
                                <h3 className="nav-subgroup-title">{item.title}</h3>
                                <i className="ri-arrow-down-s-line nav-subgroup-chevron" aria-hidden="true" />
                              </button>
                              {nodeOpen && (
                                <div id={`nav-node-${encodeURIComponent(nodeKey)}`} className="nav-panel">
                                  {renderItems(item.items, nextIdPath, nextTitlePath)}
                                </div>
                              )}
                            </li>
                          );
                        }

                        const key = [group.id, ...nextIdPath].join(".");
                        const href = `#/${sectionId}/${encodeURIComponent(key)}`;
                        const active = isPatterns
                          ? sectionId === ROUTES.patterns && activeKey === key
                          : sectionId === ROUTES.demo && activeKey === key;
                        const leafId = item.id;
                        const disabled = sectionId === ROUTES.demo && !IMPLEMENTED_DEMO_IDS.has(leafId);

                        return (
                          <li key={`${sectionId}.${key}`}>
                            <NavItemLink
                              href={href}
                              active={active}
                              disabled={disabled}
                              title={item.title}
                              badge={disabled ? "준비 중" : sectionId === ROUTES.demo ? "Demo" : "Docs"}
                            />
                          </li>
                        );
                      })}
                    </ul>
                  );
                };

                return (
                  <li key={groupKey} className="nav-subgroup">
                    <button
                      type="button"
                      className="nav-subgroup-toggle"
                      aria-expanded={groupOpen ? "true" : "false"}
                      aria-controls={`nav-group-${encodeURIComponent(groupKey)}`}
                      onClick={() => setOpenGroups((m) => ({ ...m, [groupKey]: !groupOpen }))}
                    >
                      <h3 className="nav-subgroup-title">{group.title}</h3>
                      <i className="ri-arrow-down-s-line nav-subgroup-chevron" aria-hidden="true" />
                    </button>

                    {groupOpen && (
                      <div id={`nav-group-${encodeURIComponent(groupKey)}`} className="nav-panel">
                        {renderItems(group.items, [], [])}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </li>
    );
  };

  return (
    <nav className="app-nav" aria-label="Interaction Lab 메뉴">
      <div className="app-nav-inner">
        <div className="app-nav-section">
          <div className="app-nav-list">
            <button
              type="button"
              className="nav-group-toggle"
              aria-expanded="true"
              aria-controls="nav-group-interactionlab"
              onClick={() => {}}
            >
              <h2 className="nav-group-title">Interaction Lab</h2>
              <i className="ri-arrow-down-s-line nav-group-chevron" aria-hidden="true" />
            </button>

            <div id="nav-group-interactionlab" className="nav-panel">
              <ul className="nav-group-list">
                <li>
                  <NavItemLink
                    href={`#/${ROUTES.patterns}/${encodeURIComponent(PATTERNS_INDEX.firstKey)}`}
                    active={isPatterns}
                    title="Patterns"
                    badge="Docs + Export"
                    onClick={(e) => {
                      e.preventDefault();
                      setHash(ROUTES.patterns, PATTERNS_INDEX.firstKey);
                    }}
                  />
                </li>
                <li>
                  <NavItemLink
                    href={`#/${ROUTES.demo}/${encodeURIComponent(DEMO_INDEX.firstKey)}`}
                    active={isDemo}
                    title="Demo"
                    badge="Preview"
                    onClick={(e) => {
                      e.preventDefault();
                      setHash(ROUTES.demo, DEMO_INDEX.firstKey);
                    }}
                  />
                </li>

                {/* depth2: Patterns / Demo 상세 */}
                {renderSection(MENU_PATTERNS, ROUTES.patterns)}
                {renderSection(MENU_DEMO, ROUTES.demo)}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

function ControlsPanel({ route, demoId, options, setOptions, patternsLeaf, demoLeaf }) {
  const set = (patch) => setOptions({ ...options, ...patch });
  const isFade = route === ROUTES.demo && demoId === "fade";

  return (
    <section aria-label="컨트롤">
      <div className="page-title-wrap">
        <h1 className="h-tit">
          {route === ROUTES.demo ? "Demo" : "Patterns"} <span className="badge-text">MVP</span>
        </h1>
        <div className="g-info-box">
          <p className="g-desc">
            Viewer(React)는 UI만 담당합니다. 실행 코드는 iframe 내부의 <strong>순수 HTML/CSS/JS</strong> 입니다.
          </p>
        </div>
      </div>

      <form className="fieldset" onSubmit={(e) => e.preventDefault()}>
        {route === ROUTES.patterns ? (
          <div className="form-group">
            <div className="form-tit">
              <label>선택 항목</label>
            </div>
            <div className="form-conts">
              <input
                className="krds-input"
                type="text"
                readOnly
                value={(patternsLeaf?.titles || []).join(" / ") || "선택되지 않음"}
              />
            </div>
            <p className="form-hint">Patterns는 문서/가이드 성격이라, 값 조절은 Demo에서 제공합니다.</p>
          </div>
        ) : (
          <div className="form-group">
            <div className="form-tit">
              <label>선택 Demo</label>
            </div>
            <div className="form-conts">
              <input
                className="krds-input"
                type="text"
                readOnly
                value={(demoLeaf?.titles || []).join(" / ") || "선택되지 않음"}
              />
            </div>
            <p className="form-hint">
              {IMPLEMENTED_DEMO_IDS.has(demoId) ? "컨트롤을 바꾸면 프리뷰에 즉시 반영됩니다." : "준비 중인 Demo 입니다."}
            </p>
          </div>
        )}

        {isFade && (
          <>
            <div className="form-group">
              <div className="form-tit">
                <label htmlFor="fade-duration">duration (ms)</label>
              </div>
              <div className="form-conts">
                <input
                  id="fade-duration"
                  className="krds-input"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={8000}
                  value={options.duration}
                  onChange={(e) => set({ duration: clampNumber(Number(e.target.value), 0, 8000) })}
                />
              </div>
              <p className="form-hint">애니메이션 진행 시간입니다.</p>
            </div>

            <div className="form-group">
              <div className="form-tit">
                <label htmlFor="fade-delay">delay (ms)</label>
              </div>
              <div className="form-conts">
                <input
                  id="fade-delay"
                  className="krds-input"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={8000}
                  value={options.delay}
                  onChange={(e) => set({ delay: clampNumber(Number(e.target.value), 0, 8000) })}
                />
              </div>
              <p className="form-hint">시작 전 대기 시간입니다.</p>
            </div>

            <div className="form-group">
              <div className="form-tit">
                <label htmlFor="fade-easing">easing (CSS)</label>
              </div>
              <div className="form-conts">
                <input
                  id="fade-easing"
                  className="krds-input"
                  type="text"
                  value={options.easing}
                  onChange={(e) => set({ easing: e.target.value })}
                  placeholder="ease | linear | cubic-bezier(...)"
                />
              </div>
              <p className="form-hint">CSS easing 문자열을 그대로 사용합니다.</p>
            </div>

            <div className="form-group">
              <div className="form-tit">
                <label htmlFor="fade-opacity">fromOpacity</label>
              </div>
              <div className="form-conts">
                <input
                  id="fade-opacity"
                  className="krds-input"
                  type="number"
                  step="0.05"
                  min={0}
                  max={1}
                  value={options.fromOpacity}
                  onChange={(e) => set({ fromOpacity: clampNumber(Number(e.target.value), 0, 1) })}
                />
              </div>
              <p className="form-hint">시작 opacity (0~1)입니다.</p>
            </div>
          </>
        )}
      </form>
    </section>
  );
}

function PatternsPage({ leaf }) {
  const [tab, setTab] = useState("docs"); // docs | export | code
  const exportJson = useMemo(
    () => ({
      section: "patterns",
      key: leaf?.key || "",
      title: leaf?.leafTitle || "",
      exportedAt: new Date().toISOString()
    }),
    [leaf?.key, leaf?.leafTitle]
  );
  const exportJs = useMemo(() => {
    const title = leaf?.leafTitle || "";
    const key = leaf?.key || "";
    return `// Patterns Export JS (Vanilla)\n// item: ${title}\n// key: ${key}\n\n(function(){\n  // TODO: 이 항목의 예제 코드는 준비 중입니다.\n})();\n`;
  }, [leaf?.key, leaf?.leafTitle]);

  const tabs = [
    { id: "docs", label: "Docs" },
    { id: "export", label: "Export" },
    { id: "code", label: "Code" }
  ];

  return (
    <section aria-label="Patterns">
      <Tabs active={tab} onChange={setTab} items={tabs} />

      <section hidden={tab !== "docs"} aria-label="패턴 문서">
        <div className="page-title-wrap">
          <h2 className="sec-tit">{leaf?.leafTitle || "Patterns"}</h2>
          <p className="g-desc">
            {leaf?.titles?.length ? leaf.titles.join(" / ") : "항목을 선택해 주세요."}
          </p>
        </div>

        <h3 className="sec-tit">설명</h3>
        <p className="g-desc">이 항목의 문서는 현재 템플릿만 준비되어 있습니다. (콘텐츠는 추후 작성)</p>

        <h3 className="sec-tit">Export</h3>
        <p className="g-desc">필요 시 이 항목별로 “복붙 가능한 JS/JSON”을 추가할 예정입니다.</p>
      </section>

      <section hidden={tab !== "export"} aria-label="내보내기">
        <div className="page-title-wrap">
          <h2 className="sec-tit">Export</h2>
          <p className="g-desc">현재 선택 항목의 Export(JSON/JS) 템플릿입니다.</p>
        </div>

        <CodeBlock lang="json" code={JSON.stringify(exportJson, null, 2)} />
        <CodeBlock lang="js" code={exportJs} />
      </section>

      <section hidden={tab !== "code"} aria-label="원문 코드">
        <div className="page-title-wrap">
          <h2 className="sec-tit">Code</h2>
          <p className="g-desc">이 항목은 문서 페이지이므로 `/content` 원문은 없습니다.</p>
        </div>

        <CodeBlock lang="js" code={exportJs} />
      </section>
    </section>
  );
}

function DemoPage({ demoId, options }) {
  const iframeRef = useRef(null);
  const [ready, setReady] = useState(false);

  const isImplemented = IMPLEMENTED_DEMO_IDS.has(demoId);
  const patternBaseUrl = `${CONTENT_BASE}/${demoId}`;
  const previewUrl = `${patternBaseUrl}/preview.html`;

  useEffect(() => {
    const onMessage = (e) => {
      const data = e?.data;
      if (!data || typeof data !== "object") return;
      if (data.source !== "interaction-lab-pattern") return;
      if (data.type === "pattern:ready" && data.patternId === demoId) {
        setReady(true);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [demoId]);

  useEffect(() => {
    setReady(false);
  }, [demoId]);

  useEffect(() => {
    if (!isImplemented) return;
    if (!ready) return;
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    win.postMessage(
      { source: "interaction-lab-viewer", type: "pattern:update", patternId: demoId, options },
      "*"
    );
  }, [isImplemented, ready, demoId, options]);

  return (
    <section aria-label="Demo">
      <div className="page-title-wrap">
        <h2 className="sec-tit">Preview</h2>
        <p className="g-desc">iframe 기반 프리뷰입니다. 컨트롤 변경이 즉시 반영됩니다.</p>
      </div>

      {isImplemented ? (
        <div className="lab-preview-frame">
          <iframe
            ref={iframeRef}
            title="패턴 프리뷰"
            src={previewUrl}
            className="lab-preview-iframe is-tall"
          />
        </div>
      ) : (
        <div className="g-info-box">
          <p className="g-desc">이 Demo는 아직 준비 중입니다.</p>
        </div>
      )}
    </section>
  );
}

export default function App() {
  const [navOpen, setNavOpen] = useState(true);
  const [{ route, key }, setRouteState] = useState(() => parseHash());

  const patternsLeaf = useMemo(() => PATTERNS_INDEX.byKey.get(key) || PATTERNS_INDEX.byKey.get(PATTERNS_INDEX.firstKey), [key]);
  const demoLeaf = useMemo(() => DEMO_INDEX.byKey.get(key) || DEMO_INDEX.byKey.get(DEMO_INDEX.firstKey), [key]);
  const activePatternsKey = patternsLeaf?.key || PATTERNS_INDEX.firstKey;
  const activeDemoKey = demoLeaf?.key || DEMO_INDEX.firstKey;

  const activeKey = route === ROUTES.demo ? activeDemoKey : activePatternsKey;
  const demoId = route === ROUTES.demo ? demoLeaf?.leafId || "fade" : "fade";
  const [options, setOptions] = useState(() => getFadeDefaults());

  useEffect(() => {
    const onHash = () => setRouteState(parseHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    document.body.classList.toggle("is-nav-open", navOpen);
  }, [navOpen]);

  useEffect(() => {
    if (!window.location.hash) setHash(ROUTES.patterns, PATTERNS_INDEX.firstKey);
  }, []);

  useEffect(() => {
    // Demo 항목 변경 시 옵션 리셋(현재 MVP: fade만)
    if (route === ROUTES.demo && demoId === "fade") setOptions(getFadeDefaults());
  }, [route, demoId]);

  useEffect(() => {
    // key가 비었거나 잘못된 경우 기본 leaf로 보정
    if (route === ROUTES.patterns) {
      if (!PATTERNS_INDEX.byKey.has(key)) setHash(ROUTES.patterns, PATTERNS_INDEX.firstKey);
    } else if (route === ROUTES.demo) {
      if (!DEMO_INDEX.byKey.has(key)) setHash(ROUTES.demo, DEMO_INDEX.firstKey);
    }
  }, [route, key]);

  const breadcrumbTitles = route === ROUTES.demo ? (demoLeaf?.titles || []) : (patternsLeaf?.titles || []);

  return (
    <>
      <Header onToggleNav={() => setNavOpen((v) => !v)} route={route} breadcrumbTitles={breadcrumbTitles} />

      <div className="app-layout">
        <SideNav route={route} activeKey={activeKey} />

        <div className="app-content">
          <main id="main" className="app-main" tabIndex={-1}>
            <div className="app-page">
              <div className="lab-split">
                <div className="lab-controls">
                  <ControlsPanel
                    route={route}
                    demoId={demoId}
                    options={options}
                    setOptions={setOptions}
                    patternsLeaf={patternsLeaf}
                    demoLeaf={demoLeaf}
                  />
                </div>

                <div className="lab-main">
                  {route === ROUTES.demo ? (
                    <DemoPage demoId={demoId} options={options} />
                  ) : (
                    <PatternsPage leaf={patternsLeaf} />
                  )}
                </div>
              </div>
            </div>
          </main>

          <footer className="app-footer" aria-label="푸터">
            <div className="app-footer-inner">
              <p className="app-footer-text">Interaction Lab — Patterns / Demo (Vanilla JS 실행 코드 분리)</p>
            </div>
          </footer>
        </div>
      </div>

      <div className="app-overlay" onClick={() => setNavOpen(false)} aria-hidden="true" />
    </>
  );
}

