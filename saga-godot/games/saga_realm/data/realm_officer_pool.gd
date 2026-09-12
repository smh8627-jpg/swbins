extends RefCounted

## VERTICAL_SLICE_REALM.md 3·4절 — saga_core/data/characters.gd HEROES
## (105명, 가명 처리 완료)에서 이 슬라이스가 쓰는 셋만 골랐다. 새 인물을
## 만들지 않는다 — 이 저장소 전체 습관 그대로.
##
## STARTING_OFFICER — 플레이어 세력(허창)의 시작 책사. 이 슬라이스의 명령
## 넷(개간·상업·수색·등용)이 전부 wisdom 판정이라 지력 100(현책, sg_
## zhugeliang)짜리 하나로 시작한다 — rtk.js setup()의 "군주가 있는 성이
## 본거지" 규칙을 이 슬라이스 범위(무장 하나)로 줄인 것.
##
## HIDDEN_POOL — 허창에 묻힌 재야 둘, 수색(search)으로 찾아야 보인다.
## data-force.js 주석 그대로 "삼국지 사람이 아닌 인물은 재야다"를 따라
## 한국사·일본사 쪽에서 골랐다(해장=이순신 가명, rarity 5 · 이도인=미야모토
## 무사시 가명, rarity 4).
const STARTING_OFFICER := "sg_zhugeliang"
const HIDDEN_POOL := ["kr_yisunsin", "jp_musashi"]
