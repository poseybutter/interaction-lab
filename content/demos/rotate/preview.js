/* Demo Rotate Preview (순수 JS)
  - LAB_CONFIG_UPDATE 수신 → reset 후 재생
  - LAB_READY / LAB_ERROR 응답
*/

(function () {
  var target = document.querySelector('[data-lab-target="rotate"]');
  var lastConfig = null;
  var triggerCleanup = null;
  var seqId = 0;
  var onEnd = null;

  var clamp = function (n, min, max) {
    var v = Number(n);
    if (!Number.isFinite(v)) v = min;
    return Math.min(max, Math.max(min, v));
  };

  var normalizeConfig = function (cfg) {
    var c = cfg || {};
    var pc = c.playCount != null ? c.playCount : c.iterations; // 하위 호환
    var playCount = 1;
    if (typeof pc === "string" && pc.trim().toLowerCase() === "infinite") {
      playCount = "infinite";
    } else {
      var n = Math.floor(Number(pc));
      playCount = Number.isFinite(n) && n >= 1 && n <= 99 ? n : 1;
    }
    return {
      duration: clamp(c.duration, 0, 8000),
      delay: clamp(c.delay, 0, 8000),
      playCount: playCount,
      easing: typeof c.easing === "string" && c.easing.trim() ? c.easing.trim() : "cubic-bezier(0.2, 0.8, 0.2, 1)",
      fromDeg: clamp(c.fromDeg, -720, 720),
      opacity: clamp(c.opacity, 0, 1),
      trigger: c.trigger && typeof c.trigger === "object" ? c.trigger : { type: "immediate" }
    };
  };

  var applyConfig = function (config) {
    if (!target) return;
    target.style.setProperty("--lab-duration", config.duration + "ms");
    target.style.setProperty("--lab-delay", config.delay + "ms");
    target.style.setProperty("--lab-play-count", String(config.playCount));
    target.style.setProperty("--lab-easing", config.easing);
    target.style.setProperty("--lab-from-rotate", config.fromDeg + "deg");
    target.style.setProperty("--lab-opacity", String(config.opacity));
  };

  var reset = function () {
    if (!target) return;
    target.classList.remove("is-rotate-animating");
    target.classList.add("is-rotate-ready");
  };

  var play = function () {
    if (!target) return;
    reset();
    // eslint-disable-next-line no-unused-expressions
    target.offsetWidth;
    target.classList.add("is-rotate-animating");
  };

  var parsePlayCount = function (v) {
    if (v === "infinite") return Infinity;
    var n = Math.floor(Number(v));
    return Number.isFinite(n) && n >= 1 && n <= 99 ? n : 1;
  };

  var playSequence = function () {
    if (!target || !lastConfig) return;

    seqId += 1;
    if (onEnd) {
      try {
        target.removeEventListener("animationend", onEnd);
      } catch (e) {}
      onEnd = null;
    }

    var myId = seqId;
    var remaining = parsePlayCount(lastConfig.playCount);

    onEnd = function (e) {
      if (myId !== seqId) return;
      if (e && e.target !== target) return;

      if (remaining !== Infinity) remaining -= 1;
      if (remaining === Infinity || remaining > 0) {
        play();
      } else {
        try {
          target.removeEventListener("animationend", onEnd);
        } catch (err) {}
        onEnd = null;
      }
    };

    target.addEventListener("animationend", onEnd);
    play();
  };

  var normalizeTrigger = function (trigger) {
    var t = trigger && typeof trigger === "object" ? trigger : {};
    var type = t.type === "scroll" || t.type === "click" || t.type === "immediate" ? t.type : "immediate";
    var scrollDirection = t.scrollDirection === "down" || t.scrollDirection === "up" || t.scrollDirection === "both" ? t.scrollDirection : "both";
    return {
      type: type,
      once: t.once !== false,
      scrollDirection: scrollDirection,
      threshold: typeof t.threshold === "number" ? t.threshold : 0.2,
      rootMargin: typeof t.rootMargin === "string" ? t.rootMargin : "0px 0px -10% 0px",
      selector: typeof t.selector === "string" ? t.selector : ""
    };
  };

  var attachTrigger = function (config) {
    if (triggerCleanup) {
      try {
        triggerCleanup();
      } catch (e) {}
      triggerCleanup = null;
    }

    var t = normalizeTrigger(config && config.trigger);
    var run = function () {
      try {
        if (lastConfig) applyConfig(lastConfig);
        playSequence();
      } catch (e) {}
    };

    reset();

    if (t.type === "immediate") {
      run();
      triggerCleanup = function () {};
      return;
    }

    if (t.type === "click") {
      var clickTarget = null;
      try {
        clickTarget = t.selector ? document.querySelector(t.selector) : target;
      } catch (e) {}
      if (!clickTarget) {
        run();
        triggerCleanup = function () {};
        return;
      }
      var onClick = function () {
        run();
      };
      clickTarget.addEventListener("click", onClick);
      triggerCleanup = function () {
        clickTarget.removeEventListener("click", onClick);
      };
      return;
    }

    if (!("IntersectionObserver" in window)) {
      run();
      triggerCleanup = function () {};
      return;
    }

    var lastY = window.scrollY || 0;
    var dir = "both";
    var onScroll = function () {
      var y = window.scrollY || 0;
      dir = y > lastY ? "down" : y < lastY ? "up" : dir;
      lastY = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    var inView = false;
    var obs = new IntersectionObserver(
      function (entries) {
        for (var i = 0; i < (entries || []).length; i++) {
          var ent = entries[i];
          if (!ent || !ent.isIntersecting) {
            inView = false;
            continue;
          }
          if (inView) continue;
          if (t.scrollDirection !== "both" && dir !== t.scrollDirection) continue;
          inView = true;
          run();
          if (t.once) obs.unobserve(ent.target);
        }
      },
      { root: null, rootMargin: t.rootMargin, threshold: t.threshold }
    );

    obs.observe(target);
    triggerCleanup = function () {
      try {
        obs.disconnect();
      } catch (e) {}
      try {
        window.removeEventListener("scroll", onScroll);
      } catch (e) {}
    };
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
      attachTrigger(config);
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
    var initial = normalizeConfig({});
    lastConfig = initial;
    applyConfig(initial);
    attachTrigger(initial);
  }

  safePost({ type: "LAB_READY", payload: { demoId: "rotate" } });
})();

