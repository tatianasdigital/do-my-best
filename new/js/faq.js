/*
 * DO MY BEST — FAQSection (75:1333 / open state FAQRowOpen 74:541)
 *
 * Rows are built from config.faq (exact supplied texts; "{Discord}" becomes the Discord
 * link). Each question is a real <button> with aria-expanded / aria-controls, so mouse,
 * Enter and Space all work. Accordion: opening one row closes the other (the Figma
 * open state shows a single expanded row). The answer panel animates its height
 * (grid-template-rows 0fr → 1fr) and the + turns into −.
 */
(function () {
  'use strict';

  const CFG = window.DMB_CONFIG;
  const list = document.querySelector('.faq__list');
  const rows = [];

  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const answerHtml = (a) => esc(a).replace('{Discord}', `<a href="${CFG.links.discord}" target="_blank" rel="noopener">Discord</a>`);

  CFG.faq.forEach((item, i) => {
    const n = String(i + 1).padStart(2, '0');
    const row = document.createElement('div');
    row.className = 'faq-row';
    row.dataset.name = `FAQRow${n}`;
    row.innerHTML = `
      <h3 class="faq-row__h">
        <button class="faq-row__q" type="button" id="faq-q-${n}" aria-expanded="false" aria-controls="faq-a-${n}">
          <span class="faq-row__num">${n}</span>
          <span class="faq-row__text">${esc(item.q)}</span>
          <span class="faq-row__icon" aria-hidden="true">
            <svg class="faq-row__plus" viewBox="0 0 24 24"><use href="#i-plus"/></svg>
            <svg class="faq-row__minus" viewBox="0 0 32 32"><use href="#i-minus"/></svg>
          </span>
        </button>
      </h3>
      <div class="faq-row__panel" id="faq-a-${n}" role="region" aria-labelledby="faq-q-${n}">
        <div class="faq-row__panel-inner"><p class="faq-row__answer">${answerHtml(item.a)}</p></div>
      </div>`;
    list.appendChild(row);
    const btn = row.querySelector('.faq-row__q');
    const panel = row.querySelector('.faq-row__panel-inner');
    panel.setAttribute('inert', '');
    btn.addEventListener('click', () => toggle(i));
    rows.push({ row, btn, panel });
  });

  function setOpen(i, v) {
    const r = rows[i];
    r.row.classList.toggle('is-open', v);
    r.btn.setAttribute('aria-expanded', v ? 'true' : 'false');
    r.panel.toggleAttribute('inert', !v);
  }
  function toggle(i) {
    const willOpen = !rows[i].row.classList.contains('is-open');
    rows.forEach((_, j) => setOpen(j, j === i ? willOpen : false));
    // the page height changes: let the pinned sections / chrome re-measure afterwards
    setTimeout(() => window.DMB && window.DMB.measure(), 520);
  }

  window.DMBFaq = { toggle, rows };
})();
