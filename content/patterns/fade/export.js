// Interaction Lab export.js (Vanilla)
// - 퍼블리셔가 실무에 붙일 때 “복사해서 바로 시작”할 수 있는 형태
// - 이 파일은 예시/템플릿이며, 옵션 값은 프로젝트 상황에 맞게 교체합니다.

(function () {
  var patternId = "fade";

  var options = {
    duration: 600,
    delay: 0,
    easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
    fromOpacity: 0
  };

  // 1) 대상 요소 선택(원하는 선택자로 교체)
  var target = document.querySelector('[data-interaction-target="fade"]');
  if (!target) return;

  // 2) pattern.js가 노출한 API 호출
  var api = window.InteractionLabPatterns && window.InteractionLabPatterns[patternId];
  if (!api) return;

  api.attach(target);
  api.setOptions(options);
  api.play();
})();

