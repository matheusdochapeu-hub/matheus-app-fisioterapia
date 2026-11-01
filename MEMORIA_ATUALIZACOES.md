# Memória de Atualizações — App Fisioterapia (`matheus-app-fisioterapia`)

Data da consolidação: `01/11/2026`  
Versão do Service Worker: `atend-v29` (`sw.js`)

---

## 1. Estabilidade, Concorrência, Sincronização e Link da Planilha (`Plans 001–005` + `v21–v29`)
- **Validação estrita em `postAction` (`atendimentos.html`):** Detecta erros HTTP, páginas HTML de erro do Google Apps Script e respostas `handled: false` ou `success: false`, retornando o objeto JSON parseado (`data`) para uso direto nos fluxos de sincronização.
- **Bloqueio de concorrência em `Code.gs`:** Uso de `LockService.getScriptLock()` (timeout de 30s) com `try/catch/finally` e formatação de datas respeitando o fuso horário da planilha (`getTimeZone_()`).
- **Migração automática de colunas e abas (`ensureColumns_` em `Code.gs`):** Adiciona automaticamente novas colunas (`NomeFantasia`, `OldNome`, `Arquivado`, `Foto`, dados clínicos CREFITO-3) e cria/atualiza as abas `Evolucoes` e `Agendamentos`.
- **Importação em lote (`bulk_import` em `Code.gs`):** Restauração rápida de backups em uma única chamada em lote.
- **Persistência local resiliente (`saveLocalPatientMeta`, `saveLocalEvolutions`, `saveLocalSchedules` em `atendimentos.html`):** Mantém metadados cadastrais, fotos, nome fantasia, status de arquivamento, evoluções clínicas e agendamentos sincronizados também no `localStorage` (`ft_pmeta_<id>`, `ft_archived_<id>`, `ft_avatar_<id>`, `ft_nome_fantasia_<id>`, `ft_local_evolutions`, `ft_local_schedules`).
- **Atualização automática do Link da Planilha (`SCRIPT_URL` e `init()` em `atendimentos.html`):** Configurado o link da implantação do Apps Script (`/exec`) com migração automática do `config.scriptUrl` salvo no navegador ao abrir o app.

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

## 3. Arquitetura em 4 Abas Principais

### Aba 1 — Pacientes e Dados Cadastrais (`👥 Pacientes`)
- **Cards de Pacientes com Menu Cascata:** Busca instantânea por Nome Fantasia, Nome Completo, CPF/RG, telefone ou bairro, com botão direto para **📅 Agendar**.
- **Foto de Perfil em Miniatura (`renderPatientAvatar` / `compressPatientPhoto`):** Permite subir foto da galeria ou tirar foto com a câmera na ficha cadastral, comprimindo automaticamente para miniatura quadrada `160x160` JPEG exibida no lugar das iniciais.
- **Nome Fantasia vs. Nome Completo (`getPatientDisplayName` / `getPatientLegalName`):**
  - **Nome Fantasia:** Aparece antes do Nome Completo na ficha do paciente e é usado em **todas as visualizações internas** do aplicativo.
  - **Nome Completo:** Usado exclusivamente em **todos os documentos exportados** (PDFs de ficha cadastral, prontuários/evoluções, extratos, recibos individuais, comprovantes mensais e exportação CSV). O Nome Fantasia jamais aparece em documentos externos.
- **Ficha Cadastral e Prontuário CREFITO-3 (`openPatientForm`):** Campos alinhados lado a lado no celular (`40px`/`42px`), com exportação da ficha completa em PDF.
- **Exames e Documentos (`openPatientFilesModal`):** Dois botões dedicados para anexar PDFs/imagens ou bater foto na hora (`capture="environment"`), visualizar, baixar e excluir arquivos (armazenados via `IndexedDB` `ft_docs_db`).
- **Financeiro Individual do Paciente (`openPatientFinancial` / `renderPatientFinancialDetails`):**
  - Filtro por período (*Tudo*, *Por Mês*, *Por Ano*, *Vários Meses*) e botão exibir/ocultar valores (`🙈 / 👁️`).
  - **Previsão do Paciente (`#pFinForecastBox`):** Exibe **Ganho Real (Feito)**, **Previsto (Agenda)** e **Ganho Possível**, além de listar as sessões agendadas pendentes com botão de **✓ Check-in** rápido.
- **Fluxo de Arquivamento e Aba "📁 Pacientes Arquivados" (`toggleArchivePatient` / `deletePatient`):**
  - Ao clicar em **Finalizar / Arquivar Paciente**, todos os dados são mantidos intactos e o card é movido para a seção **"📁 Pacientes Arquivados"** no final da página.
  - Pacientes ativos não podem ser excluídos diretamente; a **Exclusão Definitiva** só é permitida após o paciente estar arquivado e exige confirmação explícita (`confirm(...)`).

