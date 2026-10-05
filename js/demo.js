// Dados de demonstração. TUDO FICTÍCIO: nomes, telefones (faixa 07700 900xxx, reservada para ficção
// pelo regulador britânico) e endereços inventados.
//
// As datas são calculadas a partir do dia em que o aplicativo é aberto pela primeira vez, então a tela
// Hoje nunca fica vazia e há passado suficiente (11 semanas) para comparar "este mês × mês passado".

import { vazio } from './modelo.js';
import { somaDias, proximoDiaSemana, diasEntre, minutosDe } from './datas.js';
import { ocorrencias } from './recorrencia.js';

// [nome, telefone, endereço, postcode, valor £, duração min, dia da semana, hora, frequência, forma, obs, tipo]
const CLIENTES = [
  ['Juliana Rocha', '07700 900101', '14 Mill Lane, Gravesend', 'DA12 1AA', 50, 120, 1, '08:30', 'semanal', 'Transferência', 'Tem um cachorro simpático. Produtos ficam no armário da cozinha.'],
  ['Maria Silva', '07700 900123', '12 Rose Street, Gravesend', 'DA11 0AB', 60, 180, 2, '09:00', 'semanal', 'Transferência', 'Chave no cofre (combinar o código por telefone).'],
  ['Ana Pereira', '07700 900456', '3 Orchard Way, Dartford', 'DA1 2AA', 45, 120, 2, '13:30', 'quinzenal', 'Dinheiro', 'Tocar a campainha duas vezes.'],
  ['Patricia Costa', '07700 900789', '27 Church Road, Gravesend', 'DA11 7AA', 40, 120, 2, '16:30', 'semanal', 'Dinheiro', ''],
  ['Fernanda Mendes', '07700 900321', '8 Heron Close, Greenhithe', 'DA9 9AA', 50, 120, 3, '09:00', 'semanal', 'Transferência', 'Não usar produto com cheiro forte.'],
  ['Simone Matos', '07700 900987', '41 High Street, Dartford', 'DA1 1AA', 45, 120, 4, '10:00', 'semanal', 'Dinheiro', ''],
  ['Claudia Lima', '07700 900654', '5 Elm Grove, Gravesend', 'DA11 8AA', 50, 120, 4, '14:00', 'quinzenal', 'Transferência', 'Estacionar na rua de trás.'],
  ['Adriana Gomes', '07700 900222', '19 Park View, Northfleet', 'DA11 9AA', 50, 120, 5, '09:00', 'semanal', 'Dinheiro', ''],
  ['Roberta Dias', '07700 900333', '2 Beech Court, Swanscombe', 'DA10 0AA', 55, 180, 5, '13:00', 'quatro', 'Transferência', 'Casa grande, dois banheiros.'],
  ['Tatiane Alves', '07700 900444', '66 Riverside Walk, Gravesend', 'DA12 2AA', 65, 180, 6, '09:00', 'mensal', 'Dinheiro', 'Limpeza mais completa, uma vez por mês.'],
];

const SEMANAS_DE_PASSADO = 11;

