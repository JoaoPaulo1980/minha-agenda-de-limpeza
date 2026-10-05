// As "folhas": janelas que sobem de baixo (no celular) ou aparecem no meio (no computador)
// para detalhe, concluir, cancelar, reagendar, formulários, ficha da cliente e cópia de segurança.

import { S, hoje, agora, mudou, gravar, toast } from './estado.js';
import { dataCurta, dataLonga, somaDias, proximoDiaSemana, diaSemana, DIAS } from './datas.js';
import { libras, paraPence, paraCampo } from './dinheiro.js';
import {
  acharServico, cliente, nomeCliente, avisos, avisosDaSerie, criarCliente, salvarCliente, criarServico, alterarServico,
  concluir, cancelar, marcarPago, pararDepoisDeste, arquivarCliente, reativarCliente,
  novoTipo, habitual, serieAtiva, proximaLimpeza, MOTIVOS, FORMAS, vazio,
} from './modelo.js';
import { rotuloFreq, FREQUENCIAS } from './recorrencia.js';
import { fichaCliente as ficha, esquecidas } from './calculos.js';
import { validarCopia, normalizar } from './armazem.js';
import { dadosDemo } from './demo.js';
import { agoraMin } from './estado.js';
import {
  esc, ico, duracaoTxt, fimTxt, avatar, linhaServico, pilulaStatus, urlMapa, plural,
} from './visual.js';

// ---------------------------------------------------------------- pilha de folhas

const pilha = []; // cada item: { titulo, html(), ligar(raiz) }
let aberta = false;

function raiz() { return document.getElementById('folha'); }

export function abrirFolha(titulo, html, ligar = null) {
  pilha.push({ titulo, html, ligar });
  if (!aberta) {
    aberta = true;
    try { history.pushState({ folha: 1 }, ''); } catch (e) { /* sem histórico */ }
  }
  desenharFolha();
}

export function desenharFolha() {
  const el = raiz();
  if (!pilha.length) {
    el.classList.remove('on');
    el.innerHTML = '';
    document.body.classList.remove('com-folha');
    return;
  }
  const topo = pilha[pilha.length - 1];
  el.innerHTML = `
    <div class="fundo" data-act="fecharFolha"></div>
    <div class="painel" role="dialog" aria-modal="true" aria-label="${esc(topo.titulo)}">
      <div class="cab-folha">
        ${pilha.length > 1 ? `<button class="icone" data-act="voltarFolha" aria-label="Voltar">${ico('esq', 22)}</button>` : '<span></span>'}
        <h2>${esc(topo.titulo)}</h2>
        <button class="icone" data-act="fecharFolha" aria-label="Fechar">${ico('fechar', 22)}</button>
      </div>
      <div class="corpo-folha">${topo.html()}</div>
    </div>`;
  el.classList.add('on');
  document.body.classList.add('com-folha');
  topo.ligar?.(el);
}

export function voltarFolha() {
  pilha.pop();
  desenharFolha();
  if (!pilha.length) encerrarHistorico();
}

/** Esvazia a pilha SEM mexer no histórico: usado ao trocar uma janela por outra. */
export function trocarFolhas() {
  pilha.length = 0;
}

export function fecharFolhas() {
  if (!pilha.length) return;
  pilha.length = 0;
  desenharFolha();
  encerrarHistorico();
}

function encerrarHistorico() {
  if (aberta) {
    aberta = false;
    if (history.state && history.state.folha) history.back();
  }
}

/** O botão "voltar" do celular fecha a janela em vez de sair do aplicativo. */
export function aoVoltarDoNavegador() {
  if (aberta) {
    aberta = false;
    pilha.length = 0;
    desenharFolha();
  }
}

/** Redesenha a janela de cima (depois de uma mudança nos dados). */
export function refrescarFolha() {
  if (pilha.length) desenharFolha();
}

// ---------------------------------------------------------------- pequenos blocos

const campo = (rotulo, conteudo, extra = '') => `<label class="campo ${extra}"><span>${rotulo}</span>${conteudo}</label>`;
const erroBox = '<p class="erro" id="erro" role="alert" hidden></p>';
function mostrarErro(msg) {
  const e = document.getElementById('erro');
  if (e) { e.textContent = msg; e.hidden = false; e.scrollIntoView({ block: 'nearest' }); }
}

const opcoesDuracao = (atual) => {
  const vals = new Set();
  for (let m = 30; m <= 720; m += 30) vals.add(m);
  vals.add(atual);
  return [...vals].sort((a, b) => a - b)
    .map((m) => `<option value="${m}" ${m === atual ? 'selected' : ''}>${duracaoTxt(m)}</option>`).join('');
};

/** Janela de confirmação simples. */
export function confirmar(titulo, texto, rotulo, fn, { perigo = false } = {}) {
  abrirFolha(titulo, () => `
    <p class="texto-grande">${texto}</p>
    <div class="botoes">
      <button class="btn claro" data-act="voltarFolha">Voltar</button>
      <button class="btn ${perigo ? 'perigo' : ''}" data-confirmar="1">${esc(rotulo)}</button>
    </div>`, (el) => {
    el.querySelector('[data-confirmar]').addEventListener('click', () => { fn(); });
  });
}

// ---------------------------------------------------------------- detalhe do serviço

export function abrirServico(id) {
  const s0 = acharServico(S.dados, id);
  if (!s0) return;
  abrirFolha(nomeCliente(S.dados, s0.clienteId), () => htmlServico(id), null);
}

