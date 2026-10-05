// Guarda e lê os dados no próprio navegador do celular (localStorage).
// Nada sai do aparelho: não existe servidor, conta nem envio de dados.

import { CHAVE, vazio } from './modelo.js';

let memoria = null; // se o navegador bloquear o armazenamento, o app continua funcionando até fechar
let falhou = false;

export const armazenamentoFalhou = () => falhou;

export function carregar() {
  try {
    const txt = localStorage.getItem(CHAVE);
    if (!txt) return null;
    return normalizar(JSON.parse(txt));
  } catch (e) {
    falhou = true;
    return memoria;
  }
}

export function salvar(dados) {
  memoria = dados;
  try {
    localStorage.setItem(CHAVE, JSON.stringify(dados));
    falhou = false;
    return true;
  } catch (e) {
    falhou = true;
    return false;
  }
}

/** Garante que um arquivo antigo ou de cópia de segurança tenha todos os campos esperados. */
export function normalizar(d) {
  const base = vazio();
  const lista = (x) => (Array.isArray(x) ? x : []);
  return {
    ...base,
    ...d,
    clientes: lista(d.clientes),
    series: lista(d.series),
    servicos: lista(d.servicos),
    tipos: lista(d.tipos).length ? d.tipos : base.tipos,
  };
}

/** Confere se um arquivo de cópia de segurança parece mesmo ser deste aplicativo. */
export function validarCopia(obj) {
  if (!obj || typeof obj !== 'object') return 'O arquivo não parece uma cópia de segurança deste aplicativo.';
  if (!Array.isArray(obj.clientes) || !Array.isArray(obj.servicos) || !Array.isArray(obj.series)) {
    return 'O arquivo não parece uma cópia de segurança deste aplicativo.';
  }
  const ruim = obj.servicos.some((s) => !s || typeof s.data !== 'string' || typeof s.hora !== 'string')
    || obj.series.some((r) => !r || typeof r.inicio !== 'string' || typeof r.hora !== 'string')
    || obj.clientes.some((c) => !c || typeof c.nome !== 'string');
  return ruim ? 'O arquivo está incompleto ou foi alterado — não dá para restaurar.' : null;
}

/** Pede ao navegador para NÃO apagar os dados sozinho quando faltar espaço. */
export async function pedirPersistencia() {
  try {
    if (navigator.storage?.persist) {
      if (await navigator.storage.persisted()) return true;
      return await navigator.storage.persist();
    }
  } catch (e) { /* sem suporte: segue a vida */ }
  return false;
}
