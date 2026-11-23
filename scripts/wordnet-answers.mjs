import { archiveText } from './catalog-tables.mjs';

// The offsets identify the intended noun senses in WordNet 3.0.
// A topic or a related word is insufficient evidence for transferring an answer.
const scopes = {
  '0010': ['07850329'], '0020': ['07710283'], '0024': ['07679356'],
  '0027': ['00488225'], '0031': ['07811416', '07812184'],
  '0033': ['13600097', '13600404', '13600822', '13601596', '13602526', '13603065', '13603305', '13607985', '13608598', '13608788', '13609214', '13609507'],
  '0038': ['07911677'], '0047': ['14699752'], '0048': ['00502415'], '0054': ['09247410'],
  '0058': ['01726692'], '0059': ['07929519'], '0061': ['05289297'], '0062': ['03497657'],
  '0065': ['01699831'], '0072': ['02159955'], '0073': ['07583197'], '0076': ['03621049'],
  '0094': ['07695965'], '0103': ['03627232'], '0109': ['14381416'],
  '0114': ['07628870'], '0116': ['14586769'], '0121': ['07625493'], '0127': ['07776545'],
  '0128': ['07611148', '07702193'], '0130': ['11524662'], '0134': ['01816887'], '0135': ['07810907'],
  '0155': ['02164464'], '0156': ['07806221'], '0169': ['01674464'], '0197': ['03405725'],
  '0216': ['03309808'], '0228': ['14662574'], '0244': ['04199027'], '0246': ['12997919', '13000891'],
  '0251': ['02773037'], '0258': ['06377442'], '0290': ['05894143'], '0294': ['07742704'],
  '0314': ['14974264'], '0359': ['07635155'], '0362': ['13603305'], '0363': ['03739693'],
  '0368': ['04524313'], '0369': ['03544360'], '0410': ['03489162'],
  '0415': ['12141495'], '0422': ['07708798', '11747468'], '0462': ['03221720'],
  '0492': ['03620052'], '0527': ['03001627'], '0528': ['06523641'], '0557': ['07675627'],
  '0576': ['02908217'], '0602': ['03800933'],
  '0637': ['09239740'], '0707': ['02818832'], '0776': ['03094503'], '0780': ['03153375'],
};

const speciesOnly = new Set(['0058', '0134', '0169']);
const exclusions = {
  '0010': /^(?:velveeta|processed cheese|process cheese|double cream|rat cheese)$/iu,
  '0020': /\b(?:fries|fried|baked|mashed|stuffed|boiled|scalloped|jacket|home fries|chips|latke|hash browns?)\b/iu,
  '0031': /\b(?:tea|oolong|hyson|souchong|pekoe|Darjeeling|congou)\b/iu,
  '0047': /^(?:transparent gem|gem|stone|precious stone)$/iu,
  '0048': /^(?:dart|darts|lotto)$/iu,
  '0059': /^(?:coffee substitute|Postum|chicory)$/iu,
  '0065': /^(?:genus|suborder|family|order)\b/iu,
  '0072': /^(?:insectan|apterygote|pterygote|queen|king|worker|imago|pupa|chrysalis|larva)$/iu,
  '0073': /^(?:stock cube|bouillon cube|stock|broth|marmite|chicken broth|beef broth)$/iu,
  '0076': /^(?:kitchenware|cooking utensil|electric mixer|food blender|blender|electric blender)$/iu,
  '0094': /^(?:open-face sandwich|open sandwich)$/iu,
  '0109': /\b(?:fear|disorder|neurosis)\b/iu,
  '0114': /^(?:pancake|hotcake|griddlecake|flapcake|flapjack|johnnycake|johnny cake|waffle|bannock|corn cake|doughnut|donut|fritter|shortbread|scone|crumpet|cookie|cooky|biscuit|friedcake)\b/iu,
  '0130': /^(?:weather|atmospheric condition|conditions|weather condition|atmospheric conditions)$/iu,
  '0246': /^(?:mold|mould|rust|smut|yeast)\b/iu,
  '0258': /^(?:verse|versification|sursum corda)$/iu,
  '0314': /^(?:Post-It|Kleenex|waste paper)$/iu,
  '0359': /^(?:graham cracker|cracker|oreo|oreo cookie|fig newton|thin mint)\b/iu,
  '0410': /^(?:weapon|whip|sling|bow|bladed weapon|sword)\b/iu,
  '0422': /^(?:legume|leguminous plant)$/iu,
  '0492': /^(?:icebox|ice chest|potbelly|Dutch oven|charcoal burner|spirit stove)$/iu,
  '0527': /^(?:electric chair|death chair|hot seat)$/iu,
  '0528': /\b(?:auto|automobile|vehicle|car|motorcycle|boat|aircraft)\b/iu,
  '0557': /^(?:souse|headcheese|head cheese)$/iu,
  '0637': /^(?:celestial body|heavenly body|starlet)$/iu,
  '0707': /^(?:deathbed|sickbed|marriage bed)$/iu,
  '0776': /\b(?:appliance|washer|washing machine|dishwasher|refrigerator|freezer|stove|oven|microwave|generator|engine|toilet|vehicle|wagon)\b/iu,
};

