const answersPerPage = 30;

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function searchKey(text) {
  return text.toLowerCase().normalize('NFKD').replace(/\p{M}/gu, '').trim();
}

function answerBank(answers, question, rarity) {
  const ordered = [...answers].sort((first, second) => second[1] - first[1]);
  const panel = element('div', 'log-bank');
  const search = element('input', 'bank-search');
  search.type = 'search';
  search.placeholder = 'Find an answer…';
  search.setAttribute('aria-label', `Find an answer for ${question}`);
  const list = element('ul', 'bank-answers');
  list.setAttribute('aria-label', 'Valid answers');
  const navigation = element('div', 'bank-navigation');
  const previous = element('button', 'plain-button', 'Previous');
  const next = element('button', 'plain-button', 'Next');
  previous.type = next.type = 'button';
  const count = element('span', 'bank-count');
  count.role = 'status';
  navigation.append(previous, count, next);
  panel.append(search, list, navigation);

  let filtered = ordered;
  let searchIndex;
  let offset = 0;

  function renderPage() {
    const page = filtered.slice(offset, offset + answersPerPage);
    list.replaceChildren(...page.map(([name, points, tier, aliases]) => {
      const item = element('li', 'bank-answer');
      const names = element('div', '', name);
      if (aliases?.length) names.append(element('small', 'bank-aliases', aliases.join(', ')));
      const grade = element('strong', 'bank-grade', `${rarity[tier]?.[0] ?? 'Accepted'} · ${points} pts`);
      item.dataset.tier = tier;
      item.append(names, grade);
      return item;
    }));
    list.hidden = !filtered.length;
    list.scrollTop = 0;
    previous.disabled = offset === 0;
    next.disabled = offset + page.length >= filtered.length;
    previous.hidden = next.hidden = filtered.length <= answersPerPage;
    const total = filtered.length.toLocaleString();
    count.textContent = filtered.length ? `${(offset + 1).toLocaleString()}–${(offset + page.length).toLocaleString()} of ${total} answers` : 'No matching answers';
  }

  search.addEventListener('input', () => {
    const query = searchKey(search.value);
    if (query) {
      searchIndex ??= ordered.map(([name, , , aliases = []]) => [name, ...aliases].map(searchKey));
      filtered = ordered.filter((_answer, index) => searchIndex[index].some((name) => name.includes(query)));
    } else {
      filtered = ordered;
    }
    offset = 0;
    renderPage();
  });
  previous.addEventListener('click', () => {
    offset -= answersPerPage;
    renderPage();
    if (previous.disabled) next.focus();
  });
  next.addEventListener('click', () => {
    offset += answersPerPage;
    renderPage();
    if (next.disabled) previous.focus();
  });
  renderPage();
  return panel;
}

export function renderDiveLog(container, log, rounds, rarity) {
  container.replaceChildren(...log.map((entry, index) => {
    const item = element('li', 'log-item');
    const details = element('details', 'log-details');
    details.name = 'dive-answers';
    const summary = element('summary', 'log-question');
    const question = element('span', 'log-question-text', entry.prompt);
    const playerAnswer = entry.answer ? `${entry.answer} · ${rarity[entry.tier]?.[0] ?? 'Accepted'}` : 'No answer';
    question.append(element('small', 'log-player-answer', playerAnswer));
    const points = element('strong', 'log-points', `${entry.points} pts`);
    summary.dataset.tier = entry.tier;
    summary.append(question, points);
    const body = element('div');
    details.append(summary, body);
    details.addEventListener('toggle', () => {
      if (!details.open) {
        body.replaceChildren();
        return;
      }
      for (const other of container.querySelectorAll('details[open]')) {
        if (other !== details) other.open = false;
      }
      if (!body.firstChild) body.append(answerBank(rounds[index].answers, entry.prompt, rarity));
      summary.scrollIntoView({ block: 'nearest' });
    });
    item.append(details);
    return item;
  }));
}
