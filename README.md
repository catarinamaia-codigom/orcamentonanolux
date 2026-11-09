# Nanolux · SOMMAR — orçamentos, histórico e comissões

Site para montar propostas comerciais Nanolux em PDF (formato apresentação 16:9), guardar o histórico de orçamentos, faturar projetos e acompanhar comissões. Os dados ficam numa **planilha Google** através de um pequeno servidor em **Google Apps Script**.

## Páginas

- **Início**: resumo (total de orçamentos, últimos 30 dias, este mês, última semana, % de conversão, tempo médio de conversão), alertas de orçamentos perto de vencer, comissão a receber no próximo mês e atalhos.
- **Proposta comercial**: cliente, telefone (no PDF aparece "Nome | telefone"), projeto, local, link do Asana, itens, desconto e o PDF.
  - **Calculadora de m² e comissão**: simulação das formas de pagamento, taxas da máquina, valor líquido, custos fixos, comissão e **m² efetivo** comparado à referência do produto. Se ficar abaixo, aparece o aviso de que precisa de autorização.
  - Duas barras simulam ao vivo, sem mexer no orçamento até você aplicar: uma para o **valor do m²**, outra para o **desconto**. Os botões aplicam o valor escolhido, o **m² mínimo** ou o **desconto máximo** sem autorização.
  - Ao digitar um cliente que já existe (mesmo nome ou telefone), o site pergunta se é um **projeto novo** ou a **atualização** do orçamento antigo. O topo mostra um resumo dos orçamentos anteriores desse cliente.
  - **Salvar** guarda o orçamento como *Rascunho* (amarelo). **Baixar PDF** muda para *PDF baixado* (verde).
- **Histórico de orçamentos**: resumo no topo, busca por nome, telefone, cidade ou número e filtros de data, status, validade e vendedor. As versões do mesmo cliente ficam no mesmo bloco de cor.
  - A coluna do cliente fica fixa. O nome abre o cliente no Asana, e a tag **Asana ON/OFF** mostra se o link está vinculado (clique para vincular ou trocar).
  - As tags de validade são *Válido* (azul), *Vencido* e *Inválido · atualizado*.
  - A tabela mostra o desconto (nome e valor), o valor do m², o m² efetivo, o valor total, a simulação e o link do Asana.
  - **Atualizar** cria a próxima versão (V02, V03…) e invalida a anterior.
  - **Faturar** pede as formas de pagamento (obrigatórias, cada uma com valor e data), recalcula a comissão, comemora a venda com uma animação diferente a cada vez e gera o texto para copiar no Grupo de Pagamentos do WhatsApp.
  - **Ajustes no faturamento:** área a mais e desconto a mais, com observação interna obrigatória. O orçamento é atualizado junto, inclusive as formas de pagamento reais.
  - **Alterar faturamento** exige um motivo e guarda o histórico (antes e depois). O orçamento também é atualizado.
  - **Excluir faturamento** exige um motivo. O orçamento volta para PDF baixado ou Rascunho e pode ser faturado de novo; a exclusão fica registrada na planilha.
- **Comissões**: o vendedor vê só os dele; a Diretoria vê todos e um resumo por vendedor.
  - Gráfico das comissões por mês de faturamento.
  - Formas de pagamento mais usadas.
  - Média do m² real, área média e tempo médio do orçamento ao 1º pagamento.
  - Previsão de recebimento: a comissão é calculada pelas datas inseridas em cada pagamento e paga no mês seguinte ao recebimento, proporcional ao que foi recebido em cada mês.
- **Painel da Diretoria**:
  - **Tabelas de vigência** com a % de comissão e as taxas da máquina (PIX, Cartão 1x a 12x, Boleto, Transferência e Dinheiro). Cada tabela vale a partir de uma data até a véspera da próxima: orçamentos usam a tabela da data de emissão e faturamentos, a da **data de cada pagamento**. Assim, mudar taxas ou comissão não altera o que já foi feito.
  - Cartão parcelado: comissão integral ou dividida pelas parcelas.
  - Custo fixo por projeto e catálogo de produtos com preço padrão e **referência do m²**.
  - **Textos padrão da proposta** (apresentação, observações, pagamento, prazo, execução, turnos, informações da pág. 2) e os exemplos dos campos vazios.
  - Links do Asana e do WhatsApp.
  - Cadastro de usuários (nome + PIN, papel Vendedor ou Diretoria).

## Instalação (uma vez)

1. Crie uma planilha Google, por exemplo **Nanolux · Orçamentos**.
2. Na planilha, abra **Extensões → Apps Script**, apague o conteúdo e cole **todo** o arquivo [`backend/Codigo.js`](backend/Codigo.js). Salve.
3. Vá em **Implantar → Nova implantação**, escolha o tipo **App da Web** e configure:
   - Executar como: **Eu**
   - Quem pode acessar: **Qualquer pessoa**

   Autorize o acesso quando o Google pedir.
4. Copie a URL do App da Web (termina em `/exec`) e coloque em [`config.js`](config.js), no campo `apiUrl`.
5. Abra o site. No primeiro acesso você cria o usuário da **Diretoria**. Depois, cadastre os vendedores no Painel da Diretoria.

As abas `Usuarios`, `Orcamentos`, `Faturamentos` e `Config` são criadas sozinhas na planilha. A coluna `json` guarda os dados completos: não edite à mão.
Ao alterar `backend/Codigo.js` depois, faça **Implantar → Gerenciar implantações → editar → Nova versão** para a URL continuar a mesma.

**Modo demonstração:** abra o site com `?demo=1` no fim do endereço. Ele usa o mesmo código do servidor, mas com uma planilha simulada salva só no navegador.

## Segurança

O login é feito por nome + PIN. O PIN é guardado com hash e sal, e a sessão usa um token assinado com validade de 30 dias. Depois de 5 tentativas erradas, o login fica bloqueado por 10 minutos. O servidor confere quem é cada usuário: vendedores só recebem os próprios orçamentos e faturamentos, e só a Diretoria altera configurações e usuários.

## Ideias para depois

- **Atualizar Asana**: enviar os valores do orçamento para o cliente no Asana (o botão já aparece no menu como "em breve").
- **PDF de faturamento**: aguardando o modelo.

## Arquivos

- `index.html`, `css/`, `js/`: o site (`proposta.js` monta o PDF; `historico.js`, `comissoes.js` e `diretoria.js` são as outras páginas; `festa.js` é a comemoração de venda)
- `backend/Codigo.js`: o servidor do Apps Script, que também traz os cálculos de comissão e m² usados pelo site
- `dev/gas-mock.js`: simulação da planilha para o modo demonstração
- `assets.js`: logos, QR Code e fonte embutidos
- `lib/`: [jsPDF](https://github.com/parallax/jsPDF) 4.2.1 (MIT)

A fonte é a Liberation Sans (SIL Open Font License 1.1), com as mesmas medidas da Arial.
