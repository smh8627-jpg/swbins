/**
 * 실명 가드 — 저장 전에 표시 글자에 알려진 실명이 들어갔는지 본다(루트 CLAUDE.md "이름 정책").
 * 목록은 다섯 판 `_test.html` 의 "가명 정책" 진단(BLACK)과 같다 — 거기를 늘리면 여기도 같이 늘린다.
 * 전수 검사가 아니다: 목록에 없는 실명은 못 잡으니 새 인물은 사람이 한 번 더 훑는다.
 */
'use strict';

const BLACK = ['유비', '관우', '조조', '사마의', '하후돈', '장료', '순욱', '손권', '주유',
  '육손', '태사자', '감녕', '여포', '초선', '방통', '화타', '맹획', '봉추',
  '이순신', '을지문덕', '강감찬', '김유신', '계백', '연개소문', '광개토대왕', '세종대왕',
  '장영실', '최무선', '대조영', '왕건', '정약용', '허준', '신사임당',
  '안중근', '이토 히로부미', '히로부미', '하얼빈', '뤼순', '유관순', '아우내', '서대문',
  '김구', '백범', '원효', '김정호', '곽재우', '논개', '이황', '황희', '정몽주', '선죽교',
  '히미코', '노부나가', '히데요시', '이에야스', '다케다 신겐', '우에스기 겐신',
  '마사무네', '유키무라', '미야모토 무사시', '핫토리 한조',
  '카이사르', '시저', '알렉산더', '한니발', '샤를마뉴', '잔다르크', '나폴레옹', '다빈치',
  '레오니다스', '엘리자베스', '넬슨', '마키아벨리', '뉴턴', '미켈란젤로',
  '칭기즈칸', '징기스칸', '쿠빌라이', '만사무사', '샤카', '클레오파트라',
  '함무라비', '아틸라', '적토마', '절영'];

// 실명이 정책상 허용된 파일(역사 퀴즈 — 2026-09-14 사용자 확정, 메모리 saga_realm_data_force_realnames)
const EXEMPT = ['saga-realm/js/data-quiz.js'];

function hits(text) {
  const s = String(text || '');
  return BLACK.filter((n) => s.indexOf(n) >= 0);
}

function isExempt(relPath) {
  const p = String(relPath || '').replace(/\\/g, '/');
  return EXEMPT.some((e) => p.endsWith(e));
}

/** 걸리면 에러 문구, 아니면 null */
function guard(label, ...texts) {
  const found = [...new Set(texts.flatMap(hits))];
  return found.length ? `실명 가드: ${label}에 실명(${found.join(', ')})이 들어 있다 — 가명으로 바꿔서 다시 저장` : null;
}

module.exports = { BLACK, EXEMPT, hits, isExempt, guard };
