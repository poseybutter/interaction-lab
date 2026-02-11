import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { CodeBlock } from "../../components/CodeBlock.jsx";
import { INTERACTION_LAB_MENU } from "../../../interactionLabMenu.js";

const IMPLEMENTED_DEMO_IDS = new Set(["fade", "scale", "rotate"]);

const EASE_TYPES = [
  { id: "in", label: "in" },
  { id: "out", label: "out" },
  { id: "inOut", label: "inOut" }
];

const EASE_MENU = [
  { id: "standard", label: "Standard", kind: "single", value: "cubic-bezier(0.2, 0.8, 0.2, 1)" },
  { id: "emphasized", label: "Emphasized", kind: "single", value: "cubic-bezier(0.2, 0, 0, 1)" },
  { id: "linear", label: "linear", kind: "single", value: "linear" },

  // ease 계열
  {
    id: "ease",
    label: "ease",
    kind: "typed",
    typed: {
      in: "ease-in",
      out: "ease-out",
      inOut: "ease-in-out"
    }
  },

  // Power1~4 (CSS cubic-bezier 근사값)
  {
    id: "power1",
    label: "power1",
    kind: "typed",
    typed: {
      in: "cubic-bezier(0.55, 0.085, 0.68, 0.53)",
      out: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
      inOut: "cubic-bezier(0.455, 0.03, 0.515, 0.955)"
    }
  },
  {
    id: "power2",
    label: "power2",
    kind: "typed",
    typed: {
      in: "cubic-bezier(0.895, 0.03, 0.685, 0.22)",
      out: "cubic-bezier(0.165, 0.84, 0.44, 1)",
      inOut: "cubic-bezier(0.77, 0, 0.175, 1)"
    }
  },
  {
    id: "power3",
    label: "power3",
    kind: "typed",
    typed: {
      in: "cubic-bezier(0.755, 0.05, 0.855, 0.06)",
      out: "cubic-bezier(0.23, 1, 0.32, 1)",
      inOut: "cubic-bezier(0.86, 0, 0.07, 1)"
    }
  },
  {
    id: "power4",
    label: "power4",
    kind: "typed",
    typed: {
      in: "cubic-bezier(0.95, 0.05, 0.795, 0.035)",
      out: "cubic-bezier(0.19, 1, 0.22, 1)",
      inOut: "cubic-bezier(1, 0, 0, 1)"
    }
  },

  // steps (CSS 그대로)
  { id: "steps", label: "steps", kind: "steps" },

  // Custom
  { id: "custom", label: "Custom", kind: "custom" }
];

function deriveEaseUi(value) {
  const v = String(value || "").trim();
  for (const item of EASE_MENU) {
    if (item.kind === "single" && item.value === v) return { menuId: item.id };
    if (item.kind === "typed") {
      for (const t of EASE_TYPES) {
        if (item.typed?.[t.id] === v) return { menuId: item.id, type: t.id };
      }
      // ease 자체(ease)는 typed가 아니라 single로 취급
      if (item.id === "ease" && v === "ease") return { menuId: "ease", type: "out" };
    }
    if (item.kind === "steps") {
      const s = getStepsCount(v);
      if (s) return { menuId: "steps", stepsCount: s.count, stepsPos: s.pos };
    }
  }
  // 기본값은 standard
  if (!v) return { menuId: "standard" };
  return { menuId: "custom" };
}

function resolveEaseValue(ui, currentValue) {
  const menuId = ui?.menuId || "standard";
  const item = EASE_MENU.find((x) => x.id === menuId) || EASE_MENU[0];
  if (!item) return "cubic-bezier(0.2, 0.8, 0.2, 1)";

  if (item.kind === "single") return item.value;
  if (item.kind === "typed") {
    const type = ui?.type || "out";
    if (item.id === "ease" && type === "out") return "ease-out";
    return item.typed?.[type] || item.typed?.out;
  }
  if (item.kind === "steps") {
    const n = Number(ui?.stepsCount);
    const count = Number.isFinite(n) && n > 0 ? Math.floor(n) : 8;
    const pos = ui?.stepsPos === "start" ? "start" : "end";
    return `steps(${count}, ${pos})`;
  }
  // custom: 현재 입력값 유지
  return String(currentValue || "").trim() || "cubic-bezier(0.2, 0.8, 0.2, 1)";
}

function parseCubicBezier(value) {
  const m = String(value)
    .trim()
    .match(/^cubic-bezier\(\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\)$/i);
  if (!m) return null;
  const nums = m.slice(1).map((x) => Number(x));
  if (nums.some((n) => !Number.isFinite(n))) return null;
  return { x1: nums[0], y1: nums[1], x2: nums[2], y2: nums[3] };
}

function easingToBezier(value) {
  const v = String(value || "").trim();
  if (!v) return parseCubicBezier("cubic-bezier(0.2, 0.8, 0.2, 1)");
  if (v === "linear") return { x1: 0, y1: 0, x2: 1, y2: 1 };
  if (v === "ease") return { x1: 0.25, y1: 0.1, x2: 0.25, y2: 1 };
  if (v === "ease-in") return { x1: 0.42, y1: 0, x2: 1, y2: 1 };
  if (v === "ease-out") return { x1: 0, y1: 0, x2: 0.58, y2: 1 };
  if (v === "ease-in-out") return { x1: 0.42, y1: 0, x2: 0.58, y2: 1 };
  return parseCubicBezier(v);
}

function getStepsCount(value) {
  const m = String(value)
    .trim()
    .match(/^steps\(\s*(\d+)\s*,\s*(start|end)\s*\)$/i);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n) || n <= 0) return null;
  return { count: n, pos: String(m[2]).toLowerCase() };
}

