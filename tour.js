// ── Tour guiado de ajuda (passo a passo, estilo "spotlight") ───────────────
// Motor genérico, reaproveitável em qualquer página.
// Uso: window.iniciarTour([{ seletores: ["#id1", "#id2"], titulo: "...", texto: "..." }, ...])
// "seletores" é uma lista porque o mesmo campo pode ter um id no layout
// desktop e outro no layout/modal mobile: o motor usa o primeiro que
// estiver realmente visível na tela no momento.

let tourPassos = [];
let tourIndice = 0;
let tourEls = { fundo: null, destaque: null, popup: null };

function tourMontarDom() {
  if (tourEls.fundo) return;

  const fundo = document.createElement("div");
  fundo.className = "tour-overlay-fundo";

  const destaque = document.createElement("div");
  destaque.className = "tour-destaque";

  const popup = document.createElement("div");
  popup.className = "tour-popup";
  popup.innerHTML = `
    <button type="button" class="tour-fechar-x" aria-label="Fechar">✕</button>
    <h4></h4>
    <p></p>
    <div class="tour-popup-rodape">
      <span class="tour-contador"></span>
      <div class="tour-botoes">
        <button type="button" class="tour-btn-anterior">Anterior</button>
        <button type="button" class="tour-btn-proximo">Próximo</button>
      </div>
    </div>
  `;

  popup.style.display = "none";

  document.body.appendChild(fundo);
  document.body.appendChild(destaque);
  document.body.appendChild(popup);
  tourEls = { fundo, destaque, popup };

  popup.querySelector(".tour-fechar-x").addEventListener("click", tourFechar);
  popup.querySelector(".tour-btn-anterior").addEventListener("click", () => tourIrPara(tourIndice - 1));
  popup.querySelector(".tour-btn-proximo").addEventListener("click", () => {
    if (tourIndice >= tourPassos.length - 1) tourFechar();
    else tourIrPara(tourIndice + 1);
  });
  fundo.addEventListener("click", tourFechar);

  window.addEventListener("resize", () => {
    if (fundo.classList.contains("ativo")) tourReposicionarAtual();
  });
}

function tourAcharElementoVisivel(seletores) {
  for (const sel of seletores) {
    const el = document.querySelector(sel);
    if (!el) continue;
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return el;
  }
  return null;
}

function tourPosicionar(el) {
  const popup = tourEls.popup;
  const margem = 10;
  const r = el.getBoundingClientRect();

  tourEls.destaque.style.display = "block";
  tourEls.destaque.style.top    = `${r.top - margem}px`;
  tourEls.destaque.style.left   = `${r.left - margem}px`;
  tourEls.destaque.style.width  = `${r.width + margem * 2}px`;
  tourEls.destaque.style.height = `${r.height + margem * 2}px`;

  const alturaPopup = popup.offsetHeight || 150;
  const larguraPopup = popup.offsetWidth || 280;
  const espacoBaixo = window.innerHeight - r.bottom;

  let top;
  if (espacoBaixo > alturaPopup + 24) top = r.bottom + 16;
  else if (r.top > alturaPopup + 24) top = r.top - alturaPopup - 16;
  else top = Math.max(16, window.innerHeight / 2 - alturaPopup / 2);

  let left = r.left;
  if (left + larguraPopup > window.innerWidth - 16) left = window.innerWidth - larguraPopup - 16;
  if (left < 16) left = 16;

  popup.style.top  = `${top}px`;
  popup.style.left = `${left}px`;
}

function tourCentralizarSemAlvo() {
  const popup = tourEls.popup;
  tourEls.destaque.style.display = "none";
  const alturaPopup = popup.offsetHeight || 150;
  const larguraPopup = popup.offsetWidth || 280;
  popup.style.top  = `${Math.max(16, window.innerHeight / 2 - alturaPopup / 2)}px`;
  popup.style.left = `${Math.max(16, window.innerWidth / 2 - larguraPopup / 2)}px`;
}

function tourReposicionarAtual() {
  const passo = tourPassos[tourIndice];
  if (!passo) return;
  const el = tourAcharElementoVisivel(passo.seletores);
  if (el) tourPosicionar(el);
  else tourCentralizarSemAlvo();
}

function tourIrPara(indice) {
  if (indice < 0 || indice >= tourPassos.length) return;
  tourIndice = indice;
  const passo = tourPassos[tourIndice];
  const popup = tourEls.popup;

  popup.querySelector("h4").textContent = passo.titulo;
  popup.querySelector("p").textContent  = passo.texto;
  popup.querySelector(".tour-contador").textContent = `${tourIndice + 1} de ${tourPassos.length}`;
  popup.querySelector(".tour-btn-anterior").disabled = tourIndice === 0;
  popup.querySelector(".tour-btn-proximo").textContent =
    tourIndice === tourPassos.length - 1 ? "Concluir" : "Próximo";

  const el = tourAcharElementoVisivel(passo.seletores);
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    requestAnimationFrame(() => tourPosicionar(el));
  } else {
    tourCentralizarSemAlvo();
  }
}

function tourFechar() {
  if (!tourEls.fundo) return;
  tourEls.fundo.classList.remove("ativo");
  tourEls.destaque.style.display = "none";
  tourEls.popup.style.display = "none";
}

window.iniciarTour = function (passos) {
  if (!passos || passos.length === 0) return;
  tourMontarDom();
  tourPassos = passos;
  tourEls.fundo.classList.add("ativo");
  tourEls.popup.style.display = "block";
  tourIrPara(0);
};
