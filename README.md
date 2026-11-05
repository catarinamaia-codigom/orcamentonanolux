# Gerador de orçamento Nanolux · SOMMAR

Página para preencher um orçamento Nanolux e baixar o PDF no mesmo modelo da proposta comercial da SOMMAR (2 páginas, 16:9).

## Como usar

1. Abra a página (GitHub Pages) ou o arquivo `index.html` direto no navegador.
2. Preencha **Cliente**, **Projeto**, **Local**. O **nº do orçamento** é gerado sozinho (`ORC-AAAAMMDD-XXXXXX`); clique em **🎲 Gerar novo** para trocar.
3. Em **Itens do orçamento**, adicione quantas *Aplicações completas da resina Nanolux* quiser (ou outros itens). A descrição vem preenchida automaticamente e pode ser editada. O subtotal é calculado (quantidade × valor unitário).
4. **Área total** soma os itens marcados com "Somar na área total". **Investimento total** soma todos os subtotais.
5. **Desconto (opcional)**: informe o nome e o valor (em R$ ou %). No PDF, o quadro verde mostra o valor total riscado, o desconto e o valor atualizado.
6. Clique em **Baixar PDF**.

Os dados ficam salvos no próprio navegador até você clicar em **Novo orçamento**.
Se houver muitos itens, o PDF cria páginas de continuação automaticamente.

## Editar textos e preços padrão

No `index.html`, procure por `PRESETS` (catálogo de produtos), `INTRO_PADRAO` e `OBS_PADRAO`.

## Arquivos

- `index.html`: interface, modelo das páginas e geração do PDF
- `assets.js`: logos, QR Code do contrato e fonte embutidos
- `lib/`: [html2canvas](https://github.com/niklasvh/html2canvas) 1.4.1 e [jsPDF](https://github.com/parallax/jsPDF) 4.2.1 (licença MIT)

Fonte: Liberation Sans (SIL Open Font License 1.1), com as mesmas medidas da Arial.