function htmlServico(id) {
  const d = S.dados;
  const s = acharServico(d, id);
  if (!s) return '<p class="texto-grande">Este serviço mudou. Feche e abra de novo.</p>';
  const c = cliente(d, s.clienteId);
  const av = s.status === 'cancelado' ? [] : avisos(d, s, s.id);
  const linhas = [
    ['Quando', `${esc(dataLonga(s.data))}<br><b>${esc(s.hora)} – ${esc(fimTxt(s))}</b> (${esc(duracaoTxt(s.duracao))})`],
    ['Valor combinado', `<b>${libras(s.valor)}</b>`],
    ['Tipo', esc(s.tipo)],
    ['Endereço', `${esc(s.endereco || c?.endereco || '—')}${c?.postcode ? `<br>${esc(c.postcode)}` : ''}`],
  ];
  if (s.obs) linhas.push(['Observações do serviço', esc(s.obs)]);
  if (c?.obs) linhas.push(['Sobre a cliente', esc(c.obs)]);
  if (s.serieId) linhas.push(['Repetição', esc(rotuloFreq(d.series.find((r) => r.id === s.serieId)?.freq ?? 'uma', d.series.find((r) => r.id === s.serieId)?.inicio))]);
  if (s.status === 'concluido') {
    linhas.push(['Valor final', `<b>${libras(s.valorFinal)}</b>`]);
    linhas.push(['Pagamento', s.pago ? `Pago em ${esc(dataCurta(s.dataPagamento))} · ${esc(s.forma)}` : '<b class="alerta-txt">A receber</b>']);
  }
  if (s.status === 'cancelado') linhas.push(['Motivo', esc(s.motivo || 'não informado')]);

  let acoes = '';
  if (s.status === 'agendado') {
    acoes = `
      <button class="btn enorme verde" data-act="concluirServico" data-id="${esc(id)}">${ico('check', 26)} CONCLUIR SERVIÇO</button>
      <div class="botoes tres">
        <button class="btn claro" data-act="reagendar" data-id="${esc(id)}">Reagendar</button>
        <button class="btn claro" data-act="editarServico" data-id="${esc(id)}">Editar</button>
        <button class="btn claro perigo-txt" data-act="cancelarServico" data-id="${esc(id)}">Cancelar</button>
      </div>
      ${s.serieId ? `<button class="link" data-act="pararSerie" data-id="${esc(id)}">Este é o último: parar de repetir depois dele</button>` : ''}`;
  } else if (s.status === 'concluido') {
    acoes = `
      ${s.pago ? '' : `<button class="btn enorme verde" data-act="receber" data-id="${esc(id)}">${ico('check', 26)} Marcar como pago</button>`}
      <div class="botoes">
        <button class="btn claro" data-act="concluirServico" data-id="${esc(id)}">Corrigir valor/pagamento</button>
        <button class="btn claro" data-act="desfazerConclusao" data-id="${esc(id)}">Desfazer conclusão</button>
      </div>`;
  } else {
    acoes = `<button class="btn enorme" data-act="reativarServico" data-id="${esc(id)}">Voltar para agendado</button>`;
  }

  return `
    <div class="cab-detalhe">${avatar(nomeCliente(d, s.clienteId), s.clienteId)}<div>${pilulaStatus(s)}</div></div>
    ${av.map((a) => `<div class="aviso ${a.tipo}">${ico('alerta', 20)} <span>${esc(a.texto)}</span></div>`).join('')}
    ${s.status === 'agendado' ? `<div class="acoes">${acoes}</div>` : ''}
    <dl class="dl">${linhas.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>
    <div class="atalhos">
      ${c?.telefone ? `<a class="btn claro" href="tel:${esc(c.telefone.replace(/[^\d+]/g, ''))}">${ico('fone', 18)} Ligar</a>` : ''}
      <a class="btn claro" href="${esc(urlMapa(s))}" target="_blank" rel="noopener">${ico('pino', 18)} Ver no mapa</a>
      <button class="btn claro" data-act="cliente" data-id="${esc(s.clienteId)}">${ico('pessoa', 18)} Ver cliente</button>
    </div>
    ${s.status === 'agendado' ? '' : `<div class="acoes">${acoes}</div>`}`;
}

// ---------------------------------------------------------------- concluir / receber / cancelar

export function abrirConcluir(id) {
  const s = acharServico(S.dados, id);
  if (!s) return;
  const c = cliente(S.dados, s.clienteId);
  const jaConcluido = s.status === 'concluido';
  const valorIni = jaConcluido ? s.valorFinal : s.valor;
  const pagoIni = jaConcluido ? s.pago : true;
  const formaIni = jaConcluido ? s.forma : (c?.formaPagamento || 'Dinheiro');
  abrirFolha(jaConcluido ? 'Corrigir conclusão' : 'Concluir serviço', () => `
    <p class="texto-grande">${esc(nomeCliente(S.dados, s.clienteId))} · ${esc(dataCurta(s.data))} · ${esc(s.hora)}</p>
    <form id="f-concluir" autocomplete="off">
      ${campo('Valor final (£)', `<input name="valor" inputmode="decimal" value="${paraCampo(valorIni)}" required>`)}
      <div class="campo"><span>Pagamento</span>
        <div class="escolha" role="radiogroup">
          <label><input type="radio" name="pago" value="1" ${pagoIni ? 'checked' : ''}><span>Pago</span></label>
          <label><input type="radio" name="pago" value="0" ${pagoIni ? '' : 'checked'}><span>A receber</span></label>
        </div></div>
      <div class="campo" id="bloco-forma"><span>Forma</span>
        <div class="escolha tres" role="radiogroup">
          ${FORMAS.map((f) => `<label><input type="radio" name="forma" value="${f}" ${f === formaIni ? 'checked' : ''}><span>${f}</span></label>`).join('')}
        </div></div>
      ${erroBox}
      <button class="btn enorme verde" type="submit">${ico('check', 24)} Confirmar</button>
    </form>`, (el) => {
    const f = el.querySelector('#f-concluir');
    const mostrarForma = () => { el.querySelector('#bloco-forma').style.display = f.pago.value === '1' ? '' : 'none'; };
    f.addEventListener('change', mostrarForma);
    mostrarForma();
    f.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const valor = paraPence(f.valor.value);
      if (valor == null) return mostrarErro('Escreva o valor final, por exemplo 60 ou 60.50');
      concluir(S.dados, id, { valorFinal: valor, pago: f.pago.value === '1', forma: f.forma.value, dataPagamento: s.dataPagamento }, hoje());
      fecharFolhas();
      mudou('Serviço concluído ✓');
    });
  });
}

