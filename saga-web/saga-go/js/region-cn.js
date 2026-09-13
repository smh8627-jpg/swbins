/**
 * 중국 권역 — 위경도를 우공구주(禹貢九州, 옛 아홉 주) 대표점에 대응시킨다.
 * ---------------------------------------------------------------
 * `js/region-kr.js`(한국 팔도+제주)·`js/region-jp.js`(일본 8지방+오키나와)의
 * 셋째 확장이다 — 구조를 그대로 베꼈다(대표점 최근접 방식, 경계 다각형 없음).
 * saga-go 만의 실제 GPS 보행 메커니즘용이라 이 판에만 둔다.
 *
 * 아홉 구역 이름은 현대 행정구역이 아니라 **고대 중국의 아홉 주(九州)**를
 * 골랐다 — `js/data.js`의 `era: '삼국지'` 22명과 지리적으로 바로 이어진다
 * (익주=촉한 근거지, 형주=쟁탈의 요충지, 양주=오나라 강동, 기주=원소·조조,
 * 옹주=마초·서량 변경 등). 대표 좌표는 그 옛 주의 중심에 해당하는 오늘날
 * 도시로 잡았다(예: 익주→청두, 형주→우한, 옹주→시안).
 *
 * 한국·일본·중국 중 어느 쪽 권역표에서 고를지(대륙 판정)는 여기서 하지
 * 않는다 — `world.js`의 `genRegionAt()`이 이 파일과 `region-kr.js`·
 * `region-jp.js`의 `REGIONS`를 하나로 합쳐 통째로 최근접 탐색한다
 * (`region-kr.js` 머리말이 적어 둔 "나라별 대표 중심끼리 비교하면 규슈가
 * 한국으로 잘못 판정된다"는 실측 오류를 셋으로 늘어도 그대로 피한다 —
 * 27개 대표점 중 가장 가까운 하나를 그냥 고르는 방식은 나라 수와 무관하다).
 */
(function (global) {
  'use strict';

  /** 우공구주(禹貢九州). center 는 그 옛 주의 중심에 해당하는 오늘날 도시 좌표 */
  var REGIONS = [
    { code: 'yizhou',   name: '익주', hanja: '益州', country: 'cn', center: { lat: 30.66, lng: 104.07 },
      tags: ['nature', 'frontier'], statBias: { might: 3, wisdom: 2, command: 1 }, color: '#3f8f6b' },
    { code: 'jingzhou', name: '형주', hanja: '荊州', country: 'cn', center: { lat: 30.33, lng: 112.24 },
      tags: ['scholar', 'martial'], statBias: { might: 2, wisdom: 4, command: 2 }, color: '#6a8f4a' },
    { code: 'yangzhou', name: '양주', hanja: '揚州', country: 'cn', center: { lat: 32.05, lng: 119.42 },
      tags: ['coast', 'sea'],     statBias: { might: 1, wisdom: 3, command: 2 }, color: '#2f9fb0' },
    { code: 'jizhou',   name: '기주', hanja: '冀州', country: 'cn', center: { lat: 38.04, lng: 114.51 },
      tags: ['court', 'martial'], statBias: { might: 4, wisdom: 2, command: 5 }, color: '#c9a24a' },
    { code: 'yanzhou',  name: '연주', hanja: '兗州', country: 'cn', center: { lat: 35.40, lng: 116.60 },
      tags: ['martial', 'scholar'], statBias: { might: 4, wisdom: 3, command: 1 }, color: '#8a6a4a' },
    { code: 'qingzhou', name: '청주', hanja: '靑州', country: 'cn', center: { lat: 36.70, lng: 118.50 },
      tags: ['coast', 'frontier'], statBias: { might: 5, wisdom: 1, command: 1 }, color: '#4a6fa5' },
    { code: 'xuzhou',   name: '서주', hanja: '徐州', country: 'cn', center: { lat: 34.20, lng: 117.20 },
      tags: ['court', 'scholar'], statBias: { might: 0, wisdom: 5, command: 3 }, color: '#a0558a' },
    { code: 'yuzhou',   name: '예주', hanja: '豫州', country: 'cn', center: { lat: 34.00, lng: 113.60 },
      tags: ['court', 'scholar'], statBias: { might: 0, wisdom: 6, command: 4 }, color: '#c9c34a' },
    { code: 'yongzhou', name: '옹주', hanja: '雍州', country: 'cn', center: { lat: 34.34, lng: 108.94 },
      tags: ['frontier', 'martial'], statBias: { might: 6, wisdom: 0, command: 3 }, color: '#7f7f9f' }
  ];

  var byCode = {};
  REGIONS.forEach(function (r) { byCode[r.code] = r; });

  /** region-kr.js·region-jp.js와 같은 계산(최근접 대표점) */
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
  global.DG.regionCn = {
    REGIONS: REGIONS,
    byCode: function (code) { return byCode[code] || null; },
    regionOf: regionOf
  };
})(window);
