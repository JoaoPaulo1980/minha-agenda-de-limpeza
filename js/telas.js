// As telas. Cada uma devolve HTML; os cliques são tratados em app.js (data-act).

import { S, agora, hoje, agoraMin } from './estado.js';
import {
  dataLonga, dataLongaAno, dataCurta, diaCurtoNum, mesAno, intervaloTxt, intervaloCurto, somaDias, somaMeses,
  inicioSemana, fimSemana, inicioMes, fimMes, diaDoMes, diaSemana, minutosDe, DIAS, DIAS_CURTOS, MESES, partes,
} from './datas.js';
import { libras, librasComSinal } from './dinheiro.js';
import {
  servicosNoPeriodo, nomeCliente, habitual, proximaLimpeza, avisos, serieAtiva,
} from './modelo.js';
import { rotuloFreq } from './recorrencia.js';
import {
  resumo, resumoDoPeriodo, porDia, semanasDoMes, rankingClientes, comparar, pendentes, totalPendente, esquecidas,
} from './calculos.js';
import {
  esc, ico, casas, plural, duracaoTxt, horasTxt, fimTxt, avatar, linhaServico, vazioMsg, urlMapa, pilulaStatus,
} from './visual.js';

const norm = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// ---------------------------------------------------------------- HOJE

function proxima() {
  const h = hoje();
  const agoraM = agoraMin();
  const lista = servicosNoPeriodo(S.dados, h, somaDias(h, 30)).filter((s) => s.status === 'agendado');
  for (const s of lista) {
    const ini = minutosDe(s.hora);
    if (s.data > h) return { s, quando: 'depois' };
    if (ini + s.duracao > agoraM) return { s, quando: ini <= agoraM ? 'agora' : 'hoje', falta: ini - agoraM };
  }
  return null;
}

function emTexto(falta) {
  if (falta <= 0) return 'agora';
  if (falta < 60) return `em ${plural(falta, 'minuto', 'minutos')}`;
  const h = Math.floor(falta / 60);
  const m = falta % 60;
  return `em ${h}h${m ? ` ${m}min` : ''}`;
}

function quandoTexto(p) {
  if (p.quando === 'agora') return `em andamento · termina às ${fimTxt(p.s)}`;
  if (p.quando === 'hoje') return emTexto(p.falta);
  if (p.s.data === somaDias(hoje(), 1)) return `amanhã às ${p.s.hora}`;
  return `${DIAS_CURTOS[diaSemana(p.s.data)]}, ${dataCurta(p.s.data)}`;
}

function avisosTopo() {
  const d = S.dados;
  const caixas = [];
  let urgente = '';
  const esq = esquecidas(d, hoje(), agoraMin());
  if (esq.length) {
    urgente = `<button class="banner ambar compacto" data-act="esquecidas">${ico('alerta', 22)}
      <span><b>${plural(esq.length, 'limpeza passada sem concluir', 'limpezas passadas sem concluir')}</b>
      <small>Toque para concluir ou cancelar — senão não entram nas contas.</small></span>${ico('dir', 18)}</button>`;
  }
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const instalado = navigator.standalone || matchMedia('(display-mode: standalone)').matches;
  let dispensou = false;
  try { dispensou = localStorage.getItem('agenda-dica-ios') === '1'; } catch (e) { /* sem armazenamento */ }
  if (ios && !instalado && !dispensou && !d.demo) {
    caixas.push(`<div class="banner azul">${ico('salvar', 22)}<span><b>Para o iPhone não apagar seus dados:</b>
      <small>toque em <b>Compartilhar</b> (quadrado com seta) e depois em <b>Adicionar à Tela de Início</b>. Abra sempre por esse ícone.</small></span>
      <button class="x" data-act="dispensarIos" aria-label="Fechar">${ico('fechar', 18)}</button></div>`);
  }
  const dias = d.ultimoBackup ? Math.floor((agora() - new Date(d.ultimoBackup)) / 86400000) : null;
  if (!d.demo && d.clientes.length && (dias === null || dias >= 7)) {
    caixas.push(`<button class="banner roxo" data-act="backupAgora">${ico('subir', 22)}
      <span><b>${dias === null ? 'Você ainda não salvou uma cópia de segurança' : `Faz ${dias} dias sem salvar uma cópia`}</b>
      <small>Se o celular for limpo ou trocado, a cópia salva a sua agenda. Toque aqui.</small></span>${ico('dir', 18)}</button>`);
  }
  if (d.demo) {
    caixas.push(`<div class="banner rosa">${ico('alerta', 22)}<span><b>Você está vendo dados de demonstração</b>
      <small>Tudo aqui é inventado, para você experimentar. Quando quiser começar de verdade, use o botão abaixo.</small>
      <button class="mini" data-act="comecarDoZero">Começar do zero</button></span></div>`);
  }
  return { urgente, resto: caixas.join('') };
}