export function abrirReceber(id) {
  const s = acharServico(S.dados, id);
  if (!s) return;
  abrirFolha('Marcar como pago', () => `
    <p class="texto-grande">${esc(nomeCliente(S.dados, s.clienteId))} · ${esc(dataCurta(s.data))} · <b>${libras(s.valorFinal)}</b></p>
    <form id="f-receber">
      <div class="campo"><span>Forma</span>
        <div class="escolha tres">
          ${FORMAS.map((f) => `<label><input type="radio" name="forma" value="${f}" ${f === (s.forma || 'Dinheiro') ? 'checked' : ''}><span>${f}</span></label>`).join('')}
        </div></div>
      ${campo('Data do pagamento', `<input type="date" name="data" value="${hoje()}" max="${hoje()}" required>`)}
      ${erroBox}
      <button class="btn enorme verde" type="submit">${ico('check', 24)} Confirmar pagamento</button>
    </form>`, (el) => {
    el.querySelector('#f-receber').addEventListener('submit', (ev) => {
      ev.preventDefault();
      const f = ev.target;
      if (!f.data.value) return mostrarErro('Escolha a data do pagamento.');
      marcarPago(S.dados, id, { forma: f.forma.value, dataPagamento: f.data.value });
      gravar();
      toast('Pagamento registrado ✓');
      S.redesenhar();
      voltarFolha();
    });
  });
}

export function abrirCancelar(id) {
  const s = acharServico(S.dados, id);
  if (!s) return;
  abrirFolha('Cancelar serviço', () => `
    <p class="texto-grande">${esc(nomeCliente(S.dados, s.clienteId))} · ${esc(dataLonga(s.data))} · ${esc(s.hora)}</p>
    <p>O serviço não será apagado: fica registrado como <b>Cancelado</b>. ${s.serieId ? 'As outras limpezas desta cliente continuam normalmente.' : ''}</p>
    <div class="campo"><span>Motivo (opcional)</span></div>
    <div class="lista-botoes">
      ${MOTIVOS.map((m) => `<button class="btn claro" data-motivo="${esc(m)}">${esc(m)}</button>`).join('')}
      <button class="btn claro" data-motivo="">Não informar</button>
    </div>`, (el) => {
    el.querySelectorAll('[data-motivo]').forEach((b) => b.addEventListener('click', () => {
      cancelar(S.dados, id, b.dataset.motivo);
      fecharFolhas();
      mudou('Serviço cancelado');
    }));
  });
}

// ---------------------------------------------------------------- reagendar / escopo

/** Pergunta "só este" ou "este e os próximos" e chama `feito(escopo)`. */
function perguntarEscopo(titulo, feito) {
  abrirFolha(titulo, () => `
    <p class="texto-grande">Esta cliente repete. O que você quer mudar?</p>
    <div class="lista-botoes">
      <button class="btn enorme" data-escopo="este">Alterar somente este serviço</button>
      <button class="btn enorme claro" data-escopo="proximos">Alterar os próximos serviços também</button>
      <small>"Os próximos" começa neste serviço. O que já foi concluído e pago nunca muda.</small>
    </div>`, (el) => {
    el.querySelectorAll('[data-escopo]').forEach((b) => b.addEventListener('click', () => feito(b.dataset.escopo)));
  });
}

export function abrirReagendar(id) {
  const s = acharServico(S.dados, id);
  if (!s) return;
  abrirFolha('Reagendar', () => `
    <p class="texto-grande">${esc(nomeCliente(S.dados, s.clienteId))}<br><small>Agora: ${esc(dataLonga(s.data))}, ${esc(s.hora)}</small></p>
    <form id="f-reag">
      <div class="duas">
        ${campo('Nova data', `<input type="date" name="data" value="${s.data}" required>`)}
        ${campo('Novo horário', `<input type="time" name="hora" value="${s.hora}" required>`)}
      </div>
      <div id="avisos"></div>
      ${erroBox}
      <button class="btn enorme" type="submit">Reagendar</button>
    </form>`, (el) => {
    const f = el.querySelector('#f-reag');
    const checa = () => {
      if (!f.data.value || !f.hora.value) return;
      const av = avisos(S.dados, { ...s, data: f.data.value, hora: f.hora.value }, s.id);
      el.querySelector('#avisos').innerHTML = av.map((a) => `<div class="aviso ${a.tipo}">${ico('alerta', 20)} <span>${esc(a.texto)}</span></div>`).join('');
      f.querySelector('button[type=submit]').textContent = av.some((a) => a.tipo === 'conflito') ? 'Reagendar mesmo assim' : 'Reagendar';
    };
    f.addEventListener('input', checa);
    checa();
    f.addEventListener('submit', (ev) => {
      ev.preventDefault();
      if (!f.data.value || !f.hora.value) return mostrarErro('Escolha a data e o horário.');
      const patch = { data: f.data.value, hora: f.hora.value };
      if (patch.data === s.data && patch.hora === s.hora) return mostrarErro('A data e o horário são os mesmos de antes.');
      const aplicar = (escopo) => {
        alterarServico(S.dados, id, patch, escopo);
        fecharFolhas();
        mudou(escopo === 'proximos' ? 'Reagendado: este e os próximos ✓' : 'Reagendado ✓');
      };
      if (s.serieId) perguntarEscopo('Reagendar', aplicar); else aplicar('este');
    });
  });
}

