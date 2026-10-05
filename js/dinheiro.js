// Dinheiro. Tudo é guardado em PENCE (números inteiros) para as contas nunca darem
// 0,0000001 de diferença. Só na hora de mostrar viram libras.

/** "60", "60.50", "60,50", "£1,250.00" -> pence. Devolve null se não for um valor válido. */
export function paraPence(txt) {
  let t = String(txt ?? '').replace(/[£\s]/g, '');
  if (t === '') return null;
  if (t.includes(',') && t.includes('.')) t = t.replace(/,/g, ''); // 1,250.50
  else t = t.replace(',', '.'); // 60,50
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return null;
  return Math.round(parseFloat(t) * 100);
}

/** Divisão de inteiros arredondada para o inteiro mais próximo; no meio exato vai para o par.
 *  É a regra que reproduz os exemplos do pedido (£850 ÷ 16 = £53.12, £3,480 ÷ 139 h = £25.04). */
export function divArred(num, den) {
  if (!den) return 0;
  const q = Math.floor(num / den);
  const r = num - q * den;
  const dobro = r * 2;
  if (dobro > den) return q + 1;
  if (dobro < den) return q;
  return q % 2 === 0 ? q : q + 1;
}

const milhares = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

/** pence -> "£3,480" · "£53.12". Sem centavos quando o valor é redondo, a menos que `sempre2`. */
export function libras(p, { sempre2 = false } = {}) {
  const neg = p < 0;
  const abs = Math.abs(Math.round(p));
  const lib = Math.floor(abs / 100);
  const cent = abs % 100;
  const corpo = milhares(lib) + (cent || sempre2 ? `.${String(cent).padStart(2, '0')}` : '');
  return `${neg ? '-' : ''}£${corpo}`;
}

/** "+£330" / "-£20" / "£0" */
export function librasComSinal(p) {
  if (p > 0) return `+${libras(p)}`;
  return libras(p);
}

/** pence -> "60" ou "60.50", para preencher campo de formulário. */
export function paraCampo(p) {
  if (p == null) return '';
  const lib = Math.floor(p / 100);
  const cent = p % 100;
  return cent ? `${lib}.${String(cent).padStart(2, '0')}` : String(lib);
}
