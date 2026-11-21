const palette = [
  [0, [25, 126, 150], [11, 57, 98]],
  [450, [20, 87, 130], [9, 46, 83]],
  [1500, [15, 58, 104], [9, 27, 61]],
  [3400, [22, 36, 78], [9, 18, 44]],
  [5500, [29, 30, 65], [13, 14, 34]],
  [7000, [36, 25, 57], [14, 11, 27]],
];

// Each digit is a palette entry. A dot is transparent.
const reefFish = [
  '......1....',
  '0...11111..',
  '00.1222121.',
  '01122212320',
  '00.1111111.',
  '0....11....',
];
const ray = [
  [
    '.......0........0.......',
    '......010......010......',
    '....01110......01110....',
    '..01112210000001221110..',
    '001122221111111222211100',
    '.0001111122222211111000.',
    '....0000123232100000....',
    '........0111110.........',
    '.........00100..........',
    '...........0............',
    '...........0............',
    '..........0.............',
  ],
  [
    '........0000000.........',
    '......00111111100.......',
    '....001122222221100.....',
    '...01122223232221110....',
    '..0111122222222211110...',
    '.011110001111100011110..',
    '011000...00100...000110.',
    '00.........0.........00.',
    '...........0............',
    '..........0.............',
    '.........0..............',
  ],
];
const jelly = [
  '....01110....',
  '..011222110..',
  '.01223232210.',
  '0122222222210',
  '1101101011011',
  '..1..1.1..1..',
  '..1.1...1.1..',
  '...1....1..1.',
  '...1.....1.1.',
  '....1....1...',
];
const lanternfish = [
  '......1.......',
  '0...11111..3..',
  '00.1111111.2..',
  '011111112110..',
  '00.022011110..',
  '0....0.000....',
];
const kelp = [
  '....2...',
  '..122...',
  '..12....',
  '...2..1.',
  '...2.11.',
  '..1221..',
  '.1122...',
  '..12....',
  '...22...',
  '...12...',
  '..112...',
  '..112...',
];
const branchingCoral = [
  '..3......3......',
  '..22.....32...3.',
  '...21....21..32.',
  '3...21...21..21.',
  '32..221..21.221.',
  '.21..221.21.21..',
  '..211.22121.21..',
  '...222.2221221..',
  '.....21222121...',
  '......222221....',
  '.....0022100....',
];
const fanCoral = [
  '...2......3....',
  '.2322..3.2322..',
  '22232223233322.',
  '211232233321221',
  '.223122121232.',
  '..21223222122.',
  '....11222121..',
  '......2221....',
  '.......21.....',
  '......0110....',
];
const reefDecor = [
  [.046, 'coral', 1], [.100, 'kelp', 1], [.147, 'fan', -1], [.174, 'coral', -1],
  [.234, 'kelp', -1], [.298, 'coral', -1], [.390, 'fan', 1], [.459, 'coral', 1],
  [.606, 'fan', -1], [.688, 'kelp', 1], [.747, 'coral', -1], [.815, 'fan', 1],
  [.873, 'coral', 1], [.924, 'kelp', -1], [.961, 'fan', -1],
];

const clamp = (number, min = 0, max = 1) => Math.max(min, Math.min(max, number));
const mix = (from, to, ratio) => from + (to - from) * ratio;
const blend = (from, to, ratio) => from.map((value, index) => mix(value, to[index], ratio));
const color = (rgb) => `rgb(${rgb.map(Math.round).join(', ')})`;
const smooth = (ratio) => ratio * ratio * (3 - 2 * ratio);

function seededRandom(seed) {
  return () => {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function makeSprite(rows, colors) {
  const sheet = document.createElement('canvas');
  sheet.width = Math.max(...rows.map((row) => row.length));
  sheet.height = rows.length;
  const ink = sheet.getContext('2d');
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (row[x] === '.') continue;
      ink.fillStyle = colors[Number(row[x])];
      ink.fillRect(x, y, 1, 1);
    }
  });
  return sheet;
}

