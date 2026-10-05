// Datas e horas do aplicativo.
//
// REGRA DE OURO: uma data é sempre um texto "AAAA-MM-DD" e um horário é sempre um texto
// "HH:MM" — o relógio da parede, como a profissional enxerga. Nunca somamos "horas" a uma data.
// Para andar de dia em dia contamos dias inteiros (em UTC, que não tem horário de verão).
// Assim, uma limpeza de toda terça às 09:00 continua às 09:00 depois da mudança de horário
// (em 2026: 25 de outubro), e nenhuma limpeza pula para o dia vizinho por causa de fuso.

export const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto',
  'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
export const MESES_CURTOS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
export const DIAS = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira',
  'Sexta-feira', 'Sábado'];
export const DIAS_CURTOS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export const p2 = (n) => String(n).padStart(2, '0');

/** "2026-10-06" -> número de dias desde 1970 (inteiro, sem fuso). */
export function paraNum(s) {
  const [a, m, d] = s.split('-').map(Number);
  return Math.round(Date.UTC(a, m - 1, d) / 86400000);
}

/** número de dias -> "AAAA-MM-DD". */
export function deNum(n) {
  const d = new Date(n * 86400000);
  return `${d.getUTCFullYear()}-${p2(d.getUTCMonth() + 1)}-${p2(d.getUTCDate())}`;
}

export const somaDias = (s, n) => deNum(paraNum(s) + n);
export const diasEntre = (a, b) => paraNum(b) - paraNum(a);
/** 0 = domingo ... 6 = sábado */
export const diaSemana = (s) => new Date(paraNum(s) * 86400000).getUTCDay();
export const partes = (s) => s.split('-').map(Number); // [ano, mês, dia]
export const diaDoMes = (s) => Number(s.slice(8, 10));

/** A data de hoje no relógio do celular. */
export const hojeStr = (agora = new Date()) =>
  `${agora.getFullYear()}-${p2(agora.getMonth() + 1)}-${p2(agora.getDate())}`;
export const agoraMin = (agora = new Date()) => agora.getHours() * 60 + agora.getMinutes();

export const minutosDe = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};
export const hhmm = (min) => `${p2(Math.floor(min / 60) % 24)}:${p2(min % 60)}`;

/** A semana começa na segunda-feira. */
export const inicioSemana = (s) => somaDias(s, -((diaSemana(s) + 6) % 7));
export const fimSemana = (s) => somaDias(inicioSemana(s), 6);
export const inicioMes = (s) => `${s.slice(0, 8)}01`;
export function fimMes(s) {
  const [a, m] = partes(s);
  return deNum(Math.round(Date.UTC(a, m, 1) / 86400000) - 1); // dia 1 do mês seguinte, menos 1
}
/** Primeiro dia do mês, n meses para frente (ou para trás, se negativo). */
export function somaMeses(s, n) {
  const [a, m] = partes(s);
  const idx = a * 12 + (m - 1) + n;
  return `${Math.floor(idx / 12)}-${p2((idx % 12) + 1)}-01`;
}

/** Próxima data (a partir de `desde`, inclusive) que cai no dia da semana pedido. */
export function proximoDiaSemana(desde, dow) {
  return somaDias(desde, (dow - diaSemana(desde) + 7) % 7);
}

// ---- Textos em português do Brasil ----

/** "Terça-feira, 6 de Outubro" */
export function dataLonga(s) {
  const [, m, d] = partes(s);
  return `${DIAS[diaSemana(s)]}, ${d} de ${MESES[m - 1]}`;
}
export const dataLongaAno = (s) => `${dataLonga(s)} de ${partes(s)[0]}`;
/** "03 Out" */
export function dataCurta(s) {
  const [, m, d] = partes(s);
  return `${p2(d)} ${MESES_CURTOS[m - 1]}`;
}
/** "Ter 6" */
export const diaCurtoNum = (s) => `${DIAS_CURTOS[diaSemana(s)]} ${diaDoMes(s)}`;
/** "Outubro 2026" */
export function mesAno(s) {
  const [a, m] = partes(s);
  return `${MESES[m - 1]} ${a}`;
}
/** "5 – 11 de Outubro de 2026" (ou "28 Set – 4 Out de 2026" quando cruza o mês) */
export function intervaloTxt(de, ate) {
  const [a1, m1, d1] = partes(de);
  const [a2, m2, d2] = partes(ate);
  if (a1 === a2 && m1 === m2) return `${d1} – ${d2} de ${MESES[m2 - 1]} de ${a2}`;
  if (a1 === a2) return `${d1} ${MESES_CURTOS[m1 - 1]} – ${d2} ${MESES_CURTOS[m2 - 1]} de ${a2}`;
  return `${d1} ${MESES_CURTOS[m1 - 1]} ${a1} – ${d2} ${MESES_CURTOS[m2 - 1]} ${a2}`;
}
/** "5–11 Out" para rótulos curtos */
export function intervaloCurto(de, ate) {
  const [, m1, d1] = partes(de);
  const [, m2, d2] = partes(ate);
  return m1 === m2 ? `${d1}–${d2} ${MESES_CURTOS[m2 - 1]}` : `${d1} ${MESES_CURTOS[m1 - 1]}–${d2} ${MESES_CURTOS[m2 - 1]}`;
}
