# KRDS Interaction Lab Platform

퍼블리셔가 **복사해서 바로 쓸 수 있는 인터랙션 프리셋**(순수 HTML/CSS/JS)과, 이를 **React Viewer**에서 문서/프리뷰(iframe)로 확인하는 실험용 프로젝트입니다.

- **Viewer(React)**: UI/메뉴/컨트롤/코드 뷰 담당 (`/app`)
- **실행 코드(순수 파일)**: iframe에서 돌아가는 HTML/CSS/JS (`/content`)
- **빌드 결과물**: `dist/` (Vite build) + `dist/content` (빌드 후 스크립트로 복사)

## 핵심 개념

- **Viewer는 실행 엔진이 아닙니다.**
  - 실제 인터랙션은 `/content/**/preview.html` 안에서 로드되는 순수 JS가 처리합니다.
- **`/content`는 “퍼블리셔 산출물” 폴더입니다.**
  - Vite 빌드 후 `scripts/copy-content.mjs`가 `content/`를 `dist/content/`로 복사합니다.
- **아이콘/폰트는 `public/assets/icons/**`를 사용합니다.**
  - Remix Icon(Webfont) + 프로젝트 SVG 리소스를 그대로 씁니다.

## 개발 환경

- Node.js: LTS 권장
- 패키지 매니저: npm

## 설치

```bash
npm install
```

## 실행 (개발 서버)

```bash
npm run dev
```

기본 주소는 `http://127.0.0.1:5173` 입니다.

## 빌드

```bash
npm run build
```

빌드는 다음을 포함합니다.

- `vite build` → `dist/` 생성
- `node scripts/copy-content.mjs` → `content/` → `dist/content/` 복사

## SCSS/CSS

React Viewer에서 SCSS 엔트리는 `app/main.jsx`에서 import 하는 `src/scss/common.scss` 입니다.

- **빌드(단독)**:

```bash
npm run css:build
```

- **워치(단독)**:

```bash
npm run css:watch
```

> 참고: 현재 Sass deprecation warning(예: `map-get`)이 출력될 수 있으나, 빌드는 정상 동작합니다.

## 폴더 구조(요약)

```text
app/                    # React Viewer (Vite 엔트리: /app/main.jsx)
  main.jsx
  router.jsx
  ui/
content/                # 퍼블리셔 산출물(순수 HTML/CSS/JS)
  demos/                # Demo 프리뷰(iframe에서 실행)
  patterns/             # Patterns 문서/코드/Export
  runtime/              # (옵션) 런타임 엔진 예시 스크립트
public/                 # 정적 리소스(아이콘/폰트 등)
src/scss/               # Viewer 스타일(SCSS)
scripts/copy-content.mjs # build 후 content → dist/content 복사
index.html              # Vite HTML 엔트리(React 마운트)
vite.config.js
```

## `/content` 경로 규칙

Viewer가 아래 경로를 fetch/iframe으로 로드합니다.

- Patterns(Fade 예시)
  - `/content/patterns/fade/docs.html`
  - `/content/patterns/fade/preview.html`
  - `/content/patterns/fade/pattern.css`
  - `/content/patterns/fade/pattern.js`
  - `/content/patterns/fade/export.js`
  - `/content/patterns/fade/export.schema.json`
- Demo(예: fade/scale/rotate)
  - `/content/demos/<demoId>/preview.html`

## 아이콘/폰트

- Remix Icon(Webfont): `public/assets/icons/remixicon/fonts/remixicon.css`
- KRDS SVG 아이콘 리소스: `public/assets/icons/KRDS`

> 이 프로젝트는 아이콘/폰트 파일을 직접 수정하지 않고 “리소스 경로를 고정”해서 사용합니다.

## 라이선스

- 프로젝트 루트의 `LICENSE`를 따릅니다.
- Remix Icon은 `public/assets/icons/remixicon/LICENSE.txt` 조건을 따릅니다.