export function telaHoje() {
  const d = S.dados;
  const h = hoje();
  const lista = servicosNoPeriodo(d, h, h);
  const r = resumo(lista);
  const p = proxima();
  const semNada = !d.clientes.length;
  const av = avisosTopo();

  let corpo = '';
  if (semNada) {
    corpo = vazioMsg('clientes', 'Vamos começar!', 'Cadastre sua primeira cliente. Se ela é fixa (toda semana, por exemplo), você cadastra uma vez só e ela aparece sozinha na agenda.',
      '<button class="btn grande" data-act="novoCliente">Cadastrar primeira cliente</button>');
  } else {
    corpo += `
    <div class="tiles">
      <div class="tile azul"><b>${r.ativos}</b><span>${r.ativos === 1 ? 'Casa hoje' : 'Casas hoje'}</span></div>
      <div class="tile verde"><b>${horasTxt(r.minutosPrevistos)}</b><span>Previstas</span></div>
      <div class="tile roxo"><b>${libras(r.previsto)}</b><span>Previsto</span></div>
      <div class="tile rosa"><b>${libras(r.recebido)}</b><span>Recebido</span></div>
    </div>`;
    if (p) {
      const s = p.s;
      const nome = nomeCliente(d, s.clienteId);
      corpo += `
      <section class="proxima" data-act="servico" data-id="${esc(s.id)}" role="button" tabindex="0">
        <div class="topo-prox"><span>${ico('relogio', 18)} ${p.quando === 'agora' ? 'Agora' : 'Próxima limpeza'}</span><b>${esc(quandoTexto(p))}</b></div>
        <div class="corpo-prox">
          <div class="hora-grande">${esc(s.hora)}</div>
          <div class="info">
            <b>${esc(nome)}</b>
            <span>${ico('pino', 14)} ${esc(s.endereco || '—')}</span>
            <span>${esc(duracaoTxt(s.duracao))} · <strong>${libras(s.valor)}</strong>${p.quando === 'depois' ? '' : ''}</span>
          </div>
        </div>
        <a class="btn mapa" href="${esc(urlMapa(s))}" target="_blank" rel="noopener" data-parar="1">${ico('pino', 18)} Ver no mapa</a>
      </section>`;
    }
    corpo += av.urgente;
    corpo += `<div class="cab-lista"><h2>Limpezas de hoje</h2><button class="btn pequeno" data-act="novoServico" data-data="${h}">${ico('mais', 16)} Adicionar serviço</button></div>`;
    corpo += lista.length
      ? `<div class="lista">${lista.map((s) => linhaServico(s)).join('')}</div>`
      : vazioMsg('agenda', 'Nenhuma limpeza hoje', 'Aproveite o dia livre! Veja a Agenda para os próximos dias.');
    const pend = pendentes(d);
    if (pend.length) {
      corpo += `<button class="cartao-link" data-act="aba" data-aba="areceber">
        <span>${ico('receber', 22)} <b>A receber</b><small>${plural(pend.length, 'limpeza', 'limpezas')} sem pagar</small></span>
        <b class="grande-valor">${libras(totalPendente(pend))}</b>${ico('dir', 18)}</button>`;
    }
  }

  return `
  <div class="cab-tela">
    <div><h1>Hoje</h1><p class="data">${esc(dataLongaAno(h))}</p></div>
  </div>
  ${corpo}
  ${av.resto}`;
}

// ---------------------------------------------------------------- AGENDA

function segmentado(atual) {
  const it = [['dia', 'Dia'], ['semana', 'Semana'], ['mes', 'Mês']];
  return `<div class="seg" role="tablist">${it.map(([k, t]) =>
    `<button role="tab" aria-selected="${k === atual}" class="${k === atual ? 'on' : ''}" data-act="agModo" data-m="${k}">${t}</button>`).join('')}</div>`;
}

function resumoLinha(r) {
  return `${casas(r.ativos)} · ${horasTxt(r.minutosPrevistos)} · <b>${libras(r.previsto)}</b>`;
}