export function abrirPararSerie(id) {
  confirmar('Parar de repetir', 'Este será o último serviço desta série. Os que estavam marcados depois dele somem da agenda. O histórico fica.',
    'Parar de repetir', () => {
      pararDepoisDeste(S.dados, id);
      fecharFolhas();
      mudou('Série encerrada');
    });
}

// ---------------------------------------------------------------- formulário de serviço

export function abrirFormServico(opts = {}) {
  const d = S.dados;
  if (!d.clientes.some((c) => !c.arquivado) && !opts.id) {
    abrirFolha('Novo serviço', () => `<div class="vazio"><b>Cadastre uma cliente primeiro</b>
      <p>Para marcar uma limpeza, a cliente precisa estar no cadastro.</p>
      <button class="btn grande" data-act="novoCliente">Cadastrar cliente</button></div>`);
    return;
  }
  const editando = opts.id ? acharServico(d, opts.id) : null;
  abrirFolha(editando ? 'Editar serviço' : 'Novo serviço', () => htmlFormServico(editando, opts), (el) => ligarFormServico(el, editando, opts));
}

function htmlFormServico(ed, opts) {
  const d = S.dados;
  const clienteId = ed ? ed.clienteId : (opts.clienteId ?? '');
  const c = cliente(d, clienteId);
  const hab = c ? habitual(d, c) : null;
  const v = {
    data: ed?.data ?? opts.data ?? hoje(),
    hora: ed?.hora ?? hab?.hora ?? '09:00',
    duracao: ed?.duracao ?? hab?.duracao ?? 120,
    valor: ed?.valor ?? hab?.valor ?? null,
    tipo: ed?.tipo ?? 'Limpeza regular',
    endereco: ed?.endereco ?? c?.endereco ?? '',
    obs: ed?.obs ?? '',
    desloc: ed?.deslocamento ?? '',
  };
  const clientes = d.clientes.filter((x) => !x.arquivado).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  return `
  <form id="f-serv" autocomplete="off">
    ${ed
    ? `<p class="texto-grande">${esc(nomeCliente(d, ed.clienteId))}</p><input type="hidden" name="clienteId" value="${esc(ed.clienteId)}">`
    : campo('Cliente', `<select name="clienteId" required><option value="">Escolha a cliente…</option>${clientes.map((x) =>
      `<option value="${esc(x.id)}" ${x.id === clienteId ? 'selected' : ''}>${esc(x.nome)}</option>`).join('')}</select>`)}
    <div class="duas">
      ${campo('Data', `<input type="date" name="data" value="${v.data}" required>`)}
      ${campo('Horário', `<input type="time" name="hora" value="${v.hora}" required>`)}
    </div>
    <div class="duas">
      ${campo('Duração', `<select name="duracao">${opcoesDuracao(v.duracao)}</select>`)}
      ${campo('Valor (£)', `<input name="valor" inputmode="decimal" placeholder="60" value="${v.valor == null ? '' : paraCampo(v.valor)}" required>`)}
    </div>
    ${campo('Tipo de serviço', `<select name="tipo">${d.tipos.map((t) => `<option ${t === v.tipo ? 'selected' : ''}>${esc(t)}</option>`).join('')}<option value="__novo">➕ Criar novo tipo…</option></select>`)}
    <div id="bloco-tipo" hidden>${campo('Nome do novo tipo', '<input name="tipoNovo" maxlength="40" placeholder="Ex.: Limpeza pós-obra">')}</div>
    ${ed ? '' : `${campo('Repetir', `<select name="recorrencia">${Object.entries(FREQUENCIAS).map(([k, f]) => `<option value="${k}">${f.rotulo}</option>`).join('')}</select>`)}
    <p class="dica" id="info-rec" hidden></p><p class="dica" id="ja-tem" hidden></p>`}
    ${campo('Endereço', `<input name="endereco" value="${esc(v.endereco)}" placeholder="Rua, número, cidade">`)}
    ${campo('Observações', `<textarea name="obs" rows="2" placeholder="Ex.: levar escada, cachorro na casa…">${esc(v.obs)}</textarea>`)}
    <details class="mais"><summary>Mais opções</summary>
      ${campo('Tempo para chegar a esta casa (minutos)', `<input name="desloc" inputmode="numeric" value="${v.desloc}" placeholder="30">`)}
      <small>Se o intervalo entre a casa anterior e esta for menor que isso, o aplicativo avisa. Em branco = 30 minutos.</small>
    </details>
    <div id="avisos"></div>
    ${erroBox}
    <div class="botoes">
      <button type="button" class="btn claro" data-act="fecharFolha">Cancelar</button>
      <button class="btn" type="submit" id="salvar-serv">Salvar</button>
    </div>
  </form>`;
}

