'use strict';
/* Pizzeria on Mars — level data (15 rows tall, 48px tiles)
   Tiles:  # rock   = girder   - one-way   p pipe   H ladder   ^ spikes   ~ lava/acid
           C crate  ? pizza box   B bounce pad   G boss gate
   Things: S start  E goal  K checkpoint  o coin  s slice  W whole pizza  ! speed
           a alien  b blob  d drone  R boss  M moving platform (horizontal)  V moving platform (vertical)  L laser */
(function () {
  const H = 15;
  function B(w) {
    const g = [];
    for (let y = 0; y < H; y++) g.push(new Array(w).fill(' '));
    const api = {
      w, g,
      fill(x1, x2, y1, y2, c = '#') { for (let y = y1; y <= y2; y++) for (let x = x1; x <= x2; x++) if (y >= 0 && y < H && x >= 0 && x < w) g[y][x] = c; return api; },
      ground(x1, x2, top = 12, c = '#') { return api.fill(x1, x2, top, H - 1, c); },
      row(x1, x2, y, c) { return api.fill(x1, x2, y, y, c); },
      col(x, y1, y2, c) { return api.fill(x, x, y1, y2, c); },
      put(x, y, s) { for (let i = 0; i < s.length; i++) if (s[i] !== ' ' && x + i < w) g[y][x + i] = s[i]; return api; },
      pit(x1, x2, kind = '^') { api.fill(x1, x2, 13, 14, '#'); if (kind === '^') api.row(x1, x2, 12, '^'); else api.fill(x1, x2, 12, 12, '~'); return api; },
      done() { return g.map(r => r.join('')); }
    };
    return api;
  }

  const L = PM.LEVELS = [];

  /* 1-1 Landing Zone — tutorial */
  L.push({
    theme: 'canyon', music: 'level', build() {
      const b = B(134);
      b.ground(0, 22).put(3, 11, 'S').put(7, 10, 'sss');
      b.put(13, 9, 'C?C').put(13, 8, 'ooo');
      b.put(20, 11, 'b');
      b.put(23, 9, 's').put(24, 8, 's').put(25, 9, 's');
      b.ground(26, 44);
      b.row(30, 33, 9, '-').put(30, 8, 'oooo');
      b.put(37, 11, 'b');
      b.ground(40, 46, 11).put(42, 10, 'K');
      b.put(47, 8, 's').put(48, 7, 's').put(49, 8, 's');
      b.ground(50, 70);
      b.put(56, 11, 'B').row(58, 63, 5, '=').put(58, 4, 'ss!ss');
      b.put(54, 9, '?');
      b.put(66, 11, 'b');
      b.pit(71, 78).put(72, 10, 'M');
      b.put(73, 7, 'ooo');
      b.ground(79, 99);
      b.put(84, 11, 'a').put(88, 9, '?C?');
      b.ground(93, 94, 11).ground(95, 96, 10).ground(97, 99, 9).put(97, 8, 'sss');
      b.ground(100, 133);
      b.put(103, 11, 'K').put(108, 11, 'b').put(115, 11, 'a');
      b.put(110, 8, 's s s');
      b.put(126, 11, 'E');
      return b.done();
    }
  });

  /* 1-2 Dusty Canyon — ladders, drones, moving platforms */
  L.push({
    theme: 'canyon', music: 'level', build() {
      const b = B(152);
      b.ground(0, 18).put(2, 11, 'S').put(6, 10, 'sss');
      b.put(9, 9, 'C?C').put(9, 8, 'ooo').put(15, 11, 'b');
      b.row(20, 21, 10, '-').put(20, 9, 'ss');
      b.ground(23, 40, 11).put(27, 10, 'sss').put(33, 7, '?').put(31, 5, 'd').put(37, 10, 'a');
      b.pit(41, 46).put(42, 9, 'M').put(43, 6, 'ooo');
      b.ground(47, 72).put(49, 11, 'K');
      b.fill(56, 58, 5, 11).col(55, 5, 11, 'H').put(56, 4, 'ooo');
      b.fill(62, 64, 6, 6).put(62, 5, 'sss').fill(68, 70, 5, 5).put(68, 4, 's!s');
      b.put(61, 11, 'b').put(66, 11, 'a');
      b.row(74, 75, 10, '-');
      b.ground(77, 112);
      b.put(80, 9, '?C?').put(86, 5, 'd').put(90, 11, 'B').row(92, 97, 5, '=').put(93, 4, 'sss').put(99, 6, 'd');
      b.row(104, 106, 11, '^').put(103, 9, 'ooooo');
      b.ground(113, 151, 11).put(115, 10, 'K');
      b.put(118, 8, 'C?C').put(120, 10, 'b').put(128, 10, 'a').put(124, 7, 'sss').put(133, 6, 'd');
      b.put(145, 10, 'E');
      return b.done();
    }
  });

  /* 1-3 Bone Ridge — vertical platforms, bounce pads, stairs */
  L.push({
    theme: 'canyon', music: 'level', build() {
      const b = B(160);
      b.ground(0, 16).put(2, 11, 'S').put(6, 9, 's s s');
      b.ground(12, 16, 10).put(14, 9, 'b');
      b.pit(17, 22).put(19, 9, 'V').put(18, 4, 'ooo');
      b.ground(23, 38, 9).put(26, 8, 'a').put(30, 5, '?').put(34, 8, 'sss');
      b.ground(39, 42, 11).ground(43, 46, 13);
      b.put(43, 12, 'B').row(46, 52, 6, '=').put(47, 5, 's!s s');
      b.ground(47, 62, 11).put(50, 10, 'K').put(55, 10, 'b').put(59, 10, 'b').put(53, 7, 'C?C');
      b.pit(63, 70).put(64, 10, 'M').row(68, 69, 7, '-').put(68, 6, 'sW');
      b.ground(71, 84, 12).put(74, 11, 'a').put(80, 11, 'a').put(77, 5, 'd');
      b.ground(85, 86, 11).ground(87, 88, 10).ground(89, 90, 9).ground(91, 96, 8).put(92, 7, 'sss');
      b.pit(97, 102).put(98, 7, 'V');
      b.ground(103, 120, 10).put(105, 9, 'K').put(110, 9, 'b').put(113, 6, '?').put(116, 9, 'a');
      b.row(108, 111, 7, '-').put(108, 6, 'oooo');
      b.ground(121, 124, 12).put(122, 11, 'B').row(125, 130, 5, '=').put(126, 4, 'sss');
      b.ground(125, 159, 11).put(132, 10, 'b').put(138, 6, 'd').put(141, 10, 'a').put(136, 7, 'C?C');
      b.put(152, 10, 'E');
      return b.done();
    }
  });

  /* 1-4 Pizzeria Plaza — lasers introduced, lots of pizza */
  L.push({
    theme: 'canyon', music: 'level', build() {
      const b = B(166);
      b.ground(0, 26).put(2, 11, 'S').put(5, 10, 'sssss');
      b.row(10, 14, 2, '#').put(12, 3, 'L');
      b.put(18, 9, '?C?C?').put(23, 11, 'b');
      b.pit(27, 30);
      b.ground(31, 50, 11).put(33, 10, 'a').put(38, 7, 'd').put(44, 10, 'b');
      b.row(39, 42, 8, '-').put(39, 7, 'ssss');
      b.row(46, 48, 1, '#').put(47, 2, 'L');
      b.ground(51, 54, 12).put(52, 11, 'K');
      b.pit(55, 61).put(56, 10, 'M').put(57, 6, 'ooo');
      b.ground(62, 86, 11).put(66, 10, 'b').put(71, 10, 'b').put(76, 10, 'a');
      b.fill(68, 70, 8, 8).put(68, 7, 's!s').row(73, 76, 7, '=').put(73, 6, 'oooo');
      b.row(80, 82, 1, '#').put(81, 2, 'L');
      b.pit(87, 91).row(88, 90, 8, '-').put(88, 7, 'sss');
      b.ground(92, 120, 12).put(94, 11, 'K').put(100, 11, 'B').fill(104, 107, 5, 5).put(104, 4, 'sWss');
      b.put(98, 8, 'C?C').put(110, 11, 'a').put(115, 11, 'b').put(112, 5, 'd');
      b.ground(121, 124, 10).ground(125, 165, 11);
      b.put(128, 10, 'b').put(134, 7, '???').put(140, 10, 'a').put(144, 6, 'd').put(130, 9, 's s s s s');
      b.row(146, 148, 1, '#').put(147, 2, 'L');
      b.put(157, 10, 'E');
      return b.done();
    }
  });

  /* 1-5 Pipe Works — pipes, lasers, lava pits */
  L.push({
    theme: 'canyon', music: 'level', build() {
      const b = B(172);
      b.ground(0, 14).put(2, 11, 'S').put(6, 10, 'sss');
      b.row(10, 13, 9, 'p').put(10, 8, 'oooo');
      b.pit(15, 20, '~').row(16, 19, 9, 'p').col(15, 9, 11, 'p').col(20, 9, 11, 'p').put(16, 8, 'ssss');
      b.ground(21, 40, 11).put(24, 10, 'b').put(30, 10, 'a').put(28, 7, '?C?');
      b.row(33, 35, 1, '#').put(34, 2, 'L').put(37, 5, 'd');
      b.pit(41, 47, '~').put(42, 9, 'M');
      b.ground(48, 70, 11).put(50, 10, 'K');
      b.fill(54, 56, 4, 10).col(53, 4, 10, 'H').put(54, 3, 'sss');
      b.row(57, 62, 4, 'p').put(58, 3, 'oooo').row(60, 62, 0, '#').put(61, 1, 'L');
      b.put(64, 10, 'b').put(68, 10, 'b');
      b.pit(71, 78, '~').put(72, 10, 'V').put(75, 8, 'V').put(73, 4, 'sss');
      b.ground(79, 104, 11).put(81, 10, 'a').put(86, 10, 'B').row(88, 94, 4, 'p').put(89, 3, 's!s');
      b.row(97, 99, 1, '#').put(98, 2, 'L').put(92, 10, 'b').put(101, 10, 'a').put(95, 6, 'd');
      b.pit(105, 110, '~').row(106, 109, 9, '-').put(106, 8, 'ssss');
      b.ground(111, 136, 11).put(113, 10, 'K').put(118, 8, 'C?C').put(124, 10, 'b').put(130, 10, 'a');
      b.row(125, 127, 1, '#').put(126, 2, 'L').put(121, 5, 'd');
      b.ground(137, 140, 9).ground(141, 171, 11).put(138, 8, 'sss').put(146, 10, 'b').put(152, 5, 'd').put(150, 7, '?W?');
      b.put(163, 10, 'E');
      return b.done();
    }
  });

  /* 1-6 Acid Falls */
  L.push({
    theme: 'acid', music: 'cave', build() {
      const b = B(176);
      b.ground(0, 12).put(2, 11, 'S').put(6, 10, 'sss');
      b.pit(13, 18, '~').put(14, 10, 'M');
      b.ground(19, 32, 10).put(22, 9, 'a').put(27, 6, '?').put(30, 9, 'b');
      b.pit(33, 40, '~').row(35, 36, 8, '-').row(38, 39, 6, '-').put(35, 7, 'ss').put(38, 5, 'ss').put(36, 3, 'd');
      b.ground(41, 58, 9).put(43, 8, 'K').put(48, 8, 'b').put(53, 8, 'a').put(46, 5, 'C!C');
      b.pit(59, 66, '~').put(60, 9, 'V').put(63, 6, 'V').put(61, 3, 'ooo');
      b.ground(67, 80, 8).put(70, 7, 'b').put(75, 7, 'a').put(72, 4, 'sss').put(78, 3, 'd');
      b.ground(81, 84, 12).put(82, 11, 'B').row(84, 90, 5, '=').put(85, 4, 'sWs');
      b.pit(85, 94, '~').row(91, 92, 9, '-').put(91, 8, 'ss');
      b.ground(95, 112, 10).put(97, 9, 'K').put(101, 6, '?C?').put(105, 9, 'b').put(109, 9, 'a').put(104, 3, 'd');
      b.pit(113, 122, '~').put(114, 9, 'M').put(118, 6, 'V').put(119, 2, 'ooo');
      b.ground(123, 140, 10).put(126, 9, 'a').put(131, 9, 'b').put(135, 9, 'a').put(128, 6, 'sss').put(133, 4, 'd');
      b.pit(141, 146, '~').row(142, 145, 8, '=').put(142, 7, 'ssss');
      b.ground(147, 175, 10).put(150, 7, '?!?').put(156, 9, 'b').put(160, 5, 'd');
      b.put(168, 9, 'E');
      return b.done();
    }
  });

  /* 1-7 Crystal Caverns — cave ceiling, hanging spikes, lasers */
  L.push({
    theme: 'crystal', music: 'cave', build() {
      const b = B(180);
      b.fill(0, 179, 0, 0);
      b.ground(0, 16).put(2, 11, 'S').put(6, 10, 'sss');
      b.fill(8, 14, 1, 2).row(9, 13, 3, '^');
      b.put(12, 9, '?');
      b.pit(17, 22).row(18, 21, 9, '-').put(18, 8, 'ssss');
      b.ground(23, 40, 11).put(26, 10, 'b').put(31, 10, 'a').put(36, 10, 'b');
      b.fill(28, 34, 1, 3).row(29, 33, 4, '^').put(29, 7, 'C?C');
      b.row(38, 40, 1, '#').put(39, 2, 'L');
      b.pit(41, 48).put(42, 9, 'M').fill(44, 47, 1, 2).row(44, 47, 3, '^');
      b.ground(49, 66, 11).put(51, 10, 'K').put(56, 6, 'd').put(60, 10, 'a').put(64, 10, 'b');
      b.fill(55, 57, 8, 10).put(55, 7, 'sWs');
      b.row(58, 60, 1, '#').put(59, 2, 'L');
      b.pit(67, 74, '~').put(68, 9, 'V').put(71, 7, 'V').put(69, 3, 'ooo');
      b.ground(75, 92, 9).put(77, 8, 'b').put(81, 8, 'a').put(86, 8, 'b').put(84, 5, '?C?').put(89, 4, 'd');
      b.fill(78, 82, 1, 2).row(79, 81, 3, '^');
      b.ground(93, 96, 12).put(94, 11, 'B').row(97, 103, 5, '=').put(98, 4, 's!s');
      b.pit(97, 104, '~').row(100, 101, 9, '-');
      b.ground(105, 124, 11).put(107, 10, 'K').put(112, 10, 'a').put(117, 10, 'b').put(121, 10, 'a').put(114, 6, 'd');
      b.row(109, 111, 1, '#').put(110, 2, 'L').row(118, 120, 1, '#').put(119, 2, 'L');
      b.fill(125, 128, 8, 14).col(124, 8, 10, 'H').put(125, 7, 'ss');
      b.pit(129, 136).put(130, 8, 'M').fill(131, 135, 1, 1).row(131, 135, 2, '^');
      b.ground(137, 179, 11).put(140, 10, 'b').put(146, 10, 'a').put(150, 5, 'd').put(143, 7, 'C?C').put(154, 9, 'sss');
      b.row(157, 159, 1, '#').put(158, 2, 'L');
      b.put(170, 10, 'E');
      return b.done();
    }
  });

  /* 1-8 Robo-Chef's Castle — boss */
  L.push({
    theme: 'castle', music: 'cave', boss: true, build() {
      const b = B(96);
      b.ground(0, 14).put(2, 11, 'S').put(6, 10, 'sss').put(10, 9, '?');
      b.pit(15, 20, '~').put(16, 10, 'M').put(17, 6, 'ooo');
      b.ground(21, 36, 11).put(24, 10, 'b').put(29, 10, 'a').put(33, 5, 'd').put(27, 7, 'C!C');
      b.row(30, 32, 1, '#').put(31, 2, 'L');
      b.pit(37, 41, '~').row(38, 40, 9, '-').put(38, 8, 'sss');
      b.ground(42, 95, 12).put(44, 11, 'K').put(46, 9, 'W');
      // arena
      b.fill(50, 50, 0, 7).col(50, 8, 11, 'G');
      b.fill(88, 95, 0, 11);
      b.row(56, 59, 9, '-').row(78, 81, 9, '-').row(65, 71, 6, '-');
      b.put(82, 11, 'R');
      b.put(69, 11, 'E');
      return b.done();
    }
  });
})();