function listaDoDia(dia, comData = false) {
  const lista = servicosNoPeriodo(S.dados, dia, dia);
  const r = resumo(lista);
  return `
    <div class="resumo-dia">
      <div>${comData ? `<b>${esc(dataLonga(dia))}</b>` : ''}<span class="${comData ? '' : 'forte'}">${lista.length ? resumoLinha(r) : 'Nenhuma limpeza'}</span></div>
      <button class="btn pequeno" data-act="novoServico" data-data="${dia}">${ico('mais', 16)} Adicionar</button>
    </div>
    ${lista.length ? `<div class="lista">${lista.map((s) => linhaServico(s)).join('')}</div>`
      : vazioMsg('agenda', 'Dia livre', 'Toque em "Adicionar" para marcar uma limpeza neste dia.')}`;
}

function visaoSemana(dia) {
  const ini = inicioSemana(dia);
  const fim = fimSemana(dia);
  const dias = porDia(S.dados, ini, fim);
  const total = resumo(dias.flatMap((x) => x.itens));
  const h = hoje();
  const cartoes = dias.map((x) => `
    <button class="dia-sem ${x.data === h ? 'hoje' : ''} ${x.ativos ? '' : 'livre'}" data-act="irDia" data-data="${x.data}">
      <span class="cab-dia"><b>${esc(diaCurtoNum(x.data).toUpperCase())}</b>
        <span>${x.ativos ? `${casas(x.ativos)} · <b>${libras(x.previsto)}</b>` : 'Livre'}</span></span>
      ${x.itens.length ? `<span class="chips">${x.itens.map((s) => `
        <span class="chip ${s.status}"><i>${esc(s.hora)}</i> ${esc(nomeCliente(S.dados, s.clienteId).split(' ')[0])} <small>${esc(horasTxt(s.duracao))}</small></span>`).join('')}</span>` : ''}
    </button>`).join('');
  return `<div class="semana-grade">${cartoes}</div>
    <div class="total-semana"><span>TOTAL DA SEMANA</span><b>${plural(total.ativos, 'serviço', 'serviços')}</b><b class="v">${libras(total.previsto)}</b><small>previsto</small></div>`;
}

function visaoMes(dia) {
  const ini = inicioMes(dia);
  const fim = fimMes(dia);
  const dias = porDia(S.dados, ini, fim);
  const porData = Object.fromEntries(dias.map((x) => [x.data, x]));
  const sel = S.ui.diaSel && S.ui.diaSel >= ini && S.ui.diaSel <= fim ? S.ui.diaSel : (hoje() >= ini && hoje() <= fim ? hoje() : ini);
  const h = hoje();
  const vaziosAntes = (diaSemana(ini) + 6) % 7;
  let cel = '';
  for (let i = 0; i < vaziosAntes; i += 1) cel += '<span class="cel vazia"></span>';
  for (const x of dias) {
    cel += `<button class="cel ${x.ativos ? 'tem' : ''} ${x.data === h ? 'hoje' : ''} ${x.data === sel ? 'sel' : ''}" data-act="selDia" data-data="${x.data}"
      aria-label="${esc(dataLonga(x.data))}: ${casas(x.ativos)}, ${libras(x.previsto)}">
      <span class="n">${diaDoMes(x.data)}</span>
      ${x.ativos ? `<span class="q">${x.ativos}</span><span class="v">${libras(x.previsto)}</span>` : ''}
    </button>`;
  }
  const r = resumoDoPeriodo(S.dados, ini, fim);
  return `
    <div class="cal">
      <div class="cab-cal">${['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((t) => `<span>${t}</span>`).join('')}</div>
      <div class="grade-cal">${cel}</div>
    </div>
    <p class="legenda">Em cada dia: o número roxo é a quantidade de casas; embaixo, o valor previsto.</p>
    <div class="total-semana"><span>TOTAL DO MÊS</span><b>${plural(r.ativos, 'serviço', 'serviços')}</b><b class="v">${libras(r.previsto)}</b><small>previsto</small></div>
    <div class="dia-aberto">${listaDoDia(sel, true)}</div>`;
}