export function dadosDemo(hoje, agoraMinutos) {
  const dados = vazio();
  dados.demo = true;
  const inicioGeral = somaDias(hoje, -7 * SEMANAS_DE_PASSADO);

  // 1) clientes e séries. Cada série começa numa data do passado que cai no dia certo da semana.
  const porNome = {};
  CLIENTES.forEach(([nome, tel, end, post, valor, dur, dow, hora, freq, forma, obs], i) => {
    const c = {
      id: `c${i + 1}`, nome, telefone: tel, endereco: end, postcode: post, valor: valor * 100, duracao: dur,
      hora, formaPagamento: forma, obs, arquivado: false,
    };
    dados.clientes.push(c);
    porNome[nome] = c;
    const defasagem = freq === 'quinzenal' ? 7 * (i % 2) : 0; // a "semana sim" varia de cliente para cliente
    dados.series.push({
      id: `r${i + 1}`, clienteId: c.id, inicio: proximoDiaSemana(somaDias(inicioGeral, defasagem), dow), freq,
      hora, duracao: dur, valor: valor * 100, endereco: end, tipo: 'Limpeza regular', obs: '', deslocamento: null, fim: null,
    });
  });

  // 2) um serviço único de cada tipo, para a agenda não ser só repetição
  const unica = {
    id: 'c11', nome: 'Helena Prado', telefone: '07700 900555', endereco: '9 Willow Drive, Gravesend', postcode: 'DA11 0BB',
    valor: 18000, duracao: 300, hora: '10:00', formaPagamento: 'Transferência', obs: 'Fim de contrato de aluguel (tenancy).', arquivado: false,
  };
  dados.clientes.push(unica);

  // 3) o passado: tudo que já aconteceu vira registro concluído (e pago, com exceções propositais)
  const ontem = somaDias(hoje, -1);
  let n = 0;
  const reg = (extra) => {
    n += 1;
    return { id: `s${n}`, serieId: null, slot: null, obs: '', deslocamento: null, status: 'agendado', ...extra };
  };
  const passados = [];
  for (const r of dados.series) {
    const c = dados.clientes.find((x) => x.id === r.clienteId);
    for (const slot of ocorrencias(r, r.inicio, ontem)) {
      passados.push(reg({
        clienteId: c.id, serieId: r.id, slot, data: slot, hora: r.hora, duracao: r.duracao, valor: r.valor,
        endereco: r.endereco, tipo: r.tipo,
      }));
    }
  }
  // hoje: o que já terminou fica concluído e pago (assim o "Recebido" de hoje mostra algo real)
  for (const r of dados.series) {
    const c = dados.clientes.find((x) => x.id === r.clienteId);
    for (const slot of ocorrencias(r, hoje, hoje)) {
      if (minutosDe(r.hora) + r.duracao <= agoraMinutos) {
        passados.push(reg({
          clienteId: c.id, serieId: r.id, slot, data: slot, hora: r.hora, duracao: r.duracao, valor: r.valor,
          endereco: r.endereco, tipo: r.tipo,
        }));
      }
    }
  }
  passados.sort((a, b) => a.data.localeCompare(b.data) || a.hora.localeCompare(b.hora));

  const recentes = passados.filter((s) => diasEntre(s.data, hoje) <= 12).reverse(); // do mais novo ao mais velho
  passados.forEach((s, k) => {
    const cli = dados.clientes.find((c) => c.id === s.clienteId);
    s.status = 'concluido';
    s.valorFinal = s.valor;
    s.pago = true;
    s.forma = cli.formaPagamento;
    s.dataPagamento = s.data;
    if (k % 7 === 3) s.dataPagamento = somaDias(s.data, 1); // alguns pagam no dia seguinte
    if (k % 19 === 5) s.valorFinal = s.valor + 500; // uma gorjeta de vez em quando
  });
  // pagamentos pendentes: 3 limpezas recentes de quem paga por transferência
  let pend = 0;
  for (const s of recentes) {
    const cli = dados.clientes.find((c) => c.id === s.clienteId);
    if (s.data < hoje && cli.formaPagamento === 'Transferência' && pend < 3 && diasEntre(s.data, hoje) >= 2) {
      s.pago = false; s.dataPagamento = null; pend += 1;
    }
  }
  // cancelamentos: 4, com motivos diferentes, espalhados pelo passado
  const motivos = ['Cliente cancelou', 'Profissional cancelou', 'Cliente cancelou', 'Outro'];
  [9, 23, 37, 51].forEach((idx, j) => {
    const s = passados[idx];
    if (s && s.data < hoje) {
      s.status = 'cancelado'; s.motivo = motivos[j];
      delete s.valorFinal; delete s.pago; delete s.forma; delete s.dataPagamento;
    }
  });
  // uma limpeza passada que a profissional "esqueceu" de concluir (para a tela mostrar o aviso)
  const esquecida = [...passados].reverse().find((s) => s.data < hoje && diasEntre(s.data, hoje) <= 4 && s.status === 'concluido');
  if (esquecida) {
    esquecida.status = 'agendado';
    delete esquecida.valorFinal; delete esquecida.pago; delete esquecida.forma; delete esquecida.dataPagamento;
  }
  // um serviço pontual concluído no mês passado: limpeza profunda para a Maria
  passados.push(reg({
    clienteId: 'c2', data: somaDias(hoje, -26), hora: '14:00', duracao: 240, valor: 9000, valorFinal: 9500,
    endereco: porNome['Maria Silva'].endereco, tipo: 'Limpeza profunda', status: 'concluido', pago: true,
    forma: 'Transferência', dataPagamento: somaDias(hoje, -25),
  }));
  dados.servicos.push(...passados);

  // 4) o futuro: um fim de tenancy em 3 dias e uma limpeza extra (garante que "Hoje" nunca fica vazio)
  dados.servicos.push(reg({
    clienteId: 'c11', data: somaDias(hoje, 3), hora: '10:00', duracao: 300, valor: 18000,
    endereco: unica.endereco, tipo: 'Fim de tenancy', obs: 'Levar produto para forno e vidros.',
  }));
  // garante pelo menos 3 casas hoje (nos dias com pouca limpeza fixa entram limpezas extras)
  let hojeQtd = dados.series.reduce((t, r) => t + ocorrencias(r, hoje, hoje).length, 0);
  const extras = [['c6', '13:30', 4500, 'Pediu para caprichar na cozinha.'], ['c4', '16:30', 4000, ''], ['c8', '10:30', 5000, '']];
  for (const [cid, hora, valor, obs] of extras) {
    if (hojeQtd >= 3) break;
    const cli = dados.clientes.find((c) => c.id === cid);
    if (dados.series.some((r) => r.clienteId === cid && ocorrencias(r, hoje, hoje).length)) continue;
    const feito = minutosDe(hora) + 120 <= agoraMinutos;
    dados.servicos.push(reg({
      clienteId: cid, data: hoje, hora, duracao: 120, valor, endereco: cli.endereco, tipo: 'Limpeza extra', obs,
      ...(feito ? { status: 'concluido', valorFinal: valor, pago: true, forma: cli.formaPagamento, dataPagamento: hoje } : {}),
    }));
    hojeQtd += 1;
  }
  return dados;
}
