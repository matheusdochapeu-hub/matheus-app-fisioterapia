# Memória de Atualizações — App Fisioterapia (`matheus-app-fisioterapia`)

Data da consolidação: `01/11/2026`  
Versão do Service Worker: `atend-v24` (`sw.js`)

---

## 1. Estabilidade, Concorrência, Sincronização e Link da Planilha (`Plans 001–005` + `v21–v24`)
- **Validação estrita em `postAction` (`atendimentos.html`):** Detecta erros HTTP, páginas HTML de erro do Google Apps Script e respostas `handled: false` ou `success: false`.
- **Bloqueio de concorrência em `Code.gs`:** Uso de `LockService.getScriptLock()` (timeout de 30s) com `try/catch/finally` e formatação de datas respeitando o fuso horário da planilha (`getTimeZone_()`).
- **Migração automática de colunas (`ensureColumns_` em `Code.gs`):** Adiciona automaticamente novas colunas (`NomeFantasia`, `OldNome`, `Arquivado`, `Foto`, dados clínicos CREFITO-3) e lê/atualiza células pelo nome do cabeçalho (`readSheet_`, `updateFieldById_`).
- **Importação em lote (`bulk_import` em `Code.gs`):** Restauração rápida de backups em uma única chamada em lote.
- **Persistência local resiliente (`saveLocalPatientMeta` / `getLocalPatientMeta` / `saveLocalEvolutions` / `getLocalEvolutions` em `atendimentos.html`):** Mantém metadados cadastrais, fotos, nome fantasia, status de arquivamento e evoluções clínicas sincronizados também no `localStorage` (`ft_pmeta_<id>`, `ft_archived_<id>`, `ft_avatar_<id>`, `ft_nome_fantasia_<id>`, `ft_local_evolutions`), evitando perda de dados ou reversão de estado.
- **Atualização automática do Link da Planilha (`SCRIPT_URL` e `init()` em `atendimentos.html`):** Configurado o novo link da implantação do Apps Script (`/exec`) com migração automática do `config.scriptUrl` salvo no navegador ao abrir o app.

---

## 2. Correções Gerais de Usabilidade, Layout e Navegação Mobile
- **Remoção de botões não utilizados:** Removidos os botões *"Rotinas"*, *"Exercícios"* e *"Cartilha"*.
- **Correção do autopreenchimento `"2026"` em Novo Atendimento:** Endurecida a função `parseValor()` e `loadData()` para ignorar strings de data/timestamp (`^\d{4}-\d{2}-\d{2}`) vindas da coluna `ValorPadrao`.
- **Correção da sobreposição do prefixo `R$` no campo Valor da Sessão (`v22`):** Ajustada a especificidade CSS em `.modal .money-field input` (`padding-left: 38px !important` no desktop e `34px !important` no celular) para que o `R$` nunca sobreponha o número digitado.
- **Botão "Voltar" do celular nos Modais e Configurações:**
  - Abrir qualquer modal empilha `{ modalOpen: true }` no `history`; clicar em "Voltar" no aparelho fecha apenas o modal aberto sem sair do aplicativo.
  - Abrir as Configurações (`openSettings`) empilha `{ screen: 'settings' }`; clicar em "Voltar" descarta edições não salvas, mantém as últimas configurações válidas e retorna para a tela inicial (`cancelSetup`).
- **Valores Financeiros Ocultos por Padrão (Ícone de Olho `🙈 / 👁️`):**
  - Todos os saldos e valores iniciam ocultos por padrão (`sessionStorage.getItem('show_financials') !== 'true'`).
  - Botão de exibir/ocultar valores presente na **Aba Financeiro**, no **Relatório Financeiro** e no modal **Financeiro do Paciente**.

---

## 3. Arquitetura em 3 Abas Principais

