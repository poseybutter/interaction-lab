// Interaction Lab 메뉴 구조(JSON 기반)
// - 사용자가 제공한 구조를 “그대로” 재현하기 위한 데이터
// - Viewer(React)는 이 데이터를 읽어 좌측 네비를 렌더링한다.

export const INTERACTION_LAB_MENU = {
  interactionLab: {
    title: "Interaction Lab",
    depth2: [
      {
        id: "patterns",
        title: "Patterns",
        description: "Docs + Export 통합",
        groups: [
          {
            id: "basics",
            title: "Basics",
            items: [
              { id: "fade", title: "Fade" },
              { id: "scale", title: "Scale" },
              { id: "rotate", title: "Rotate" }
            ]
          },
          {
            id: "scroll",
            title: "Scroll",
            items: [
              { id: "scrollReveal", title: "Scroll Reveal" },
              { id: "scrollProgress", title: "Scroll Progress" },
              { id: "pinSticky", title: "Pin / Sticky" },
              { id: "scrollTo", title: "Scroll To" },
              { id: "smoothScroll", title: "Smooth Scroll (Concept)" }
            ]
          },
          {
            id: "ui",
            title: "UI",
            items: [
              { id: "flip", title: "FLIP" },
              { id: "draggable", title: "Draggable" },
              { id: "observer", title: "Observer" }
            ]
          },
          {
            id: "textAnimation",
            title: "Text Animation",
            items: [
              { id: "splitText", title: "Split Text (Char / Word / Line)" },
              { id: "typewriter", title: "Typewriter" },
              { id: "scrambleText", title: "Scramble Text" },
              { id: "maskReveal", title: "Mask Reveal" }
            ]
          },
          {
            id: "svg",
            title: "SVG",
            items: [
              { id: "drawSvg", title: "Draw SVG" },
              { id: "morphSvg", title: "Morph SVG" },
              { id: "motionPath", title: "Motion Path" }
            ]
          },
          {
            id: "physics",
            title: "Physics (Concept Demo)",
            items: [
              { id: "gravity", title: "Gravity" },
              { id: "spring", title: "Spring" },
              { id: "bounce", title: "Bounce" }
            ]
          }
        ]
      },
      {
        id: "demo",
        title: "Demo",
        description: "실험실 / iframe Preview",
        groups: [
          {
            id: "basics",
            title: "Basics",
            items: [
              { id: "fade", title: "Fade" },
              { id: "scale", title: "Scale" },
              { id: "rotate", title: "Rotate" }
            ]
          },
          {
            id: "scroll",
            title: "Scroll",
            items: [
              { id: "scrollReveal", title: "Scroll Reveal" },
              { id: "scrollProgress", title: "Scroll Progress" },
              { id: "pinSticky", title: "Pin / Sticky" },
              { id: "scrollTo", title: "Scroll To" }
            ]
          },
          {
            id: "ui",
            title: "UI",
            items: [
              { id: "flip", title: "FLIP" },
              { id: "draggable", title: "Draggable" },
              { id: "observer", title: "Observer" }
            ]
          },
          {
            id: "textAnimation",
            title: "Text Animation",
            items: [
              { id: "splitText", title: "Split Text (Char / Word / Line)" },
              { id: "typewriter", title: "Typewriter" },
              { id: "scrambleText", title: "Scramble Text" },
              { id: "maskReveal", title: "Mask Reveal" }
            ]
          },
          {
            id: "svg",
            title: "SVG",
            items: [
              { id: "drawSvg", title: "Draw SVG" },
              { id: "morphSvg", title: "Morph SVG" },
              { id: "motionPath", title: "Motion Path" }
            ]
          },
          {
            id: "physics",
            title: "Physics (Concept Demo)",
            items: [
              { id: "gravity", title: "Gravity" },
              { id: "spring", title: "Spring" },
              { id: "bounce", title: "Bounce" }
            ]
          }
        ]
      }
    ]
  }
};