function ligarFormServico(el, ed, opts) {
  const d = S.dados;
  const f = el.querySelector('#f-serv');
  const lerDesloc = () => {
    const n = parseInt(f.desloc.value, 10);
    return Number.isFinite(n) && n >= 0 ? n : null;
  };
  const atualizarAvisos = () => {
    const caixa = el.querySelector('#avisos');
    if (!f.clienteId.value || !f.data.value || !f.hora.value) { caixa.innerHTML = ''; return; }
    const svc = {
      id: ed?.id ?? '__novo__', clienteId: f.clienteId.value, data: f.data.value, hora: f.hora.value,
      duracao: Number(f.duracao.value), deslocamento: lerDesloc(), status: 'agendado',
    };
    let av = avisos(d, svc, ed?.id).map((a) => ({ ...a }));
    const rec = f.recorrencia?.value;
    if (!ed && rec && rec !== 'uma') {
      const r = avisosDaSerie(d, { ...svc, recorrencia: rec });
      if (r && r.data !== svc.data) av.push({ tipo: 'conflito', texto: `Nas repetições: em ${dataCurta(r.data)} — ${r.avisos[0].texto}` });
    }
    caixa.innerHTML = av.map((a) => `<div class="aviso ${a.tipo}">${ico('alerta', 20)} <span>${esc(a.texto)}</span></div>`).join('');
    el.querySelector('#salvar-serv').textContent = av.some((a) => a.tipo === 'conflito') ? 'Salvar mesmo assim' : 'Salvar';
  };
  const atualizarRec = () => {
    if (!f.recorrencia) return;
    const info = el.querySelector('#info-rec');
    const rec = f.recorrencia.value;
    if (rec === 'uma' || !f.data.value) { info.hidden = true; } else {
      info.hidden = false;
      info.textContent = `Vai aparecer na agenda: ${rotuloFreq(rec, f.data.value).toLowerCase()}, às ${f.hora.value}, a partir de ${dataCurta(f.data.value)}. Você não precisa criar de novo.`;
    }
    const ja = el.querySelector('#ja-tem');
    const ativa = f.clienteId.value && rec !== 'uma' ? serieAtiva(d, f.clienteId.value) : null;
    if (ativa) {
      ja.hidden = false;
      ja.textContent = `Atenção: ${nomeCliente(d, ativa.clienteId)} já repete (${rotuloFreq(ativa.freq, ativa.inicio).toLowerCase()}). Isto criaria uma segunda repetição.`;
    } else ja.hidden = true;
  };
  f.clienteId.addEventListener('change', () => {
    const c = cliente(d, f.clienteId.value);
    if (!c) return;
    const hab = habitual(d, c);
    f.hora.value = hab.hora || '09:00';
    f.duracao.value = String(hab.duracao);
    if (![...f.duracao.options].some((o) => o.value === String(hab.duracao))) {
      f.duracao.insertAdjacentHTML('beforeend', `<option value="${hab.duracao}" selected>${duracaoTxt(hab.duracao)}</option>`);
      f.duracao.value = String(hab.duracao);
    }
    f.valor.value = paraCampo(hab.valor);
    f.endereco.value = hab.endereco || c.endereco || '';
    atualizarAvisos(); atualizarRec();
  });
  f.tipo.addEventListener('change', () => { el.querySelector('#bloco-tipo').hidden = f.tipo.value !== '__novo'; });
  f.addEventListener('input', () => { atualizarAvisos(); atualizarRec(); });
  f.addEventListener('change', () => { atualizarAvisos(); atualizarRec(); });
  atualizarAvisos(); atualizarRec();

  f.addEventListener('submit', (ev) => {
    ev.preventDefault();
    if (!f.clienteId.value) return mostrarErro('Escolha a cliente.');
    if (!f.data.value) return mostrarErro('Escolha a data.');
    if (!f.hora.value) return mostrarErro('Escolha o horário.');
    const valor = paraPence(f.valor.value);
    if (valor == null) return mostrarErro('Escreva o valor, por exemplo 60 ou 60.50');
    let tipo = f.tipo.value;
    if (tipo === '__novo') {
      tipo = novoTipo(d, f.tipoNovo.value);
      if (!tipo) return mostrarErro('Escreva o nome do novo tipo.');
    }
    const campos = {
      clienteId: f.clienteId.value, data: f.data.value, hora: f.hora.value, duracao: Number(f.duracao.value), valor, tipo,
      endereco: f.endereco.value.trim(), obs: f.obs.value.trim(), deslocamento: lerDesloc(),
    };
    if (!ed) {
      criarServico(d, { ...campos, recorrencia: f.recorrencia.value });
      fecharFolhas();
      mudou(f.recorrencia.value === 'uma' ? 'Serviço marcado ✓' : 'Serviço marcado — e já está nas próximas semanas ✓');
      return;
    }
    const aplicar = (escopo) => {
      const { clienteId: _c, ...patch } = campos;
      alterarServico(d, ed.id, patch, escopo);
      fecharFolhas();
      mudou('Serviço salvo ✓');
    };
    if (ed.serieId) perguntarEscopo('Salvar alterações', aplicar); else aplicar('este');
  });
}

// ---------------------------------------------------------------- formulário de cliente

