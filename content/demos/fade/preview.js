/* Demo Fade Preview (순수 JS)
  - 부모(React) → iframe: LAB_CONFIG_UPDATE
  - iframe → 부모(React): LAB_READY, LAB_ERROR
*/

(function () {
  var TARGET_SELECTOR = '[data-lab-target="fade"]';
  var target = document.querySelector(TARGET_SELECTOR);

  var lastConfig = null;

  var clamp = function (n, min, max) {
    var v = Number(n);
    if (!Number.isFinite(v)) v = min;
    return Math.min(max, Math.max(min, v));
  };

  var normalizeConfig = function (cfg) {
    var c = cfg || {};
    return {
      direction:
        c.direction === "left" || c.direction === "right" || c.direction === "top" || c.direction === "bottom"
          ? c.direction
          : "bottom",
      duration: clamp(c.duration, 0, 8000),
      delay: clamp(c.delay, 0, 8000),
      easing: typeof c.easing === "string" && c.easing.trim() ? c.easing.trim() : "cubic-bezier(0.2, 0.8, 0.2, 1)",
      distance: Math.abs(clamp(c.distance, 0, 400)),
      opacity: clamp(c.opacity, 0, 1)
    };
  };

  var resolveXY = function (direction, distance) {
    var d = Number(distance);
    if (!Number.isFinite(d)) d = 0;
    d = Math.abs(d);
    if (direction === "left") return { x: -d, y: 0 };
    if (direction === "right") return { x: d, y: 0 };
    if (direction === "top") return { x: 0, y: -d };
    return { x: 0, y: d }; // bottom
  };

  var applyConfig = function (config) {
    if (!target) return;
    var xy = resolveXY(config.direction, config.distance);
    target.style.setProperty("--lab-duration", config.duration + "ms");
    target.style.setProperty("--lab-delay", config.delay + "ms");
    target.style.setProperty("--lab-easing", config.easing);
    target.style.setProperty("--lab-x", xy.x + "px");
    target.style.setProperty("--lab-y", xy.y + "px");
    target.style.setProperty("--lab-opacity", String(config.opacity));
  };

  var reset = function () {
    if (!target) return;
    target.classList.remove("is-fade-animating");
    target.classList.add("is-fade-ready");
  };

  var play = function () {
    if (!target) return;
    reset();
    // reflow로 animation 재시작 보장
    // eslint-disable-next-line no-unused-expressions
    target.offsetWidth;
    target.classList.add("is-fade-animating");
  };

  var safePostToParent = function (msg) {
    try {
      window.parent.postMessage(msg, "*");
    } catch (e) {
      // noop
    }
  };

  var handleMessage = function (e) {
    var data = e && e.data;
    if (!data || typeof data !== "object") return;
    if (data.type !== "LAB_CONFIG_UPDATE") return;

    try {
      var config = normalizeConfig(data.payload);
      lastConfig = config;
      applyConfig(config);
      play();
    } catch (err) {
      safePostToParent({
        type: "LAB_ERROR",
        payload: {
          message: String(err && err.message ? err.message : err),
          stack: err && err.stack ? String(err.stack) : ""
        }
      });
    }
  };

  window.addEventListener("message", handleMessage);

  // 버튼(프리뷰 내 재생)
  var replayBtn = document.querySelector(".js-replay");
  if (replayBtn) {
    replayBtn.addEventListener("click", function () {
      try {
        if (lastConfig) applyConfig(lastConfig);
        play();
      } catch (err) {
        safePostToParent({
          type: "LAB_ERROR",
          payload: { message: String(err), stack: err && err.stack ? String(err.stack) : "" }
        });
      }
    });
  }

  // 초기 상태 1회
  if (target) {
    applyConfig(normalizeConfig({}));
    play();
  }

  // READY
  safePostToParent({ type: "LAB_READY", payload: { demoId: "fade" } });
})();

