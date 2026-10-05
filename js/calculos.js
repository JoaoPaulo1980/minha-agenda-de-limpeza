// Todas as contas do aplicativo moram aqui — e só aqui. Nenhuma tela soma por conta própria.
//
// REGRAS ESCRITAS:
//  • previsto      = soma do valor combinado (valor) das limpezas NÃO canceladas do período
//  • faturado      = soma do valor final das limpezas CONCLUÍDAS do período
//  • recebido      = parte do faturado que já está pago
//  • a receber     = parte do faturado que ainda não foi paga
//  • "do período" é sempre a DATA DA LIMPEZA (não a do pagamento). Assim recebido + a receber
//    = faturado, e o mesmo dia mostra o mesmo valor em todas as telas. A data do pagamento é
//    guardada e aparece na lista "A receber" e no histórico.
//  • horas trabalhadas = soma das durações combinadas das limpezas concluídas
//  • média por serviço = faturado ÷ nº de concluídas · média por hora = faturado ÷ horas trabalhadas
//    (arredondadas ao centavo; no meio exato, para o par — reproduz os exemplos do pedido)
//  • cancelamentos = nº de canceladas; valor perdido = valor combinado das canceladas, EXCETO as
//    que foram só "Reagendado" (essas não são perda de dinheiro)
//  • "Semana 1…" do mês = semanas de calendário (segunda a domingo); as pontas ficam inteiras
//    dentro do mês, sem contar nada duas vezes

import { servicosNoPeriodo } from './modelo.js';
import { divArred } from './dinheiro.js';
import { inicioSemana, fimSemana, inicioMes, fimMes, somaDias, intervaloCurto } from './datas.js';

export function resumo(servicos) {
  const r = {
    ativos: 0, previsto: 0, minutosPrevistos: 0,
    concluidos: 0, faturado: 0, recebido: 0, aReceber: 0, minutosTrabalhados: 0,
    agendados: 0, previstoAgendado: 0,
    cancelados: 0, perdido: 0, clientes: 0, mediaServico: 0, mediaHora: 0,
  };
  const quem = new Set();
  for (const s of servicos) {
    if (s.status === 'cancelado') {
      r.cancelados += 1;
      if (s.motivo !== 'Reagendado') r.perdido += s.valor;
      continue;
    }
    r.ativos += 1;
    r.previsto += s.valor;
    r.minutosPrevistos += s.duracao;
    if (s.status === 'concluido') {
      r.concluidos += 1;
      r.faturado += s.valorFinal;
      r.minutosTrabalhados += s.duracao;
      quem.add(s.clienteId);
      if (s.pago) r.recebido += s.valorFinal; else r.aReceber += s.valorFinal;
    } else {
      r.agendados += 1;
      r.previstoAgendado += s.valor;
    }
  }
  r.clientes = quem.size;
  r.mediaServico = divArred(r.faturado, r.concluidos);
  r.mediaHora = divArred(r.faturado * 60, r.minutosTrabalhados);
  return r;
}

export const resumoDoPeriodo = (dados, de, ate) => resumo(servicosNoPeriodo(dados, de, ate));

export const periodoSemana = (s) => [inicioSemana(s), fimSemana(s)];
export const periodoMes = (s) => [inicioMes(s), fimMes(s)];

/** Um item por dia do período, com as limpezas daquele dia e o resumo. */
export function porDia(dados, de, ate) {
  const todos = servicosNoPeriodo(dados, de, ate);
  const dias = [];
  for (let d = de; d <= ate; d = somaDias(d, 1)) {
    const itens = todos.filter((s) => s.data === d);
    dias.push({ data: d, itens, ...resumo(itens) });
  }
  return dias;
}

/** Semanas de calendário que tocam o mês, cortadas nas pontas. */
export function semanasDoMes(dados, dia) {
  const ini = inicioMes(dia);
  const fim = fimMes(dia);
  const semanas = [];
  let n = 1;
  for (let seg = inicioSemana(ini); seg <= fim; seg = somaDias(seg, 7)) {
    const de = seg < ini ? ini : seg;
    const ate = somaDias(seg, 6) > fim ? fim : somaDias(seg, 6);
    semanas.push({ n, de, ate, rotulo: `Semana ${n}`, sub: intervaloCurto(de, ate), ...resumoDoPeriodo(dados, de, ate) });
    n += 1;
  }
  return semanas;
}

/** Quanto cada cliente rendeu no período (só concluídas), da maior para a menor. */
export function rankingClientes(servicos) {
  const m = new Map();
  for (const s of servicos) {
    if (s.status !== 'concluido') continue;
    const x = m.get(s.clienteId) ?? { clienteId: s.clienteId, qtd: 0, total: 0 };
    x.qtd += 1;
    x.total += s.valorFinal;
    m.set(s.clienteId, x);
  }
  return [...m.values()].sort((a, b) => b.total - a.total || b.qtd - a.qtd);
}

/** Compara dois resumos (atual × anterior) nas quatro linhas do pedido. */
export function comparar(atual, anterior) {
  const linha = (rotulo, a, b, tipo) => {
    const dif = a - b;
    const pct = b ? (dif / b) * 100 : null;
    return { rotulo, atual: a, anterior: b, dif, pct, tipo };
  };
  return [
    linha('Faturamento', atual.faturado, anterior.faturado, 'dinheiro'),
    linha('Serviços', atual.concluidos, anterior.concluidos, 'qtd'),
    linha('Horas', atual.minutosTrabalhados, anterior.minutosTrabalhados, 'horas'),
    linha('Média por hora', atual.mediaHora, anterior.mediaHora, 'dinheiro2'),
  ];
}

/** Limpezas concluídas e ainda não pagas (de qualquer data), da mais antiga para a mais nova. */
export function pendentes(dados, clienteId = null) {
  return dados.servicos
    .filter((s) => s.status === 'concluido' && !s.pago && (!clienteId || s.clienteId === clienteId))
    .sort((a, b) => a.data.localeCompare(b.data) || a.hora.localeCompare(b.hora));
}
export const totalPendente = (lista) => lista.reduce((t, s) => t + s.valorFinal, 0);

/** Limpezas de datas passadas que ficaram "Agendado": ninguém concluiu nem cancelou. */
export function esquecidas(dados, hoje, agoraMinutos) {
  const lista = servicosNoPeriodo(dados, somaDias(hoje, -400), hoje).filter((s) => s.status === 'agendado');
  return lista.filter((s) => s.data < hoje || (s.data === hoje && minutosFim(s) <= agoraMinutos));
}
const minutosFim = (s) => {
  const [h, m] = s.hora.split(':').map(Number);
  return h * 60 + m + s.duracao;
};

/** Histórico e totais de uma cliente. */
export function fichaCliente(dados, clienteId) {
  const meus = dados.servicos.filter((s) => s.clienteId === clienteId);
  const concl = meus.filter((s) => s.status === 'concluido');
  return {
    historico: [...meus].sort((a, b) => b.data.localeCompare(a.data) || b.hora.localeCompare(a.hora)),
    totalRecebido: concl.filter((s) => s.pago).reduce((t, s) => t + s.valorFinal, 0),
    pendente: totalPendente(concl.filter((s) => !s.pago)),
    qtdConcluidos: concl.length,
  };
}