function EasingGraph({ easing }) {
  const parsed = useMemo(() => {
    const v = String(easing || "").trim();
    return {
      easing: v,
      bez: easingToBezier(v),
      steps: getStepsCount(v)
    };
  }, [easing]);

  const bez = parsed.bez;
  const steps = parsed.steps;
  const [progress, setProgress] = useState(1); // 0..1

  const w = 340;
  const h = 220;
  const pad = 10;
  const innerW = w - pad * 2;
  const innerH = h - pad * 2;

  const px = (x) => pad + x * innerW;
  const py = (y) => pad + (1 - y) * innerH;

  const cubic = (t, a, b, c, d) => {
    const mt = 1 - t;
    return mt * mt * mt * a + 3 * mt * mt * t * b + 3 * mt * t * t * c + t * t * t * d;
  };

  const buildBezierPath = () => {
    if (!bez) return "";
    const p0 = { x: 0, y: 0 };
    const p1 = { x: bez.x1, y: bez.y1 };
    const p2 = { x: bez.x2, y: bez.y2 };
    const p3 = { x: 1, y: 1 };

    const samples = 60;
    let d = `M ${px(p0.x)} ${py(p0.y)}`;
    for (let i = 1; i <= samples; i++) {
      const t = i / samples;
      const x = cubic(t, p0.x, p1.x, p2.x, p3.x);
      const y = cubic(t, p0.y, p1.y, p2.y, p3.y);
      d += ` L ${px(x)} ${py(y)}`;
    }
    return d;
  };

  const buildBezierPoints = () => {
    if (!bez) return [];
    const p0 = { x: 0, y: 0 };
    const p1 = { x: bez.x1, y: bez.y1 };
    const p2 = { x: bez.x2, y: bez.y2 };
    const p3 = { x: 1, y: 1 };

    const samples = 120;
    const pts = [];
    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      const x = cubic(t, p0.x, p1.x, p2.x, p3.x);
      const y = cubic(t, p0.y, p1.y, p2.y, p3.y);
      pts.push({ x: px(x), y: py(y) });
    }
    return pts;
  };

  const buildStepsPath = () => {
    if (!steps) return "";
    const n = Math.min(steps.count, 60);
    const stepW = 1 / n;
    const stepH = 1 / n;
    let x = 0;
    let y = steps.pos === "start" ? stepH : 0;
    let d = `M ${px(0)} ${py(0)}`;
    for (let i = 0; i < n; i++) {
      const nextX = x + stepW;
      // horizontal
      d += ` L ${px(nextX)} ${py(y)}`;
      x = nextX;
      // vertical
      y = steps.pos === "start" ? Math.min(1, y + stepH) : Math.min(1, y + stepH);
      d += ` L ${px(x)} ${py(y)}`;
    }
    d += ` L ${px(1)} ${py(1)}`;
    return d;
  };

  const buildStepsPoints = () => {
    if (!steps) return [];
    const n = Math.min(steps.count, 60);
    const stepW = 1 / n;
    const stepH = 1 / n;
    let x = 0;
    let y = steps.pos === "start" ? stepH : 0;
    const pts = [{ x: px(0), y: py(0) }];
    for (let i = 0; i < n; i++) {
      const nextX = x + stepW;
      pts.push({ x: px(nextX), y: py(y) });
      x = nextX;
      y = Math.min(1, y + stepH);
      pts.push({ x: px(x), y: py(y) });
    }
    pts.push({ x: px(1), y: py(1) });
    return pts;
  };

  const { pathD, points, totalLen, show } = useMemo(() => {
    const d = steps ? buildStepsPath() : buildBezierPath();
    const pts = steps ? buildStepsPoints() : buildBezierPoints();
    const len = pts.reduce((acc, p, idx) => {
      if (idx === 0) return acc;
      const prev = pts[idx - 1];
      return acc + Math.hypot(p.x - prev.x, p.y - prev.y);
    }, 0);
    return { pathD: d, points: pts, totalLen: len, show: Boolean(d) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsed.easing]);

  useEffect(() => {
    if (!show) return;
    if (!points.length) return;

    const mq = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)");
    const reduce = mq ? mq.matches : false;
    if (reduce) {
      setProgress(1);
      return;
    }

    let raf = 0;
    const start = performance.now();
    const durationMs = 1400;
    setProgress(0);

    const tick = (now) => {
      const t = Math.min(1, Math.max(0, (now - start) / durationMs)); // 0..1 (1회만)
      setProgress(t);
      if (t < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [parsed.easing]); // easing 바뀔 때만 재생/초기화

  const idx = points.length ? Math.max(0, Math.min(points.length - 1, Math.floor(progress * (points.length - 1)))) : 0;
  const fixedX = w - pad;
  const dotY = points[idx]?.y ?? py(0);

  return (
    <div className="lab-easing-graph" aria-label="easing 그래프 미리보기">
      <svg className="lab-easing-graph-svg" viewBox={`0 0 ${w} ${h}`} role="img" aria-label="easing 곡선">
        <rect x="0" y="0" width={w} height={h} rx="10" className="lab-easing-graph-bg" />
        {/* grid */}
        {[0.25, 0.5, 0.75].map((t) => (
          <g key={t}>
            <line x1={px(t)} y1={pad} x2={px(t)} y2={h - pad} className="lab-easing-graph-grid" />
            <line x1={pad} y1={py(t)} x2={w - pad} y2={py(t)} className="lab-easing-graph-grid" />
          </g>
        ))}
        {/* axis */}
        <line x1={pad} y1={py(0)} x2={w - pad} y2={py(0)} className="lab-easing-graph-axis" />
        <line x1={px(0)} y1={pad} x2={px(0)} y2={h - pad} className="lab-easing-graph-axis" />

        {show ? (
          <>
            <path d={pathD} className="lab-easing-graph-line-bg" />
            <path
              d={pathD}
              className="lab-easing-graph-line"
              style={
                totalLen > 0
                  ? { strokeDasharray: `${totalLen} ${totalLen}`, strokeDashoffset: `${totalLen * (1 - progress)}` }
                  : undefined
              }
            />
            <circle cx={fixedX} cy={dotY} r="4.2" className="lab-easing-graph-dot" />
          </>
        ) : (
          <text x="50%" y="50%" textAnchor="middle" className="lab-easing-graph-empty">미리보기 없음</text>
        )}
      </svg>
    </div>
  );
}

function EasingField({ idPrefix, value, onChange, className = "" }) {
  const derivedUi = useMemo(() => deriveEaseUi(value), [value]);
  const [ui, setUi] = useState(() => derivedUi);

  useEffect(() => {
    // easing 문자열이 바뀌었을 때만(= duration/delay 변경과 무관) UI 동기화
    // Custom 모드라면 사용자가 입력 중일 수 있으니 강제 동기화하지 않음
    if (ui?.menuId !== "custom") setUi(derivedUi);
  }, [value]);

  const currentMenuId = ui?.menuId || "standard";

  return (
    <div className={`form-group${className ? ` ${className}` : ""}`}>
      <div className="form-tit lab-form-tit">
        <label htmlFor={`${idPrefix}-easing`}>easing</label>
        <span className="lab-form-tit-sub">가속도 느낌</span>
      </div>
      <div className="form-conts lab-ease-layout">
        <div className="lab-ease-left">
          <EasingGraph easing={value} />
        </div>

        <div className="lab-ease-right">
          <div className="lab-ease-menu" role="group" aria-label="easing 메뉴">
            {EASE_MENU.filter((x) => x.id !== "custom").map((item) => (
              <button
                key={item.id}
                type="button"
                className={`lab-ease-btn${currentMenuId === item.id ? " is-active" : ""}`}
                aria-pressed={currentMenuId === item.id ? "true" : "false"}
                onClick={() => {
                  const next = { menuId: item.id };
                  // typed 기본값(out)
                  if (item.kind === "typed") next.type = ui?.type || "out";
                  if (item.kind === "steps") {
                    next.stepsCount = ui?.stepsCount || 8;
                    next.stepsPos = ui?.stepsPos || "end";
                  }
                  setUi(next);
                  onChange(resolveEaseValue(next, value));
                }}
              >
                {item.label}
              </button>
            ))}
            <button
              type="button"
              className={`lab-ease-btn${currentMenuId === "custom" ? " is-active" : ""}`}
              aria-pressed={currentMenuId === "custom" ? "true" : "false"}
              onClick={() => setUi({ menuId: "custom" })}
            >
              Custom
            </button>
          </div>

          {/* typed 옵션(in/out/inOut) */}
          {(() => {
            const item = EASE_MENU.find((x) => x.id === currentMenuId);
            if (!item || item.kind !== "typed") return null;
            return (
              <div className="lab-ease-sub lab-mt-3">
                <label className="sr-only" htmlFor={`${idPrefix}-ease-type`}>easing 타입</label>
                <select
                  id={`${idPrefix}-ease-type`}
                  className="krds-input"
                  value={ui?.type || "out"}
                  onChange={(e) => {
                    const next = { ...ui, menuId: currentMenuId, type: e.target.value };
                    setUi(next);
                    onChange(resolveEaseValue(next, value));
                  }}
                  aria-label="easing in/out/inOut 선택"
                >
                  {EASE_TYPES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            );
          })()}

          {/* steps 옵션 */}
          {currentMenuId === "steps" ? (
            <div className="lab-ease-sub lab-mt-3">
              <div className="lab-ease-steps">
                <label className="sr-only" htmlFor={`${idPrefix}-steps-count`}>steps 개수</label>
                <select
                  id={`${idPrefix}-steps-count`}
                  className="krds-input"
                  value={ui?.stepsCount || 8}
                  onChange={(e) => {
                    const next = { ...ui, menuId: "steps", stepsCount: Number(e.target.value) };
                    setUi(next);
                    onChange(resolveEaseValue(next, value));
                  }}
                  aria-label="steps 개수 선택"
                >
                  {[2, 4, 6, 8, 12, 20].map((n) => (
                    <option key={n} value={n}>
                      steps({n})
                    </option>
                  ))}
                </select>

                <label className="sr-only" htmlFor={`${idPrefix}-steps-pos`}>steps 위치</label>
                <select
                  id={`${idPrefix}-steps-pos`}
                  className="krds-input"
                  value={ui?.stepsPos || "end"}
                  onChange={(e) => {
                    const next = { ...ui, menuId: "steps", stepsPos: e.target.value };
                    setUi(next);
                    onChange(resolveEaseValue(next, value));
                  }}
                  aria-label="steps start/end 선택"
                >
                  <option value="end">end</option>
                  <option value="start">start</option>
                </select>
              </div>
            </div>
          ) : null}

          {/* Custom 입력 */}
          {currentMenuId === "custom" ? (
            <div className="lab-ease-sub lab-mt-3">
              <input
                className="krds-input"
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder='예: cubic-bezier(0.2, 0.8, 0.2, 1)'
                aria-label="easing 문자열 입력"
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function clampNumber(n, min, max) {
  const v = Number.isFinite(n) ? n : min;
  return Math.min(max, Math.max(min, v));
}

function clampNumberOrEmpty(raw, min, max) {
  // 의도: <input type="number">에서 지우기(빈 문자열)를 허용해 “지우고 다시 쓰기” UX 개선
  if (raw === "") return "";
  return String(clampNumber(Number(raw), min, max));
}

function toClampedNumber(raw, fallback, min, max) {
  // raw: string | number | null | undefined
  // - ""(비어있음)은 사용자가 입력 중일 수 있으므로 fallback 사용
  if (raw === "" || raw === null || raw === undefined) return fallback;
  return clampNumber(Number(raw), min, max);
}

function normalizePlayCount(raw, fallback = 1) {
  const s = String(raw ?? "").trim().toLowerCase();
  if (!s) return fallback;
  if (s === "infinite") return "infinite";
  const n = Math.floor(Number(s));
  if (Number.isFinite(n) && n >= 1 && n <= 99) return n;
  return fallback;
}

function buildGeneratedJs(demoId, config) {
  const commonHowTo = `// 사용 방법
// - 이 코드는 “대상 요소가 DOM에 존재한 뒤” 실행되어야 합니다.
//   1) 가장 쉬운 방법: </body> 직전에 <script>로 붙여넣기
//   2) 파일로 분리할 경우: <script src="..." defer></script> 또는 DOMContentLoaded 이후 실행
//
// 왜 이렇게 하나요?
// - DOM 생성 전에 실행되면 querySelector가 대상을 못 찾아서 동작하지 않습니다.
//
// 시작 조건(트리거)
// - config.trigger.type 으로 제어합니다.
//   - "immediate": 즉시 재생
//   - "scroll": 뷰포트 진입 시 재생(IntersectionObserver)
//   - "click": 클릭 시 재생
`;

  if (demoId === "fade") {
    return `// 생성 코드 (Demo Fade)
${commonHowTo}
// 대상 요소: .is-fade
//
// 필요 조건(CSS)
// - .is-fade가 아래 CSS 변수를 사용해 애니메이션하도록 준비되어 있어야 합니다.
//   --lab-duration, --lab-delay, --lab-easing, --lab-x, --lab-y, --lab-opacity

(() => {
  const config = ${JSON.stringify(config, null, 2)};
  const trigger = config.trigger || { type: "immediate" };

  const resolveXY = (direction, distance) => {
    let d = Number(distance);
    if (!Number.isFinite(d)) d = 0;
    d = Math.abs(d);

    if (direction === "left") return { x: -d, y: 0 };
    if (direction === "right") return { x: d, y: 0 };
    if (direction === "top") return { x: 0, y: -d };
    return { x: 0, y: d }; // bottom
  };

  const apply = (el) => {
    const xy = resolveXY(config.direction || "bottom", config.distance || 0);

    el.style.setProperty("--lab-duration", (config.duration || 0) + "ms");
    el.style.setProperty("--lab-delay", (config.delay || 0) + "ms");
    el.style.setProperty("--lab-easing", config.easing || "ease");
    el.style.setProperty("--lab-x", (xy.x || 0) + "px");
    el.style.setProperty("--lab-y", (xy.y || 0) + "px");
    el.style.setProperty("--lab-opacity", String(config.opacity ?? 0));
  };

  const reset = (el) => {
    el.classList.remove("is-fade-animating");
    el.classList.add("is-fade-ready");
  };

  const play = (el) => {
    reset(el);
    // reflow로 animation 재시작 보장
    void el.offsetWidth;
    el.classList.add("is-fade-animating");
  };

  const init = () => {
    const target = document.querySelector(".is-fade");
    if (!target) {
      console.warn("[DemoFade] .is-fade 요소를 찾지 못했습니다.");
      return;
    }

    // 진입 전 상태를 잡아두고(특히 scroll/click 트리거), 트리거 시점에 play()
    apply(target);
    reset(target);

    const run = () => play(target);

    if (trigger.type === "scroll") {
      if (!("IntersectionObserver" in window)) {
        run();
        return;
      }
      const once = trigger.once !== false;
      const obs = new IntersectionObserver(
        (entries) => {
          const ent = entries && entries[0];
          if (!ent || !ent.isIntersecting) return;
          run();
          if (once) obs.disconnect();
        },
        {
          root: null,
          rootMargin: typeof trigger.rootMargin === "string" ? trigger.rootMargin : "0px 0px -10% 0px",
          threshold: typeof trigger.threshold === "number" ? trigger.threshold : 0.2
        }
      );
      obs.observe(target);
      return;
    }

    if (trigger.type === "click") {
      // 기본: 대상 요소 클릭 시 재생
      // 원하는 경우: trigger.selector에 버튼 선택자를 넣고, 아래를 querySelector로 바꾸면 됩니다.
      target.addEventListener("click", run);
      return;
    }

    // immediate
    run();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
`;
  }

  if (demoId === "scale") {
    return `// 생성 코드 (Demo Scale)
${commonHowTo}
// 대상 요소: .is-scale
//
// 필요 조건(CSS)
// - .is-scale이 아래 CSS 변수를 사용해 애니메이션하도록 준비되어 있어야 합니다.
//   --lab-duration, --lab-delay, --lab-easing, --lab-from-scale, --lab-opacity

(() => {
  const config = ${JSON.stringify(config, null, 2)};
  const trigger = config.trigger || { type: "immediate" };

  const apply = (el) => {
    el.style.setProperty("--lab-duration", (config.duration || 0) + "ms");
    el.style.setProperty("--lab-delay", (config.delay || 0) + "ms");
    el.style.setProperty("--lab-easing", config.easing || "ease");
    el.style.setProperty("--lab-from-scale", String(config.fromScale ?? 0.9));
    el.style.setProperty("--lab-opacity", String(config.opacity ?? 0));
  };

  const reset = (el) => {
    el.classList.remove("is-scale-animating");
    el.classList.add("is-scale-ready");
  };

  const play = (el) => {
    reset(el);
    // reflow로 animation 재시작 보장
    void el.offsetWidth;
    el.classList.add("is-scale-animating");
  };

  const init = () => {
    const target = document.querySelector(".is-scale");
    if (!target) {
      console.warn("[DemoScale] .is-scale 요소를 찾지 못했습니다.");
      return;
    }

    apply(target);
    reset(target);

    const run = () => play(target);

    if (trigger.type === "scroll") {
      if (!("IntersectionObserver" in window)) {
        run();
        return;
      }
      const once = trigger.once !== false;
      const obs = new IntersectionObserver(
        (entries) => {
          const ent = entries && entries[0];
          if (!ent || !ent.isIntersecting) return;
          run();
          if (once) obs.disconnect();
        },
        {
          root: null,
          rootMargin: typeof trigger.rootMargin === "string" ? trigger.rootMargin : "0px 0px -10% 0px",
          threshold: typeof trigger.threshold === "number" ? trigger.threshold : 0.2
        }
      );
      obs.observe(target);
      return;
    }

    if (trigger.type === "click") {
      target.addEventListener("click", run);
      return;
    }

    run();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
`;
  }

  if (demoId === "rotate") {
    return `// 생성 코드 (Demo Rotate)
${commonHowTo}
// 대상 요소: .is-rotate
//
// 필요 조건(CSS)
// - .is-rotate가 아래 CSS 변수를 사용해 애니메이션하도록 준비되어 있어야 합니다.
//   --lab-duration, --lab-delay, --lab-easing, --lab-from-rotate, --lab-opacity

(() => {
  const config = ${JSON.stringify(config, null, 2)};
  const trigger = config.trigger || { type: "immediate" };

  const apply = (el) => {
    el.style.setProperty("--lab-duration", (config.duration || 0) + "ms");
    el.style.setProperty("--lab-delay", (config.delay || 0) + "ms");
    el.style.setProperty("--lab-easing", config.easing || "ease");
    el.style.setProperty("--lab-from-rotate", (config.fromDeg || 0) + "deg");
    el.style.setProperty("--lab-opacity", String(config.opacity ?? 0));
  };

  const reset = (el) => {
    el.classList.remove("is-rotate-animating");
    el.classList.add("is-rotate-ready");
  };

  const play = (el) => {
    reset(el);
    // reflow로 animation 재시작 보장
    void el.offsetWidth;
    el.classList.add("is-rotate-animating");
  };

  const init = () => {
    const target = document.querySelector(".is-rotate");
    if (!target) {
      console.warn("[DemoRotate] .is-rotate 요소를 찾지 못했습니다.");
      return;
    }

    apply(target);
    reset(target);

    const run = () => play(target);

    if (trigger.type === "scroll") {
      if (!("IntersectionObserver" in window)) {
        run();
        return;
      }
      const once = trigger.once !== false;
      const obs = new IntersectionObserver(
        (entries) => {
          const ent = entries && entries[0];
          if (!ent || !ent.isIntersecting) return;
          run();
          if (once) obs.disconnect();
        },
        {
          root: null,
          rootMargin: typeof trigger.rootMargin === "string" ? trigger.rootMargin : "0px 0px -10% 0px",
          threshold: typeof trigger.threshold === "number" ? trigger.threshold : 0.2
        }
      );
      obs.observe(target);
      return;
    }

    if (trigger.type === "click") {
      target.addEventListener("click", run);
      return;
    }

    run();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
`;
  }

  return `// 생성 코드
// demoId: ${demoId}
// TODO: 준비 중
`;
}

function getDemoMenu() {
  const root = INTERACTION_LAB_MENU.interactionLab;
  return root.depth2.find((x) => x.id === "demo");
}

function buildInteractionEntryFromConfig(demoId, config) {
  const { trigger, ...vars } = config || {};
  const preset = demoId;
  const target =
    demoId === "fade" ? ".is-fade" : demoId === "scale" ? ".is-scale" : demoId === "rotate" ? ".is-rotate" : ".is-target";

  return {
    id: `lab-${demoId}`,
    preset,
    target,
    trigger: trigger || { type: "immediate" },
    vars
  };
}

function buildInteractionJsFromInteractions(interactions) {
  return `// assets/js/interaction.js
// - 여기에서 인터랙션 설정을 관리합니다.
// - 실행 엔진은 interaction-lab.runtime.js 입니다.

(() => {
  const interactions = ${JSON.stringify(interactions || [], null, 4)};

  if (!window.InteractionLab || typeof window.InteractionLab.init !== "function") {
    console.warn("[interaction.js] InteractionLab runtime을 찾지 못했습니다. interaction-lab.runtime.js 로드를 확인하세요.");
    return;
  }

  window.InteractionLab.init(interactions);
})();
`;
}

function buildInteractionJsonEmbedHtml(interactions) {
  // </script> 문자열이 들어오면 HTML 파서가 태그를 닫아버릴 수 있어 예방
  const safeJson = JSON.stringify(interactions || [], null, 2).replace(/<\/script>/gi, "</scr" + "ipt>");

  return `<!-- 1) 런타임(필수) -->
<script src="/assets/js/interaction-lab.runtime.js" defer></script>

<!-- 2) JSON 설정(필수): JSON만 넣어도 자동 실행됩니다 -->
<script type="application/json" data-interaction-lab>
${safeJson}
</script>
`;
}

export function DemoLabPage() {
  const demoMenu = getDemoMenu();
  const [searchParams, setSearchParams] = useSearchParams();

  const allItems = useMemo(() => {
    const list = [];
    for (const g of demoMenu?.groups || []) {
      for (const it of g.items || []) {
        list.push({ groupId: g.id, groupTitle: g.title, id: it.id, title: it.title });
      }
    }
    return list;
  }, [demoMenu]);

  const initialDemoId = searchParams.get("id") || "fade";
  const [demoId, setDemoId] = useState(initialDemoId);

  useEffect(() => {
    // URL ↔ state 동기화
    const urlId = searchParams.get("id") || "fade";
    if (urlId !== demoId) setDemoId(urlId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    setSearchParams({ id: demoId }, { replace: true });
  }, [demoId, setSearchParams]);

  const isImplemented = IMPLEMENTED_DEMO_IDS.has(demoId);

  const iframeRef = useRef(null);
  const readyRef = useRef(false);
  const pendingConfigRef = useRef(null);
  const latestConfigRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [exportTab, setExportTab] = useState("json"); // json | js
  const [exportAcc, setExportAcc] = useState({ jsonEmbed: false, howto: false, legacy: false });

  const [triggerOptions, setTriggerOptions] = useState({
    type: "immediate", // immediate | scroll | click
    once: true,
    scrollDirection: "both", // both | down | up
    threshold: 0.2,
    rootMargin: "0px 0px -10% 0px"
  });

  const [fadeOptions, setFadeOptions] = useState({
    direction: "bottom",
    duration: "600",
    delay: "0",
    playCount: "1",
    easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
    distance: "16",
    opacity: "0"
  });

  const [scaleOptions, setScaleOptions] = useState({
    duration: "600",
    delay: "0",
    playCount: "1",
    easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
    fromScale: "0.9",
    opacity: "0"
  });

  const [rotateOptions, setRotateOptions] = useState({
    duration: "600",
    delay: "0",
    playCount: "1",
    easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
    fromDeg: "-24",
    opacity: "0"
  });

  const config = useMemo(() => {
    if (demoId === "fade") {
      return {
        trigger: triggerOptions,
        direction: fadeOptions.direction,
        duration: toClampedNumber(fadeOptions.duration, 600, 0, 8000),
        delay: toClampedNumber(fadeOptions.delay, 0, 0, 8000),
        playCount: normalizePlayCount(fadeOptions.playCount, 1),
        easing: fadeOptions.easing,
        distance: toClampedNumber(fadeOptions.distance, 16, 0, 400),
        opacity: toClampedNumber(fadeOptions.opacity, 0, 0, 1)
      };
    }

    if (demoId === "scale") {
      return {
        trigger: triggerOptions,
        duration: toClampedNumber(scaleOptions.duration, 600, 0, 8000),
        delay: toClampedNumber(scaleOptions.delay, 0, 0, 8000),
        playCount: normalizePlayCount(scaleOptions.playCount, 1),
        easing: scaleOptions.easing,
        fromScale: toClampedNumber(scaleOptions.fromScale, 0.9, 0.05, 3),
        opacity: toClampedNumber(scaleOptions.opacity, 0, 0, 1)
      };
    }

    if (demoId === "rotate") {
      return {
        trigger: triggerOptions,
        duration: toClampedNumber(rotateOptions.duration, 600, 0, 8000),
        delay: toClampedNumber(rotateOptions.delay, 0, 0, 8000),
        playCount: normalizePlayCount(rotateOptions.playCount, 1),
        easing: rotateOptions.easing,
        fromDeg: toClampedNumber(rotateOptions.fromDeg, -24, -720, 720),
        opacity: toClampedNumber(rotateOptions.opacity, 0, 0, 1)
      };
    }

    return {};
  }, [demoId, triggerOptions, fadeOptions, scaleOptions, rotateOptions]);

  // 렌더 시점에 최신 config를 ref로 보관(iframe onLoad 등 “effect 이전” 타이밍에서도 최신값 접근)
  latestConfigRef.current = config;

  const exportJson = useMemo(
    () => ({
      demoId,
      type: "demo",
      engine: "vanilla",
      config,
      exportedAt: new Date().toISOString()
    }),
    [demoId, config]
  );

  const generatedJs = useMemo(() => buildGeneratedJs(demoId, config), [demoId, config]);

  const interactionEntry = useMemo(() => {
    return buildInteractionEntryFromConfig(demoId, config);
  }, [demoId, config]);

  const exportInteractionJs = useMemo(() => {
    return buildInteractionJsFromInteractions([interactionEntry]);
  }, [interactionEntry]);

  const exportInteractionJsonEmbedHtml = useMemo(() => {
    return buildInteractionJsonEmbedHtml([interactionEntry]);
  }, [interactionEntry]);

  const exportScriptTags = useMemo(() => {
    return `<!-- 예시: common.js / main.js 같은 흐름에 추가 -->\n<script src=\"/assets/js/common.js\" defer></script>\n<script src=\"/assets/js/interaction-lab.runtime.js\" defer></script>\n<script src=\"/assets/js/interaction.js\" defer></script>\n`;
  }, []);

  const previewUrl = `/content/demos/${demoId}/preview.html`;

  const postConfig = (cfg) => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    // sandbox 환경/호스트 차이에서도 안정적으로 전달되도록 targetOrigin은 "*" 사용
    win.postMessage({ type: "LAB_CONFIG_UPDATE", payload: cfg }, "*");
  };

  // 메시지 핸들러(페이지 단위) + clean-up
  useEffect(() => {
    const onMessage = (e) => {
      const data = e?.data;
      if (!data || typeof data !== "object") return;
      // sandbox 설정에 따라 origin이 "null"일 수 있음(최소 필터: same-origin 또는 null)
      if (e.origin !== window.location.origin && e.origin !== "null") return;
      // 같은 iframe에서 온 메시지만 처리(페이지 내 iframe 1개 기준)
      if (e.source && e.source !== iframeRef.current?.contentWindow) return;

      if (data.type === "LAB_READY") {
        readyRef.current = true;
        setReady(true);
        setErrorMsg("");

        if (pendingConfigRef.current) {
          postConfig(pendingConfigRef.current);
          pendingConfigRef.current = null;
        } else {
          postConfig(latestConfigRef.current || {});
        }
      } else if (data.type === "LAB_ERROR") {
        const msg = data.payload?.message ? String(data.payload.message) : "미상 오류";
        setErrorMsg(msg);
      }
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  // demoId 바뀌면 READY/큐 초기화 (iframe도 key로 리마운트)
  useEffect(() => {
    readyRef.current = false;
    setReady(false);
    setErrorMsg("");
    pendingConfigRef.current = latestConfigRef.current || config;
  }, [demoId]);

  // config 변경 → READY 전엔 큐잉, READY 후 즉시 전송
  useEffect(() => {
    if (!isImplemented) return;
    if (!readyRef.current) {
      pendingConfigRef.current = config;
      return;
    }
    postConfig(config);
  }, [isImplemented, config]);

  const setFade = (patch) => setFadeOptions((p) => ({ ...p, ...patch }));
  const setScale = (patch) => setScaleOptions((p) => ({ ...p, ...patch }));
  const setRotate = (patch) => setRotateOptions((p) => ({ ...p, ...patch }));
  const setTrigger = (patch) => setTriggerOptions((p) => ({ ...p, ...patch }));

  return (
    <div className="app-page">
      <div className="page-title-wrap">
        <h1 className="h-tit">
          Demo <span className="badge-text">Preview</span>
        </h1>
      </div>

      <div className="lab-stack">
        <section aria-label="프리뷰">
          <h2 className="sec-tit">Preview</h2>
          <div className="lab-preview-frame">
            {isImplemented ? (
              <iframe
                key={demoId}
                ref={iframeRef}
                title="Demo 프리뷰"
                src={previewUrl}
                sandbox="allow-scripts allow-same-origin"
                onLoad={() => {
                  // iframe 로드 시점을 “준비됨”으로 간주(실제로는 preview.js 리스너가 이때 준비되는 편)
                  // READY 메시지가 누락되어도 컨트롤 변경이 정상 반영되도록 보정
                  readyRef.current = true;
                  setReady(true);
                  setErrorMsg("");

                  const payload = pendingConfigRef.current || latestConfigRef.current || {};
                  postConfig(payload);
                  pendingConfigRef.current = null;
                }}
                className={`lab-preview-iframe${triggerOptions.type === "scroll" ? " is-tall" : ""}`}
              />
            ) : (
              <div className="g-info-box">
                <p className="g-desc">이 Demo는 아직 준비 중입니다.</p>
              </div>
            )}
          </div>
          {isImplemented && !ready ? <p className="g-desc lab-mt-3">프리뷰 로딩 중…</p> : null}
          {errorMsg ? (
            <div className="g-info-box lab-mt-3">
              <p className="g-desc"><strong>프리뷰 오류</strong>: {errorMsg}</p>
            </div>
          ) : null}
        </section>

        <section aria-label="컨트롤" className="lab-mt-6">
          <h2 className="sec-tit">Controls</h2>
          <form className="fieldset" onSubmit={(e) => e.preventDefault()}>
              <div className="form-group">
                <div className="form-tit lab-form-tit">
                  <label htmlFor="demo-select">데모 선택</label>
                  <span className="lab-form-tit-sub">현재 실험할 항목</span>
                </div>
                <div className="form-conts">
                  <select
                    id="demo-select"
                    className="krds-input"
                    value={demoId}
                    onChange={(e) => setDemoId(e.target.value)}
                  >
                    {demoMenu?.groups?.map((g) => (
                      <optgroup key={g.id} label={g.title}>
                        {(g.items || []).map((it) => (
                          <option key={it.id} value={it.id}>
                            {it.title}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group lab-span-2">
                <div className="form-tit lab-form-tit">
                  <label htmlFor="trigger-type">시작 조건</label>
                  <span className="lab-form-tit-sub">어느 시점에 재생?</span>
                </div>
                <div className="form-conts">
                  <select
                    id="trigger-type"
                    className="krds-input"
                    value={triggerOptions.type}
                    onChange={(e) => setTrigger({ type: e.target.value })}
                    aria-label="애니메이션 시작 조건 선택"
                  >
                    <option value="immediate">페이지 로드 후</option>
                    <option value="scroll">스크롤 진입 시</option>
                    <option value="click">대상 클릭 시</option>
                  </select>
                </div>
                {triggerOptions.type === "scroll" ? (
                  <div className="lab-ease-sub lab-mt-3">
                    <div className="lab-trigger-row">
                      <div className="lab-trigger-field">
                        <label className="sr-only" htmlFor="trigger-threshold">진입 감도</label>
                        <select
                          id="trigger-threshold"
                          className="krds-input"
                          value={String(triggerOptions.threshold)}
                          onChange={(e) => setTrigger({ threshold: Number(e.target.value) })}
                          aria-label="진입 감도(얼마나 보이면 시작?) 선택"
                        >
                          <option value="0">보이기 시작하면</option>
                          <option value="0.1">10% 보이면</option>
                          <option value="0.2">20% 보이면</option>
                          <option value="0.25">25% 보이면</option>
                          <option value="0.5">절반(50%) 보이면</option>
                          <option value="0.75">75% 보이면</option>
                          <option value="1">전부(100%) 보이면</option>
                        </select>
                      </div>
                      <div className="lab-trigger-field is-grow">
                        <label className="sr-only" htmlFor="trigger-root-margin">rootMargin</label>
                        <input
                          id="trigger-root-margin"
                          className="krds-input"
                          type="text"
                          value={triggerOptions.rootMargin}
                          onChange={(e) => setTrigger({ rootMargin: e.target.value })}
                          aria-label="IntersectionObserver rootMargin 입력"
                          placeholder='예: 0px 0px -10% 0px'
                        />
                      </div>
                      <div className="lab-trigger-field">
                        <label className="sr-only" htmlFor="trigger-scroll-direction">scrollDirection</label>
                        <select
                          id="trigger-scroll-direction"
                          className="krds-input"
                          value={triggerOptions.scrollDirection}
                          onChange={(e) => setTrigger({ scrollDirection: e.target.value })}
                          aria-label="스크롤 방향 조건 선택"
                        >
                          <option value="both">방향 무관</option>
                          <option value="down">위 → 아래 스크롤</option>
                          <option value="up">아래 → 위 스크롤</option>
                        </select>
                      </div>
                      <div className="lab-trigger-field">
                        <label className="sr-only" htmlFor="trigger-once">once</label>
                        <select
                          id="trigger-once"
                          className="krds-input"
                          value={triggerOptions.once ? "true" : "false"}
                          onChange={(e) => setTrigger({ once: e.target.value === "true" })}
                          aria-label="한 번만 재생 여부 선택"
                        >
                          <option value="true">한 번만</option>
                          <option value="false">진입마다</option>
                        </select>
                      </div>
                    </div>
                    <p className="form-hint lab-mt-2">
                      “진입 감도”는 대상 요소가 화면에 몇 % 들어왔을 때 시작할지입니다. (예: 20% 보이면 시작)
                    </p>
                  </div>
                ) : triggerOptions.type === "click" ? (
                  <p className="form-hint lab-mt-2">
                    클릭 트리거는 기본적으로 대상 요소를 클릭했을 때 재생됩니다. (원하면 코드에서 버튼 selector로 바꿀 수 있어요)
                  </p>
                ) : null}
              </div>

              {demoId === "fade" ? (
                <>
                  <div className="form-group">
                    <div className="form-tit lab-form-tit">
                      <label htmlFor="fade-direction">Direction</label>
                    </div>
                    <div className="form-conts">
                      <select
                        id="fade-direction"
                        className="krds-input"
                        value={fadeOptions.direction}
                        onChange={(e) => setFade({ direction: e.target.value })}
                        aria-label="Select fade direction"
                      >
                        <option value="bottom">Bottom → Up</option>
                        <option value="top">Top → Down</option>
                        <option value="left">Left → Right</option>
                        <option value="right">Right → Left</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <div className="form-tit lab-form-tit">
                      <label htmlFor="fade-duration">duration (ms)</label>
                      <span className="lab-form-tit-sub">재생 시간</span>
                    </div>
                    <div className="form-conts">
                      <input
                        id="fade-duration"
                        className="krds-input"
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={8000}
                        value={fadeOptions.duration}
                        onChange={(e) => setFade({ duration: clampNumberOrEmpty(e.target.value, 0, 8000) })}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <div className="form-tit lab-form-tit">
                      <label htmlFor="fade-delay">delay (ms)</label>
                      <span className="lab-form-tit-sub">시작 지연</span>
                    </div>
                    <div className="form-conts">
                      <input
                        id="fade-delay"
                        className="krds-input"
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={8000}
                        value={fadeOptions.delay}
                        onChange={(e) => setFade({ delay: clampNumberOrEmpty(e.target.value, 0, 8000) })}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <div className="form-tit lab-form-tit">
                      <label htmlFor="fade-play-count">playCount</label>
                      <span className="lab-form-tit-sub">재생(실행) 횟수</span>
                    </div>
                    <div className="form-conts">
                      <select
                        id="fade-play-count"
                        className="krds-input"
                        value={String(fadeOptions.playCount)}
                        onChange={(e) => setFade({ playCount: e.target.value })}
                        aria-label="재생(실행) 횟수 선택"
                      >
                        {[1, 2, 3, 5].map((n) => (
                          <option key={n} value={String(n)}>
                            {n}회
                          </option>
                        ))}
                        <option value="infinite">무한</option>
                      </select>
                    </div>
                  </div>

                  <EasingField
                    idPrefix="fade"
                    value={fadeOptions.easing}
                    onChange={(next) => setFade({ easing: next })}
                    className="lab-span-2"
                  />

                  <div className="form-group">
                    <div className="form-tit lab-form-tit">
                      <label htmlFor="fade-distance">distance (px)</label>
                      <span className="lab-form-tit-sub">이동 거리</span>
                    </div>
                    <div className="form-conts">
                      <input
                        id="fade-distance"
                        className="krds-input"
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={400}
                        value={fadeOptions.distance}
                        onChange={(e) => setFade({ distance: clampNumberOrEmpty(e.target.value, 0, 400) })}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <div className="form-tit lab-form-tit">
                      <label htmlFor="fade-opacity">opacity (from)</label>
                      <span className="lab-form-tit-sub">시작 투명도</span>
                    </div>
                    <div className="form-conts">
                      <input
                        id="fade-opacity"
                        className="krds-input"
                        type="number"
                        step="0.05"
                        min={0}
                        max={1}
                        value={fadeOptions.opacity}
                        onChange={(e) => setFade({ opacity: clampNumberOrEmpty(e.target.value, 0, 1) })}
                      />
                    </div>
                  </div>
                </>
              ) : demoId === "scale" ? (
                <>
                  <div className="form-group">
                    <div className="form-tit lab-form-tit">
                      <label htmlFor="scale-duration">duration (ms)</label>
                      <span className="lab-form-tit-sub">재생 시간</span>
                    </div>
                    <div className="form-conts">
                      <input
                        id="scale-duration"
                        className="krds-input"
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={8000}
                        value={scaleOptions.duration}
                        onChange={(e) => setScale({ duration: clampNumberOrEmpty(e.target.value, 0, 8000) })}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <div className="form-tit lab-form-tit">
                      <label htmlFor="scale-delay">delay (ms)</label>
                      <span className="lab-form-tit-sub">시작 지연</span>
                    </div>
                    <div className="form-conts">
                      <input
                        id="scale-delay"
                        className="krds-input"
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={8000}
                        value={scaleOptions.delay}
                        onChange={(e) => setScale({ delay: clampNumberOrEmpty(e.target.value, 0, 8000) })}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <div className="form-tit lab-form-tit">
                      <label htmlFor="scale-play-count">playCount</label>
                      <span className="lab-form-tit-sub">재생(실행) 횟수</span>
                    </div>
                    <div className="form-conts">
                      <select
                        id="scale-play-count"
                        className="krds-input"
                        value={String(scaleOptions.playCount)}
                        onChange={(e) => setScale({ playCount: e.target.value })}
                        aria-label="재생(실행) 횟수 선택"
                      >
                        {[1, 2, 3, 5].map((n) => (
                          <option key={n} value={String(n)}>
                            {n}회
                          </option>
                        ))}
                        <option value="infinite">무한</option>
                      </select>
                    </div>
                  </div>

                  <EasingField
                    idPrefix="scale"
                    value={scaleOptions.easing}
                    onChange={(next) => setScale({ easing: next })}
                    className="lab-span-2"
                  />

                  <div className="form-group">
                    <div className="form-tit lab-form-tit">
                      <label htmlFor="scale-from">fromScale</label>
                      <span className="lab-form-tit-sub">시작 크기</span>
                    </div>
                    <div className="form-conts">
                      <input
                        id="scale-from"
                        className="krds-input"
                        type="number"
                        step="0.05"
                        min={0.05}
                        max={3}
                        value={scaleOptions.fromScale}
                        onChange={(e) => setScale({ fromScale: clampNumberOrEmpty(e.target.value, 0.05, 3) })}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <div className="form-tit lab-form-tit">
                      <label htmlFor="scale-opacity">opacity (from)</label>
                      <span className="lab-form-tit-sub">시작 투명도</span>
                    </div>
                    <div className="form-conts">
                      <input
                        id="scale-opacity"
                        className="krds-input"
                        type="number"
                        step="0.05"
                        min={0}
                        max={1}
                        value={scaleOptions.opacity}
                        onChange={(e) => setScale({ opacity: clampNumberOrEmpty(e.target.value, 0, 1) })}
                      />
                    </div>
                  </div>
                </>
              ) : demoId === "rotate" ? (
                <>
                  <div className="form-group">
                    <div className="form-tit lab-form-tit">
                      <label htmlFor="rotate-duration">duration (ms)</label>
                      <span className="lab-form-tit-sub">재생 시간</span>
                    </div>
                    <div className="form-conts">
                      <input
                        id="rotate-duration"
                        className="krds-input"
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={8000}
                        value={rotateOptions.duration}
                        onChange={(e) => setRotate({ duration: clampNumberOrEmpty(e.target.value, 0, 8000) })}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <div className="form-tit lab-form-tit">
                      <label htmlFor="rotate-delay">delay (ms)</label>
                      <span className="lab-form-tit-sub">시작 지연</span>
                    </div>
                    <div className="form-conts">
                      <input
                        id="rotate-delay"
                        className="krds-input"
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={8000}
                        value={rotateOptions.delay}
                        onChange={(e) => setRotate({ delay: clampNumberOrEmpty(e.target.value, 0, 8000) })}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <div className="form-tit lab-form-tit">
                      <label htmlFor="rotate-play-count">playCount</label>
                      <span className="lab-form-tit-sub">재생(실행) 횟수</span>
                    </div>
                    <div className="form-conts">
                      <select
                        id="rotate-play-count"
                        className="krds-input"
                        value={String(rotateOptions.playCount)}
                        onChange={(e) => setRotate({ playCount: e.target.value })}
                        aria-label="재생(실행) 횟수 선택"
                      >
                        {[1, 2, 3, 5].map((n) => (
                          <option key={n} value={String(n)}>
                            {n}회
                          </option>
                        ))}
                        <option value="infinite">무한</option>
                      </select>
                    </div>
                  </div>

                  <EasingField
                    idPrefix="rotate"
                    value={rotateOptions.easing}
                    onChange={(next) => setRotate({ easing: next })}
                    className="lab-span-2"
                  />

                  <div className="form-group">
                    <div className="form-tit lab-form-tit">
                      <label htmlFor="rotate-from">fromDeg</label>
                      <span className="lab-form-tit-sub">시작 각도</span>
                    </div>
                    <div className="form-conts">
                      <input
                        id="rotate-from"
                        className="krds-input"
                        type="number"
                        inputMode="numeric"
                        min={-720}
                        max={720}
                        value={rotateOptions.fromDeg}
                        onChange={(e) => setRotate({ fromDeg: clampNumberOrEmpty(e.target.value, -720, 720) })}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <div className="form-tit lab-form-tit">
                      <label htmlFor="rotate-opacity">opacity (from)</label>
                      <span className="lab-form-tit-sub">시작 투명도</span>
                    </div>
                    <div className="form-conts">
                      <input
                        id="rotate-opacity"
                        className="krds-input"
                        type="number"
                        step="0.05"
                        min={0}
                        max={1}
                        value={rotateOptions.opacity}
                        onChange={(e) => setRotate({ opacity: clampNumberOrEmpty(e.target.value, 0, 1) })}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <p className="g-desc">이 데모는 아직 준비 중입니다.</p>
              )}
          </form>
        </section>

        <section aria-label="내보내기" className="lab-mt-6">
          <h2 className="sec-tit">Export</h2>
          <div className="krds-tab-area layer lab-export-tabs">
            <div className="tab line full">
              <ul role="tablist" aria-label="내보내기 형식">
                <li
                  id="export-tab-json"
                  role="tab"
                  aria-selected={exportTab === "json" ? "true" : "false"}
                  aria-controls="export-panel-json"
                  className={exportTab === "json" ? "active" : undefined}
                >
                  <button type="button" className="btn-tab" onClick={() => setExportTab("json")}>
                    JSON
                    {exportTab === "json" ? <i className="sr-only created"> 선택됨</i> : null}
                  </button>
                </li>
                <li
                  id="export-tab-js"
                  role="tab"
                  aria-selected={exportTab === "js" ? "true" : "false"}
                  aria-controls="export-panel-js"
                  className={exportTab === "js" ? "active" : undefined}
                >
                  <button type="button" className="btn-tab" onClick={() => setExportTab("js")}>
                    JS
                    {exportTab === "js" ? <i className="sr-only created"> 선택됨</i> : null}
                  </button>
                </li>
              </ul>
            </div>

            <div className="tab-conts-wrap">
              <section
                id="export-panel-json"
                aria-labelledby="export-tab-json"
                className={`tab-conts${exportTab === "json" ? " active" : ""}`}
                data-quick-nav="false"
                hidden={exportTab !== "json"}
              >
                <h3 className="sr-only">Export JSON</h3>
                <CodeBlock lang="json" code={JSON.stringify(interactionEntry, null, 2)} />
              </section>

              <section
                id="export-panel-js"
                aria-labelledby="export-tab-js"
                className={`tab-conts${exportTab === "js" ? " active" : ""}`}
                data-quick-nav="false"
                hidden={exportTab !== "js"}
              >
                <h3 className="sr-only">Export JS</h3>
                <CodeBlock lang="js" code={exportInteractionJs} />
                <div className="krds-accordion lab-export-acc lab-mt-3">
                  <div className="accordion-item">
                    <h5 className="accordion-header">
                      <button
                        type="button"
                        id="accordionHeaderExport00"
                        className="btn-accordion"
                        aria-controls="accordionCollapseExport00"
                        aria-expanded={exportAcc.jsonEmbed ? "true" : "false"}
                        onClick={() => setExportAcc((p) => ({ ...p, jsonEmbed: !p.jsonEmbed }))}
                      >
                        추천: JSON만 넣고 자동 실행(HTML 스니펫)
                      </button>
                    </h5>
                    <div
                      id="accordionCollapseExport00"
                      className={`accordion-collapse collapse${exportAcc.jsonEmbed ? " show" : ""}`}
                      aria-labelledby="accordionHeaderExport00"
                      hidden={!exportAcc.jsonEmbed}
                    >
                      <div className="accordion-body">
                        <CodeBlock lang="html" code={exportInteractionJsonEmbedHtml} />
                      </div>
                    </div>
                  </div>

                  <div className="accordion-item">
                    <h5 className="accordion-header">
                      <button
                        type="button"
                        id="accordionHeaderExport01"
                        className="btn-accordion"
                        aria-controls="accordionCollapseExport01"
                        aria-expanded={exportAcc.howto ? "true" : "false"}
                        onClick={() => setExportAcc((p) => ({ ...p, howto: !p.howto }))}
                      >
                        스크립트 로드 예시
                      </button>
                    </h5>
                    <div
                      id="accordionCollapseExport01"
                      className={`accordion-collapse collapse${exportAcc.howto ? " show" : ""}`}
                      aria-labelledby="accordionHeaderExport01"
                      hidden={!exportAcc.howto}
                    >
                      <div className="accordion-body">
                        <CodeBlock lang="html" code={exportScriptTags} />
                      </div>
                    </div>
                  </div>

                  <div className="accordion-item">
                    <h5 className="accordion-header">
                      <button
                        type="button"
                        id="accordionHeaderExport02"
                        className="btn-accordion"
                        aria-controls="accordionCollapseExport02"
                        aria-expanded={exportAcc.legacy ? "true" : "false"}
                        onClick={() => setExportAcc((p) => ({ ...p, legacy: !p.legacy }))}
                      >
                        구버전: 단일 실행 JS(직접 실행)
                      </button>
                    </h5>
                    <div
                      id="accordionCollapseExport02"
                      className={`accordion-collapse collapse${exportAcc.legacy ? " show" : ""}`}
                      aria-labelledby="accordionHeaderExport02"
                      hidden={!exportAcc.legacy}
                    >
                      <div className="accordion-body">
                        <CodeBlock lang="js" code={generatedJs} />
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

