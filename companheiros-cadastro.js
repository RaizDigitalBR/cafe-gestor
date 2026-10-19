import { db } from "./firebase.js";
import { exigirUsuarioAprovado, ativarTopbarDesktop } from "./acesso.js";
import {
  collection, addDoc, getDocs, doc, deleteDoc
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";
import { verificarPlanoCompleto } from "./companheiros-shared.js";

let usuarioAtual        = null;
let todosOsCompanheiros = [];
let todosOsTrabalhos    = [];

// ── Modal (só usado no celular) ───────────────────────────────────────────────
window.abrirModal  = id => document.getElementById(id).classList.add("aberto");
window.fecharModal = id => document.getElementById(id).classList.remove("aberto");
document.querySelectorAll(".modal-overlay").forEach(m => {
  m.addEventListener("click", e => { if (e.target === m) m.classList.remove("aberto"); });
});

// ── Tour guiado de ajuda (passo a passo) ────────────────────────────────────
const PASSOS_TOUR_COMPANHEIROS_CADASTRO = [
  {
    seletores: [".card-form-lista"],
    titulo: "Bem-vindo(a) à página de Cadastrar Companheiro",
    texto: "Aqui você cadastra as pessoas que trabalham com você na lavoura."
  },
  {
    seletores: ["#nome-companheiro-desktop", "#nome-companheiro"],
    titulo: "Nome",
    texto: "O nome da pessoa que trabalha com você."
  },
  {
    seletores: ["#pix-companheiro-desktop", "#pix-companheiro"],
    titulo: "Chave Pix",
    texto: "Opcional, facilita na hora de registrar o pagamento depois."
  },
  {
    seletores: [".tabela-dados", "#lista-companheiros"],
    titulo: "Companheiros Cadastrados",
    texto: "Depois de cadastrado, esse companheiro pode ser colocado em Turmas e ter trabalho registrado em \"Registrar Trabalho\"."
  }
];
window.iniciarTourCompanheirosCadastro = function () {
  window.iniciarTour(PASSOS_TOUR_COMPANHEIROS_CADASTRO);
};

// ── Tour dedicado da TELA PRINCIPAL do celular (mostra só os botões de
// ação; os campos ficam dentro de cada modal). No desktop o "?" do
// topbar continua chamando iniciarTourCompanheirosCadastro() normal.
const PASSOS_TOUR_COMPANHEIROS_CADASTRO_PRINCIPAL = [
  {
    seletores: [".secao-acoes-mobile"],
    titulo: "Cadastrar Companheiro",
    texto: "Aqui você cadastra as pessoas que trabalham com você na lavoura. Toque em um dos botões abaixo."
  },
  {
    seletores: ["#btn-abrir-cadastro-companheiro"],
    titulo: "Cadastrar Companheiro",
    texto: "Toque aqui pra cadastrar um companheiro novo."
  },
  {
    seletores: ["#btn-abrir-ver-companheiros"],
    titulo: "Ver Companheiros",
    texto: "Toque aqui pra ver ou excluir os companheiros já cadastrados."
  }
];
window.iniciarTourCompanheirosCadastroPrincipal = function () {
  window.iniciarTour(PASSOS_TOUR_COMPANHEIROS_CADASTRO_PRINCIPAL);
};

// ── Tour dedicado SÓ do modal "Cadastrar Companheiro" (celular) ─────────────
const PASSOS_TOUR_COMPANHEIROS_CADASTRO_MODAL = [
  {
    seletores: ["#modal-cadastro .modal-box"],
    titulo: "Cadastrar Companheiro",
    texto: "Aqui você cadastra uma pessoa que trabalha com você na lavoura. Vamos passar pelos campos."
  },
  {
    seletores: ["#nome-companheiro"],
    titulo: "Nome",
    texto: "O nome da pessoa que trabalha com você."
  },
  {
    seletores: ["#pix-companheiro"],
    titulo: "Chave Pix",
    texto: "Opcional, facilita na hora de registrar o pagamento depois."
  },
  {
    seletores: ["#btn-salvar-companheiro"],
    titulo: "Cadastrar Companheiro",
    texto: "Depois de preencher os campos, toque aqui pra salvar o companheiro."
  }
];
window.iniciarTourCompanheirosCadastroModal = function () {
  window.iniciarTour(PASSOS_TOUR_COMPANHEIROS_CADASTRO_MODAL);
};

// ── Tour dedicado do modal "Ver Companheiros" (celular) ──────────────────────
const PASSOS_TOUR_COMPANHEIROS_CADASTRO_VER = [
  {
    seletores: ["#pesquisa-companheiro"],
    titulo: "Buscar Companheiro",
    texto: "Use essa busca pra encontrar rápido um companheiro já cadastrado."
  },
  {
    seletores: ["#lista-companheiros"],
    titulo: "Companheiros Cadastrados",
    texto: "Aqui aparecem todos os companheiros já cadastrados. Depois de cadastrado, um companheiro pode ser colocado em Turmas e ter trabalho registrado em \"Registrar Trabalho\"."
  }
];
window.iniciarTourCompanheirosCadastroVer = function () {
  window.iniciarTour(PASSOS_TOUR_COMPANHEIROS_CADASTRO_VER);
};

// ── Busca ─────────────────────────────────────────────────────────────────────
window.filtrarCompanheiros = function () {
  const termo = document.getElementById("pesquisa-companheiro").value.trim().toLowerCase();
  document.querySelectorAll("#lista-companheiros .card-item").forEach(card => {
    const nome = card.getAttribute("data-nome") || "";
    card.style.display = nome.includes(termo) ? "block" : "none";
  });
};
const pesquisaDesktop = document.getElementById("pesquisa-companheiro-desktop");
if (pesquisaDesktop) {
  pesquisaDesktop.addEventListener("input", () => {
    const termo = pesquisaDesktop.value.trim().toLowerCase();
    document.querySelectorAll("#tabela-companheiros-corpo tr[data-nome]").forEach(linha => {
      const nome = linha.getAttribute("data-nome") || "";
      linha.classList.toggle("linha-oculta", !nome.includes(termo));
    });
  });
}

// ── Carregamento Firebase ─────────────────────────────────────────────────────
async function buscarTrabalhos() {
  todosOsTrabalhos = [];
  const snap = await getDocs(collection(db, "usuarios", usuarioAtual.uid, "trabalhosCompanheiros"));
  snap.forEach(d => todosOsTrabalhos.push({ id: d.id, ...d.data() }));
}

async function carregarCompanheiros() {
  todosOsCompanheiros = [];
  const snap = await getDocs(collection(db, "usuarios", usuarioAtual.uid, "companheiros"));
  snap.forEach(d => todosOsCompanheiros.push({ id: d.id, ...d.data() }));
  todosOsCompanheiros.sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));
  renderizarCompanheiros();
}

