/*!
 * Interaction 설정 파일 예시
 * - 이 파일에서 preset/target/trigger/vars를 관리하세요.
 * - 실행 엔진은 interaction-lab.runtime.js 입니다.
 */

(() => {
  const interactions = [
    // 예시: Scale(스크롤 진입 시 1회)
    {
      id: "home-hero-scale",
      preset: "scale",
      target: ".is-scale",
      trigger: { type: "scroll", once: true, threshold: 0.2, rootMargin: "0px 0px -10% 0px" },
      vars: { duration: 900, delay: 0, easing: "ease-out", fromScale: 0.9, opacity: 0 }
    }
  ];

  // 공통 스크립트 로드 순서:
  // common.js → interaction-lab.runtime.js → interaction.js
  if (!window.InteractionLab || typeof window.InteractionLab.init !== "function") {
    console.warn("[interaction.js] InteractionLab runtime을 찾지 못했습니다. interaction-lab.runtime.js 로드를 확인하세요.");
    return;
  }

  window.InteractionLab.init(interactions);
})();