### Aba 1 — Pacientes e Dados Cadastrais (`👥 Pacientes`)
- **Cards de Pacientes com Menu Cascata:** Busca instantânea por Nome Fantasia, Nome Completo, CPF/RG, telefone ou bairro.
- **Foto de Perfil em Miniatura (`renderPatientAvatar` / `compressPatientPhoto`):** Permite subir foto da galeria ou tirar foto com a câmera na ficha cadastral, comprimindo automaticamente para miniatura quadrada `160x160` JPEG exibida no lugar das iniciais.
- **Nome Fantasia vs. Nome Completo (`getPatientDisplayName` / `getPatientLegalName`):**
  - **Nome Fantasia:** Aparece antes do Nome Completo na ficha do paciente e é usado em **todas as visualizações internas** do aplicativo.
  - **Nome Completo:** Usado exclusivamente em **todos os documentos exportados** (PDFs de ficha cadastral, prontuários/evoluções, extratos, recibos individuais, comprovantes mensais e exportação CSV). O Nome Fantasia jamais aparece em documentos externos.
- **Ficha Cadastral e Prontuário CREFITO-3 (`openPatientForm`):** Campos alinhados lado a lado no celular (`40px`/`42px`), com exportação da ficha completa em PDF.
- **Exames e Documentos (`openPatientFilesModal`):** Dois botões dedicados para anexar PDFs/imagens ou bater foto na hora (`capture="environment"`), visualizar, baixar e excluir arquivos (armazenados via `IndexedDB` `ft_docs_db`).
- **Financeiro do Paciente (`openPatientFinancial`):** Filtro por período (*Tudo*, *Por Mês*, *Por Ano*, *Vários Meses*), botão exibir/ocultar valores (`🙈 / 👁️`), alteração de status `Pago`/`Pendente` preservando o modal aberto e geração de Extrato em PDF.
- **Fluxo de Arquivamento e Aba "📁 Pacientes Arquivados" (`toggleArchivePatient` / `deletePatient`):**
  - Ao clicar em **Finalizar / Arquivar Paciente**, **todos os dados do paciente são mantidos intactos** e o card é movido imediatamente para a aba/seção **"📁 Pacientes Arquivados"** no final da página (e marcado como `(Finalizado)` no Financeiro).
  - Dentro da aba **Pacientes Arquivados**, cada card possui botões diretos para **🔄 Desarquivar** (retorna à lista de ativos) e **🗑️ Excluir Definitivamente**.
  - Pacientes ativos não podem ser excluídos diretamente; a **Exclusão Definitiva** só é permitida após o paciente estar arquivado e exige confirmação explícita (`confirm(...)`).

### Aba 2 — Evoluções Clínicas (`📋 Evoluções`)
- **Layout Limpo e Ordenação:** Apenas um botão grande **"+ Nova Evolução"** abaixo do filtro; painel de filtros recolhido por padrão com botão **"▼ Expandir filtros"** e dois botões de ordenação (**"▼ Do mais novo pro mais antigo"** e **"▲ Do mais antigo para o mais novo"**).
- **Registro Estruturado:** Campos alinhados para Data, Horário, `PA`, `FC`, `Estado Clínico Geral` e `Condutas Fisioterapêuticas`, com gravação na planilha (`Evolucoes`) e persistência local (`ft_local_evolutions`).
- **Histórico de Evoluções do Paciente (`openPatientEvolutions`):** Sem botão redundante de nova evolução; possui caixas de seleção (**"Selecionar todas"** ou seleção manual uma a uma) para exportar múltiplas evoluções concatenadas em um PDF único (`exportSelectedPatientEvolutionsPDF`).

### Aba 3 — Financeiro (`💰 Financeiro`)
- **Comprovantes Mensais Múltiplos (`openMonthlyReceipt` / `submitMonthlyReceipt`):** Permite selecionar um ou mais pacientes simultaneamente para gerar comprovantes conjuntos em um único PDF.
- **Relatório Financeiro Avançado (`openReports`):** Filtro por **Ano** e por **Mês** (`Ano Completo` ou `Janeiro..Dezembro`), valores ocultos por padrão com botão `🙈 / 👁️`, gráfico mensal empilhado (Recebido vs. Pendente), ranking por paciente, distribuição por forma de pagamento e calendário de dias trabalhados.