export function telaAgenda() {
  const u = S.ui;
  const dia = u.agendaData;
  let rotulo;
  if (u.agendaModo === 'dia') rotulo = dataLongaAno(dia);
  else if (u.agendaModo === 'semana') rotulo = intervaloTxt(inicioSemana(dia), fimSemana(dia));
  else rotulo = mesAno(dia);
  const corpo = u.agendaModo === 'dia' ? listaDoDia(dia)
    : u.agendaModo === 'semana' ? visaoSemana(dia) : visaoMes(dia);
  return `
  <div class="cab-tela"><h1>Agenda</h1></div>
  ${segmentado(u.agendaModo)}
  <div class="nav-periodo">
    <button class="icone" data-act="agNav" data-d="-1" aria-label="Anterior">${ico('esq', 22)}</button>
    <b>${esc(rotulo)}</b>
    <button class="icone" data-act="agNav" data-d="1" aria-label="Próximo">${ico('dir', 22)}</button>
    <button class="btn pequeno claro" data-act="agHoje">Hoje</button>
  </div>
  ${corpo}`;
}

// ---------------------------------------------------------------- CLIENTES

export function listaClientesHtml() {
  const d = S.dados;
  const q = norm(S.ui.busca);
  const casam = (c) => !q || norm(c.nome).includes(q) || norm(c.telefone).includes(q) || norm(c.postcode).includes(q);
  const linha = (c) => {
    const hab = habitual(d, c);
    return `<button class="cli" data-act="cliente" data-id="${esc(c.id)}">
      ${avatar(c.nome, c.id)}
      <span class="meio"><b>${esc(c.nome)}</b>
        <span class="sub">${ico('fone', 13)} ${esc(c.telefone || 'sem telefone')}</span>
        <span class="pilula lilas">${esc(rotuloFreq(hab.freq, hab.inicio))}</span></span>
      <span class="dir"><b class="valor">${libras(hab.valor ?? 0)}</b>${ico('dir', 16)}</span>
    </button>`;
  };
  const ativos = d.clientes.filter((c) => !c.arquivado && casam(c)).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  const arq = d.clientes.filter((c) => c.arquivado && casam(c)).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  let html = ativos.map(linha).join('');
  if (!ativos.length) {
    html = q ? vazioMsg('clientes', 'Ninguém com esse nome', 'Confira a escrita ou limpe a busca.')
      : vazioMsg('clientes', 'Nenhuma cliente ainda', 'Toque em "Nova cliente" para cadastrar a primeira.');
  }
  if (arq.length) {
    html += `<button class="link-arq" data-act="verArquivados">${S.ui.mostrarArquivados ? 'Esconder' : 'Mostrar'} ${plural(arq.length, 'cliente que parou', 'clientes que pararam')}</button>`;
    if (S.ui.mostrarArquivados) html += arq.map(linha).join('');
  }
  return html;
}

export function telaClientes() {
  return `
  <div class="cab-tela"><h1>Clientes</h1>
    <button class="btn" data-act="novoCliente">${ico('mais', 18)} Nova cliente</button></div>
  <label class="busca">${ico('clientes', 20)}<input id="busca" type="search" placeholder="Pesquisar cliente…" value="${esc(S.ui.busca)}" autocomplete="off" enterkeyhint="search"></label>
  <div id="lista-clientes" class="lista-cli">${listaClientesHtml()}</div>`;
}

// ---------------------------------------------------------------- A RECEBER

export function telaAReceber() {
  const d = S.dados;
  const lista = pendentes(d);
  const total = totalPendente(lista);
  const linhas = lista.map((s) => `
    <div class="receber-linha">
      <button class="linha-r" data-act="servico" data-id="${esc(s.id)}">
        ${avatar(nomeCliente(d, s.clienteId), s.clienteId)}
        <span class="meio"><b>${esc(nomeCliente(d, s.clienteId))}</b>
          <span class="sub">${esc(dataCurta(s.data))} · ${esc(s.tipo)}</span>
          <span class="pilula ambar">Pendente</span></span>
        <b class="valor">${libras(s.valorFinal)}</b>
      </button>
      <button class="btn verde" data-act="receber" data-id="${esc(s.id)}">${ico('check', 18)} Recebi</button>
    </div>`).join('');
  return `
  <div class="cab-tela"><h1>A receber</h1></div>
  <div class="cartao-total"><span>TOTAL A RECEBER</span><b>${libras(total)}</b><small>${plural(lista.length, 'limpeza', 'limpezas')} sem pagar</small></div>
  ${lista.length ? `<div class="lista">${linhas}</div>` : vazioMsg('check', 'Tudo pago!', 'Nenhuma cliente está devendo.')}`;
}

// ---------------------------------------------------------------- RELATÓRIOS

