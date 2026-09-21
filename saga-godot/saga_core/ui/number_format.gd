extends RefCounted

## 102-7 "UI 폰트·패널 불일치"의 "숫자" 처방 — 큰 금액(재화)에 천 단위
## 구분자를 붙인다. DUNGEON·STORY·REALM 이 지갑을 각자 %d로 그냥 찍던 걸
## 하나로 통일(작은 수치 — agri/troops/재야 같은 0~수백대 게이지는 그대로 %d).

static func comma(n: int) -> String:
	var s := str(absi(n))
	var out := ""
	var count := 0
	for i in range(s.length() - 1, -1, -1):
		out = s[i] + out
		count += 1
		if count % 3 == 0 and i != 0:
			out = "," + out
	if n < 0:
		out = "-" + out
	return out
