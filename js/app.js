// Ponto de partida: monta a moldura (menu, topo, abas), liga os cliques e escolhe a tela.

import { S, agora, hoje, agoraMin, gravar, mudou } from './estado.js';
import { carregar, salvar, pedirPersistencia } from './armazem.js';
import { dadosDemo } from './demo.js';
import { somaDias, somaMeses, inicioSemana } from './datas.js';
import { telaHoje, telaAgenda, telaClientes, telaAReceber, telaRelatorios, listaClientesHtml } from './telas.js';
import {
  abrirServico, abrirConcluir, abrirReceber, abrirCancelar, abrirReagendar, abrirPararSerie, abrirFormServico,
  abrirFormCliente, abrirCliente, abrirArquivar, abrirMais, abrirEsquecidas, abrirMenu, abrirComecarDoZero,
  abrirRecarregarDemo, voltarFolha, fecharFolhas, trocarFolhas, aoVoltarDoNavegador, refrescarFolha, salvarCopia, escolherCopia,
  lerCopia, reativarClienteAcao,
} from './folhas.js';
import { desfazerConclusao, reativar, acharServico } from './modelo.js';
import { pendentes, totalPendente } from './calculos.js';
import { libras } from './dinheiro.js';
import { ico, esc } from './visual.js';

const $ = (sel) => document.querySelector(sel);

const ABAS = [
  ['hoje', 'Hoje', 'hoje'],
  ['agenda', 'Agenda', 'agenda'],
  ['mais', '', 'mais'],
  ['clientes', 'Clientes', 'clientes'],
  ['relatorios', 'Relatórios', 'relatorios'],
];

function montarMoldura() {
  $('#app').innerHTML = `
  <aside id="lateral" aria-label="Menu">
    <div class="marca">${ico('casa', 34)}<b>Minha Agenda<br>de Limpeza</b></div>
    <nav>
      ${[['hoje', 'Hoje', 'hoje'], ['agenda', 'Agenda', 'agenda'], ['clientes', 'Clientes', 'clientes'],
    ['relatorios', 'Relatórios', 'relatorios'], ['areceber', 'A receber', 'receber']].map(([k, t, i]) =>
    `<button data-act="aba" data-aba="${k}" data-nav="${k}">${ico(i, 22)}<span>${t}</span></button>`).join('')}
    </nav>
    <button class="btn novo-lateral" data-act="mais">${ico('mais', 20)} Adicionar</button>
    <button class="menu-lateral" data-act="menu">${ico('engrenagem', 20)} Cópia de segurança</button>
  </aside>
  <div id="coluna">
    <header id="topo">
      <b class="logo">${ico('casa', 24)}<span>Minha Agenda<small>de Limpeza</small></span></b>
      <span class="topo-botoes">
        <button class="chip-receber" id="chip-receber" data-act="aba" data-aba="areceber"></button>
        <button class="icone" data-act="menu" aria-label="Cópia de segurança e configurações">${ico('engrenagem', 22)}</button>
      </span>
    </header>
    <main id="tela" tabindex="-1"></main>
  </div>
  <nav id="abas" aria-label="Navegação">
    ${ABAS.map(([k, t, i]) => (k === 'mais'
    ? `<button class="aba-mais" data-act="mais" aria-label="Adicionar">${ico('mais', 30)}</button>`
    : `<button class="aba" data-act="aba" data-aba="${k}" data-nav="${k}">${ico(i, 24)}<span>${t}</span></button>`)).join('')}
  </nav>
  <div id="folha"></div>
  <div id="toast" role="status" aria-live="polite"></div>
  <input type="file" id="arquivo-copia" accept=".json,application/json" hidden>`;
}

const TELAS = {
  hoje: telaHoje, agenda: telaAgenda, clientes: telaClientes, areceber: telaAReceber, relatorios: telaRelatorios,
};

function desenhar() {
  const u = S.ui;
  if (!TELAS[u.aba]) u.aba = 'hoje';
  const el = $('#tela');
  const rolagem = window.scrollY;
  const mesmaTela = el.dataset.aba === u.aba;
  el.innerHTML = TELAS[u.aba]();
  el.dataset.aba = u.aba;
  if (mesmaTela) window.scrollTo(0, rolagem);
  document.querySelectorAll('[data-nav]').forEach((b) => b.classList.toggle('on', b.dataset.nav === u.aba));
  const pend = pendentes(S.dados);
  const chip = $('#chip-receber');
  chip.hidden = !pend.length;
  chip.innerHTML = `${ico('receber', 18)} A receber <b>${libras(totalPendente(pend))}</b>`;
  refrescarFolha();
}
S.redesenhar = desenhar;

function irParaAba(aba) {
  S.ui.aba = aba;
  if (location.hash !== `#${aba}`) history.replaceState(null, '', `#${aba}`);
  fecharFolhas();
  desenhar();
  window.scrollTo(0, 0);
}

// ---------------------------------------------------------------- cliques

