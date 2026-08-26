/* three.js 를 통째로 window.THREE 로 내보낸다.
   ESM 만 배포되는 버전이라, file:// 에서 <script type="module"> 이 막히는
   PC 단독판을 위해 IIFE 로 다시 묶는다. */
export * from 'three';
