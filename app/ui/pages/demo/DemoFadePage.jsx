import React, { useEffect, useMemo, useRef, useState } from "react";
import { CodeBlock } from "../../components/CodeBlock.jsx";

const DEMO_ID = "fade";
const PREVIEW_URL = `/content/demos/${DEMO_ID}/preview.html`;

function clampNumber(n, min, max) {
  const v = Number.isFinite(n) ? n : min;
  return Math.min(max, Math.max(min, v));
}

function buildGeneratedJs(config) {
  return `// Generated Vanilla JS (Demo Fade)\n// - 퍼블리셔가 복사/붙여넣기 하면 동일하게 동작하는 형태\n\n(function(){\n  var config = ${JSON.stringify(config, null, 2)};\n\n  var target = document.querySelector('.is-fade');\n  if(!target){\n    console.warn('[DemoFade] .is-fade 요소를 찾지 못했습니다.');\n    return;\n  }\n\n  var apply = function(){\n    target.style.setProperty('--lab-duration', (config.duration || 0) + 'ms');\n    target.style.setProperty('--lab-delay', (config.delay || 0) + 'ms');\n    target.style.setProperty('--lab-easing', (config.easing || 'ease'));\n    target.style.setProperty('--lab-distance', (config.distance || 0) + 'px');\n    target.style.setProperty('--lab-opacity', String(config.opacity ?? 0));\n  };\n\n  var reset = function(){\n    target.classList.remove('is-fade-animating');\n    target.classList.add('is-fade-ready');\n  };\n\n  var play = function(){\n    reset();\n    // reflow\n    void target.offsetWidth;\n    target.classList.add('is-fade-animating');\n  };\n\n  apply();\n  play();\n})();\n`;
}

export function DemoFadePage() {
  const iframeRef = useRef(null);
  const readyRef = useRef(false);
  const pendingConfigRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [options, setOptions] = useState({
    duration: 600,
    delay: 0,
    easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
    distance: 16,
    opacity: 0
  });

  const config = useMemo(
    () => ({
      duration: options.duration,
      delay: options.delay,
      easing: options.easing,
      distance: options.distance,
      opacity: options.opacity
    }),
    [options]
  );

  const exportJson = useMemo(
    () => ({
      demoId: DEMO_ID,
      type: "demo",
      engine: "vanilla",
      config,
      exportedAt: new Date().toISOString()
    }),
    [config]
  );

  const generatedJs = useMemo(() => buildGeneratedJs(config), [config]);

  const postConfig = (cfg) => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    win.postMessage({ type: "LAB_CONFIG_UPDATE", payload: cfg }, window.location.origin);
  };

  // 페이지 진입 시: 메시지 핸들러 등록 / 이탈 시 clean-up
  useEffect(() => {
    const onMessage = (e) => {
      const data = e?.data;
      if (!data || typeof data !== "object") return;

      // 같은 origin + 같은 iframe에서 온 메시지만 처리(최소 권한)
      if (e.origin !== window.location.origin) return;
      if (e.source !== iframeRef.current?.contentWindow) return;

      if (data.type === "LAB_READY") {
        readyRef.current = true;
        setReady(true);
        setErrorMsg("");

        // READY 이전에 쌓인 config가 있으면 1회 전송
        if (pendingConfigRef.current) {
          postConfig(pendingConfigRef.current);
          pendingConfigRef.current = null;
        } else {
          postConfig(config);
        }
      } else if (data.type === "LAB_ERROR") {
        const msg = data.payload?.message ? String(data.payload.message) : "미상 오류";
        setErrorMsg(msg);
      }
    };

    window.addEventListener("message", onMessage);
    readyRef.current = false;
    setReady(false);
    setErrorMsg("");
    pendingConfigRef.current = config;

    return () => {
      window.removeEventListener("message", onMessage);
      readyRef.current = false;
      pendingConfigRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 옵션 변경 → READY 전엔 큐잉, READY 후엔 즉시 전송
  useEffect(() => {
    if (!readyRef.current) {
      pendingConfigRef.current = config;
      return;
    }
    postConfig(config);
  }, [config]);

  const set = (patch) => setOptions((prev) => ({ ...prev, ...patch }));

  return (
    <div className="app-page">
      <div className="page-title-wrap">
        <h1 className="h-tit">
          Fade <span className="badge-text">Demo</span>
        </h1>
        <div className="g-info-box">
          <p className="g-desc">
            Demo는 <strong>Controls / Preview(iframe) / Export</strong>가 한 화면에 있습니다.
          </p>
        </div>
      </div>

      <div className="lab-split">
        <div className="lab-controls">
          <section aria-label="컨트롤">
            <form className="fieldset" onSubmit={(e) => e.preventDefault()}>
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
              </div>

              <div className="form-group">
                <div className="form-tit">
                  <label htmlFor="fade-distance">distance (px)</label>
                </div>
                <div className="form-conts">
                  <input
                    id="fade-distance"
                    className="krds-input"
                    type="number"
                    inputMode="numeric"
                    min={-400}
                    max={400}
                    value={options.distance}
                    onChange={(e) => set({ distance: clampNumber(Number(e.target.value), -400, 400) })}
                  />
                </div>
              </div>

              <div className="form-group">
                <div className="form-tit">
                  <label htmlFor="fade-opacity">opacity (from)</label>
                </div>
                <div className="form-conts">
                  <input
                    id="fade-opacity"
                    className="krds-input"
                    type="number"
                    step="0.05"
                    min={0}
                    max={1}
                    value={options.opacity}
                    onChange={(e) => set({ opacity: clampNumber(Number(e.target.value), 0, 1) })}
                  />
                </div>
              </div>
            </form>
          </section>
        </div>

        <div className="lab-main">
          <section aria-label="프리뷰">
            <h2 className="sec-tit">Preview</h2>
            <div className="lab-preview-frame">
              <iframe
                ref={iframeRef}
                title="Fade 프리뷰"
                src={PREVIEW_URL}
                sandbox="allow-scripts allow-same-origin"
                className="lab-preview-iframe"
              />
            </div>
            {!ready ? <p className="g-desc lab-mt-3">프리뷰 로딩 중…</p> : null}
            {errorMsg ? (
              <div className="g-info-box lab-mt-3">
                <p className="g-desc"><strong>프리뷰 오류</strong>: {errorMsg}</p>
              </div>
            ) : null}
          </section>

          <section aria-label="내보내기" className="lab-mt-6">
            <h2 className="sec-tit">Export</h2>
            <CodeBlock lang="json" code={JSON.stringify(exportJson, null, 2)} />
            <CodeBlock lang="js" code={generatedJs} />
          </section>
        </div>
      </div>
    </div>
  );
}