const ACOES = {
  aba: (el) => irParaAba(el.dataset.aba),
  mais: () => abrirMais(),
  menu: () => abrirMenu(),
  servico: (el) => abrirServico(el.dataset.id),
  concluirServico: (el) => abrirConcluir(el.dataset.id),
  receber: (el) => abrirReceber(el.dataset.id),
  cancelarServico: (el) => abrirCancelar(el.dataset.id),
  reagendar: (el) => abrirReagendar(el.dataset.id),
  editarServico: (el) => abrirFormServico({ id: el.dataset.id }),
  pararSerie: (el) => abrirPararSerie(el.dataset.id),
  desfazerConclusao: (el) => {
    desfazerConclusao(S.dados, el.dataset.id);
    fecharFolhas();
    mudou('Conclusão desfeita');
  },
  reativarServico: (el) => {
    reativar(S.dados, el.dataset.id);
    fecharFolhas();
    mudou('Serviço voltou para agendado');
  },
  novoServico: (el) => {
    const opts = {};
    if (el.dataset.data) opts.data = el.dataset.data;
    if (el.dataset.cliente) opts.clienteId = el.dataset.cliente;
    trocarFolhas();
    abrirFormServico(opts);
  },
  novoCliente: () => { trocarFolhas(); abrirFormCliente(); },
  editarCliente: (el) => abrirFormCliente(el.dataset.id),
  cliente: (el) => abrirCliente(el.dataset.id),
  arquivarCliente: (el) => abrirArquivar(el.dataset.id),
  reativarCliente: (el) => reativarClienteAcao(el.dataset.id),
  verArquivados: () => { S.ui.mostrarArquivados = !S.ui.mostrarArquivados; desenhar(); },
  esquecidas: () => abrirEsquecidas(),
  fecharFolha: () => fecharFolhas(),
  voltarFolha: () => voltarFolha(),
  salvarCopia: () => salvarCopia(),
  backupAgora: () => salvarCopia(),
  escolherCopia: () => escolherCopia(),
  comecarDoZero: () => abrirComecarDoZero(),
  recarregarDemo: () => abrirRecarregarDemo(),
  dispensarIos: () => {
    try { localStorage.setItem('agenda-dica-ios', '1'); } catch (e) { /* sem armazenamento */ }
    desenhar();
  },
  // agenda
  agModo: (el) => { S.ui.agendaModo = el.dataset.m; S.ui.diaSel = null; desenhar(); },
  agNav: (el) => {
    const n = Number(el.dataset.d);
    const u = S.ui;
    if (u.agendaModo === 'dia') u.agendaData = somaDias(u.agendaData, n);
    else if (u.agendaModo === 'semana') u.agendaData = somaDias(u.agendaData, 7 * n);
    else { u.agendaData = somaMeses(u.agendaData, n); u.diaSel = null; }
    desenhar();
  },
  agHoje: () => { S.ui.agendaData = hoje(); S.ui.diaSel = hoje(); desenhar(); },
  irDia: (el) => { S.ui.agendaData = el.dataset.data; S.ui.agendaModo = 'dia'; desenhar(); window.scrollTo(0, 0); },
  selDia: (el) => {
    S.ui.diaSel = el.dataset.data;
    S.ui.agendaData = el.dataset.data;
    desenhar();
    document.querySelector('.dia-aberto')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  },
  // relatórios
  relModo: (el) => { S.ui.relModo = el.dataset.m; desenhar(); },
  relNav: (el) => {
    const n = Number(el.dataset.d);
    S.ui.relData = S.ui.relModo === 'semana' ? somaDias(S.ui.relData, 7 * n) : somaMeses(S.ui.relData, n);
    desenhar();
  },
  relHoje: () => { S.ui.relData = hoje(); desenhar(); },
};

document.addEventListener('click', (ev) => {
  const alvo = ev.target.closest('[data-act]');
  if (!alvo) return;
  // o botão "Ver no mapa" dentro de um cartão clicável só abre o mapa
  if (ev.target.closest('[data-parar]')) return;
  const fn = ACOES[alvo.dataset.act];
  if (fn) { ev.preventDefault(); fn(alvo); }
});
document.addEventListener('keydown', (ev) => {
  if ((ev.key === 'Enter' || ev.key === ' ') && ev.target.matches?.('[role=button][data-act]')) {
    ev.preventDefault();
    ev.target.click();
  }
  if (ev.key === 'Escape') fecharFolhas();
});
document.addEventListener('input', (ev) => {
  if (ev.target.id === 'busca') {
    S.ui.busca = ev.target.value;
    $('#lista-clientes').innerHTML = listaClientesHtml();
  }
});
document.addEventListener('change', (ev) => {
  if (ev.target.id === 'arquivo-copia' && ev.target.files[0]) lerCopia(ev.target.files[0]);
});
window.addEventListener('popstate', aoVoltarDoNavegador);
window.addEventListener('hashchange', () => {
  const aba = location.hash.slice(1);
  if (TELAS[aba] && aba !== S.ui.aba) { S.ui.aba = aba; fecharFolhas(); desenhar(); }
});

// ---------------------------------------------------------------- partida

function iniciar() {
  let dados = carregar();
  if (!dados) {
    dados = dadosDemo(hoje(), agoraMin());
    S.dados = dados;
    salvar(dados);
  }
  S.dados = dados;
  S.ui.agendaData = hoje();
  S.ui.diaSel = hoje();
  S.ui.relData = hoje();
  const aba = location.hash.slice(1);
  if (TELAS[aba]) S.ui.aba = aba;
  montarMoldura();
  desenhar();
  pedirPersistencia();
  // Mantém "em 45 minutos" e "Hoje" atualizados enquanto o aplicativo fica aberto
  setInterval(() => {
    if (document.visibilityState === 'visible' && !document.body.classList.contains('com-folha')
      && ['hoje'].includes(S.ui.aba) && !document.activeElement?.matches?.('input,textarea,select')) desenhar();
  }, 30000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && !document.body.classList.contains('com-folha')) desenhar();
  });
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('./sw.js').catch(() => { /* funciona sem */ });
  }
}

iniciar();

