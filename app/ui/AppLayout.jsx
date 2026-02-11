import React, { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";

import { INTERACTION_LAB_MENU } from "../interactionLabMenu.js";

function toKebabCase(input) {
  return String(input)
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase();
}

function buildLeafLinks(section) {
  const links = [];

  const walkItems = (items, groupId, pathIds) => {
    for (const it of items || []) {
      const nextPathIds = [...pathIds, it.id];
      if (it.items && it.items.length > 0) {
        walkItems(it.items, groupId, nextPathIds);
      } else {
        links.push({
          ids: [groupId, ...nextPathIds],
          title: it.title,
          leafId: it.id
        });
      }
    }
  };

  for (const group of section?.groups || []) {
    walkItems(group.items, group.id, []);
  }

  return links;
}

function resolveToPath(sectionId, ids, leafId) {
  // MVP 고정 라우트(요구사항)
  if (sectionId === "patterns" && ids?.[0] === "basics" && leafId === "fade") return "/patterns/basics/fade";
  if (sectionId === "demo") return "/demo";

  // 일반 규칙(예: /patterns/scroll/scroll-reveal)
  const segs = (ids || []).map(toKebabCase);
  return `/${sectionId}/${segs.join("/")}`;
}

function Header({ onToggleNav }) {
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
    } catch {
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

function NavGroup({ id, title, open, onToggle, children }) {
  const panelId = useMemo(
    () => id || `nav-group-${title.replace(/\s+/g, "-").toLowerCase()}`,
    [id, title]
  );

  return (
    <li className="nav-subgroup">
      <button
        type="button"
        className="nav-subgroup-toggle"
        aria-expanded={open ? "true" : "false"}
        aria-controls={panelId}
        onClick={onToggle}
      >
        <h3 className="nav-subgroup-title">{title}</h3>
        <i className="ri-arrow-down-s-line nav-subgroup-chevron" aria-hidden="true" />
      </button>
      {open && (
        <div id={panelId} className="nav-panel">
          <ul className="nav-group-list is-spaced-top">
            {children}
          </ul>
        </div>
      )}
    </li>
  );
}

function SideNav() {
  const root = INTERACTION_LAB_MENU.interactionLab;
  const patterns = root.depth2.find((x) => x.id === "patterns");
  const demo = root.depth2.find((x) => x.id === "demo");

  const location = useLocation();
  const isPatterns = location.pathname.startsWith("/patterns");
  const isDemo = location.pathname.startsWith("/demo");

  const [rootOpen, setRootOpen] = useState(true);
  const [patternsOpen, setPatternsOpen] = useState(isPatterns);
  const [patternsGroupOpen, setPatternsGroupOpen] = useState(() => {
    // 처음에는 모두 닫고, 현재 라우트가 patterns라면 해당 그룹만 오픈
    const segs = location.pathname.split("/").filter(Boolean); // ["patterns", "basics", "fade"]
    const groupId = segs[1];
    return groupId ? { [groupId]: true } : {};
  });

  useEffect(() => {
    // 현재 라우트 기반으로 “현재 메뉴만 활성화(오픈)” 기본값 유지
    // - Patterns 라우트면 Patterns를 열고, 해당 그룹만 오픈
    // - 그 외 라우트면 Patterns는 닫음
    setPatternsOpen(isPatterns);
    if (isPatterns) {
      const segs = location.pathname.split("/").filter(Boolean);
      const groupId = segs[1];
      if (groupId) setPatternsGroupOpen({ [groupId]: true });
    }
  }, [isPatterns]);

  return (
    <nav className="app-nav" aria-label="Interaction Lab 메뉴">
      <div className="app-nav-inner">
        <div className="app-nav-section">
          <div className="app-nav-list">
            <button
              type="button"
              className="nav-group-toggle"
              aria-expanded={rootOpen ? "true" : "false"}
              aria-controls="nav-root"
              onClick={() => setRootOpen((v) => !v)}
            >
              <h2 className="nav-group-title">{root.title}</h2>
              <i className="ri-arrow-down-s-line nav-group-chevron" aria-hidden="true" />
            </button>

            {rootOpen && (
              <div id="nav-root" className="nav-panel">
                <ul className="nav-group-list">
                  {/* Demo (메뉴 1개) - Patterns보다 먼저 */}
                  <li>
                    <NavLink
                      to="/demo"
                      className={({ isActive }) => `nav-link${isActive ? " is-active" : ""}`}
                      aria-current={isDemo ? "page" : undefined}
                    >
                      <span>{demo.title}</span>
                    </NavLink>
                  </li>

                  {/* Patterns: 접힘/펼침(아코디언) */}
                  <li className="nav-subgroup">
                    <button
                      type="button"
                      className={`nav-subgroup-toggle${isPatterns ? " is-current" : ""}`}
                      aria-expanded={patternsOpen ? "true" : "false"}
                      aria-controls="nav-patterns-panel"
                      onClick={() => setPatternsOpen((v) => !v)}
                    >
                      <h3 className="nav-subgroup-title">{patterns.title}</h3>
                      <i className="ri-arrow-down-s-line nav-subgroup-chevron" aria-hidden="true" />
                    </button>
                    <p className="nav-group-desc">
                      {patterns.description}
                    </p>

                    {patternsOpen && (
                      <div id="nav-patterns-panel" className="nav-panel">
                        <ul className="nav-group-list is-spaced-top">
                          {(patterns.groups || []).map((g) => (
                            <NavGroup
                              key={`patterns.${g.id}`}
                              id={`nav-patterns-${g.id}`}
                              title={g.title}
                              open={!!patternsGroupOpen[g.id]}
                              onToggle={() =>
                                setPatternsGroupOpen((prev) => ({
                                  ...prev,
                                  [g.id]: !prev[g.id]
                                }))
                              }
                            >
                              {buildLeafLinks({ groups: [g] }).map((leaf) => {
                                const to = resolveToPath("patterns", leaf.ids, leaf.leafId);
                                return (
                                  <li key={`patterns.${leaf.ids.join(".")}.${leaf.leafId}`}>
                                <NavLink to={to} className={({ isActive }) => `nav-link${isActive ? " is-active" : ""}`}>
                                      <span>{leaf.title}</span>
                                    </NavLink>
                                  </li>
                                );
                              })}
                            </NavGroup>
                          ))}
                        </ul>
                      </div>
                    )}
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

export function AppLayout() {
  const [navOpen, setNavOpen] = useState(true);

  useEffect(() => {
    document.body.classList.toggle("is-nav-open", navOpen);
  }, [navOpen]);

  return (
    <>
      <Header onToggleNav={() => setNavOpen((v) => !v)} />
      <div className="app-layout">
        <SideNav />
        <div className="app-content">
          <main id="main" className="app-main" tabIndex={-1}>
            <Outlet />
          </main>
          <footer className="app-footer" aria-label="푸터">
            <div className="app-footer-inner">
              <p className="app-footer-text">Interaction Lab — React Router 기반 Viewer</p>
            </div>
          </footer>
        </div>
      </div>
      <div className="app-overlay" onClick={() => setNavOpen(false)} aria-hidden="true" />
    </>
  );
}

