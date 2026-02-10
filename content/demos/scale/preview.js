/* Demo Scale Preview (순수 JS)
  - LAB_CONFIG_UPDATE 수신 → reset 후 재생
  - LAB_READY / LAB_ERROR 응답
*/

(function () {
  var target = document.querySelector('[data-lab-target="scale"]');
  var lastConfig = null;

  var clamp = function (n, min, max) {
    var v = Number(n);
    if (!Number.isFinite(v)) v = min;
    return Math.min(max, Math.max(min, v));
  };

  var normalizeConfig = function (cfg) {
    var c = cfg || {};
    return {
      duration: clamp(c.duration, 0, 8000),
      delay: clamp(c.delay, 0, 8000),
      easing: typeof c.easing === "string" && c.easing.trim() ? c.easing.trim() : "cubic-bezier(0.2, 0.8, 0.2, 1)",
      fromScale: clamp(c.fromScale, 0.05, 3),
      opacity: clamp(c.opacity, 0, 1)
    };
  };

  var applyConfig = function (config) {
    if (!target) return;
    target.style.setProperty("--lab-duration", config.duration + "ms");
    target.style.setProperty("--lab-delay", config.delay + "ms");
    target.style.setProperty("--lab-easing", config.easing);
    target.style.setProperty("--lab-from-scale", String(config.fromScale));
    target.style.setProperty("--lab-opacity", String(config.opacity));
  };

  var reset = function () {
    if (!target) return;
    target.classList.remove("is-scale-animating");
    target.classList.add("is-scale-ready");
  };

  var play = function () {
    if (!target) return;
    reset();
    // eslint-disable-next-line no-unused-expressions
    target.offsetWidth;
    target.classList.add("is-scale-animating");
  };

  var safePost = function (msg) {
    try {
      window.parent.postMessage(msg, "*");
    } catch (e) {}
  };

  window.addEventListener("message", function (e) {
    var data = e && e.data;
    if (!data || typeof data !== "object") return;
    if (data.type !== "LAB_CONFIG_UPDATE") return;
    try {
      var config = normalizeConfig(data.payload);
      lastConfig = config;
      applyConfig(config);
      play();
    } catch (err) {
      safePost({
        type: "LAB_ERROR",
        payload: {
          message: String(err && err.message ? err.message : err),
          stack: err && err.stack ? String(err.stack) : ""
        }
      });
    }
  });

  var replayBtn = document.querySelector(".js-replay");
  if (replayBtn) {
    replayBtn.addEventListener("click", function () {
      try {
        if (lastConfig) applyConfig(lastConfig);
        play();
      } catch (err) {
        safePost({ type: "LAB_ERROR", payload: { message: String(err), stack: err && err.stack ? String(err.stack) : "" } });
      }
    });
  }

  if (target) {
    applyConfig(normalizeConfig({}));
    play();
  }

  safePost({ type: "LAB_READY", payload: { demoId: "scale" } });
})();