function barras(itens, { legenda = true } = {}) {
  const max = Math.max(1, ...itens.map((i) => i.valor + (i.extra ?? 0)));
  const cores = ['#6fa3ff', '#6fcf97', '#ffb454', '#b392f0', '#ff7a9c', '#5fd0c6', '#f2b8c6'];
  return `<div class="barras">${itens.map((i, k) => {
    const alt = Math.round((i.valor / max) * 100);
    const alt2 = Math.round(((i.extra ?? 0) / max) * 100);
    return `<div class="barra"><span class="rot-v">${libras(i.valor)}</span>
      <div class="coluna">${alt2 ? `<i class="falta" style="height:${alt2}%"></i>` : ''}<i style="height:${alt}%;background:${cores[k % cores.length]}"></i></div>
      <span class="rot-n">${esc(i.rotulo)}</span></div>`;
  }).join('')}</div>${legenda && itens.some((i) => i.extra) ? '<p class="legenda"><span class="amostra"></span> claro = ainda agendado, não concluído</p>' : ''}`;
}

function compararHtml(atual, anterior, tituloAtual, tituloAnterior, aindaNaoAcabou) {
  const linhas = comparar(atual, anterior).map((l0) => {
    // período ainda em andamento: só a diferença, sem porcentagem (ele ainda vai crescer)
    const l = aindaNaoAcabou ? { ...l0, pct: null } : l0;
    const fmt = (v) => (l.tipo === 'dinheiro' ? libras(v) : l.tipo === 'dinheiro2' ? libras(v, { sempre2: true }) : l.tipo === 'horas' ? horasTxt(v) : String(v));
    const pctTxt = l.pct == null ? '' : `${l.pct > 0 ? '+' : ''}${(Math.round(l.pct * 10) / 10).toFixed(1)}%`;
    let dif;
    if (l.tipo === 'dinheiro') dif = [librasComSinal(l.dif), pctTxt].filter(Boolean).join(' / ');
    else if (l.tipo === 'dinheiro2') dif = pctTxt || (l.dif > 0 ? '+' : '') + libras(l.dif, { sempre2: true });
    else if (l.tipo === 'horas') dif = `${l.dif > 0 ? '+' : '-'}${horasTxt(Math.abs(l.dif))}`;
    else dif = `${l.dif > 0 ? '+' : ''}${l.dif}`;
    const cls = aindaNaoAcabou ? '' : (l.dif > 0 ? 'sobe' : l.dif < 0 ? 'desce' : '');
    return `<div class="cmp"><b>${l.rotulo}</b>
      <div class="cmp-v"><span>${esc(tituloAnterior)}<br><b>${fmt(l.anterior)}</b></span><span>${esc(tituloAtual)}<br><b>${fmt(l.atual)}</b></span></div>
      <div class="cmp-d ${cls}">${l.dif === 0 ? 'igual' : dif}</div></div>`;
  }).join('');
  return `<section class="cartao"><h2>Comparar: ${esc(tituloAnterior)} × ${esc(tituloAtual)}</h2>${linhas}
    ${aindaNaoAcabou ? '<p class="nota">O período atual ainda não terminou, então o número dele ainda vai crescer.</p>' : ''}</section>`;
}

function tilesRelatorio(r, mes) {
  const t = (cls, v, rot) => `<div class="tile ${cls}"><b>${v}</b><span>${rot}</span></div>`;
  return `<div class="tiles tres">
    ${t('azul', r.concluidos, r.concluidos === 1 ? 'Serviço feito' : 'Serviços feitos')}
    ${t('verde', libras(r.faturado), 'Faturado')}
    ${t('roxo', libras(r.recebido), 'Recebido')}
    ${t('rosa', libras(r.aReceber), 'A receber')}
    ${t('claro', horasTxt(r.minutosTrabalhados), 'Trabalhadas')}
    ${t('claro', libras(r.mediaServico, { sempre2: true }), 'Média / serviço')}
    ${t('claro', libras(r.mediaHora, { sempre2: true }), 'Média / hora')}
    ${t('claro', r.clientes, 'Clientes atendidos')}
    ${mes ? t('claro', r.cancelados, r.cancelados === 1 ? 'Cancelamento' : 'Cancelamentos') : t('claro', libras(r.previstoAgendado), 'Ainda agendado')}
  </div>`;
}

