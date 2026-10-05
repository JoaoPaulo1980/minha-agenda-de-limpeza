// Peças visuais reutilizadas em várias telas.

import { S } from './estado.js';
import { libras } from './dinheiro.js';
import { hhmm, minutosDe } from './datas.js';
import { nomeCliente, avisos } from './modelo.js';

/** Todo texto digitado por uma pessoa passa por aqui antes de entrar no HTML. */
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const ICONES = {
  hoje: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v10h5v-6h4v6h5V10"/>',
  agenda: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18"/>',
  clientes: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.8-5.5 6.5-5.5s6.5 1.9 6.5 5.5"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.7c2.2.6 3.5 2.3 3.5 5.3"/>',
  relatorios: '<path d="M4 20V11M10 20V4M16 20v-6M3 20h18"/>',
  receber: '<circle cx="12" cy="12" r="9"/><path d="M14.8 8.6c-.6-.8-1.6-1.2-2.8-1.2-1.7 0-2.9.9-2.9 2.3 0 3.3 5.8 1.5 5.8 4.8 0 1.4-1.3 2.4-3 2.4-1.3 0-2.4-.5-3-1.4M12 6v1.4M12 16.6V18"/>',
  mais: '<path d="M12 5v14M5 12h14"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  fone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
  pino: '<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  engrenagem: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  esq: '<path d="m15 5-7 7 7 7"/>',
  dir: '<path d="m9 5 7 7-7 7"/>',
  fechar: '<path d="M6 6l12 12M18 6 6 18"/>',
  relogio: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  alerta: '<path d="M12 3 2 20h20L12 3z"/><path d="M12 10v4M12 17.5v.1"/>',
  pessoa: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.5-6 8-6s8 2 8 6"/>',
  casa: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v10h14V10"/>',
  salvar: '<path d="M12 3v12m0 0-4-4m4 4 4-4M4 17v3h16v-3"/>',
  subir: '<path d="M12 15V3m0 0-4 4m4-4 4 4M4 17v3h16v-3"/>',
};

export function ico(nome, tam = 22, classe = '') {
  return `<svg class="ico ${classe}" width="${tam}" height="${tam}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONES[nome] ?? ''}</svg>`;
}

export const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
export const casas = (n) => plural(n, 'casa', 'casas');

/** "3 horas", "1 hora", "2h30", "45 min" */
export function duracaoTxt(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (!h) return `${m} min`;
  if (!m) return h === 1 ? '1 hora' : `${h} horas`;
  return `${h}h${String(m).padStart(2, '0')}`;
}
/** "7h", "34h", "2h30" — para os números grandes */
export function horasTxt(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
}

export const fimTxt = (s) => hhmm(minutosDe(s.hora) + s.duracao);

export function iniciais(nome) {
  const p = String(nome).trim().split(/\s+/).filter(Boolean);
  return ((p[0]?.[0] ?? '?') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
}
const corDe = (id) => {
  let h = 0;
  for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) % 997;
  return h % 6;
};
export const avatar = (nome, id) => `<span class="avatar cor${corDe(id)}" aria-hidden="true">${esc(iniciais(nome))}</span>`;

export function pilulaStatus(s) {
  if (s.status === 'cancelado') return '<span class="pilula cinza">Cancelado</span>';
  if (s.status === 'concluido') {
    return s.pago ? '<span class="pilula roxa">Concluído · Pago</span>' : '<span class="pilula ambar">Concluído · A receber</span>';
  }
  return '<span class="pilula verde">Agendado</span>';
}

export function urlMapa(s) {
  const c = S.dados.clientes.find((x) => x.id === s.clienteId);
  const alvo = [s.endereco || c?.endereco, c?.postcode].filter(Boolean).join(', ');
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
  return ios
    ? `https://maps.apple.com/?q=${encodeURIComponent(alvo)}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(alvo)}`;
}

/** Uma limpeza numa lista: horário · cliente · tipo/duração · valor · situação. */
export function linhaServico(s, { mostrarData = false } = {}) {
  const d = S.dados;
  const nome = nomeCliente(d, s.clienteId);
  const av = s.status === 'cancelado' ? [] : avisos(d, s, s.id);
  const valor = s.status === 'concluido' ? s.valorFinal : s.valor;
  const aviso = av.map((a) => `<div class="aviso-linha ${a.tipo}">${ico('alerta', 15)} ${esc(a.texto)}</div>`).join('');
  return `
  <div class="linha-wrap ${s.status}">
    <button class="linha" data-act="servico" data-id="${esc(s.id)}">
      <span class="hora"><b>${esc(s.hora)}</b><i>${esc(fimTxt(s))}</i></span>
      ${avatar(nome, s.clienteId)}
      <span class="meio">
        <b>${esc(nome)}</b>
        <span class="sub">${esc(s.tipo)} · ${esc(duracaoTxt(s.duracao))}</span>
        <span class="local">${ico('pino', 13)} ${esc(s.endereco || '—')}</span>
      </span>
      <span class="dir"><b class="valor">${libras(valor)}</b>${pilulaStatus(s)}</span>
    </button>
    ${aviso}
  </div>`;
}

export const vazioMsg = (icone, titulo, texto = '', botao = '') => `
  <div class="vazio">${ico(icone, 34)}<b>${esc(titulo)}</b>${texto ? `<p>${esc(texto)}</p>` : ''}${botao}</div>`;