export function abrirFormCliente(id = null) {
  const c = id ? cliente(S.dados, id) : null;
  abrirFolha(c ? 'Editar cliente' : 'Nova cliente', () => htmlFormCliente(c), (el) => ligarFormCliente(el, c));
}

function htmlFormCliente(c) {
  const d = S.dados;
  const hab = c ? habitual(d, c) : { freq: 'semanal', hora: '09:00', duracao: 120, valor: null, endereco: '', inicio: null };
  const base = hoje();
  const dow = hab.inicio ? diaSemana(hab.inicio) : diaSemana(somaDias(base, 1));
  const prox = proximoDiaSemana(base, dow);
  return `
  <form id="f-cli" autocomplete="off">
    ${campo('Nome', `<input name="nome" value="${esc(c?.nome ?? '')}" required maxlength="60" autocapitalize="words">`)}
    ${campo('Telefone', `<input name="telefone" type="tel" value="${esc(c?.telefone ?? '')}" placeholder="07XXX XXXXXX">`)}
    ${campo('Endereço', `<input name="endereco" value="${esc(c?.endereco ?? '')}" placeholder="Rua, número, cidade">`)}
    ${campo('Postcode', `<input name="postcode" value="${esc(c?.postcode ?? '')}" placeholder="DA11 0AB" autocapitalize="characters">`)}
    <div class="duas">
      ${campo('Valor habitual (£)', `<input name="valor" inputmode="decimal" value="${hab.valor == null ? '' : paraCampo(hab.valor)}" placeholder="60" required>`)}
      ${campo('Duração habitual', `<select name="duracao">${opcoesDuracao(hab.duracao)}</select>`)}
    </div>
    ${campo('Frequência', `<select name="frequencia">${Object.entries(FREQUENCIAS).map(([k, f]) =>
      `<option value="${k}" ${k === hab.freq ? 'selected' : ''}>${f.rotulo}</option>`).join('')}</select>`)}
    <div id="bloco-rec">
      <div class="duas">
        ${campo('Dia habitual', `<select name="dia">${[1, 2, 3, 4, 5, 6, 0].map((n) => `<option value="${n}" ${n === dow ? 'selected' : ''}>${DIAS[n]}</option>`).join('')}</select>`)}
        ${campo(c ? 'A partir de' : 'Primeira limpeza', `<input type="date" name="inicio" value="${prox}" min="${c ? '' : ''}">`)}
      </div>
    </div>
    ${campo('Horário habitual', `<input type="time" name="hora" value="${hab.hora}" required>`)}
    <p class="dica" id="info-cli" hidden></p>
    <div class="campo"><span>Forma de pagamento</span>
      <div class="escolha tres">${FORMAS.map((x) => `<label><input type="radio" name="forma" value="${x}" ${x === (c?.formaPagamento ?? 'Dinheiro') ? 'checked' : ''}><span>${x}</span></label>`).join('')}</div></div>
    ${campo('Observações', `<textarea name="obs" rows="2" placeholder="Ex.: chave no cofre, cachorro…">${esc(c?.obs ?? '')}</textarea>`)}
    ${erroBox}
    <div class="botoes">
      <button type="button" class="btn claro" data-act="fecharFolha">Cancelar</button>
      <button class="btn" type="submit">Salvar</button>
    </div>
  </form>`;
}

function ligarFormCliente(el, c) {
  const d = S.dados;
  const f = el.querySelector('#f-cli');
  const mostra = () => {
    const rec = f.frequencia.value !== 'uma';
    el.querySelector('#bloco-rec').hidden = !rec;
    const info = el.querySelector('#info-cli');
    if (rec && f.inicio.value && f.hora.value) {
      info.hidden = false;
      info.textContent = `Vai aparecer na agenda: ${rotuloFreq(f.frequencia.value, f.inicio.value).toLowerCase()}, às ${f.hora.value}, começando em ${dataCurta(f.inicio.value)}. Você cadastra uma vez só.${c ? ' Mudanças valem para as próximas limpezas; as já concluídas não mudam.' : ''}`;
    } else info.hidden = true;
  };
  f.dia.addEventListener('change', () => { f.inicio.value = proximoDiaSemana(hoje(), Number(f.dia.value)); mostra(); });
  f.inicio.addEventListener('change', () => { if (f.inicio.value) f.dia.value = String(diaSemana(f.inicio.value)); mostra(); });
  f.frequencia.addEventListener('change', mostra);
  f.hora.addEventListener('input', mostra);
  mostra();
  f.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const nome = f.nome.value.trim();
    if (!nome) return mostrarErro('Escreva o nome da cliente.');
    const valor = paraPence(f.valor.value);
    if (valor == null) return mostrarErro('Escreva o valor habitual, por exemplo 60 ou 60.50');
    if (!f.hora.value) return mostrarErro('Escolha o horário habitual.');
    const rec = f.frequencia.value !== 'uma';
    if (rec && !f.inicio.value) return mostrarErro('Escolha a data da primeira limpeza.');
    const campos = {
      nome, telefone: f.telefone.value, endereco: f.endereco.value, postcode: f.postcode.value, valor,
      duracao: Number(f.duracao.value), hora: f.hora.value, frequencia: f.frequencia.value,
      inicio: rec ? f.inicio.value : null, diaSemana: Number(f.dia.value), formaPagamento: f.forma.value, obs: f.obs.value,
    };
    try {
      if (c) salvarCliente(d, c.id, campos, hoje()); else criarCliente(d, campos, hoje());
    } catch (e) { return mostrarErro(e.message); }
    fecharFolhas();
    mudou(c ? 'Cliente salva ✓' : (rec ? 'Cliente cadastrada — e já está na agenda ✓' : 'Cliente cadastrada ✓'));
  });
}

