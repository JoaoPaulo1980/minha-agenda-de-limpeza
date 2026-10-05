// Estado compartilhado entre as telas: os dados, em que tela ela está, e o relógio.

import { hojeStr, agoraMin as _agoraMin } from './datas.js';
import { salvar, armazenamentoFalhou } from './armazem.js';

export const S = {
  dados: null,
  ui: {
    aba: 'hoje',
    agendaModo: 'dia', // dia | semana | mes
    agendaData: null,
    diaSel: null, // dia aberto na visão do mês
    relModo: 'semana', // semana | mes
    relData: null,
    busca: '',
    mostrarArquivados: false,
  },
  redesenhar: () => {},
};

// Relógio. Para testar o aplicativo em outro dia/hora: abrir a página com ?agora=2026-10-06T08:15
const falso = new URLSearchParams(location.search).get('agora');
export const agora = () => (falso ? new Date(falso) : new Date());
export const hoje = () => hojeStr(agora());
export const agoraMin = () => _agoraMin(agora());

export function gravar() {
  const ok = salvar(S.dados);
  if (!ok && armazenamentoFalhou()) {
    toast('Não consegui salvar neste navegador. Faça uma cópia de segurança agora.', 6000);
  }
}

/** Depois de qualquer mudança nos dados: salva, avisa e redesenha. */
export function mudou(mensagem) {
  gravar();
  if (mensagem) toast(mensagem);
  S.redesenhar();
}

let temporizador;
export function toast(texto, ms = 2600) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = texto;
  el.classList.add('on');
  clearTimeout(temporizador);
  temporizador = setTimeout(() => el.classList.remove('on'), ms);
}
