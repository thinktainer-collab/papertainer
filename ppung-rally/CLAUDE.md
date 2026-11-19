# 뿡뿡 랠리: 작업 이어가기 메모

방귀 부스트로 달리는 모바일 레이싱 게임. 클라우드 세션에서 만든 것을 이어서 개발할 때 먼저 읽을 것.

## 사용자 선호
- **항상 한국어로 답한다.**
- 캐릭터·차량 디자인은 코드로 도형을 쌓아 만들면 품질이 낮다는 피드백을 받았다. 무료 에셋(Kenney, CC0)이나 사용자가 준 스케치·레퍼런스를 바탕으로 작업한다.
- 동작을 바꾸면 반드시 프레임 단위로 확인한다(이상한 동작, 부품이 따로 노는 것, 관통 등).
- 원작 게임(Ivan "Ironman" Stewart's Super Off Road) 이름·그래픽은 쓰지 않는다. 규칙(한 화면 코스, 부스트, 업그레이드)만 참고.

## 파일 지도
| 경로 | 내용 |
|---|---|
| `play/index.html` | 버전 비교 허브 → `v1.html`(2D 원래 버전), `v2.html`(3D 새 버전, 메인 개발 대상), `showroom.html` |
| `play/assets/` | Kenney Cube Pets 동물, Starter Kit Racing 차량·트랙 (glTF JSON으로 변환, CC0) |
| `assets/super-d/` | **슈퍼 D 제트보드**: 사용자가 가장 마음에 들어 한 3D 탈것. GLB 3종 + 미리보기. 원본 그대로 보관 |
| `concepts/v4-super-d/index.html` | 슈퍼 D 쇼룸(동작 코드 포함): 꽉! 부스트 1.8초, 일반 점프(플립 없음), 질주 |
| `concepts/` 나머지 | 지난 시안들(v1 트럭, v2 오리·고양이, v3 키트 쇼룸) |
| `prototype.html` | 초기 2D 프로토타입 |

## v2.html(3D 게임) 구조
- 시뮬레이션(물리·AI·랩·언덕·점프)은 2D 버전과 같은 코드. 월드 좌표 px, 3D 변환 `U=1/12`, 월드 (x, y, 높이) → three (X, Y위, Z).
- 렌더링: three.js r128(cdnjs) + GLTFLoader(jsdelivr). HUD는 위에 겹친 2D 캔버스.
- 저장 키 `ppungRally.v2-3d`, 2D는 `ppungRally.v1`.
- 로컬 실행: 모델을 XHR로 읽으므로 `file://`로 열면 안 된다. `cd ppung-rally/play && python3 -m http.server 8000` 후 http://localhost:8000

## 다음 할 일 (합의된 방향: 원본 보관, 게임은 계속 개선)
1. 슈퍼 D를 v2 게임 탈것으로 추가. 같은 색 부품을 합쳐서(BufferGeometryUtils.mergeBufferGeometries) 그리기 호출을 줄일 것. 바퀴, 제트 팬, 오리 머리, 부리는 따로 둔다. 측정값: 4대 기준 그대로 1,260회, 합치면 182회. 크기는 0.5배로 줄이면 Kenney 트럭과 비슷.
2. 슈퍼 D의 꽉! 부스트(1.8초)를 게임 부스트 동작으로 연결.
3. 실제 폰에서 성능 확인 후 그림자·관중 수 조절.
4. Cube Pets에 오리가 없음. 오리 캐릭터는 슈퍼 D의 성난 오리처럼 직접 모델링한 것을 기준으로 삼는다.
