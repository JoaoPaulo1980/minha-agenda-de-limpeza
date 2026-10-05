// Recorrência: de uma "série" (ex.: Maria, toda terça às 09:00) sai a lista de datas.
//
// REGRAS ESCRITAS (valem em todas as telas):
//  • toda semana        -> a cada 7 dias, a partir da data de início
//  • a cada 2 semanas   -> a cada 14 dias, a partir da data de início (é ela que define a "semana sim")
//  • a cada 4 semanas   -> a cada 28 dias, a partir da data de início
//  • mensal             -> mesmo dia da semana e mesma posição no mês da data de início
//                          (início numa 1ª terça = toda 1ª terça; numa 5ª terça = toda ÚLTIMA terça)
//  • a série pode ter data final (`fim`, inclusive). Sem `fim`, não acaba.
//
// Tudo é feito contando dias inteiros — ver datas.js — então o horário de verão não mexe em nada.

import { paraNum, deNum, diaSemana, partes, diaDoMes, DIAS_CURTOS } from './datas.js';

export const FREQUENCIAS = {
  uma: { rotulo: 'Só uma vez', passo: 0 },
  semanal: { rotulo: 'Toda semana', passo: 7 },
  quinzenal: { rotulo: 'A cada 2 semanas', passo: 14 },
  quatro: { rotulo: 'A cada 4 semanas', passo: 28 },
  mensal: { rotulo: 'Mensal', passo: 0 },
};

/** Posição do dia da semana no mês: 1ª, 2ª, 3ª, 4ª ou 5 (= última). */
export const ordinalNoMes = (s) => Math.min(5, Math.ceil(diaDoMes(s) / 7));

/** Data do n-ésimo dia da semana `dow` no mês (a, m). n = 5 significa "o último". */
function nesimoDiaDoMes(a, m, dow, n) {
  const primeiro = Math.round(Date.UTC(a, m - 1, 1) / 86400000);
  const dowPrimeiro = new Date(primeiro * 86400000).getUTCDay();
  const ultimo = Math.round(Date.UTC(a, m, 1) / 86400000) - 1;
  let dia = primeiro + ((dow - dowPrimeiro + 7) % 7) + 7 * (Math.min(n, 5) - 1);
  while (dia > ultimo) dia -= 7; // n = 5 e o mês só tem 4 → usa o último que existe
  return deNum(dia);
}

/**
 * Datas (slots) da série entre `de` e `ate`, inclusive, respeitando início e fim.
 * Uma série com freq "uma" não existe: serviço único não é série.
 */
export function ocorrencias(serie, de, ate) {
  const ini = serie.inicio;
  const lim = serie.fim && serie.fim < ate ? serie.fim : ate;
  const desde = de > ini ? de : ini;
  if (desde > lim) return [];
  const saida = [];

  if (serie.freq === 'mensal') {
    const dow = diaSemana(ini);
    const n = ordinalNoMes(ini);
    let [a, m] = partes(desde);
    const [af, mf] = partes(lim);
    while (a < af || (a === af && m <= mf)) {
      const d = nesimoDiaDoMes(a, m, dow, n);
      if (d >= desde && d <= lim && d >= ini) saida.push(d);
      m += 1;
      if (m > 12) { m = 1; a += 1; }
    }
    return saida;
  }

  const passo = FREQUENCIAS[serie.freq]?.passo;
  if (!passo) return [];
  const base = paraNum(ini);
  const primeiro = Math.max(0, Math.ceil((paraNum(desde) - base) / passo));
  for (let k = primeiro; ; k += 1) {
    const d = deNum(base + k * passo);
    if (d > lim) break;
    saida.push(d);
  }
  return saida;
}

/** A data `s` é uma das datas da série? */
export const eSlot = (serie, s) => ocorrencias(serie, s, s).length === 1;

/** "Toda semana (Ter)", "Mensal (1ª Ter)", "Só uma vez" — texto curto para etiquetas. */
export function rotuloFreq(freq, inicio) {
  if (!inicio || freq === 'uma') return FREQUENCIAS[freq]?.rotulo ?? 'Só uma vez';
  const dia = DIAS_CURTOS[diaSemana(inicio)];
  if (freq === 'mensal') {
    const n = ordinalNoMes(inicio);
    return `Mensal (${n === 5 ? 'última' : `${n}ª`} ${dia})`;
  }
  return `${FREQUENCIAS[freq].rotulo} (${dia})`;
}
