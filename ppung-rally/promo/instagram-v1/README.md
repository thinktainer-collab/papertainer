# 인스타그램 배너 시안 v1 (오리 vs 닭)

- `banner-A.png` 볼 맞대고, 뿡! (메인 추천) · `banner-B.png` 오늘의 라이벌전 · `banner-C.png` 누가 더 멀리 날까?
- 크기 1080×1350 (인스타 피드 4:5)
- `render.html` + `racer3d.js`로 다시 그릴 수 있어요. 같은 폴더에 `three.min.js`(three.js r128)를 두고 브라우저에서 열어 `bannerA()` 등을 호출하면 PNG 데이터가 나와요.
- 글꼴: 블랙한산스, 고운돋움 (SIL Open Font License, fontsource 배포본)

## 시안 D (시네마틱)
- `cine.html`: 층별 렌더(배경/연기/레이서/불꽃 빛/앞쪽 털) 후 2D 합성 (줌 블러, 블러, 글로우, 색 보정, 비네트).
- 렌더: Playwright(swiftshader)로 `cine.html`을 열고 `await window.ready` 후 `window.cinematic()`이 PNG dataURL을 돌려줌.
- 결과: `banner-D.png`, `banner-D.jpg`

## 시안 E (영화 포스터 3종)
- `poster.html`: 포스터용 캐릭터(셸 방식 털, 큰 눈, 굵은 눈썹)를 슈퍼 D에 태워 찍고 하늘·속도선·관중·블러를 합성.
- 렌더: `await window.ready` 후 `window.posters.main()` / `.duck()` / `.hen()` 이 PNG dataURL을 돌려줌.
- 결과: `poster-main`, `poster-duck`, `poster-hen` (.png/.jpg)
