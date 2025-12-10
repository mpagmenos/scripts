// ==UserScript==
// @name         Gerador de EAN
// @namespace    http://tampermonkey.net/
// @version      2.2
// @description  Gera EAN 789
// @author       Você
// @match        https://marketplace.netshoes.com.br/*
// @match        https://*.microvix.com.br/*/suprimentos/*
// @match        https://*/gestor_web/produtos/atualiza_codebars.asp*
// @match        https://magazinepagmenos.admin.core.dcg.com.br/Catalog/*
// @match        https://painel.plugg.to/products
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Calcula dígito verificador EAN-13
    function calcularDV(ean12) {
        let soma = 0;
        for (let i = 0; i < 12; i++) {
            let digito = parseInt(ean12[i]);
            soma += (i % 2 === 0) ? digito : digito * 3;
        }
        return (10 - (soma % 10)) % 10;
    }

    // Copia para área de transferência
    function copiar(texto) {
        navigator.clipboard.writeText(texto).catch(() => {
            const ta = document.createElement('textarea');
            ta.value = texto;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
        });
    }

    // Tenta preencher o campo codebar e retorna true se conseguiu
    function preencherCodebar(ean) {
        const seletores = [
            '#codebar', '#Codebar', '#CODEBAR',
            '#codigoBarras', '#codigobarras',
            '#ean', '#EAN',
            'input[name="codebar"]', 'input[name="codigoBarras"]', 'input[name="ean"]',
            'input[placeholder*="EAN" i]', 'input[placeholder*="barra" i]', 'input[placeholder*="código" i]'
        ];

        for (let sel of seletores) {
            const campo = document.querySelector(sel);
            if (campo && campo.offsetParent !== null && !campo.readOnly) {
                campo.focus();
                campo.value = ean;
                campo.dispatchEvent(new Event('input', { bubbles: true }));
                campo.dispatchEvent(new Event('change', { bubbles: true }));
                campo.dispatchEvent(new Event('keyup', { bubbles: true }));
                console.log('EAN preenchido com sucesso em:', campo);
                return campo; // Retorna o campo encontrado
            }
        }
        console.warn('Campo codebar não encontrado na página');
        return null;
    }

    // Clica no botão "+" (só se o campo foi preenchido)
    function clicarBotaoMais() {
        const seletoresBotao = [
            'button.btn.btn-sm.btn-primary > i.fas.fa-plus',
            'button.btn.btn-primary > i.fas.fa-plus',
            'button.btn-sm.btn-primary:has(i.fas.fa-plus)',
            'button.btn-primary:has(i.fa-plus)',
            'button[title*="Adicionar" i]',
            'button:has(i.fa-plus)',
            '.btnAdicionarCodebar, #btnAdicionarEan'
        ];

        for (let sel of seletoresBotao) {
            const icone = document.querySelector(sel);
            if (!icone) continue;

            const botao = icone.closest('button') || icone.closest('a');
            if (botao && !botao.disabled && botao.offsetParent !== null) {
                botao.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setTimeout(() => {
                    botao.click();
                }, 150);
                console.log('Botão + clicado com sucesso');
                return true;
            }
        }
        console.warn('Botão + não encontrado');
        return false;
    }

    // Gera o EAN completo
    function gerarEAN(numero) {
        numero = numero.replace(/\D/g, '');
        if (!numero) {
            alert('Insira ou selecione um número válido!');
            return null;
        }

        const base = ('789' + numero).padEnd(12, '0');
        const eanCompleto = base + calcularDV(base);

        // 1. Copia para clipboard
        copiar(eanCompleto);

        // 2. Tenta preencher o campo #codebar
        const campoPreenchido = preencherCodebar(eanCompleto);

        // 3. Só clica no botão + se o campo foi realmente preenchido
        if (campoPreenchido) {
            setTimeout(clicarBotaoMais, 400); // Pequeno delay para garantir que o campo foi atualizado
        } else {
            console.log('Botão + NÃO foi clicado porque o campo #codebar não foi encontrado');
        }

        return eanCompleto;
    }

    // === Interface flutuante (mesma de antes, limpa e funcional) ===
    const div = document.createElement('div');
    Object.assign(div.style, {
        position:'fixed', top:'10px', right:'10px', background:'white',
        border:'2px solid #0066cc', padding:'10px', borderRadius:'10px',
        zIndex:'99999', fontFamily:'Arial, sans-serif', fontSize:'13px',
        boxShadow:'0 6px 20px rgba(0,0,0,0.3)', display:'flex',
        alignItems:'center', gap:'10px', cursor:'move'
    });
    document.body.appendChild(div);

    // Fechar
    const x = document.createElement('span');
    x.textContent = '×';
    x.style.cssText = 'font-size:20px;cursor:pointer;color:#999;margin-left:5px;';
    x.onclick = () => div.remove();
    div.appendChild(x);

    // Input
    const input = document.createElement('input');
    input.placeholder = 'Ex: 123456';
    input.style.cssText = 'width:110px;padding:6px;border:1px solid #ccc;border-radius:5px;';
    div.appendChild(input);

    // Botão Gerar
    const btn = document.createElement('button');
    btn.textContent = 'Gerar EAN';
    btn.style.cssText = 'padding:6px 12px;background:#0066cc;color:white;border:none;border-radius:5px;cursor:pointer;font-weight:bold;';
    div.appendChild(btn);

    // Resultado
    const res = document.createElement('span');
    res.style.cssText = 'margin-left:10px;font-weight:bold;color:#0066cc;cursor:pointer;';
    div.appendChild(res);

    // Checkbox menu
    const chk = document.createElement('input');
    chk.type = 'checkbox';
    chk.checked = true;
    div.appendChild(chk);
    const lbl = document.createElement('label');
    lbl.textContent = ' Menu';
    lbl.style.fontSize = '11px';
    div.appendChild(lbl);

    // Arrastar
    let arrastando = false, ox, oy;
    div.addEventListener('mousedown', e => {
        if ([x, input, btn, res].includes(e.target)) return;
        ox = e.clientX - div.getBoundingClientRect().left;
        oy = e.clientY - div.getBoundingClientRect().top;
        arrastando = true;
    });
    document.addEventListener('mousemove', e => {
        if (arrastando) {
            div.style.left = (e.clientX - ox) + 'px';
            div.style.top = (e.clientY - oy) + 'px';
            div.style.right = 'auto';
        }
    });
    document.addEventListener('mouseup', () => arrastando = false);

    // Ações
    const gerar = num => {
        const ean = gerarEAN(num);
        if (ean) {
            res.textContent = ean;
            res.title = 'Clique para copiar';
        }
        input.value = '';
        input.focus();
    };

    btn.onclick = () => gerar(input.value.trim());
    input.addEventListener('keydown', e => e.key === 'Enter' && gerar(input.value.trim()));
    res.onclick = () => res.textContent && copiar(res.textContent);

    // Menu de contexto
    document.addEventListener('contextmenu', e => {
        if (!chk.checked) return;
        const sel = window.getSelection().toString().trim();
        if (!sel) return;

        e.preventDefault();
        const menu = document.createElement('div');
        menu.textContent = 'Gerar EAN-13 (789)';
        Object.assign(menu.style, {
            position:'absolute', top:e.pageY+'px', left:e.pageX+'px',
            background:'white', border:'2px solid #0066cc', padding:'8px 14px',
            borderRadius:'6px', cursor:'pointer', fontSize:'13px', zIndex:'100000',
            boxShadow:'3px 3px 10px rgba(0,0,0,0.4)', fontWeight:'bold', color:'#0066cc'
        });
        document.body.appendChild(menu);
        const remover = () => menu.remove();
        document.addEventListener('click', remover, {once:true});
        menu.onclick = () => { gerar(sel); remover(); };
    });

})();