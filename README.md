# App de Controle de Atendimentos — Fisioterapia Domiciliar

App para celular (PWA instalável) que controla pacientes atendidas e valores a receber, com os dados salvos em uma planilha do Google Sheets.

## O que o app faz

- Cadastro de pacientes (nome, telefone, valor padrão da sessão e forma de pagamento)
- Lançamento de atendimentos com lista de pacientes, data, horário e valor (o valor já vem preenchido pelo padrão da paciente)
- Registro da localização do atendimento pelo GPS do celular, com link do Google Maps no comprovante
- Edição e exclusão de atendimentos lançados
- Registro de pagamento com data
- Resumo mensal por paciente (esperado × recebido × pendente)
- Comprovante em PDF por sessão
- Comprovante mensal em PDF por paciente ou com o resumo de todos os pacientes

## 📱 App instalável e offline (PWA)

O app é um **PWA** (Progressive Web App): dá para **instalar na tela inicial** do celular e **abrir mesmo sem internet** (a interface e a biblioteca de PDF ficam em cache; os dados da planilha, naturalmente, precisam de conexão).

- **Android (Chrome):** abra o site → menu `⋮` → **Instalar aplicativo** / **Adicionar à tela inicial**.
- **iPhone (Safari):** botão **Compartilhar** → **Adicionar à Tela de Início**.
- **Computador (Chrome/Edge):** ícone de instalar na barra de endereço.

Arquivos que compõem o PWA: `manifest.json` (nome, cores, ícones), `sw.js` (service worker com o cache) e os ícones em `icons/`.

> O manifesto usa a extensão `.json` (e não `.webmanifest`) de propósito: o GitHub Pages serve `.webmanifest` com um tipo de conteúdo que o Chrome ignora, e aí o botão "Instalar" não aparece. Com `.json` a instalação funciona. O app ainda tem um botão **⬇ Instalar** no cabeçalho (aparece quando o navegador permite; no iPhone abre as instruções de "Adicionar à Tela de Início").

> Ao publicar mudanças de interface, **incremente `CACHE_VERSION`** no topo de `sw.js` para que os aparelhos baixem a versão nova.

## 🎨 Visual

Interface **mobile-first** com paleta **terracota e cores de outono** (âmbar/mostarda, folhagem e creme). Botões e alvos de toque ampliados, campos com fonte de 16px (evita o zoom automático do iOS), modais em folha deslizante com fechamento por toque fora ou `Esc`, e respeito às *safe areas* (notch) do celular.

## Arquivos

- `atendimentos.html` — o app (página única)
- `index.html` — redireciona para `atendimentos.html` (permite abrir pela raiz e serve de `start_url` do PWA)
- `manifest.json` — manifesto do PWA
- `sw.js` — service worker (cache offline do app)
- `icons/` — ícones do app (192, 512 e *maskable* 512)
- `scripts/gerar-icones.js` — gera os ícones do zero (Node puro)
- `Code.gs` — conector do Google Apps Script que lê e grava na planilha

## Instalação

1. Crie uma planilha nova no Google Sheets.
2. Abra **Extensões > Apps Script**, apague o código padrão e cole o conteúdo de `Code.gs`. Salve.
3. Clique em **Implantar > Nova implantação**, tipo **App da Web**. Em "Executar como" escolha **Eu** e em "Quem pode acessar" escolha **Qualquer pessoa**. Autorize o acesso quando o Google pedir.
4. Copie o link terminado em `/exec`.
5. Hospede a pasta do projeto em qualquer serviço de páginas estáticas **com HTTPS** (GitHub Pages, Netlify, tiiny.site etc.) e abra o endereço no celular.
6. Na primeira abertura, cole o link `/exec` e preencha o nome da profissional (e CREFITO/PIX, se quiser que apareçam nos recibos).

O script cria sozinho as abas **Atendimentos** e **Pacientes** na planilha.

> **Importante:** o PWA (instalação e cache offline) só funciona quando a página é servida por **HTTPS** (ou em `localhost`). Abrir o arquivo direto por `file://` não ativa o service worker.

## Regenerar os ícones

Para mudar o desenho/cores dos ícones, edite e rode:

```
node scripts/gerar-icones.js
```

Isso recria `icons/icon-192.png`, `icon-512.png` e `icon-maskable-512.png`. Não exige nenhuma dependência externa.

## Atualizando o script

Sempre que o `Code.gs` for alterado, cole a nova versão no Apps Script e publique uma nova versão em **Implantar > Gerenciar implantações > Editar > Nova versão**. O link `/exec` continua o mesmo.

## Observações

- A configuração (link do script e dados da profissional) fica salva no navegador do aparelho. Use sempre o mesmo navegador ou atalho.
- A localização exige que o navegador tenha permissão de acesso ao GPS e que a página seja aberta por HTTPS.
- Gravações que falham na planilha (sem conexão) são **desfeitas na tela** (rollback) e um aviso é exibido, para que a lista nunca fique diferente do que está salvo.
