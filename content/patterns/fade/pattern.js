/* ==========================================================================
  fade pattern (Vanilla JS)
  - 실행 코드는 iframe 내부(순수 HTML/CSS/JS)
  - Viewer(React)는 postMessage로 옵션만 전달
========================================================================== */

(function () {
  var PATTERN_ID = "fade";
  var DEFAULTS = {
    duration: 600,
    delay: 0,
    easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
    fromOpacity: 0
  };

  var clamp = function (n, min, max) {
    var v = Number(n);
    if (!Number.isFinite(v)) v = min;
    return Math.min(max, Math.max(min, v));
  };

  var normalizeOptions = function (opts) {
    var o = opts || {};
    return {
      duration: clamp(o.duration, 0, 8000),
      delay: clamp(o.delay, 0, 8000),
      easing: typeof o.easing === "string" && o.easing.trim() ? o.easing.trim() : DEFAULTS.easing,
      fromOpacity: clamp(o.fromOpacity, 0, 1)
    };
  };

  var createController = function () {
    var target = null;
    var options = normalizeOptions(DEFAULTS);

    var applyCssVars = function () {
      if (!target) return;
      target.style.setProperty("--fade-duration", options.duration + "ms");
      target.style.setProperty("--fade-delay", options.delay + "ms");
      target.style.setProperty("--fade-easing", options.easing);
      target.style.setProperty("--fade-from-opacity", String(options.fromOpacity));
    };

    var resetToStart = function () {
      if (!target) return;
      target.classList.remove("is-fade-animating");
      target.classList.add("is-fade-ready");
    };

    var play = function () {
      if (!target) return;
      resetToStart();
      // reflow로 animation 재시작 보장
      // eslint-disable-next-line no-unused-expressions
      target.offsetWidth;
      target.classList.add("is-fade-animating");
    };

    return {
      id: PATTERN_ID,
      attach: function (el) {
        target = el;
        applyCssVars();
        resetToStart();
        play();
      },
      setOptions: function (opts) {
        options = normalizeOptions(opts);
        applyCssVars();
      },
      getOptions: function () {
        return { ...options };
      },
      play: play
    };
  };

  var api = createController();
  var initialTarget = document.querySelector('[data-interaction-target="fade"]') || document.querySelector(".is-fade");
  if (initialTarget) api.attach(initialTarget);

  // Viewer(React) ↔ iframe 통신
  window.addEventListener("message", function (e) {
    var data = e && e.data;
    if (!data || typeof data !== "object") return;
    if (data.source !== "interaction-lab-viewer") return;
    if (data.type !== "pattern:update") return;
    if (data.patternId !== PATTERN_ID) return;
    api.setOptions(data.options);
    api.play();
  });

  // 프리뷰 내 재생 버튼
  var replayBtn = document.querySelector(".fade-replay");
  if (replayBtn) {
    replayBtn.addEventListener("click", function () {
      api.play();
    });
  }

  // 부모에게 "준비됨" 알림
  try {
    window.parent.postMessage(
      { source: "interaction-lab-pattern", type: "pattern:ready", patternId: PATTERN_ID },
      "*"
    );
  } catch (e) {
    // noop
  }

  // 퍼블리셔 직접 사용을 위한 전역 노출
  window.InteractionLabPatterns = window.InteractionLabPatterns || {};
  window.InteractionLabPatterns[PATTERN_ID] = api;
})();

