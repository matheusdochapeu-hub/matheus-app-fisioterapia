# App de Controle de Atendimentos — Fisioterapia Domiciliar

App para celular (PWA instalável) que controla pacientes atendidas e valores a receber, com os dados salvos em uma planilha do Google Sheets.

## O que o app faz

O aplicativo conta com **3 abas principais**:

### 1. Pacientes e Dados Cadastrais (Aba Inicial)
- **Lista e busca rápida de pacientes** por nome, telefone, documento ou bairro.
- **Botão "+ Adicionar novo paciente"** com ficha cadastral completa e prontuário CREFITO-3:
  - Identificação (Nome completo, RG/CPF, Data de nascimento).
  - Contatos & Endereço (Telefone/WhatsApp com atalho direto, Contato 02 de emergência/familiar, Endereço, Bairro, Cidade).
  - Condições de Atendimento & Contrato (Valor da sessão, Forma de pagamento padrão, Frequência semanal de 1x a 7x/sem, TCLE entregue Sim/Não, Contrato assinado Sim/Não).
  - Prontuário Domiciliar CREFITO-3 (Diagnóstico clínico/CID, Diagnóstico cinesiológico-funcional/queixa principal, Objetivos terapêuticos).
- **Menu cascata em cada paciente** com 5 ações rápidas:
  - **Check-in**: Lançamento rápido de atendimento já com o paciente selecionado e valor padrão preenchido.
  - **Evolução**: Registro clínico da sessão (PA, FC, Estado clínico geral e Condutas fisioterapêuticas).
  - **Evoluções**: Histórico completo de prontuários do paciente e exportação para PDF.
  - **Dados Cadastrais**: Visualização e edição completa da ficha do paciente.
  - **Financeiro**: Extrato financeiro exclusivo do paciente com sessões, saldos e exportação de PDF.

### 2. Evoluções (Visão Geral de Prontuários)
- **Feed cronológico** de todas as evoluções clínicas de todos os pacientes (da mais recente para a mais antiga).
- **Multi-filtros combináveis**: por Paciente, Mês/Ano, Período (De / Até) e busca textual por termos (queixas, condutas, sinais vitais).
- **Exportação para PDF** com cabeçalho profissional, marca d'água de outono e carimbo digital.
- **Backup clínico local** (JSON/CSV) e sincronização contínua com a planilha.

### 3. Financeiro
- **Controle mensal** de atendimentos com navegação de meses.
- **Ícone de olho (estilo app de banco)** para ocultar/exibir os saldos de recebido e a receber com um toque.
- **Comprovantes em PDF com seleção múltipla de pacientes**: gere comprovantes individuais ou consolidados com resumo e página detalhada por paciente.
- **Relatório financeiro anual avançado**:
  - KPIs: Faturamento anual, Recebido, A Receber, Taxa de inadimplência (%), Total de sessões, Pacientes ativos e Ticket médio.
  - Gráfico comparativo mensal com barras empilhadas de recebido × pendente.
  - Ranking de pacientes com barras de porcentagem de participação no faturamento.
  - Distribuição das receitas por forma de pagamento (Pix, Dinheiro, Transferência, Cartão).
  - Calendário interativo dos dias trabalhados no mês.
  - Exportação do Relatório Financeiro Anual completo em PDF.

## 🔗 Link da planilha embutido

O link do Google Apps Script (`/exec`) fica **embutido no código**, na constante `SCRIPT_URL` no topo do `<script>` de `atendimentos.html`. Assim o app abre direto, de qualquer aparelho, **sem pedir o link** na primeira vez — pede apenas o nome da profissional (para os recibos).

> Para apontar o app para outra planilha, basta trocar a URL de `SCRIPT_URL` (deve terminar em `/exec`). Instalações antigas que já tinham o link salvo continuam funcionando (o app usa o link salvo quando existe).

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

> ⚠️ **Importante (Segurança da Planilha):**
> Nunca compartilhe publicamente o link `/exec` da sua implantação do Apps Script.
> Caso seu link tenha sido exposto, acesse o editor do Apps Script, vá em **Implantar > Gerenciar implantações**,
> exclua a implantação antiga e crie uma nova (**Nova implantação > App da Web**).

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

> **Importante (exercícios e rotinas):** a versão atual do `Code.gs` cria duas abas novas — **Exercicios** e **Rotinas**. Para o cadastro de exercícios, as rotinas e a cartilha funcionarem, é preciso **colar o `Code.gs` novo no Apps Script e publicar uma nova versão** (passo acima). As abas são criadas sozinhas na primeira vez. Os dados de atendimentos/pacientes já existentes **não são afetados**.

> **Múltiplas rotinas por paciente:** a aba **Rotinas** ganhou a coluna **`Rotulo`** (nome da rotina, ex.: "Terça"). Itens antigos sem rótulo entram automaticamente na rotina "Rotina principal". Se já havia uma aba Rotinas, **republique o `Code.gs`** para que a coluna seja adicionada.

## Observações

- A configuração (link do script e dados da profissional) fica salva no navegador do aparelho. Use sempre o mesmo navegador ou atalho.
- A localização exige que o navegador tenha permissão de acesso ao GPS e que a página seja aberta por HTTPS.
- Gravações que falham na planilha (sem conexão) são **desfeitas na tela** (rollback) e um aviso é exibido, para que a lista nunca fique diferente do que está salvo.
