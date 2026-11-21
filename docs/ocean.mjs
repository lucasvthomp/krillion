const palette = [
  [0, [21, 117, 141], [7, 50, 78]],
  [450, [13, 78, 110], [6, 38, 65]],
  [1500, [11, 48, 79], [7, 24, 48]],
  [3400, [15, 32, 57], [6, 17, 34]],
  [5500, [19, 24, 44], [8, 11, 24]],
  [7000, [25, 21, 39], [9, 9, 19]],
];

const clamp = (number, min = 0, max = 1) => Math.max(min, Math.min(max, number));
const mix = (from, to, ratio) => from + (to - from) * ratio;
const color = (rgb) => `rgb(${rgb.map(Math.round).join(', ')})`;
const smooth = (ratio) => ratio * ratio * (3 - 2 * ratio);

function seededRandom(seed) {
  return () => {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

export function createOcean(canvas) {
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) return { descend() {} };

  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const random = seededRandom(18832);
  const scatter = (count, make) => Array.from({ length: count }, () => make());
  const particles = scatter(150, () => [random(), random(), random(), random()]);
  const fish = scatter(27, () => [random(), random(), random(), random()]);
  const jellies = scatter(9, () => [random(), random(), random()]);
  const shelves = [690, 1720, 2940, 4380, 5620, 6930];
  let width, height, density;
  let frame = 0;
  let renderedAt = -Infinity;
  let depth = 0;
  let camera = 0;
  let target = 0;
  let travelFrom = 0;
  let travelStarted = 0;
  let travelDuration = 0;

  function waterColor() {
    const next = palette.findIndex(([start]) => start > depth);
    const upper = palette[next < 0 ? palette.length - 1 : next];
    const lower = palette[Math.max(0, (next < 0 ? palette.length : next) - 1)];
    const ratio = upper[0] === lower[0] ? 0 : (depth - lower[0]) / (upper[0] - lower[0]);
    const water = ctx.createLinearGradient(0, 0, 0, height);
    water.addColorStop(0, color(lower[1].map((value, i) => mix(value, upper[1][i], ratio))));
    water.addColorStop(1, color(lower[2].map((value, i) => mix(value, upper[2][i], ratio))));
    ctx.fillStyle = water;
    ctx.fillRect(0, 0, width, height);
  }

  function surface(time, offset) {
    const surfaceY = height * .11 - offset * .89;
    const light = clamp(1 - camera / 760);
    if (!light) return;

    for (let ray = 0; ray < 20; ray++) {
      const phase = ray * 4.13;
      const x = width * (.10 + ray * .041 + Math.sin(time * .2 + phase) * .025);
      const tip = x + width * (.22 + Math.sin(phase) * .21);
      const span = width * (.022 + .036 * (1 + Math.cos(phase)));
      const end = surfaceY + height * (.66 + .27 * Math.sin(phase * 2));
      const beam = ctx.createLinearGradient(x, surfaceY, tip, end);
      beam.addColorStop(0, `rgba(196, 255, 240, ${light * (.05 + .032 * (1 + Math.sin(phase)))})`);
      beam.addColorStop(1, 'rgba(155, 241, 241, 0)');
      ctx.fillStyle = beam;
      ctx.beginPath();
      ctx.moveTo(x - span * .2, surfaceY);
      ctx.lineTo(x + span * .2, surfaceY);
      ctx.lineTo(tip + span, end);
      ctx.lineTo(tip - span, end);
      ctx.closePath();
      ctx.fill();
    }

    if (surfaceY < -32) return;
    const wave = (x, layer) => surfaceY + layer * 5 +
      Math.sin(x / 62 + time * .91 + layer * .7) * (7 - layer) +
      Math.sin(x / 25 - time * .7 + layer * .9) * 2.5;

    const surfaceGlow = ctx.createLinearGradient(0, 0, 0, Math.max(1, surfaceY + 27));
    surfaceGlow.addColorStop(0, '#226979');
    surfaceGlow.addColorStop(.7, '#48acb2');
    surfaceGlow.addColorStop(1, '#9ce0d7');
    ctx.beginPath();
    ctx.moveTo(0, -3);
    ctx.lineTo(width, -3);
    for (let x = width + 10; x >= -10; x -= 10) ctx.lineTo(x, wave(x, 0));
    ctx.closePath();
    ctx.fillStyle = surfaceGlow;
    ctx.fill();

    for (let layer = 0; layer < 6; layer++) {
      ctx.beginPath();
      for (let x = -10; x <= width + 10; x += 8) ctx.lineTo(x, wave(x, layer));
      ctx.strokeStyle = `rgba(189, 251, 229, ${(.46 - layer * .067) * light})`;
      ctx.lineWidth = layer ? 1 : 2;
      ctx.stroke();
    }
  }

  function terrain(offset, layer) {
    for (const [index, anchor] of shelves.entries()) {
      const baseline = (anchor / 1000) * height * .9 - offset * layer + height * .27;
      if (baseline < -height * .6 || baseline > height * 1.4) continue;
      const ridge = (fraction) => {
        const edge = Math.pow(Math.abs(fraction * 2 - 1), 2.9) * .32;
        const broad = Math.sin(fraction * 9 + index * 2 + layer) * .064;
        const teeth = (Math.cos(fraction * 32 + index) + Math.sin(fraction * 67 - layer * 2)) * .015;
        return baseline + height * (broad + teeth - edge);
      };
      const step = Math.max(5, width / 180);
      ctx.beginPath();
      for (let x = 0; x <= width; x += step) ctx.lineTo(x, ridge(x / width));
      ctx.lineTo(width, ridge(1));
      ctx.lineTo(width, baseline + height * .62);
      ctx.lineTo(0, baseline + height * .62);
      ctx.closePath();
      const rock = ctx.createLinearGradient(0, baseline - height * .38, 0, baseline + height * .46);
      rock.addColorStop(0, layer >= 1 ? '#001927a6' : '#10526472');
      rock.addColorStop(.55, layer >= 1 ? '#00121d8c' : '#092c4096');
      rock.addColorStop(1, '#040e1b00');
      ctx.fillStyle = rock;
      ctx.fill();
    }
  }

  function swimmingFish(time, offset) {
    const opacity = clamp(1 - camera / 2300);
    if (!opacity) return;
    for (const [x, y, size, seed] of fish) {
      const school = seed < .53 ? 0 : 1;
      const direction = school ? -1 : 1;
      const across = (time * (.013 + seed * .009) + x * .28 + school * .5) % 1;
      const left = direction > 0 ? across : 1 - across;
      const top = (.42 + school * .32 + y * .16) * height - offset * (.51 + seed * .24);
      if (top < -36 || top > height + 36) continue;
      ctx.save();
      ctx.translate(left * (width + 88) - 44, top + 6 * Math.sin(time * .95 + x * 15));
      const magnitude = .44 + size * 1.06;
      ctx.scale(direction * magnitude, magnitude);
      ctx.fillStyle = `rgba(0, 24, 39, ${opacity * (.19 + size * .28)})`;
      ctx.beginPath();
      ctx.moveTo(-8, 0);
      ctx.quadraticCurveTo(1, -8, 11, -3);
      ctx.quadraticCurveTo(18, 0, 10, 4);
      ctx.quadraticCurveTo(2, 8, -8, 1);
      ctx.lineTo(-16 + Math.sin(time * 5 + seed * 12) * 3, 5);
      ctx.lineTo(-14, 0);
      ctx.lineTo(-17, -5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  function deepLife(time, offset) {
    for (const [x, y, seed] of jellies) {
      const world = 1450 + y * 5400;
      const top = world / 1000 * height * .9 - offset * (.91 + seed * .15);
      if (top < -90 || top > height + 90) continue;
      const left = width * (x < .5 ? .08 + x * .45 : .69 + (x - .5) * .46);
      const radius = 12 + seed * 19;
      const pulse = time * 1.35 + seed * 20;
      ctx.save();
      ctx.translate(left + Math.sin(time * .38 + seed * 33) * 17, top + Math.sin(pulse) * 10);
      ctx.scale(1 + Math.sin(pulse) * .09, 1);
      const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 1.65);
      glow.addColorStop(0, 'rgba(79, 219, 241, .18)');
      glow.addColorStop(1, 'rgba(79, 219, 241, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(-radius * 2, -radius * 2, radius * 4, radius * 4);
      ctx.beginPath();
      ctx.ellipse(0, 0, radius, radius * .59, 0, Math.PI, Math.PI * 2);
      ctx.quadraticCurveTo(0, radius * .4, -radius, 0);
      ctx.fillStyle = 'rgba(121, 235, 244, .15)';
      ctx.strokeStyle = 'rgba(146, 235, 247, .37)';
      ctx.fill();
      ctx.stroke();
      for (let arm = -3; arm <= 3; arm++) {
        const start = arm * radius * .23;
        ctx.beginPath();
        ctx.moveTo(start, radius * .13);
        ctx.bezierCurveTo(start + 10 * Math.sin(pulse + arm), radius * .6, start - 6, radius * 1.08,
          start + 10 * Math.cos(pulse + arm), radius * (1.45 + seed * .55));
        ctx.strokeStyle = 'rgba(121, 235, 244, .22)';
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  function suspendedMatter(time, offset) {
    for (const [x, y, size, seed] of particles) {
      const drift = Math.sin(time * .6 + seed * 27) * (7 + 12 * size);
      const vertical = y * height - time * (2 + size * 4) - offset * (.35 + size * .65);
      const top = ((vertical % height) + height) % height;
      const deep = camera > 1100;
      const opacity = (.09 + size * .31) * (.71 + .29 * Math.sin(time * 1.2 + seed * 22));
      ctx.fillStyle = deep ? `rgba(138, 209, 255, ${opacity})` : `rgba(184, 246, 232, ${opacity})`;
      ctx.beginPath();
      ctx.arc(x * width + drift, top, .4 + size * (deep ? 1.5 : 1.9), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function fadeEdges() {
    const gradient = ctx.createRadialGradient(width / 2, height * .48, height * .1,
      width / 2, height * .48, Math.max(width, height) * .64);
    gradient.addColorStop(0, '#02162100');
    gradient.addColorStop(1, '#010b1b92');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  function draw(now) {
    const time = motion.matches ? 0 : now / 1000;
    const offset = camera / 1000 * height * .9;
    ctx.setTransform(density, 0, 0, density, 0, 0);
    waterColor();
    surface(time, offset);
    terrain(offset, .72);
    swimmingFish(time, offset);
    deepLife(time, offset);
    terrain(offset, 1.04);
    suspendedMatter(time, offset);
    fadeEdges();
  }

  function animate(now) {
    frame = 0;
    if (now - renderedAt >= 29) {
      const progress = travelDuration ? smooth(clamp((now - travelStarted) / travelDuration)) : 1;
      camera = mix(travelFrom, target, progress);
      depth = clamp(camera - 70, 0, 7000);
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
      depth = clamp(camera - 70, 0, 7000);
      draw(0);
    } else if (!document.hidden) {
      renderedAt = -Infinity;
      frame = requestAnimationFrame(animate);
    }
  }

  function resize() {
    width = Math.max(1, canvas.clientWidth);
    height = Math.max(1, canvas.clientHeight);
    density = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * density);
    canvas.height = Math.round(height * density);
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
