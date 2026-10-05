// Modelo de dados e ações. Sem tela aqui: só regras, para poderem ser testadas.
//
// Três coisas guardadas:
//  • clientes — quem é, o que paga, como gosta de pagar
//  • series   — "Maria, toda terça às 09:00". É a ÚNICA fonte de repetição.
//  • servicos — só as limpezas que ganharam vida própria (concluída, cancelada, movida, editada).
//
// As ocorrências futuras de uma série NÃO são gravadas: são calculadas na hora. Por isso a agenda
// nunca "acaba" (dá para navegar anos à frente) e alterar uma série não deixa lixo para trás.
// Quando algo acontece com uma ocorrência (concluir, cancelar, mover, editar), ela é "materializada":
// vira um registro em `servicos` que guarda de qual série e de qual data (slot) veio. Esse slot
// fica "ocupado", e a série não o gera de novo.

import { somaDias, hhmm, minutosDe, diaSemana, proximoDiaSemana } from './datas.js';
import { ocorrencias, eSlot } from './recorrencia.js';

export const CHAVE = 'agenda-limpeza-v1';
export const TIPOS_INICIAIS = ['Limpeza regular', 'Limpeza profunda', 'Fim de tenancy', 'Limpeza extra', 'Outro'];
export const MOTIVOS = ['Cliente cancelou', 'Profissional cancelou', 'Reagendado', 'Outro'];
export const FORMAS = ['Dinheiro', 'Transferência', 'Outro'];
/** Intervalo mínimo (min) entre uma casa e outra, quando o serviço não define o seu. */
export const DESLOCAMENTO_PADRAO = 30;

export const vazio = () => ({
  versao: 1,
  demo: false,
  clientes: [],
  series: [],
  servicos: [],
  tipos: [...TIPOS_INICIAIS],
  ultimoBackup: null,
});

