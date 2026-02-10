/*!
 * Interaction Lab Runtime (MVP)
 * - 퍼블리셔는 interaction.js에서 설정만 관리
 * - 이 파일은 실행 엔진(트리거/재생/변수 적용)을 담당
 *
 * 지원 preset(MVP): fade, scale, rotate
 * 지원 trigger.type: immediate | scroll | click
 */

(() => {
  const VERSION = "0.1.0";

  const isBrowser = typeof window !== "undefined" && typeof document !== "undefined";
  if (!isBrowser) return;

  const state = {
    cleanups: []
  };

  const toArray = (x) => (Array.isArray(x) ? x : x ? [x] : []);

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
    return {
      type,
      once: t.once !== false,
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

    const obs = new IntersectionObserver(
      (entries) => {
        for (const ent of entries || []) {
          if (!ent.isIntersecting) continue;
          run();
          if (t.once) obs.unobserve(ent.target);
        }
      },
      { root: null, rootMargin: t.rootMargin, threshold: t.threshold }
    );

    obs.observe(el);
    return () => obs.disconnect();
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

  window.InteractionLab = {
    version: VERSION,
    init,
    destroyAll
  };
})();

