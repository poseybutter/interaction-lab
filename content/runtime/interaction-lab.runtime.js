/*!
 * Interaction Lab Runtime (MVP)
 * - 퍼블리셔는 interaction.js에서 설정만 관리
 * - 이 파일은 실행 엔진(트리거/재생/변수 적용)을 담당
 *
 * 지원 preset(MVP): fade, scale, rotate
 * 지원 trigger.type: immediate | scroll | click
 */

(() => {
  const VERSION = "0.2.0";

  const isBrowser = typeof window !== "undefined" && typeof document !== "undefined";
  if (!isBrowser) return;

  const state = {
    cleanups: []
  };

  const toArray = (x) => (Array.isArray(x) ? x : x ? [x] : []);

  const parseJsonSafe = (raw) => {
    try {
      return { ok: true, data: JSON.parse(String(raw || "").trim()) };
    } catch (e) {
      return { ok: false, data: null, error: e };
    }
  };

  const normalizeInteractions = (data) => {
    // 지원 포맷:
    // 1) 배열: [{...}, {...}]
    // 2) 단일 엔트리: { preset, target, trigger, vars, ... }
    // 3) 래핑: { interactions: [...] }
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (typeof data === "object" && Array.isArray(data.interactions)) return data.interactions;
    if (typeof data === "object" && data.preset && data.target) return [data];
    return [];
  };

  const qsAll = (selector, root = document) => {
    try {
      return Array.from(root.querySelectorAll(selector));
    } catch {
      return [];
    }
  };

  const forceReflow = (el) => {
    // eslint-disable-next-line no-unused-expressions
    el && el.offsetWidth;
  };

  const setVars = (el, vars) => {
    if (!el || !vars || typeof vars !== "object") return;
    for (const [k, v] of Object.entries(vars)) {
      if (v === undefined) continue;
      el.style.setProperty(`--lab-${k.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}`, String(v));
    }
  };

  const normalizePlayCount = (raw) => {
    const s = String(raw ?? "").trim().toLowerCase();
    if (!s) return "1";
    if (s === "infinite") return "infinite";
    const n = Math.floor(Number(s));
    if (Number.isFinite(n) && n >= 1 && n <= 99) return String(n);
    return "1";
  };

  const resolveFadeXY = (direction, distance) => {
    let d = Number(distance);
    if (!Number.isFinite(d)) d = 0;
    d = Math.abs(d);
    if (direction === "left") return { x: -d, y: 0 };
    if (direction === "right") return { x: d, y: 0 };
    if (direction === "top") return { x: 0, y: -d };
    return { x: 0, y: d }; // bottom
  };

  const PRESETS = {
    fade: {
      targetClass: "is-fade",
      readyClass: "is-fade-ready",
      animClass: "is-fade-animating",
      apply: (el, vars) => {
        const dir = vars?.direction || "bottom";
        const dist = vars?.distance ?? 0;
        const xy = resolveFadeXY(dir, dist);
        el.style.setProperty("--lab-x", `${xy.x || 0}px`);
        el.style.setProperty("--lab-y", `${xy.y || 0}px`);

        // 나머지는 공통 이름으로 유지
        el.style.setProperty("--lab-duration", `${Number(vars?.duration || 0)}ms`);
        el.style.setProperty("--lab-delay", `${Number(vars?.delay || 0)}ms`);
        // playCount 우선, 없으면 iterations(하위 호환)
        el.style.setProperty("--lab-play-count", normalizePlayCount(vars?.playCount ?? vars?.iterations));
        el.style.setProperty("--lab-easing", String(vars?.easing || "ease"));
        el.style.setProperty("--lab-opacity", String(vars?.opacity ?? 0));
      }
    },
    scale: {
      targetClass: "is-scale",
      readyClass: "is-scale-ready",
      animClass: "is-scale-animating",
      apply: (el, vars) => {
        el.style.setProperty("--lab-duration", `${Number(vars?.duration || 0)}ms`);
        el.style.setProperty("--lab-delay", `${Number(vars?.delay || 0)}ms`);
        el.style.setProperty("--lab-play-count", normalizePlayCount(vars?.playCount ?? vars?.iterations));
        el.style.setProperty("--lab-easing", String(vars?.easing || "ease"));
        el.style.setProperty("--lab-from-scale", String(vars?.fromScale ?? 0.9));
        el.style.setProperty("--lab-opacity", String(vars?.opacity ?? 0));
      }
    },
    rotate: {
      targetClass: "is-rotate",
      readyClass: "is-rotate-ready",
      animClass: "is-rotate-animating",
      apply: (el, vars) => {
        el.style.setProperty("--lab-duration", `${Number(vars?.duration || 0)}ms`);
        el.style.setProperty("--lab-delay", `${Number(vars?.delay || 0)}ms`);
        el.style.setProperty("--lab-play-count", normalizePlayCount(vars?.playCount ?? vars?.iterations));
        el.style.setProperty("--lab-easing", String(vars?.easing || "ease"));
        el.style.setProperty("--lab-from-rotate", `${Number(vars?.fromDeg || 0)}deg`);
        el.style.setProperty("--lab-opacity", String(vars?.opacity ?? 0));
      }
    }
  };

  const reset = (preset, el) => {
    if (!preset || !el) return;
    el.classList.remove(preset.animClass);
    el.classList.add(preset.readyClass);
  };

  const play = (preset, el) => {
    if (!preset || !el) return;
    reset(preset, el);
    forceReflow(el);
    el.classList.add(preset.animClass);
  };

  const normalizeTrigger = (trigger) => {
    const t = trigger && typeof trigger === "object" ? trigger : {};
    const type = t.type === "scroll" || t.type === "click" || t.type === "immediate" ? t.type : "immediate";
    const scrollDirection =
      t.scrollDirection === "down" || t.scrollDirection === "up" || t.scrollDirection === "both" ? t.scrollDirection : "both";
    return {
      type,
      once: t.once !== false,
      scrollDirection,
      threshold: typeof t.threshold === "number" ? t.threshold : 0.2,
      rootMargin: typeof t.rootMargin === "string" ? t.rootMargin : "0px 0px -10% 0px",
      // click: selector가 있으면 그 요소를 클릭했을 때 실행
      selector: typeof t.selector === "string" ? t.selector : ""
    };
  };

  const attachTrigger = ({ preset, el, trigger, run }) => {
    const t = normalizeTrigger(trigger);

    if (t.type === "immediate") {
      run();
      return () => {};
    }

    if (t.type === "click") {
      const clickTarget = t.selector ? document.querySelector(t.selector) : el;
      if (!clickTarget) {
        run();
        return () => {};
      }
      const onClick = () => run();
      clickTarget.addEventListener("click", onClick);
      return () => clickTarget.removeEventListener("click", onClick);
    }

    // scroll
    if (!("IntersectionObserver" in window)) {
      run();
      return () => {};
    }

    let lastY = window.scrollY || 0;
    let dir = "both";
    const onScroll = () => {
      const y = window.scrollY || 0;
      dir = y > lastY ? "down" : y < lastY ? "up" : dir;
      lastY = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    let inView = false;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const ent of entries || []) {
          if (!ent.isIntersecting) {
            inView = false;
            continue;
          }
          if (inView) continue;
          // 방향 조건
          if (t.scrollDirection !== "both" && dir !== t.scrollDirection) continue;
          inView = true;
          run();
          if (t.once) obs.unobserve(ent.target);
        }
      },
      { root: null, rootMargin: t.rootMargin, threshold: t.threshold }
    );

    obs.observe(el);
    return () => {
      try {
        obs.disconnect();
      } catch {
        // noop
      }
      try {
        window.removeEventListener("scroll", onScroll);
      } catch {
        // noop
      }
    };
  };

  const init = (entries = []) => {
    const list = toArray(entries);
    const localCleanups = [];

    for (const entry of list) {
      const presetId = String(entry?.preset || "").trim();
      const preset = PRESETS[presetId];
      if (!preset) {
        console.warn(`[InteractionLab] 지원하지 않는 preset: ${presetId}`);
        continue;
      }

      const targetSel = String(entry?.target || "").trim() || `.${preset.targetClass}`;
      const targets = qsAll(targetSel);
      if (!targets.length) {
        console.warn(`[InteractionLab] target을 찾지 못했습니다: ${targetSel}`);
        continue;
      }

      for (const el of targets) {
        // 초기 상태: 변수 적용 + ready 상태로 고정
        try {
          preset.apply(el, entry?.vars || {});
          reset(preset, el);
        } catch (e) {
          console.warn("[InteractionLab] 초기화 실패:", e);
        }

        const cleanup = attachTrigger({
          preset,
          el,
          trigger: entry?.trigger,
          run: () => {
            try {
              preset.apply(el, entry?.vars || {});
              play(preset, el);
            } catch (e) {
              console.warn("[InteractionLab] 재생 실패:", e);
            }
          }
        });

        localCleanups.push(cleanup);
      }
    }

    const destroy = () => {
      for (const fn of localCleanups.splice(0)) {
        try {
          fn && fn();
        } catch {
          // noop
        }
      }
    };

    state.cleanups.push(destroy);
    return destroy;
  };

  const destroyAll = () => {
    for (const fn of state.cleanups.splice(0)) {
      try {
        fn && fn();
      } catch {
        // noop
      }
    }
  };

  const initFromJson = (jsonLike, options = {}) => {
    // jsonLike: string | object | array
    // options.destroyBeforeInit: 기본 true
    const destroyBeforeInit = options.destroyBeforeInit !== false;
    if (destroyBeforeInit) destroyAll();

    const data = typeof jsonLike === "string" ? parseJsonSafe(jsonLike) : { ok: true, data: jsonLike };
    if (!data.ok) {
      console.warn("[InteractionLab] JSON 파싱 실패:", data.error);
      return () => {};
    }

    const interactions = normalizeInteractions(data.data);
    if (!interactions.length) {
      console.warn("[InteractionLab] interactions를 찾지 못했습니다. (배열 / {interactions} / 단일 엔트리만 지원)");
      return () => {};
    }

    return init(interactions);
  };

  const initFromDom = (options = {}) => {
    // 퍼블리셔 사용 예:
    // <script type="application/json" data-interaction-lab>
    //   [{...}, {...}]
    // </script>
    //
    // 또는:
    // <script type="application/json" id="interaction-lab">
    //   { "interactions": [ ... ] }
    // </script>
    const selector =
      options.selector ||
      'script[type="application/json"][data-interaction-lab],script[type="application/json"]#interaction-lab';

    const destroyBeforeInit = options.destroyBeforeInit !== false;
    if (destroyBeforeInit) destroyAll();

    const scripts = qsAll(selector);
    if (!scripts.length) return () => {};

    const interactions = [];
    for (const el of scripts) {
      const raw = el.textContent || "";
      const parsed = parseJsonSafe(raw);
      if (!parsed.ok) {
        console.warn("[InteractionLab] DOM JSON 파싱 실패:", parsed.error);
        continue;
      }
      interactions.push(...normalizeInteractions(parsed.data));
    }

    if (!interactions.length) {
      console.warn("[InteractionLab] DOM에서 유효한 interactions가 없습니다.");
      return () => {};
    }

    return init(interactions);
  };

  const autoInit = () => {
    // 의도: JSON 스크립트가 있는 사이트에서만 “조용히” 자동 실행
    // - 기존 방식(interaction.js에서 init 호출)과 충돌을 줄이기 위해,
    //   DOM에 data-interaction-lab / #interaction-lab 이 없으면 아무 것도 하지 않음.
    try {
      initFromDom({ destroyBeforeInit: false });
    } catch (e) {
      console.warn("[InteractionLab] autoInit 실패:", e);
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", autoInit, { once: true });
  } else {
    autoInit();
  }

  window.InteractionLab = {
    version: VERSION,
    init,
    initFromJson,
    initFromDom,
    destroyAll
  };
})();