const excludedBranches = {
  '0020': new Set(['07711569']), // Prepared potato dishes are not root vegetables.
  '0072': new Set(['02160947']),
  '0114': new Set(['07630909', '07635155', '07638676', '07640203', '07641699']),
  '0130': new Set(['11456462', '14520278', '14522113']),
  '0776': new Set(['04576211']),
};

const binomial = /^[A-Z][a-z]+ [a-z][a-z-]+$/u;

export function wordnetAnswers(directory, add) {
  const nouns = archiveText(directory, 'wordnet.zip', 'wordnet/data.noun');
  const senses = archiveText(directory, 'wordnet.zip', 'wordnet/index.sense');
  const synsets = new Map();
  const familiarity = new Map();
  for (const line of senses.split(/\r?\n/u)) {
    const [key, offset, , count] = line.split(' ');
    if (key.includes('%1:')) familiarity.set(offset, Math.max(familiarity.get(offset) ?? 0, Number(count)));
  }
  for (const line of nouns.split(/\r?\n/u)) {
    if (!/^\d{8} /u.test(line)) continue;
    const fields = line.slice(0, line.indexOf(' | ')).trim().split(/\s+/u);
    const words = Number.parseInt(fields[3], 16);
    const names = Array.from({ length: words }, (_, index) => fields[4 + index * 2].replaceAll('_', ' '));
    const start = 4 + words * 2;
    const children = [];
    for (let index = start + 1; index < start + 1 + Number(fields[start]) * 4; index += 4) {
      if (fields[index] === '~') children.push(fields[index + 1]);
    }
    synsets.set(fields[0], { names, children });
  }

  for (const [id, roots] of Object.entries(scopes)) {
    const visited = new Set(roots);
    const stack = roots.flatMap((root) => synsets.get(root).children);
    const entries = [];
    while (stack.length) {
      const offset = stack.pop();
      if (visited.has(offset) || excludedBranches[id]?.has(offset)) continue;
      visited.add(offset);
      const { names, children } = synsets.get(offset);
      // Only traverse a branch if its parent fits the exact prompt.
      const eligible = names.filter((term) => !exclusions[id]?.test(term));
      if (!eligible.length) continue;
      stack.push(...children);
      if (speciesOnly.has(id) && !eligible.some((term) => binomial.test(term))) continue;
      const [name, ...aliases] = eligible;
      const count = familiarity.get(offset) ?? 0;
      const points = count >= 20 ? 10 : count >= 3 ? 30 : 60;
      entries.push([name, points, aliases, offset]);
    }
    if (entries.length) add(id, 'wordnet', entries);
  }
}