// ---------------------------------------------------------------- ficha da cliente

export function abrirCliente(id) {
  if (!cliente(S.dados, id)) return;
  abrirFolha(cliente(S.dados, id).nome, () => htmlCliente(id));
}

function htmlCliente(id) {
  const d = S.dados;
  const c = cliente(d, id);
  if (!c) return '<p>Cliente não encontrada.</p>';
  const hab = habitual(d, c);
  const fi = ficha(d, id);
  const prox = proximaLimpeza(d, id, hoje());
  const h = hoje();
  const hist = fi.historico.filter((s) => s.data <= h || s.status !== 'agendado').slice(0, 40);
  const mapaS = { endereco: c.endereco, clienteId: id };
  return `
    <div class="cab-detalhe">${avatar(c.nome, id)}<div><span class="pilula lilas">${esc(rotuloFreq(hab.freq, hab.inicio))}</span>${c.arquivado ? ' <span class="pilula cinza">Parou</span>' : ''}</div></div>
    <dl class="dl">
      <div><dt>Telefone</dt><dd>${c.telefone ? `<a href="tel:${esc(c.telefone.replace(/[^\d+]/g, ''))}">${esc(c.telefone)}</a>` : '—'}</dd></div>
      <div><dt>Endereço</dt><dd>${esc(c.endereco || '—')}${c.postcode ? `<br>${esc(c.postcode)}` : ''}</dd></div>
      <div><dt>Próxima limpeza</dt><dd>${prox ? `<b>${esc(dataLonga(prox.data))}</b>, ${esc(prox.hora)}` : 'Nenhuma marcada'}</dd></div>
      <div><dt>Valor habitual</dt><dd><b>${libras(hab.valor ?? 0)}</b> · ${esc(duracaoTxt(hab.duracao ?? 120))} · ${esc(hab.hora ?? '')}</dd></div>
      <div><dt>Forma de pagamento</dt><dd>${esc(c.formaPagamento)}</dd></div>
      ${c.obs ? `<div><dt>Observações</dt><dd>${esc(c.obs)}</dd></div>` : ''}
    </dl>
    <div class="tiles dois">
      <div class="tile verde"><b>${libras(fi.totalRecebido)}</b><span>Total recebido</span></div>
      <div class="tile ${fi.pendente ? 'ambar' : 'claro'}"><b>${libras(fi.pendente)}</b><span>Pendente</span></div>
    </div>
    <div class="atalhos">
      ${c.arquivado ? '' : `<button class="btn" data-act="novoServico" data-cliente="${esc(id)}">${ico('mais', 18)} Marcar limpeza</button>`}
      <button class="btn claro" data-act="editarCliente" data-id="${esc(id)}">Editar</button>
      ${c.telefone ? `<a class="btn claro" href="tel:${esc(c.telefone.replace(/[^\d+]/g, ''))}">${ico('fone', 18)} Ligar</a>` : ''}
    </div>
    <h3>Histórico</h3>
    ${hist.length ? `<div class="lista">${hist.map((s) => `
      <button class="linha-h" data-act="servico" data-id="${esc(s.id)}">
        <span class="hora"><b>${esc(dataCurta(s.data))}</b><i>${esc(s.hora)}</i></span>
        <span class="meio"><b>${esc(s.tipo)}</b>${pilulaStatus(s)}</span>
        <b class="valor">${libras(s.status === 'concluido' ? s.valorFinal : s.valor)}</b>
      </button>`).join('')}</div>` : '<p class="nota">Ainda não há serviços no histórico.</p>'}
    <div class="perigo-zona">
      ${c.arquivado
    ? `<button class="btn claro" data-act="reativarCliente" data-id="${esc(id)}">Voltar a atender esta cliente</button>`
    : `<button class="link perigo-txt" data-act="arquivarCliente" data-id="${esc(id)}">Esta cliente parou? Encerrar</button>`}
    </div>`;
}

export function abrirArquivar(id) {
  const c = cliente(S.dados, id);
  confirmar('Encerrar cliente', `${esc(c.nome)} deixa de aparecer na lista e de repetir na agenda. O histórico e os pagamentos <b>ficam guardados</b> e continuam nos relatórios. Você pode reativar depois.`,
    'Encerrar cliente', () => {
      arquivarCliente(S.dados, id, hoje());
      fecharFolhas();
      mudou('Cliente encerrada');
    }, { perigo: true });
}

export function reativarClienteAcao(id) {
  reativarCliente(S.dados, id);
  gravar();
  S.redesenhar();
  desenharFolha();
  toast('Cliente reativada');
}

// ---------------------------------------------------------------- menu "+"

export function abrirMais() {
  abrirFolha('Adicionar', () => `
    <div class="lista-botoes">
      <button class="btn enorme" data-act="novoServico">${ico('agenda', 24)} Novo serviço</button>
      <button class="btn enorme claro" data-act="novoCliente">${ico('clientes', 24)} Nova cliente</button>
    </div>`);
}

// ---------------------------------------------------------------- limpezas esquecidas

