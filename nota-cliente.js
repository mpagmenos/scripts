// ==UserScript==
// @name         nota-cliente
// @namespace    http://tampermonkey.net/
// @version      2.21-final
// @description
// @author       Você
// @match        */gestor_web/faturamento/imprime_doc.asp*
// @run-at       document-idle
// @grant        GM_addStyle
// ==/UserScript==

(() => {
    'use strict';

    // ==============================================
    // 1. CSS – INJETADO COM GM_addStyle (MAIS RÁPIDO)
    // ==============================================
    GM_addStyle(`
        * { color:#000 !important; font-family:Arial,Helvetica,sans-serif !important; }
        body {
            background:#fff;
            margin:5px !important;
            line-height:1.35;
        }
        /* CABEÇALHO DA LOJA */
        .cabecalho-loja {
            font-weight:bold !important;
            line-height:1.3 !important;
            margin-bottom:35px !important;
            padding-bottom:15px !important;
            text-align:center !important;
            border-bottom:1px solid #eee !important;
        }
        .cabecalho-loja .linha-nome {
            font-size:16px !important;
            font-weight:bold !important;
        }
        .cabecalho-loja .linha-endereco,
        .cabecalho-loja .linha-contato {
            font-size:12px !important;
        }
        /* SEÇÃO DESTINATÁRIO/REMETENTE – 20px */
        .secao-destinatario,
        .secao-destinatario * {
            font-size:16px !important;
            line-height:1.3 !important;
        }
        /* CABEÇALHO PRINCIPAL – 18px */
        .cabecalho-principal,
        .cabecalho-principal * {
            font-size:18px !important;
            line-height:1.45 !important;
        }
        /* DATA DE EMISSÃO – 17px */
        .info-complementar,
        .info-complementar * {
            font-size:12px !important;
        }
        /* OBSERVAÇÕES – 15px */
        .observacoes,
        .observacoes * {
            font-size:13px !important;
            line-height:1.3 !important;
        }
        /* FORMA DE PAGAMENTO – 18px */
        .highlight-pagamento,
        .highlight-pagamento * {
            font-size:12px !important;
            font-weight:bold !important;
        }
        /* NOME DO CLIENTE – 24px */
        .highlight-nome,
        .highlight-nome * {
            font-size:24px !important;
            font-weight:bold !important;
        }
        /* TABELA DE PRODUTOS – INALTERADA */
        .tabela-produtos th {
            background:#E8E8E8 !important;
            text-align:center !important;
            font-size:10px !important;
            font-weight:bold !important;
            padding:4px 2px !important;
        }
        .tabela-produtos td {
            font-size:10px !important;
            text-align:center !important;
            padding:3px 2px !important;
        }
        .tabela-produtos .desc {
            text-align:left !important;
            padding-left:4px !important;
        }
        .tabela-produtos .valor-unit {
            font-weight:bold !important;
        }
        /* TABELA DE FATURAS – INALTERADA */
        .tabela-faturas-outer {
            width:100% !important;
            margin:18px 0 !important;
        }
        .tabela-faturas {
            width:100% !important;
            border-collapse:collapse;
        }
        .tabela-faturas th {
            background:#E8E8E8 !important;
            font-weight:bold !important;
            text-align:center !important;
            padding:6px !important;
            font-size:12px !important;
        }
        .tabela-faturas td {
            padding:4px 6px !important;
            font-size:11px !important;
            border:1px solid #000 !important;
        }
        .tabela-faturas .col-numero { width:35% !important; text-align:center !important; }
        .tabela-faturas .col-vencimento { width:30% !important; text-align:center !important; }
        .tabela-faturas .col-valor { width:35% !important; text-align:right !important; }
        .fakehr, .removido { display:none !important; }
    `);

    // ==============================================
    // 2. LIMPEZA + APLICA CLASSES (REFATORADO)
    // ==============================================
    const limparTudo = () => {
        // Logo
        document.querySelector('img[src*="mostra_logomarca"]')?.closest('td')?.remove();

        // Documento Interno
        const docCell = Array.from(document.querySelectorAll('td'))
            .find(td => td.textContent.includes('Documento Interno') && td.textContent.includes('Cópia de Nota Fiscal'));
        docCell?.remove();

        // Dados Complementares
        const linhaDados = Array.from(document.querySelectorAll('td'))
            .find(td => td.textContent.trim() === 'Dados Complementares');
        linhaDados?.closest('tr')?.remove();

        // Bloco de Operação
        const blocoOperacao = Array.from(document.querySelectorAll('td'))
            .find(td => td.innerHTML.includes('Tipo de Operação') && td.innerHTML.includes('Saída'));
        blocoOperacao?.closest('td[width="54%"][colspan="2"]')?.remove();

        // Linhas vazias
        document.querySelectorAll('tr').forEach(tr => {
            if (tr.querySelector('.fakehr') || tr.innerHTML.trim() === '' || tr.textContent.trim() === '') {
                tr.remove();
            }
        });

        // Tabelas fiscais
        const tabelasRemover = ['Totalização da Nota', 'Base Cálc. ICMS', 'Valor do Frete', 'Transportador'];
        tabelasRemover.forEach(texto => {
            const celula = Array.from(document.querySelectorAll('td, th'))
                .find(el => el.textContent.includes(texto) && !el.textContent.includes('Número da Fatura'));
            celula?.closest('table')?.remove();
        });

        // Detalhamento
        const detalhamento = Array.from(document.querySelectorAll('td'))
            .find(td => td.textContent.includes('Detalhamento da Nota / Produtos'));
        detalhamento?.closest('tr')?.remove();

        // CABEÇALHO DA LOJA – 25px (1ª linha) + 16px (demais)
        const celulaLoja = Array.from(document.querySelectorAll('td'))
            .find(td => {
                const text = td.textContent || '';
                return text.includes('PAGMENOS');
            });
        if (celulaLoja) {
            celulaLoja.classList.add('cabecalho-loja');
            celulaLoja.style.textAlign = 'center';
            celulaLoja.style.width = '100%';
            const linhas = celulaLoja.textContent
                .split('\n')
                .map(l => l.trim())
                .filter(l => l);
            if (linhas.length >= 1) {
                const htmlLinhas = [
                    `<div class="linha-nome">${linhas[0]}</div>`,
                    ...linhas.slice(1).map(l => `<div class="linha-endereco">${l}</div>`)
                ].join('');
                celulaLoja.innerHTML = htmlLinhas;
            }
        }

        // SEÇÃO DESTINATÁRIO/REMETENTE – 20px
        const celulaDestinatario = Array.from(document.querySelectorAll('td'))
            .find(td => td.textContent.includes('Destinatário / Remetente'));
        if (celulaDestinatario) {
            const tabelaDest = celulaDestinatario.closest('table');
            if (tabelaDest) tabelaDest.classList.add('secao-destinatario');
        }

        // Cabeçalho principal (Nota Fiscal:)
        const celulaCabecalho = Array.from(document.querySelectorAll('td'))
            .find(td => td.innerHTML.includes('Nota Fiscal:'));
        if (celulaCabecalho) {
            celulaCabecalho.classList.add('cabecalho-principal');
            let html = celulaCabecalho.innerHTML;
            const antes = html;
            //Série utilizada para gerar o link da promissoria (não esconder)
            // html = html.replace(/<br>\s*Série?:\s*<b>\s*[^<]*\s*<\/b>/gi, '');
            html = html.replace(/<br>\s*Data de entrada\/saída:\s*<b>[^<]*<\/b>\s*-\s*Hora:\s*<b>[^<]*<\/b>/gi, '');
            html = html.replace(/<br>\s*Depósito Origem:\s*<b>[^<]*<\/b>/gi, '');
            html = html.replace(/<br>\s*Depósito Destino:\s*<b>[^<]*<\/b>/gi, '');
            html = html.replace(/\s*<br>\s*<br>\s*/gi, '<br>');
            html = html.replace(/<br>\s*$/gi, '');
            if (html !== antes) celulaCabecalho.innerHTML = html;
        }

        // Data + Forma de Pagamento
        const celulaInfo = Array.from(document.querySelectorAll('td'))
            .find(td => td.innerHTML.includes('Data de Emissão:') || td.innerHTML.includes('Forma de Pagamento:'));
        if (celulaInfo) celulaInfo.classList.add('info-complementar');

        // Observações
        const celulaObs = Array.from(document.querySelectorAll('td'))
            .find(td => td.textContent.includes('Observações:') || td.innerHTML.includes('Observação:'));
        if (celulaObs) celulaObs.classList.add('observacoes');

        // REMOVE 2 RODAPÉS
        const rodapes = Array.from(document.querySelectorAll('table'))
            .filter(table => {
                const text = table.textContent || '';
                const firstTd = table.querySelector('td[width="100%"] > b > font');
                const hasTexto = firstTd && firstTd.textContent.includes('Este documento não tem valor fiscal');
                const hasRotina = text.includes('Rotina Origem:');
                return hasTexto && hasRotina;
            });
        rodapes.forEach(table => table.remove());
    };

    // ==============================================
    // 3. RECONSTRUIR TABELA PRODUTOS
    // ==============================================
    const reconstruirTabelaProdutos = () => {
        const tabelaOriginal = Array.from(document.querySelectorAll('table'))
            .find(t => t.textContent.includes('Código') && t.textContent.includes('Descrição do Produto / Ref'));
        if (!tabelaOriginal) return false;

        const linhas = tabelaOriginal.querySelectorAll('tr');
        const dadosLinhas = [];
        linhas.forEach(tr => {
            const cells = tr.querySelectorAll('td, th');
            const row = Array.from(cells).map(cell => cell.textContent.trim());
            if (row.length > 0) dadosLinhas.push(row);
        });
        if (dadosLinhas.length < 2) return false;

        const header = dadosLinhas[0];
        const indices = {
            codigo: header.findIndex(h => h.includes('Código')),
            descricao: header.findIndex(h => h.includes('Descrição do Produto / Ref')),
            qtd: header.findIndex(h => h.includes('Qtd.')),
            valorUnit: header.findIndex(h => h.includes('Valor Unit.')),
            descProduto: header.findIndex(h => h.includes('Desc. Produto')),
            valorTotal: header.findIndex(h => h.includes('Valor Total'))
        };
        if (Object.values(indices).some(i => i === -1)) return false;

        const novaTabela = document.createElement('table');
        novaTabela.classList.add('tabela-produtos');

        const thead = document.createElement('tr');
        ['Código', 'Descrição', 'Qtd.', 'Valor Unit.', 'Des.', 'Valor Total'].forEach(txt => {
            const th = document.createElement('th');
            th.textContent = txt;
            thead.appendChild(th);
        });
        novaTabela.appendChild(thead);

        dadosLinhas.slice(1).forEach(row => {
            const tr = document.createElement('tr');
            const valores = [
                row[indices.codigo],
                row[indices.descricao],
                row[indices.qtd],
                row[indices.valorUnit],
                row[indices.descProduto],
                row[indices.valorTotal]
            ];
            valores.forEach((val, i) => {
                const td = document.createElement('td');
                td.textContent = val;
                if (i === 1) td.classList.add('desc');
                if (i === 3) td.classList.add('valor-unit');
                tr.appendChild(td);
            });
            novaTabela.appendChild(tr);
        });

        tabelaOriginal.parentNode.replaceChild(novaTabela, tabelaOriginal);

        const regex = /\s*\(Total aproximado dos tributos R\$\s*[\d.,\s]+\)/gi;
        novaTabela.querySelectorAll('td.desc').forEach(td => {
            let html = td.innerHTML;
            const antes = html;
            html = html.replace(regex, '').replace(/\s+/g, ' ').trim();
            if (html !== antes) td.innerHTML = html;
        });

        return true;
    };

    // ==============================================
    // 4. AJUSTAR TABELA DE FATURAS
    // ==============================================
    const ajustarTabelaFaturas = () => {
        const outerTr = Array.from(document.querySelectorAll('tr'))
            .find(tr => tr.querySelector('td[colspan="3"]') && tr.textContent.includes('Número da Fatura'));
        if (!outerTr) return;

        const tabelaOriginal = outerTr.querySelector('table');
        if (!tabelaOriginal) return;

        const linhas = tabelaOriginal.querySelectorAll('tr');
        const dados = [];
        linhas.forEach((tr, i) => {
            const cells = tr.querySelectorAll('td');
            if (i === 0 || cells.length < 4) return;
            dados.push({
                numero: cells[1].textContent.trim(),
                vencimento: cells[2].textContent.trim(),
                valor: cells[3].textContent.trim()
            });
        });

        if (dados.length === 0) return;

        const novaTabela = document.createElement('table');
        novaTabela.classList.add('tabela-faturas');

        const thead = document.createElement('tr');
        ['Número da Fatura', 'Vencimento', 'Valor'].forEach(txt => {
            const th = document.createElement('th');
            th.textContent = txt;
            if (txt.includes('Número')) th.classList.add('col-numero');
            if (txt.includes('Vencimento')) th.classList.add('col-vencimento');
            if (txt.includes('Valor')) th.classList.add('col-valor');
            thead.appendChild(th);
        });
        novaTabela.appendChild(thead);

        dados.forEach(item => {
            const tr = document.createElement('tr');
            const td1 = document.createElement('td'); td1.textContent = item.numero; td1.classList.add('col-numero');
            const td2 = document.createElement('td'); td2.textContent = item.vencimento; td2.classList.add('col-vencimento');
            const td3 = document.createElement('td'); td3.textContent = item.valor; td3.classList.add('col-valor');
            tr.appendChild(td1); tr.appendChild(td2); tr.appendChild(td3);
            novaTabela.appendChild(tr);
        });

        const outerTd = outerTr.querySelector('td[colspan="3"]');
        outerTd.innerHTML = '';
        outerTd.classList.add('tabela-faturas-outer');
        outerTd.appendChild(novaTabela);
    };

    //busca o ID da loja atual.
    function buscarIdLoja() {
        const lojas = {
            'PAGMENOS CENTRO':     1,
            'PAGMENOS BOA ESP.':   2,
            'PAGMENOS VILA':       3,
            'PAGMENOS SJBV':       4,
            'PAGMENOS SOCORRO':    5,
            'PAGMENOS DER':    7
        };

        // Pega TODO o texto visível da página de uma vez só (muito rápido)
        const textoPagina = document.body.textContent || '';

        // Procura cada nome de loja no texto completo
        for (const [nomeLoja, id] of Object.entries(lojas)) {
            if (textoPagina.includes(nomeLoja)) {
                return id;
            }
        }
        return null; // não encontrou nenhuma loja conhecida
    };

    function imprimirPromissoria() {
        let nota = '';
        let serie = '';
        let loja = null;

        // Percorre todos os <font> apenas UMA vez
        for (const font of document.querySelectorAll('font')) {
            const texto = font.textContent;

            // Busca a linha "Nota Fiscal:"
            if (texto.includes('Nota Fiscal:')) {
                const filhos = font.children;
                if (filhos.length >= 2) {
                    nota = filhos[0].textContent.trim();        // número da nota
                    serie = filhos[2].textContent.trim();       // série (pula um <br> ou span)
                }
            }

        // Quando encontra "CREDIÁRIO", já tem tudo que precisa
            if (texto.includes('CREDIÁRIO')) {
                loja = buscarIdLoja(); // sua função já otimizada

                if (loja && nota && serie) {
                    const baseUrl = document.URL.split('/gestor_web')[0];
                    const url = `${baseUrl}/gestor_web/financeiro/boletos/carnet_modelo_12.asp?identificador=&empresa=${loja}&documento=${nota}&serie=${serie}`;

                    window.open(url, '_blank');
                    return; // já abriu, não precisa continuar procurando
                }
            }
        }
    };


    // ==============================================
    // 6. EXECUÇÃO – OTIMIZADA (SEM LOGS)
    // ==============================================
    let executado = false;
    const rodar = () => {
        if (executado) return;
        executado = true;
        limparTudo();
        reconstruirTabelaProdutos();
        ajustarTabelaFaturas();
        imprimirPromissoria();

    };

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(rodar, 100);
    } else {
        document.addEventListener('DOMContentLoaded', () => setTimeout(rodar, 100));
    }
    setTimeout(rodar, 3000); // fallback seguro
})();