extends RefCounted

## VERTICAL_SLICE_REALM.md 3·4절 — saga_core/data/characters.gd HEROES
## (105명, 가명 처리 완료)에서 이 슬라이스가 쓰는 셋만 골랐다. 새 인물을
## 만들지 않는다 — 이 저장소 전체 습관 그대로.
##
## STARTING_OFFICER — 플레이어 세력(허창)의 시작 책사. 현책(sg_zhugeliang,
## 지력100·통솔92·무력38)은 지력·통솔 판정 명령은 다 잘 해내고 무력 판정
## (훈련)만 약하다 — rtk.js setup()의 "군주가 있는 성이 본거지" 규칙을
## 이 슬라이스 범위(무장 하나)로 줄인 것. 로스터가 하나뿐이라 매달 명령을
## 하나만 쓸 수 있다는 제약은 그대로 유효하다(어느 명령이든).
##
## HIDDEN_POOL — 허창에 묻힌 재야 둘, 수색(search)으로 찾아야 보인다.
## data-force.js 주석 그대로 "삼국지 사람이 아닌 인물은 재야다"를 따라
## 한국사·일본사 쪽에서 골랐다(해장=이순신 가명, rarity 5 · 이도인=미야모토
## 무사시 가명, rarity 4).
const STARTING_OFFICER := "sg_zhugeliang"
const HIDDEN_POOL := ["kr_yisunsin", "jp_musashi"]