export function abrirEsquecidas() {
  abrirFolha('Falta concluir', () => {
    const lista = esquecidas(S.dados, hoje(), agoraMin());
    return lista.length
      ? `<p class="texto-grande">Estas limpezas já passaram e ainda estão como "Agendado". Toque em uma para concluir ou cancelar.</p>
         <div class="lista">${lista.map((s) => linhaServico(s)).join('')}</div>`
      : '<div class="vazio"><b>Tudo em dia!</b></div>';
  });
}

// ---------------------------------------------------------------- menu do aplicativo, cópia de segurança

function nomeArquivoCopia() {
  return `agenda-limpeza-${hoje()}.json`;
}

export async function salvarCopia() {
  const d = S.dados;
  const texto = JSON.stringify(d, null, 1);
  const nome = nomeArquivoCopia();
  const arquivo = new File([texto], nome, { type: 'application/json' });
  let feito = false;
  try {
    if (navigator.canShare && navigator.canShare({ files: [arquivo] })) {
      await navigator.share({ files: [arquivo], title: 'Cópia de segurança — Minha Agenda de Limpeza' });
      feito = true;
    }
  } catch (e) {
    if (e && e.name === 'AbortError') return; // ela fechou a janela de compartilhar
  }
  if (!feito) {
    const url = URL.createObjectURL(arquivo);
    const a = document.createElement('a');
    a.href = url; a.download = nome;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }
  d.ultimoBackup = agora().toISOString();
  gravar();
  toast('Cópia salva ✓ Guarde esse arquivo em lugar seguro (Arquivos, e-mail ou WhatsApp).', 5000);
  S.redesenhar();
  refrescarFolha();
}

export function escolherCopia() {
  const inp = document.getElementById('arquivo-copia');
  inp.value = '';
  inp.click();
}

export function lerCopia(arquivo) {
  const leitor = new FileReader();
  leitor.onload = () => {
    let obj;
    try { obj = JSON.parse(String(leitor.result)); } catch (e) { return toast('Esse arquivo não é uma cópia de segurança válida.', 4000); }
    const erro = validarCopia(obj);
    if (erro) return toast(erro, 5000);
    const novo = normalizar(obj);
    abrirFolha('Restaurar cópia', () => `
      <p class="texto-grande">Esta cópia tem <b>${plural(novo.clientes.length, 'cliente', 'clientes')}</b> e
      <b>${plural(novo.servicos.length, 'serviço registrado', 'serviços registrados')}</b>.</p>
      <p class="aviso conflito">${ico('alerta', 20)} <span>Tudo o que está agora neste celular será <b>substituído</b> por esta cópia.</span></p>
      <div class="botoes"><button class="btn claro" data-act="voltarFolha">Voltar</button>
      <button class="btn perigo" data-confirmar="1">Restaurar</button></div>`, (el) => {
      el.querySelector('[data-confirmar]').addEventListener('click', () => {
        S.dados = novo;
        gravar();
        fecharFolhas();
        S.redesenhar();
        toast('Cópia restaurada ✓');
      });
    });
  };
  leitor.onerror = () => toast('Não consegui ler o arquivo.', 4000);
  leitor.readAsText(arquivo);
}

export function abrirMenu() {
  abrirFolha('Cópia de segurança e mais', () => {
    const d = S.dados;
    const ult = d.ultimoBackup ? `Última cópia: ${dataCurta(d.ultimoBackup.slice(0, 10))}` : 'Você ainda não salvou nenhuma cópia.';
    return `
    <p class="texto-grande">Seus dados ficam <b>só neste celular</b>, dentro do navegador. Se você limpar os dados do navegador ou trocar de celular, <b>eles somem</b>. Por isso, salve uma cópia de vez em quando.</p>
    <div class="lista-botoes">
      <button class="btn enorme" data-act="salvarCopia">${ico('salvar', 24)} Salvar cópia de segurança</button>
      <small>${esc(ult)}</small>
      <button class="btn enorme claro" data-act="escolherCopia">${ico('subir', 24)} Restaurar de uma cópia</button>
    </div>
    <h3>Tipos de serviço</h3>
    <p class="nota">${d.tipos.map(esc).join(' · ')}<br>Para criar um novo tipo, use "Criar novo tipo…" na hora de marcar um serviço.</p>
    <h3>Dados de demonstração</h3>
    <div class="lista-botoes">
      <button class="btn claro" data-act="comecarDoZero">Apagar tudo e começar do zero</button>
      <button class="btn claro" data-act="recarregarDemo">Recarregar os dados de demonstração</button>
    </div>
    <p class="nota">Minha Agenda de Limpeza · piloto. Nenhum dado seu sai deste aparelho.</p>`;
  });
}

export function abrirComecarDoZero() {
  confirmar('Começar do zero', 'Isto <b>apaga tudo</b> o que está neste celular (clientes, serviços e pagamentos) e deixa o aplicativo vazio. Se você já usa de verdade, salve uma cópia antes. Não dá para desfazer.',
    'Apagar tudo', () => {
      S.dados = vazio();
      gravar();
      fecharFolhas();
      S.ui.aba = 'hoje';
      S.redesenhar();
      toast('Pronto. Tudo vazio — comece cadastrando a primeira cliente.');
    }, { perigo: true });
}

export function abrirRecarregarDemo() {
  confirmar('Recarregar demonstração', 'Isto <b>substitui tudo</b> que está neste celular pelos dados de demonstração (todos inventados). Não dá para desfazer.',
    'Recarregar', () => {
      S.dados = dadosDemo(hoje(), agoraMin());
      gravar();
      fecharFolhas();
      S.redesenhar();
      toast('Dados de demonstração carregados.');
    }, { perigo: true });
}