export function telaRelatorios() {
  const d = S.dados;
  const u = S.ui;
  const modo = u.relModo;
  const ref = u.relData;
  const h = hoje();
  let corpo = '';
  let rotulo;
  if (modo === 'semana') {
    const ini = inicioSemana(ref);
    const fim = fimSemana(ref);
    rotulo = intervaloTxt(ini, fim);
    const dias = porDia(d, ini, fim);
    const r = resumoDoPeriodo(d, ini, fim);
    const ant = resumoDoPeriodo(d, somaDias(ini, -7), somaDias(ini, -1));
    corpo += tilesRelatorio(r, false);
    if (!r.concluidos && ant.concluidos) {
      corpo += `<button class="btn claro dica-btn" data-act="relNav" data-d="-1">Ainda não concluiu nenhum serviço nesta semana. Ver a semana passada ›</button>`;
    }
    corpo += `<section class="cartao"><h2>Faturamento por dia</h2>${barras(dias.map((x) => ({
      rotulo: DIAS_CURTOS[diaSemana(x.data)], valor: x.faturado, extra: x.previstoAgendado,
    })))}</section>`;
    corpo += `<section class="cartao"><h2>Serviços da semana</h2>${dias.map((x) => `
      <div class="linha-dia"><span><b>${DIAS[diaSemana(x.data)]}</b> <small>${esc(dataCurta(x.data))}</small></span>
      <span>${plural(x.ativos, 'serviço', 'serviços')}</span><b>${libras(x.faturado + x.previstoAgendado)}</b></div>`).join('')}
      <p class="nota">Valor do dia = feito + ainda agendado.</p></section>`;
    corpo += compararHtml(r, ant, 'Esta semana', 'Semana passada', fim >= h);
  } else {
    const ini = inicioMes(ref);
    const fim = fimMes(ref);
    rotulo = mesAno(ref);
    const r = resumoDoPeriodo(d, ini, fim);
    const ant = resumoDoPeriodo(d, somaMeses(ini, -1), fimMes(somaMeses(ini, -1)));
    const sem = semanasDoMes(d, ref);
    const todos = servicosNoPeriodo(d, ini, fim);
    const rank = rankingClientes(todos);
    corpo += tilesRelatorio(r, true);
    if (!r.concluidos && ant.concluidos) {
      corpo += `<button class="btn claro dica-btn" data-act="relNav" data-d="-1">Ainda não concluiu nenhum serviço neste mês. Ver o mês passado ›</button>`;
    }
    if (r.cancelados) {
      corpo += `<div class="aviso-cancel">${plural(r.cancelados, 'serviço cancelado', 'serviços cancelados')} no mês · valor potencial perdido: <b>${libras(r.perdido)}</b>
        <small>(os que só foram reagendados não contam como perda)</small></div>`;
    }
    corpo += `<section class="cartao"><h2>Faturamento por semana</h2>${barras(sem.map((x) => ({
      rotulo: x.rotulo.replace('Semana ', 'Sem. '), valor: x.faturado, extra: x.previstoAgendado,
    })))}
      <p class="nota">${sem.map((x) => `${x.rotulo}: ${x.sub}`).join(' · ')}</p></section>`;
    corpo += `<section class="cartao"><h2>Principais clientes</h2>${rank.length ? rank.map((x, k) => `
      <button class="linha-rank" data-act="cliente" data-id="${esc(x.clienteId)}">
        <span class="pos p${k % 4}">${k + 1}</span><b>${esc(nomeCliente(d, x.clienteId))}</b>
        <span>${plural(x.qtd, 'serviço', 'serviços')}</span><b>${libras(x.total)}</b></button>`).join('')
      : '<p class="nota">Nenhum serviço concluído neste mês ainda.</p>'}</section>`;
    corpo += compararHtml(r, ant, mesAno(ini).split(' ')[0], mesAno(somaMeses(ini, -1)).split(' ')[0], fim >= h);
  }
  return `
  <div class="cab-tela"><h1>Relatórios</h1></div>
  <div class="seg" role="tablist">
    <button role="tab" class="${modo === 'semana' ? 'on' : ''}" data-act="relModo" data-m="semana">Semana</button>
    <button role="tab" class="${modo === 'mes' ? 'on' : ''}" data-act="relModo" data-m="mes">Mês</button>
  </div>
  <div class="nav-periodo">
    <button class="icone" data-act="relNav" data-d="-1" aria-label="Anterior">${ico('esq', 22)}</button>
    <b>${esc(rotulo)}</b>
    <button class="icone" data-act="relNav" data-d="1" aria-label="Próximo">${ico('dir', 22)}</button>
    <button class="btn pequeno claro" data-act="relHoje">Hoje</button>
  </div>
  ${corpo}`;
}
