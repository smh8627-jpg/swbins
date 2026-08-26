/**
 * 원소(元素) — 원작의 피해 속성
 * ===============================================================
 * 원작(디아블로2)에서 피해에는 결이 있다 — 물리·화·냉·전기·독·마법.
 * 그 결마다 **적의 저항이 따로**이고, **내 저항도 따로**다.
 * 보석을 어디에 박느냐로 그 결을 손에 넣는 것이 원작 젬의 전부다:
 *
 *   무기에 박으면  그 원소의 **피해**가 붙는다
 *   갑주에 박으면  그 원소의 **저항**이 붙는다
 *   부적에 박으면  능력치가 오른다
 *
 * 이 판도 그대로 간다. 이름만 이 판의 말로 옮겼다.
 *
 * 결마다 하는 일이 다르다 (원작의 그 성질을 옮겼다)
 *   화(火)  큰 한 방. 곁들이는 것이 없다
 *   빙(氷)  맞은 적이 **느려진다** (원작의 냉기가 그렇다)
 *   뇌(雷)  **편차가 크다** — 적게 들어가거나 크게 들어간다
 *   독(毒)  **몇 초에 걸쳐** 들어간다 (즉발이 아니다)
 *   기(氣)  이 판의 마법 자리. 곧게 들어간다
 *
 * 원소를 늘릴 때는 ELEMENTS 에 한 줄. 보석(data-gem.js)이 그 키를 가리키고,
 * dungeon.js 의 applyElem 이 성질을 읽는다.
 */
(function (global) {
  'use strict';

  var ELEMENTS = [
    { key: 'phys', name: '물리', hanja: '物理', color: '#d0c8b8',
      desc: '칼과 주먹. 보석으로는 못 얻는다 — 무기가 곧 물리다.' },
    { key: 'fire', name: '화', hanja: '火', color: '#e2601a',
      desc: '큰 한 방.' },
    { key: 'cold', name: '빙', hanja: '氷', color: '#5fa8e8', slow: 0.45, slowSec: 1.6,
      desc: '맞은 적이 잠깐 느려진다.' },
    { key: 'lit', name: '뇌', hanja: '雷', color: '#f0d060', spread: 1.4,
      desc: '편차가 크다 — 적게 들어가거나 크게 들어간다.' },
    { key: 'pois', name: '독', hanja: '毒', color: '#7ac943', dot: 3.0,
      desc: '3초에 걸쳐 들어간다. 즉발이 아니다.' },
    { key: 'chi', name: '기', hanja: '氣', color: '#b98ae0',
      desc: '이 판의 마법. 곧게 들어간다.' }
  ];

  /** 보석으로 얻을 수 있는 결 (물리는 무기 자체다) */
  var GEM_ELEMENTS = ['fire', 'cold', 'lit', 'pois', 'chi'];

  function elemByKey(k) {
    for (var i = 0; i < ELEMENTS.length; i++) { if (ELEMENTS[i].key === k) { return ELEMENTS[i]; } }
    return null;
  }

  function elemName(k) {
    var e = elemByKey(k);
    return e ? (e.name + '(' + e.hanja + ')') : k;
  }

  function elemColor(k) {
    var e = elemByKey(k);
    return e ? e.color : '#d0c8b8';
  }

  global.DG = global.DG || {};
  global.DG.elemData = {
    ELEMENTS: ELEMENTS, GEM_ELEMENTS: GEM_ELEMENTS,
    elemByKey: elemByKey, elemName: elemName, elemColor: elemColor
  };
})(window);