// ── Renderização (celular = cards, desktop = tabela) ──────────────────────────
function renderizarCompanheiros() {
  const listaMobile = document.getElementById("lista-companheiros");
  const tabelaDesktop = document.getElementById("tabela-companheiros-corpo");
  const totalDesktop = document.getElementById("total-companheiros-desktop");

  listaMobile.innerHTML = todosOsCompanheiros.length === 0 ? "<p>Nenhum companheiro cadastrado.</p>" : "";
  if (tabelaDesktop) {
    tabelaDesktop.innerHTML = todosOsCompanheiros.length === 0
      ? '<tr class="tabela-vazio"><td colspan="3">Nenhum companheiro cadastrado.</td></tr>' : "";
  }
  if (totalDesktop) totalDesktop.textContent = todosOsCompanheiros.length;

  todosOsCompanheiros.forEach(c => {
    const div = document.createElement("div");
    div.className = "card-item";
    div.setAttribute("data-nome", (c.nome || "").toLowerCase());
    div.innerHTML = `
      <p><strong>Nome:</strong> ${c.nome}</p>
      <p><strong>Chave Pix:</strong> ${c.pix || "-"}</p>
      <button data-id="${c.id}" class="btn-excluir btn-excluir-companheiro">Excluir</button>`;
    listaMobile.appendChild(div);

    if (tabelaDesktop) {
      const tr = document.createElement("tr");
      tr.setAttribute("data-nome", (c.nome || "").toLowerCase());
      tr.innerHTML = `
        <td>${c.nome}</td>
        <td>${c.pix || "-"}</td>
        <td><button data-id="${c.id}" class="btn-excluir-tabela btn-excluir-companheiro">Excluir</button></td>`;
      tabelaDesktop.appendChild(tr);
    }
  });

  document.querySelectorAll(".btn-excluir-companheiro").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-id");
      if (todosOsTrabalhos.some(t => t.companheiroId === id)) {
        alert("Não é possível excluir: companheiro possui trabalhos cadastrados."); return;
      }
      if (!confirm("Excluir este companheiro?")) return;
      await deleteDoc(doc(db, "usuarios", usuarioAtual.uid, "companheiros", id));
      await carregarCompanheiros();
    });
  });
}

// ── Formulários (celular + desktop) ───────────────────────────────────────────
async function cadastrarCompanheiro(nome, pix) {
  await addDoc(collection(db, "usuarios", usuarioAtual.uid, "companheiros"), { nome, pix: pix || null, criadoEm: new Date() });
  await carregarCompanheiros();
}

document.getElementById("cadastro-companheiro-form").addEventListener("submit", async e => {
  e.preventDefault();
  const nome = document.getElementById("nome-companheiro").value.trim();
  const pix  = document.getElementById("pix-companheiro").value.trim();
  await cadastrarCompanheiro(nome, pix);
  alert("Companheiro cadastrado!");
  e.target.reset();
  window.fecharModal("modal-cadastro");
});

const formDesktop = document.getElementById("cadastro-companheiro-form-desktop");
if (formDesktop) {
  formDesktop.addEventListener("submit", async e => {
    e.preventDefault();
    const nome = document.getElementById("nome-companheiro-desktop").value.trim();
    const pix  = document.getElementById("pix-companheiro-desktop").value.trim();
    await cadastrarCompanheiro(nome, pix);
    alert("Companheiro cadastrado!");
    e.target.reset();
  });
}

// ── Início ────────────────────────────────────────────────────────────────────
(async function iniciar() {
  try {
    const resultado = await exigirUsuarioAprovado();
    if (!resultado) return;
    ativarTopbarDesktop(resultado.dados?.dados?.nome);
    if (!verificarPlanoCompleto(resultado)) return;
    usuarioAtual = resultado.user;
    await buscarTrabalhos();
    await carregarCompanheiros();
  } catch (erro) {
    console.error("Erro:", erro);
    window.location.href = "index.html";
  }
})();