export function createOcean(canvas) {
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) return { descend() {} };

  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const random = seededRandom(18832);
  const scatter = (count, make) => Array.from({ length: count }, () => make());
  const particles = scatter(115, () => [random(), random(), random(), random()]);
  const fish = scatter(22, () => [random(), random(), random(), random()]);
  const deepCreatures = scatter(16, () => [random(), random(), random()]);
  const shelves = [660, 1700, 2950, 4380, 5650, 6920];
  const foldedTail = reefFish.map((row, index) => (index === 3 ? '.01' : '...') + row.slice(3));
  const fishSprites = [
    ['#173a67', '#2899b4', '#62ddd6', '#e2fff3'],
    ['#82465b', '#e88857', '#ffc47d', '#fff2c9'],
    ['#4f4182', '#ae75c5', '#db9fe2', '#f6dafa'],
    ['#646340', '#bf9f56', '#e9d388', '#fff2c0'],
    ['#273d69', '#658cb6', '#a7c8e1', '#ffffff'],
  ].map((colors) => [makeSprite(reefFish, colors), makeSprite(foldedTail, colors)]);
  const raySprites = ray.map((rows) => makeSprite(rows, ['#263453', '#455a7e', '#778dab', '#afa9c6']));
  const jellySprites = [
    makeSprite(jelly, ['#397394', '#559cb7', '#87d5d5', '#c1fff0']),
    makeSprite(jelly, ['#56427d', '#a268b7', '#e297ce', '#ffcef2']),
  ];
  const lanternSprite = makeSprite(lanternfish, ['#162642', '#2c4b6e', '#4e819e', '#b5f7ce']);
  const kelpSprite = makeSprite(kelp, ['#0a3046', '#14615f', '#248880']);
  const coralSprites = {
    coral: [
      makeSprite(branchingCoral, ['#743753', '#ae4c62', '#e07577', '#ffa38c']),
      makeSprite(branchingCoral, ['#754c62', '#b57065', '#eaa36d', '#ffcc91']),
    ],
    fan: [
      makeSprite(fanCoral, ['#66426e', '#9d609d', '#d68bc1', '#f4aad5']),
      makeSprite(fanCoral, ['#775368', '#bc7064', '#e59671', '#f9c597']),
    ],
  };
  const dither = document.createElement('canvas');
  dither.width = dither.height = 4;
  const dots = dither.getContext('2d');
  dots.fillStyle = '#102642';
  dots.fillRect(0, 0, 1, 1);
  dots.fillRect(2, 2, 1, 1);
  const texture = ctx.createPattern(dither, 'repeat');

  let width, height;
  let frame = 0;
  let renderedAt = -Infinity;
  let camera = 0;
  let target = 0;
  let travelFrom = 0;
  let travelStarted = 0;
  let travelDuration = 0;

  function sprite(image, x, y, direction = 1) {
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.scale(direction, 1);
    ctx.drawImage(image, -Math.floor(image.width / 2), 0);
    ctx.restore();
  }

  function waterColor() {
    const depth = clamp(camera - 70, 0, 7000);
    let next = palette.findIndex(([start]) => start > depth);
    if (next < 0) next = palette.length - 1;
    const upper = palette[next];
    const lower = palette[next - 1];
    const ratio = (depth - lower[0]) / (upper[0] - lower[0]);
    const top = blend(lower[1], upper[1], ratio);
    const bottom = blend(lower[2], upper[2], ratio);
    const bands = 13;
    for (let band = 0; band < bands; band++) {
      const y = Math.floor(band * height / bands);
      const end = Math.floor((band + 1) * height / bands);
      ctx.fillStyle = color(blend(top, bottom, band / (bands - 1)));
      ctx.fillRect(0, y, width, end - y);
      if (!band) continue;
      ctx.fillStyle = color(blend(top, bottom, (band - 1) / (bands - 1)));
      for (let x = (band % 2) * 2; x < width; x += 4) ctx.fillRect(x, y, 2, 1);
    }
  }

  function surface(time, offset) {
    const surfaceY = height * .11 - offset * .89;
    const light = clamp(1 - camera / 900);
    if (!light) return;

    for (let rayIndex = 0; rayIndex < 11; rayIndex++) {
      const phase = rayIndex * 4.13;
      const x = width * (.08 + rayIndex * .079 + Math.sin(time * .24 + phase) * .025);
      const slant = width * (.17 + Math.sin(phase) * .12);
      const span = width * (.021 + .014 * (1 + Math.cos(phase)));
      const reach = height * (.63 + .24 * Math.sin(phase * 2));
      for (let y = Math.max(0, Math.ceil(surfaceY)); y < surfaceY + reach; y += 3) {
        const progress = (y - surfaceY) / reach;
        const half = Math.max(1, Math.round(span * (.24 + progress * .66)));
        ctx.fillStyle = `rgba(167, 243, 220, ${light * (1 - progress) * (.07 + .035 * Math.cos(phase))})`;
        ctx.fillRect(Math.round(x + slant * progress) - half, y, half * 2, 3);
      }
    }

    if (surfaceY < -8) return;
    for (let x = 0; x < width; x += 2) {
      const y = Math.round(surfaceY + Math.sin(x / 16 + time * 1.06) * 2.6 + Math.sin(x / 6 - time * .7) * 1.2);
      ctx.fillStyle = '#296d85';
      ctx.fillRect(x, 0, 2, Math.max(0, y));
      ctx.fillStyle = '#4b969f';
      ctx.fillRect(x, y - 4, 2, 4);
      ctx.fillStyle = '#80cbc7';
      ctx.fillRect(x, y, 2, 1);
      ctx.fillStyle = '#6cb9ba';
      ctx.fillRect(x, y + 2 + Math.round(Math.sin(x / 11 - time) * 2), 2, 1);
    }
  }

  function terrain(time, offset, foreground) {
    const layer = foreground ? 1.06 : .72;
    for (const [index, anchor] of shelves.entries()) {
      const baseline = (anchor / 1000) * height * .9 - offset * layer + height * .29;
      if (baseline < -height * .55 || baseline > height * 1.4) continue;
      const ridge = (x) => {
        const fraction = x / width;
        const edge = Math.pow(Math.abs(fraction * 2 - 1), 2.1) * .37;
        const broad = Math.sin(fraction * 10 + index * 2 + layer) * .077;
        const teeth = (Math.cos(fraction * 33 + index) + Math.sin(fraction * 71 - layer * 2)) * .012;
        return Math.round(baseline + height * (broad + teeth - edge));
      };
      const deep = index >= 3;
      const rockColors = deep ? ['#343051', '#212641', '#151c34'] : ['#277080', '#1b485f', '#12384e'];
      const top = deep ? '#454063' : '#3d8590';
      const sand = index === 0 ? ['#deb987', '#af8c68', '#777668'] : ['#a49a8d', '#817d78', '#5e646e'];
      ctx.save();
      ctx.globalAlpha = foreground ? .87 : .37;
      for (let x = 0; x < width; x += 3) {
        const y = ridge(x);
        const shelf = Math.round(3 + 4 * (1 + Math.sin(x / 11 + index * 4)));
        ctx.fillStyle = rockColors[2];
        ctx.fillRect(x, y, 3, height * .47);
        ctx.fillStyle = rockColors[1];
        ctx.fillRect(x, y, 3, shelf + 3);
        ctx.fillStyle = rockColors[0];
        ctx.fillRect(x, y, 3, Math.max(2, shelf / 2 | 0));
        ctx.fillStyle = top;
        ctx.fillRect(x, y, 3, 1);
        if (foreground && index < 2) {
          const bank = Math.sin(x / width * 13 + index * 2) + Math.sin(x / width * 22 + 1) * .26;
          const thickness = Math.max(0, Math.round((bank + .38) * 5));
          if (thickness > 0) {
            ctx.fillStyle = sand[2];
            ctx.fillRect(x, y + 2, 3, thickness + 2);
            ctx.fillStyle = sand[1];
            ctx.fillRect(x, y + 1, 3, thickness);
            ctx.fillStyle = sand[0];
            ctx.fillRect(x, y, 3, thickness > 4 ? 2 : 1);
          }
        }
        if (x % 15 === 0) {
          ctx.fillStyle = rockColors[1];
          ctx.fillRect(x, y + shelf + 7 + (x % 11), 2, 2);
        }
      }
      if (foreground && index < 2) {
        for (const [item, [position, kind, facing]] of reefDecor.entries()) {
          if (index === 1 && item % 2) continue;
          const x = width * position + (index === 1 ? 5 : 0);
          const y = ridge(x);
          if (kind === 'kelp') {
            const lean = Math.sin(time * 1.8 + position * 30) > 0 ? 1 : -1;
            sprite(kelpSprite, x, y - kelpSprite.height + 1, lean);
          } else {
            const coral = coralSprites[kind][(item + index) % 2];
            sprite(coral, x, y - coral.height + 1, facing);
          }
        }
      }
      ctx.restore();
    }
  }

  function swimmingFish(time, offset) {
    const opacity = clamp(1 - camera / 1850);
    if (!opacity) return;
    for (const [x, y, size, seed] of fish) {
      const school = seed < .53 ? 0 : 1;
      const direction = school ? -1 : 1;
      const across = (time * (.016 + seed * .006) + x * .34 + school * .59) % 1;
      const left = direction > 0 ? across : 1 - across;
      const top = (.41 + school * .29 + y * .19) * height - offset * (.51 + seed * .24);
      ctx.globalAlpha = opacity * (.50 + size * .44);
      const tail = Number(Math.sin(time * 6 + seed * 30) > 0);
      const species = Math.floor(x * fishSprites.length);
      sprite(fishSprites[species][tail], left * (width + 30) - 15, top + Math.sin(time * 1.6 + x * 15) * 2, direction);
    }

    ctx.globalAlpha = opacity * .94;
    const across = (time * .023 + .18) % 1;
    const y = height * .72 - offset * .67 + Math.sin(time * 1.3) * 3;
    sprite(raySprites[Math.floor(time * 3) % 2], across * (width + 60) - 30, y);
    ctx.globalAlpha = 1;
  }

  function deepLife(time, offset) {
    for (const [x, y, seed] of deepCreatures) {
      const world = 1240 + y * 5580;
      const top = world / 1000 * height * .9 - offset * (.91 + seed * .13);
      if (top < -24 || top > height + 24) continue;
      const left = width * (x < .5 ? .06 + x * .52 : .68 + (x - .5) * .48);
      if (seed > .54) {
        const crossing = (x + time * .015) % 1;
        sprite(lanternSprite, crossing * (width + 36) - 18, top + Math.sin(time * 1.3 + x * 19) * 4);
        continue;
      }
      const pulse = time * 1.75 + seed * 20;
      ctx.globalAlpha = .59 + Math.sin(pulse) * .21;
      const jellySprite = jellySprites[Number(x > .45)];
      sprite(jellySprite, left + Math.sin(time * .62 + seed * 22) * 4, top + Math.sin(pulse) * 3, Math.sin(pulse) < 0 ? -1 : 1);
      ctx.globalAlpha = 1;
    }
  }

  function suspendedMatter(time, offset) {
    const deep = camera > 1100;
    for (const [x, y, size, seed] of particles) {
      const drift = Math.sin(time * .6 + seed * 27) * (1 + 3 * size);
      const vertical = y * height - time * (.35 + size * .9) - offset * (.35 + size * .65);
      const top = ((vertical % height) + height) % height;
      ctx.globalAlpha = (.12 + size * .3) * (.72 + .28 * Math.sin(time * 1.8 + seed * 20));
      ctx.fillStyle = deep ? '#92bcef' : '#b1e4d1';
      ctx.fillRect(Math.round(x * width + drift), Math.round(top), 1, 1);
    }
    ctx.globalAlpha = 1;
  }

  function draw(now) {
    const time = motion.matches ? 0 : now / 1000;
    const offset = camera / 1000 * height * .9;
    waterColor();
    surface(time, offset);
    terrain(time, offset, false);
    swimmingFish(time, offset);
    deepLife(time, offset);
    terrain(time, offset, true);
    suspendedMatter(time, offset);
    ctx.fillStyle = texture;
    ctx.globalAlpha = .12;
    ctx.fillRect(0, 0, width, height);
    ctx.globalAlpha = 1;
  }

  function animate(now) {
    frame = 0;
    if (now - renderedAt >= 29) {
      const progress = travelDuration ? smooth(clamp((now - travelStarted) / travelDuration)) : 1;
      camera = mix(travelFrom, target, progress);
      draw(now);
      renderedAt = now;
    }
    if (!motion.matches && !document.hidden) frame = requestAnimationFrame(animate);
  }

  function refresh() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    if (motion.matches) {
      camera = target;
      draw(0);
    } else if (!document.hidden) {
      renderedAt = -Infinity;
      frame = requestAnimationFrame(animate);
    }
  }

  function resize() {
    const pixelSize = canvas.clientWidth <= 550 ? 3 : 5;
    width = Math.max(1, Math.round(canvas.clientWidth / pixelSize));
    height = Math.max(1, Math.round(canvas.clientHeight / pixelSize));
    canvas.width = width;
    canvas.height = height;
    ctx.imageSmoothingEnabled = false;
    refresh();
  }

  new ResizeObserver(resize).observe(canvas);
  motion.addEventListener('change', refresh);
  document.addEventListener('visibilitychange', refresh);
  resize();

  return {
    descend(metres, inGame) {
      const destination = inGame ? metres + 70 : 0;
      if (destination === target) return;
      travelFrom = camera;
      target = destination;
      travelStarted = performance.now();
      travelDuration = clamp(520 + Math.abs(target - camera) * 1.25, 520, 2300);
      if (motion.matches) refresh();
    },
  };
}