### Aba 2 — Agenda e Integração com Google Agenda (`📅 Agenda`) (`v27–v29`)
- **E-mail Padrão Configurado (`DEFAULT_CALENDAR_ID = 'scarletsantos7@gmail.com'`):**
  - Definido como padrão tanto no aplicativo (`atendimentos.html` via `getUserCalendarId()` e `init()`) quanto no servidor da planilha (`Code.gs` via `resolveUserCalendar_()`), permitindo também alterar ou testar a conexão em **⚙️ Configurar Agenda**.
- **Agendamento Único ou Escala da Semana / Mês (`openScheduleModal` / `submitSchedule`):**
  - Permite agendar uma sessão avulsa ou gerar em lote toda a escala da semana, quinzena, mês atual ou próximo mês escolhendo os dias da semana (`Seg` a `Dom`).
- **Sincronização Automática com Google Agenda (`CalendarApp` em `Code.gs`):**
  - Cria automaticamente os eventos no Google Agenda com nome do paciente, endereço, telefone e observações (`create_schedule`, `create_schedules_batch`), atualiza data/hora ao remarcar (`update_schedule`) e remove do Google Agenda ao cancelar (`delete_schedule`).
  - Inclui também atalho **"📅 Abrir no Google Agenda"** por sessão e exportação de arquivo `.ics` (**"📲 Exportar Agenda"**).
- **Prevenção de Conflitos e Vínculo Bidirecional entre Agenda, Check-ins e Lançamentos Manuais (`v28`):**
  - **No modal "Novo Atendimento / Check-in" (`openNewEntry` / `onNewEntryPatientOrDateChange`):** Detecta automaticamente se o paciente tem agendamento pendente na data escolhida (ou em datas próximas para reposição/antecipação), pré-preenche horário/valor e vincula o lançamento ao agendamento (`status = 'Realizado'`, `atendimentoId = entry.id`), além de exibir alerta amarelo caso já exista atendimento lançado no mesmo dia.
  - **No modal "Nova Evolução Clínica" (`updateNewEvoScheduleUI` / `submitNewEvolution`):** Detecta agendamento pendente na data da evolução e oferece opção pré-marcada para confirmar o Check-in e lançar no financeiro simultaneamente.
  - **No Check-in da Agenda e na geração de escala (`completeScheduleCheckin` / `submitSchedule` / `reconcileSchedulesWithEntries`):** Se já houver um atendimento lançado manualmente no mesmo dia para o paciente, vincula ao lançamento existente sem duplicar cobrança; se excluir o atendimento financeiro (`deleteEntry`), o agendamento volta para `Agendado`.

### Aba 3 — Evoluções Clínicas (`📋 Evoluções`)
- **Layout Limpo e Ordenação:** Botão **"+ Nova Evolução"**, filtros recolhidos por padrão e ordenação crescente/decrescente.
- **Histórico de Evoluções do Paciente (`openPatientEvolutions`):** Seleção individual ou **"Selecionar todas"** para exportar múltiplas evoluções em um PDF único (`exportSelectedPatientEvolutionsPDF`).

### Aba 4 — Financeiro e Previsões (`💰 Financeiro`) (`v25–v28`)
- **Painel de Previsão Mensal (`#finForecastCard` em `renderList`):**
  - Separa os KPIs principais de **Ganho Real (Sessões já realizadas: Recebido vs. A Receber)** do quadro de previsão do mês (**Ganho Real (Feito)**, **Previsto (Agendado)** e **Ganho Possível Total**), listando também as sessões agendadas do mês com botão de **✓ Check-in**.
- **Relatório Financeiro Geral Interativo (`openReports` / `renderReportBody` / `renderWorkCalendar`):**
  - **Previsão Anual/Mensal:** Quadro comparativo entre **Ganho Real (Trabalhado)**, **Previsto na Agenda (A Realizar)** e **Ganho Possível**.
  - **Gráfico de 12 Meses Empilhado:** Exibe barras com 3 camadas (*Recebido*, *A Receber já feito* e *Previsto na Agenda tracejado em azul*).
  - **Todos os Pacientes no Ranking (Interativo):** Lista 100% dos pacientes com sessões realizadas ou agendadas no período (sem limite de 6), mostrando ganho real e ganho possível; ao clicar em qualquer paciente, expande a lista de sessões realizadas e agendadas com botões diretos para editar, alternar Pago/Pendente, excluir ou fazer Check-in.
  - **Calendário Interativo de Dias Trabalhados e Agendados:** Marca dias trabalhados (`✓` verde) e dias agendados (`📅` azul); ao clicar em qualquer dia, exibe todos os pacientes atendidos e agendados naquela data com atalhos de edição e Check-in.
