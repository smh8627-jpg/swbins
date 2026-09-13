/**
 * 일본 권역 — 위경도를 일본 8지방+오키나와에 대응시킨다.
 * ---------------------------------------------------------------
 * `js/region-kr.js`(한국 팔도+제주)의 둘째 확장이다 — 구조를 그대로
 * 베꼈다(대표점 최근접 방식, 경계 다각형 없음). saga-go 만의 실제 GPS
 * 보행 메커니즘용이라 이 판에만 둔다.
 *
 * 한국·일본 중 어느 쪽 권역표에서 고를지(대륙 판정)는 여기서 하지 않는다
 * — `world.js`의 `genRegionAt()`이 이 파일과 `region-kr.js`의 `REGIONS`를
 * 하나로 합쳐 통째로 최근접 탐색한다(나라별 대표 중심끼리 비교하는 방식은
 * 규슈가 한국으로 잘못 판정되는 실측 오류가 있어 버렸다 — `region-kr.js`
 * 머리말 참고).
 */
(function (global) {
  'use strict';

  /** 일본 8지방 + 오키나와. center 는 대략의 대표 좌표 */
  var REGIONS = [
    { code: 'hokkaido', name: '홋카이도', hanja: '北海道', country: 'jp', center: { lat: 43.00, lng: 142.50 },
      tags: ['frontier', 'nature'], statBias: { might: 6, wisdom: 0, command: 3 }, color: '#5f9fd0' },
    { code: 'tohoku',   name: '도호쿠',   hanja: '東北',   country: 'jp', center: { lat: 38.50, lng: 140.80 },
      tags: ['nature', 'frontier'], statBias: { might: 4, wisdom: 1, command: 2 }, color: '#3f8f6b' },
    { code: 'kanto',    name: '간토',     hanja: '關東',   country: 'jp', center: { lat: 35.90, lng: 139.60 },
      tags: ['court', 'scholar'],    statBias: { might: 0, wisdom: 5, command: 7 }, color: '#c9a24a' },
    { code: 'chubu',    name: '주부',     hanja: '中部',   country: 'jp', center: { lat: 36.50, lng: 138.00 },
      tags: ['nature', 'martial'],   statBias: { might: 4, wisdom: 2, command: 0 }, color: '#7f8f5c' },
    { code: 'kansai',   name: '간사이',   hanja: '關西',   country: 'jp', center: { lat: 34.70, lng: 135.50 },
      tags: ['court', 'art', 'scholar'], statBias: { might: -1, wisdom: 6, command: 3 }, color: '#a0558a' },
    { code: 'chugoku',  name: '주고쿠',   hanja: '中國',   country: 'jp', center: { lat: 34.50, lng: 132.50 },
      tags: ['martial', 'coast'],    statBias: { might: 5, wisdom: 2, command: 1 }, color: '#4a6fa5' },
    { code: 'shikoku',  name: '시코쿠',   hanja: '四國',   country: 'jp', center: { lat: 33.80, lng: 133.50 },
      tags: ['nature', 'coast'],     statBias: { might: 1, wisdom: 3, command: 0 }, color: '#5c8a5c' },
    { code: 'kyushu',   name: '규슈',     hanja: '九州',   country: 'jp', center: { lat: 32.80, lng: 130.70 },
      tags: ['martial', 'frontier', 'coast'], statBias: { might: 6, wisdom: 1, command: 3 }, color: '#8a6a4a' },
    { code: 'okinawa',  name: '오키나와', hanja: '沖繩',   country: 'jp', center: { lat: 26.20, lng: 127.70 },
      tags: ['sea', 'coast'],        statBias: { might: 1, wisdom: 2, command: 2 }, color: '#2f9fb0' }
  ];

  var byCode = {};
  REGIONS.forEach(function (r) { byCode[r.code] = r; });

  /** region-kr.js의 regionOf와 같은 계산(최근접 대표점) */
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
  global.DG.regionJp = {
    REGIONS: REGIONS,
    byCode: function (code) { return byCode[code] || null; },
    regionOf: regionOf
  };
})(window);