export const novoId = (prefixo) =>
  `${prefixo}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

// ---------- Leitura ----------

export const cliente = (dados, id) => dados.clientes.find((c) => c.id === id);
export const nomeCliente = (dados, id) => cliente(dados, id)?.nome ?? '(cliente removida)';

const porHorario = (a, b) =>
  a.data.localeCompare(b.data) || a.hora.localeCompare(b.hora) || String(a.id).localeCompare(String(b.id));

function virtual(serie, slot) {
  return {
    id: `v|${serie.id}|${slot}`,
    virtual: true,
    clienteId: serie.clienteId,
    serieId: serie.id,
    slot,
    data: slot,
    hora: serie.hora,
    duracao: serie.duracao,
    valor: serie.valor,
    endereco: serie.endereco,
    tipo: serie.tipo,
    obs: serie.obs ?? '',
    deslocamento: serie.deslocamento ?? null,
    status: 'agendado',
  };
}

/** Todas as limpezas com data entre `de` e `ate` (inclusive), em ordem de dia e horário. */
export function servicosNoPeriodo(dados, de, ate) {
  const ocupados = new Set();
  const saida = [];
  for (const s of dados.servicos) {
    if (s.serieId && s.slot) ocupados.add(`${s.serieId}|${s.slot}`);
    if (s.data >= de && s.data <= ate) saida.push(s);
  }
  for (const serie of dados.series) {
    for (const slot of ocorrencias(serie, de, ate)) {
      if (!ocupados.has(`${serie.id}|${slot}`)) saida.push(virtual(serie, slot));
    }
  }
  return saida.sort(porHorario);
}

export function acharServico(dados, id) {
  if (String(id).startsWith('v|')) {
    const [, serieId, slot] = id.split('|');
    const serie = dados.series.find((r) => r.id === serieId);
    if (!serie || !eSlot(serie, slot)) return null;
    if (dados.servicos.some((s) => s.serieId === serieId && s.slot === slot)) return null;
    return virtual(serie, slot);
  }
  return dados.servicos.find((s) => s.id === id) ?? null;
}

/** Série que a cliente tem hoje (a que não terminou). */
export const serieAtiva = (dados, clienteId) =>
  dados.series.find((r) => r.clienteId === clienteId && !r.fim) ?? null;

/** Dados habituais da cliente: vêm da série ativa, se houver; senão do cadastro. */
export function habitual(dados, c) {
  const r = serieAtiva(dados, c.id);
  return {
    freq: r ? r.freq : 'uma',
    inicio: r ? r.inicio : null,
    hora: r ? r.hora : c.hora,
    duracao: r ? r.duracao : c.duracao,
    valor: r ? r.valor : c.valor,
    endereco: r ? r.endereco : c.endereco,
  };
}

/** Próxima limpeza marcada (não cancelada, não concluída) da cliente, a partir de `desde`. */
export function proximaLimpeza(dados, clienteId, desde) {
  const lista = servicosNoPeriodo(dados, desde, somaDias(desde, 400))
    .filter((s) => s.clienteId === clienteId && s.status === 'agendado');
  return lista[0] ?? null;
}

// ---------- Conflito e intervalo ----------

const inicioMin = (s) => minutosDe(s.hora);
const fimMin = (s) => minutosDe(s.hora) + s.duracao;

/**
 * Avisos de um serviço (ainda não salvo ou já salvo) contra os outros do mesmo dia.
 * Serviço cancelado não gera aviso. Encostar (um acaba 12:00, outro começa 12:00) não é conflito.
 * Devolve [{tipo: 'conflito'|'intervalo', texto}]
 */
export function avisos(dados, svc, ignorarId = null) {
  if (svc.status === 'cancelado') return [];
  const dia = servicosNoPeriodo(dados, svc.data, svc.data)
    .filter((o) => o.status !== 'cancelado' && o.id !== ignorarId && o.id !== svc.id);
  const lista = [];
  const ini = inicioMin(svc);
  const fim = fimMin(svc);
  const desloc = svc.deslocamento ?? DESLOCAMENTO_PADRAO;
  for (const o of dia) {
    const nome = nomeCliente(dados, o.clienteId);
    if (ini < fimMin(o) && fim > inicioMin(o)) {
      lista.push({ tipo: 'conflito', texto: `Conflito de horário com ${nome} (${o.hora}–${hhmm(fimMin(o))})` });
    }
  }
  const antes = dia.filter((o) => fimMin(o) <= ini).sort((a, b) => fimMin(b) - fimMin(a))[0];
  if (antes) {
    const folga = ini - fimMin(antes);
    if (folga < desloc) lista.push({ tipo: 'intervalo', texto: textoFolga(folga, nomeCliente(dados, antes.clienteId)) });
  }
  const depois = dia.filter((o) => inicioMin(o) >= fim).sort((a, b) => inicioMin(a) - inicioMin(b))[0];
  if (depois) {
    const folga = inicioMin(depois) - fim;
    const dDepois = depois.deslocamento ?? DESLOCAMENTO_PADRAO;
    if (folga < Math.max(dDepois, 0)) lista.push({ tipo: 'intervalo', texto: textoFolga(folga, nomeCliente(dados, depois.clienteId)) });
  }
  return lista;
}

const textoFolga = (min, nome) =>
  min <= 0 ? `Nenhum intervalo entre os clientes (${nome})`
    : `Somente ${min} minutos entre os clientes (${nome})`;

/** Para um serviço que vai repetir: confere as próximas ocorrências e devolve o 1º dia com problema. */
export function avisosDaSerie(dados, params, quantas = 12) {
  const serie = { inicio: params.data, freq: params.recorrencia, fim: null };
  const datas = ocorrencias(serie, params.data, somaDias(params.data, 400)).slice(0, quantas);
  for (const data of datas) {
    const av = avisos(dados, { ...params, data, id: '__novo__', status: 'agendado' });
    if (av.length) return { data, avisos: av };
  }
  return null;
}

// ---------- Escrita ----------

/** Transforma uma ocorrência calculada em registro próprio (se ainda não for). */
export function materializar(dados, s) {
  if (!s.virtual) return s;
  const { virtual: _v, ...resto } = s;
  const reg = { ...resto, id: novoId('s') };
  dados.servicos.push(reg);
  return reg;
}

const CAMPOS_SERIE = ['hora', 'duracao', 'valor', 'endereco', 'tipo', 'obs', 'deslocamento'];

function novaSerie(c, extra) {
  return {
    id: novoId('r'),
    clienteId: c.id,
    inicio: extra.inicio,
    freq: extra.freq,
    hora: extra.hora,
    duracao: extra.duracao,
    valor: extra.valor,
    endereco: extra.endereco ?? c.endereco ?? '',
    tipo: extra.tipo ?? 'Limpeza regular',
    obs: extra.obs ?? '',
    deslocamento: extra.deslocamento ?? null,
    fim: null,
  };
}

/**
 * Cadastra a cliente. Se ela tem frequência (≠ "uma vez"), a série nasce junto: a cliente é
 * cadastrada UMA vez e as próximas ocorrências aparecem sozinhas.
 * campos: nome, telefone, endereco, postcode, valor, duracao, hora, frequencia, inicio, formaPagamento, obs
 */
export function criarCliente(dados, campos, hoje) {
  const nome = String(campos.nome ?? '').trim();
  if (!nome) throw new Error('Escreva o nome da cliente.');
  const c = {
    id: novoId('c'),
    nome,
    telefone: String(campos.telefone ?? '').trim(),
    endereco: String(campos.endereco ?? '').trim(),
    postcode: String(campos.postcode ?? '').trim().toUpperCase(),
    valor: campos.valor ?? 0,
    duracao: campos.duracao ?? 120,
    hora: campos.hora || '09:00',
    formaPagamento: campos.formaPagamento || 'Dinheiro',
    obs: String(campos.obs ?? '').trim(),
    arquivado: false,
  };
  dados.clientes.push(c);
  if (campos.frequencia && campos.frequencia !== 'uma') {
    const inicio = campos.inicio || proximoDiaSemana(hoje, campos.diaSemana ?? 1);
    dados.series.push(novaSerie(c, { ...c, freq: campos.frequencia, inicio }));
  }
  return c;
}

/**
 * Edita a cliente. Mudanças de valor, duração, horário, endereço ou frequência valem para as PRÓXIMAS
 * limpezas; as concluídas e o histórico nunca mudam.
 */
export function salvarCliente(dados, id, campos, hoje) {
  const c = cliente(dados, id);
  if (!c) throw new Error('Cliente não encontrada.');
  const nome = String(campos.nome ?? '').trim();
  if (!nome) throw new Error('Escreva o nome da cliente.');
  Object.assign(c, {
    nome,
    telefone: String(campos.telefone ?? '').trim(),
    endereco: String(campos.endereco ?? '').trim(),
    postcode: String(campos.postcode ?? '').trim().toUpperCase(),
    valor: campos.valor ?? c.valor,
    duracao: campos.duracao ?? c.duracao,
    hora: campos.hora || c.hora,
    formaPagamento: campos.formaPagamento || c.formaPagamento,
    obs: String(campos.obs ?? '').trim(),
  });
  const ativa = serieAtiva(dados, id);
  const freq = campos.frequencia ?? (ativa ? ativa.freq : 'uma');
  if (freq === 'uma') {
    if (ativa) encerrarSerie(dados, ativa, somaDias(hoje, -1));
    return c;
  }
  const inicio = campos.inicio || (ativa ? ativa.inicio : proximoDiaSemana(hoje, campos.diaSemana ?? 1));
  if (!ativa) {
    dados.series.push(novaSerie(c, { ...c, freq, inicio }));
    return c;
  }
  const mudouGrade = ativa.freq !== freq || (campos.inicio && campos.inicio !== ativa.inicio && diaSemana(campos.inicio) !== diaSemana(ativa.inicio));
  const mudouResto = ['hora', 'duracao', 'valor', 'endereco'].some((k) => ativa[k] !== c[k]);
  if (mudouGrade || mudouResto) {
    const pivo = primeiraOcorrenciaAPartir(dados, ativa, hoje);
    const patch = { hora: c.hora, duracao: c.duracao, valor: c.valor, endereco: c.endereco, freq };
    dividirSerie(dados, ativa, pivo, patch, mudouGrade ? inicio : null);
  }
  return c;
}

/** Primeira data da série de `desde` em diante (ou, se não houver, o próprio `desde`). */
function primeiraOcorrenciaAPartir(dados, serie, desde) {
  return ocorrencias(serie, desde, somaDias(desde, 800))[0] ?? desde;
}

function encerrarSerie(dados, serie, ultimoDia) {
  serie.fim = ultimoDia;
  // limpezas agendadas dessa série que ficaram depois do fim deixam de existir (sem dinheiro envolvido)
  dados.servicos = dados.servicos.filter((s) => !(s.serieId === serie.id && s.status === 'agendado' && s.slot > ultimoDia));
}

/**
 * Divide a série em duas: a antiga termina na véspera de `pivo`; a nova começa em `novoInicio`
 * (ou no próprio `pivo`) já com as mudanças de `patch`. Nada que já foi concluído é tocado.
 */
export function dividirSerie(dados, serie, pivo, patch, novoInicio = null) {
  const nova = { ...serie, ...patch, id: novoId('r'), inicio: novoInicio ?? pivo, fim: serie.fim };
  serie.fim = somaDias(pivo, -1);
  dados.series.push(nova);
  const resto = [];
  for (const s of dados.servicos) {
    if (s.serieId === serie.id && s.slot >= pivo) {
      if (s.status === 'agendado') continue; // alteração isolada antiga: a nova regra vale
      if (s.status === 'cancelado' && eSlot(nova, s.slot)) s.serieId = nova.id; // cancelamento continua valendo
    }
    resto.push(s);
  }
  dados.servicos = resto;
  return nova;
}

/**
 * Cria um serviço. recorrencia = 'uma' cria só uma limpeza; qualquer outra cria a série.
 * campos: clienteId, data, hora, duracao, valor, endereco, tipo, recorrencia, obs, deslocamento
 */
export function criarServico(dados, campos) {
  const c = cliente(dados, campos.clienteId);
  if (!c) throw new Error('Escolha a cliente.');
  const base = {
    hora: campos.hora, duracao: campos.duracao, valor: campos.valor,
    endereco: campos.endereco ?? '', tipo: campos.tipo || 'Limpeza regular',
    obs: campos.obs ?? '', deslocamento: campos.deslocamento ?? null,
  };
  if (!campos.recorrencia || campos.recorrencia === 'uma') {
    const s = { id: novoId('s'), clienteId: c.id, serieId: null, slot: null, data: campos.data, ...base, status: 'agendado' };
    dados.servicos.push(s);
    return s;
  }
  const r = novaSerie(c, { ...base, freq: campos.recorrencia, inicio: campos.data });
  dados.series.push(r);
  return r;
}

/**
 * Altera um serviço (inclusive reagendar, que é só mudar data/hora).
 * escopo: 'este' (só esta limpeza) ou 'proximos' (esta e as seguintes da série).
 * Limpezas concluídas nunca são alteradas pelo escopo 'proximos'.
 */
export function alterarServico(dados, id, patch, escopo = 'este') {
  const s = acharServico(dados, id);
  if (!s) throw new Error('Serviço não encontrado.');
  if (!s.serieId || escopo === 'este') {
    const m = materializar(dados, s);
    Object.assign(m, patch);
    return m;
  }
  const serie = dados.series.find((r) => r.id === s.serieId);
  const patchSerie = {};
  for (const k of CAMPOS_SERIE) if (k in patch) patchSerie[k] = patch[k];
  const novoInicio = patch.data ?? s.data;
  return dividirSerie(dados, serie, s.slot, patchSerie, novoInicio);
}

export function concluir(dados, id, { valorFinal, pago, forma, dataPagamento }, hoje) {
  const s = materializar(dados, acharServico(dados, id));
  s.status = 'concluido';
  s.valorFinal = valorFinal;
  s.pago = !!pago;
  s.forma = forma || 'Dinheiro';
  s.dataPagamento = pago ? (dataPagamento || hoje) : null;
  delete s.motivo;
  return s;
}

export function marcarPago(dados, id, { forma, dataPagamento }) {
  const s = dados.servicos.find((x) => x.id === id);
  if (!s || s.status !== 'concluido') throw new Error('Só dá para receber um serviço concluído.');
  s.pago = true;
  s.dataPagamento = dataPagamento;
  if (forma) s.forma = forma;
  return s;
}

export function desfazerConclusao(dados, id) {
  const s = dados.servicos.find((x) => x.id === id);
  if (!s) return null;
  s.status = 'agendado';
  delete s.valorFinal; delete s.pago; delete s.forma; delete s.dataPagamento;
  return s;
}

export function cancelar(dados, id, motivo) {
  const s = materializar(dados, acharServico(dados, id));
  s.status = 'cancelado';
  s.motivo = motivo || '';
  return s;
}

export function reativar(dados, id) {
  const s = dados.servicos.find((x) => x.id === id);
  if (!s) return null;
  s.status = 'agendado';
  delete s.motivo;
  return s;
}

/** "Este é o último": a série para de repetir depois desta data. */
export function pararDepoisDeste(dados, id) {
  const s = acharServico(dados, id);
  const serie = s && dados.series.find((r) => r.id === s.serieId);
  if (!serie) return;
  encerrarSerie(dados, serie, s.slot);
}

/** Cliente que parou: o histórico fica (entra nos relatórios); só deixa de aparecer nas listas e de repetir. */
export function arquivarCliente(dados, id, hoje) {
  const c = cliente(dados, id);
  c.arquivado = true;
  for (const r of dados.series) {
    if (r.clienteId === id && !r.fim) encerrarSerie(dados, r, somaDias(hoje, -1));
  }
}
export const reativarCliente = (dados, id) => { cliente(dados, id).arquivado = false; };

export function novoTipo(dados, nome) {
  const n = String(nome ?? '').trim();
  if (!n) return null;
  const ja = dados.tipos.find((t) => t.toLowerCase() === n.toLowerCase());
  if (ja) return ja;
  dados.tipos.push(n);
  return n;
}
