/**
 * 한국 권역 — 위경도를 한반도 권역(조선 팔도 + 제주)에 대응시킨다.
 * ---------------------------------------------------------------
 * saga-go 만의 실제 GPS 보행 메커니즘에 결부된 기능이라 이 판에만 둔다
 * (다른 네 판과 동기화하지 않는다 — data.js 와는 성격이 다르다).
 *
 * world.js 의 `REGION_NAMES`/`regionName()` 은 완전히 별개다 — 그건
 * "이 자리는 이런 옛 지명처럼 보인다"는 순전한 지도 장식(경영 없음)이고,
 * 여긴 "이 위경도는 실제로 어느 권역이라 어떤 인물·펫이 나오는가"를
 * 정하는 게임플레이용 매핑이다. 서로 안 건드린다.
 *
 * 지금은 한국만 채운다 — 일본 확장은 사용자가 미룬 다음 목표
 * (SAGA-HANDOFF 2026-09-11 항목 참고). regionOf() 는 한반도 밖 좌표에도
 * 그저 "가장 가까운 권역"을 골라 돌려준다(빈 값을 안 주는 편이 다루기
 * 쉽다) — 일본 확장 때 별도 대륙 판정을 얹으면 된다.
 */
(function (global) {
  'use strict';

  /** 조선 팔도 + 제주. center 는 권역 대표 좌표(대략) — 정확한 행정 경계가
   *  아니라 "가장 가까운 대표점" 방식으로 권역을 가른다(경계 다각형을 그릴
   *  필요가 없어 가볍다). tags 는 이름·설화 풀을 고를 때 쓰는 성향이다. */
  var REGIONS = [
    { code: 'gyeonggi',    name: '경기', hanja: '京畿', center: { lat: 37.55, lng: 127.00 },
      tags: ['court', 'scholar'], statBias: { might: 0, wisdom: 4, command: 6 }, color: '#c9a24a' },
    { code: 'chungcheong', name: '충청', hanja: '忠淸', center: { lat: 36.60, lng: 127.30 },
      tags: ['scholar', 'nature'], statBias: { might: -2, wisdom: 6, command: 2 }, color: '#5c8a5c' },
    { code: 'jeolla',      name: '전라', hanja: '全羅', center: { lat: 35.30, lng: 126.90 },
      tags: ['art', 'nature'], statBias: { might: -2, wisdom: 5, command: 1 }, color: '#a0558a' },
    { code: 'gyeongsang',  name: '경상', hanja: '慶尙', center: { lat: 35.80, lng: 128.60 },
      tags: ['martial', 'scholar'], statBias: { might: 5, wisdom: 3, command: 2 }, color: '#4a6fa5' },
    { code: 'gangwon',     name: '강원', hanja: '江原', center: { lat: 37.90, lng: 128.30 },
      tags: ['nature', 'martial'], statBias: { might: 3, wisdom: 2, command: -1 }, color: '#3f8f6b' },
    { code: 'hwanghae',    name: '황해', hanja: '黃海', center: { lat: 38.30, lng: 125.60 },
      tags: ['coast', 'scholar'], statBias: { might: 1, wisdom: 4, command: 1 }, color: '#c9c34a' },
    { code: 'pyeongan',    name: '평안', hanja: '平安', center: { lat: 39.60, lng: 125.60 },
      tags: ['frontier', 'martial'], statBias: { might: 6, wisdom: 1, command: 3 }, color: '#7f7f9f' },
    { code: 'hamgyeong',   name: '함경', hanja: '咸鏡', center: { lat: 41.00, lng: 128.00 },
      tags: ['frontier', 'martial'], statBias: { might: 7, wisdom: 0, command: 4 }, color: '#8a6a4a' },
    { code: 'jeju',        name: '제주', hanja: '濟州', center: { lat: 33.40, lng: 126.50 },
      tags: ['sea', 'coast'], statBias: { might: 2, wisdom: 2, command: 3 }, color: '#2f9fb0' }
  ];

  var byCode = {};
  REGIONS.forEach(function (r) { byCode[r.code] = r; });

  /** 위경도 → 가장 가까운 권역. 위경도 1도의 실제 거리가 위선에서 다르므로
   *  경도차에 cos(위도)를 곱해 대략적인 평면 거리로 잰다(world.js 의
   *  latLngToWorld 와 같은 근사). 권역이 9개뿐이라 매 호출 선형 탐색으로
   *  충분하다. */
  function regionOf(lat, lng) {
    var best = null, bestD = Infinity, cosLat = Math.cos(lat * Math.PI / 180);
    for (var i = 0; i < REGIONS.length; i++) {
      var r = REGIONS[i];
      var dLat = lat - r.center.lat;
      var dLng = (lng - r.center.lng) * cosLat;
      var d = dLat * dLat + dLng * dLng;
      if (d < bestD) { bestD = d; best = r; }
    }
    return best;
  }

  global.DG = global.DG || {};
  global.DG.regionKr = {
    REGIONS: REGIONS,
    byCode: function (code) { return byCode[code] || null; },
    regionOf: regionOf
  };
})(window);
