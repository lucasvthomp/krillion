// Text drawn over the ocean at real depths: facts and wrecks passed on the way down, a depth ruler,
// and during a dive the answer sinking past the depth each rarity tier would reach. The ocean
// reports where it is looking on every frame through update().

// Silhouettes shown beside some facts. Any character other than a dot is filled.
const silhouettes = {
  liner: [
    '..........##...##...##.......',
    '..........##...##...##.......',
    '...#######################...',
    '...#######################...',
    '..#########################..',
    '.###########################.',
    '..#########################..',
    '...#######################...',
    '.....###################.....',
  ],
  warship: [
    '...........#............',
    '..........###...........',
    '......#..#####..#.......',
    '....#################...',
    '...###################..',
    '..#####################.',
    '...####################.',
    '.....###############....',
  ],
  freighter: [
    '...................#....',
    '...................#....',
    '..#.......##.##...###...',
    '..####################..',
    '.######################.',
    '.######################.',
    '..####################..',
    '...##################...',
  ],
  galleon: [
    '.....#.......#.....',
    '....###.....###....',
    '.....#.......#.....',
    '.....#...#...#.....',
    '##################.',
    '.################..',
    '..##############...',
    '...############....',
    '....##########.....',
  ],
  submarine: [
    '.........##.........',
    '........####........',
    '...###############..',
    '..#################.',
    '.###################',
    '..################..',
    '...##############...',
  ],
  penguin: ['.###.', '#####', '#####', '#####', '#####', '.###.', '.#.#.'],
  turtle: [
    '....###.....',
    '..#######...',
    '.##########.',
    '############',
    '.#########..',
    '.#.......#..',
  ],
  whale: [
    '.############..........',
    '##################.....',
    '###################..##',
    '#######################',
    '.######################',
    '..###################.#',
  ],
  seal: ['........##..', '..#####.###.', '.##########.', '##########..', '.#######.##.'],
  octopus: ['.#.###.#.', '#########', '.#######.', '.#######.', '.#######.', '.#.#.#.#.', '#..#.#..#'],
};

function silhouette(kind, colour) {
  const rows = silhouettes[kind];
  const sheet = document.createElement('canvas');
  sheet.className = 'silhouette';
  sheet.width = Math.max(...rows.map((row) => row.length));
  sheet.height = rows.length;
  sheet.style.setProperty('--art-width', sheet.width);
  const ink = sheet.getContext('2d');
  ink.fillStyle = colour;
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) if (row[x] !== '.') ink.fillRect(x, y, 1, 1);
  });
  return sheet;
}

function element(className, text = '') {
  const item = document.createElement('div');
  item.className = className;
  item.textContent = text;
  return item;
}

// Centres an element on a height in the layer.
function place(item, top) {
  item.style.transform = `translate3d(0, ${top.toFixed(1)}px, 0) translateY(-50%)`;
}

const gap = 10;
const overlaps = (box, others) => others.some((other) => box.left < other.right + gap &&
  box.right > other.left - gap && box.top < other.bottom + gap && box.bottom > other.top - gap);
const boxesOf = (items) => items.map((item) => item.getBoundingClientRect())
  .filter((box) => box.width > 0 && box.height > 0);

// What a fact label must not cover: the text of the screen being shown, and the depth readout.
// During a dive the screens are invisible, so only the readout counts.
function screenText(readout) {
  const shown = document.body.classList.contains('diving') ? [] : [...document.querySelectorAll(
    'main > .screen:not([hidden]) > :not([hidden]), main > .screen:not([hidden]) > div:not([hidden]) > :not([hidden])')]
    // A wrapper div spans the whole column, so its children stand in for it.
    .filter((item) => !(item.tagName === 'DIV' && item.parentElement.matches('.screen')));
  return boxesOf(readout && !readout.hidden ? [...shown, readout] : shown);
}

export function createDiveOverlay(layer, facts, rarity, { readout } = {}) {
  const factItems = facts.map(({ depth, side, sprite, text, zone }) => {
    const item = element(`fact ${side}${zone ? ' zone-name' : ''}`);
    // Shapes are dark in sunlit water and pale in the dark, so they read as part of the water.
    if (sprite && silhouettes[sprite]) item.append(silhouette(sprite, depth > 1500 ? '#a9c3e8' : '#01111c'));
    const label = element('fact-label', text);
    item.append(label);
    layer.append(item);
    return [depth, item];
  });
  const ruler = element('ruler');
  const ticks = Array.from({ length: 18 }, () => ruler.appendChild(element('tick')));
  const you = ruler.appendChild(element('you', 'you'));
  layer.append(ruler);
  const tag = element('dive-tag');
  const pill = tag.appendChild(element('dive-pill'));
  tag.hidden = true;
  let lines = [];
  let view = null;

  function draw() {
    if (!view || layer.hidden) return;
    const { depth, camera, surfaceY, pxPerMetre } = view;
    const height = layer.clientHeight;
    const at = (metres) => surfaceY + (metres - camera) * pxPerMetre;
    const visible = (top) => top > -80 && top < height + 80;
    const blockers = screenText(readout);

    for (const [metres, item] of factItems) {
      const top = at(metres);
      item.hidden = !visible(top);
      if (item.hidden) continue;
      place(item, top);
      item.classList.toggle('blocked', overlaps(item.getBoundingClientRect(), blockers));
    }

    const first = Math.max(0, Math.ceil((camera - surfaceY / pxPerMetre) / 50) * 50);
    ticks.forEach((tick, index) => {
      const metres = first + index * 50;
      const top = at(metres);
      tick.hidden = top > height + 10;
      if (tick.hidden) return;
      const major = metres % 100 === 0;
      tick.classList.toggle('major', major);
      tick.textContent = major ? `${metres.toLocaleString()}m` : '';
      place(tick, top);
    });
    you.hidden = depth < 1;
    place(you, at(depth));

    for (const line of lines) {
      line.item.classList.toggle('lit', depth >= line.metres - .5);
      place(line.item, at(line.metres));
    }
    // Tier labels take priority: the depth readout fades while one passes beneath it.
    if (readout) {
      const labels = lines.length ? boxesOf(lines.map((line) => line.label)) : [];
      readout.classList.toggle('yielding', !readout.hidden && overlaps(readout.getBoundingClientRect(), labels));
    }
    if (!tag.hidden) place(tag, at(depth));
  }

  function clearLines() {
    for (const line of lines) line.item.remove();
    lines = [];
  }

  return {
    update(next) {
      view = next;
      draw();
    },
    // Draws a line at the depth each tier would reach from this dive's start, and shows the
    // answer sinking from there.
    startDive(name, tier, from) {
      clearLines();
      lines = Object.entries(rarity).map(([key, [label, points]]) => {
        const item = element('tier-line');
        item.dataset.tier = key;
        const tierLabel = item.appendChild(element('line-label', `${label} · ${points}`));
        layer.insertBefore(item, ruler);
        return { tier: key, metres: from + points * 10, item, label: tierLabel };
      });
      // The answer keeps its own tier's colour for the whole dive.
      pill.textContent = `“${name}”`;
      tag.dataset.tier = tier;
      tag.hidden = false;
      layer.append(tag);
      draw();
    },
    endDive() {
      tag.hidden = true;
    },
    clearLines() {
      clearLines();
      readout?.classList.remove('yielding');
    },
  };
}
