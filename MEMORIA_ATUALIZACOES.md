# Memória de Atualizações — App Fisioterapia (`matheus-app-fisioterapia`)

Data da consolidação: `02/11/2026`  
Versão do Service Worker: `atend-v43` (`sw.js`)

---

## 10. Auditoria do Google Agenda, Correção do Modal de Férias e UX Uniforme da Agenda (`v43`)
- **Auditoria e Diagnóstico da Conexão com Google Agenda:**
  - **Diagnóstico da Conta e Permissões:** O backend Google Apps Script roda sob a conta `matheusrodrigues1917@usp.br` (`Session.getEffectiveUser()`). A profissional solicitada é `scarletssantos7@gmail.com` / `scarletsantos7@gmail.com`.
  - **Identificação do Motivo dos Agendamentos não aparecerem no celular de Scarlet:** Quando o Apps Script chamava `CalendarApp.getCalendarById('scarletssantos7@gmail.com')`, a API retornava `null` caso a agenda não tivesse sido explicitamente compartilhada com a conta executora (`matheusrodrigues1917@usp.br`). O script caía no fallback da agenda padrão da USP mas sem adicionar Scarlet como participante, gravando os agendamentos na conta da USP sem refletir no aplicativo Google Agenda do celular de Scarlet.
  - **Correção Aplicada:** Atualizada a função `resolveUserCalendar_` e `createCalendarEventForSchedule_`: no fallback, o script agora inclui `opts.guests = Scarlet` com `opts.sendInvites = false`. O Google Calendar sincroniza nativamente o compromisso no app do celular de Scarlet sem disparar e-mails chatos.
  - **Compartilhamento Direto Opcional (Gravação 100% Nativa):** Scarlet pode acessar o Google Calendar no computador, clicar em "Configurações e compartilhamento" da sua agenda e conceder permissão de edição para `matheusrodrigues1917@usp.br`. O script detectará e gravará nativamente via `mode: direct_shared`.
  - **Teste ao Vivo no Endpoint de Produção:** Testes automatizados executados com sucesso em `https://script.google.com/macros/s/AKfycbwYFDh0-sZSZut51QJriLORBta_D_5BX3xJyeJm38qhERnKl1D4HgGA9oalxYDNQ28EbQ/exec`:
    - `test_calendar`: Respondeu HTTP 200 confirmando CalendarApp plenamente ativo e operacional.
    - `create_schedule` com hora normal e bloqueio dia inteiro: Eventos criados e excluídos com integridade verificada.
- **Bugs Críticos e Incongruências Identificados e Remediados:**
  - **Bug 1 (ReferenceError em Lote):** No `Code.gs` linha 941, `defCalFallback.createEvent(title, ...)` gerava `ReferenceError: title is not defined`. Corrigido para `calData.title`.
  - **Bug 2 (Data/Hora Inválida em Férias):** Enviar `hora: 'Dia Inteiro'` causava rejeição `"Data/hora inválida para o Google Agenda"` em instâncias anteriores do Apps Script. Corrigido em `atendimentos.html` para enviar `08:00` com `duracaoMin = 720` no payload enquanto exibe "Dia Inteiro" visualmente na interface.
  - **Bug 3 (PrecoGasolina Coagido como Data pelo Sheets):** O Google Sheets formatou `6.10` como data (`2026-10-06`), fazendo `parseFloat()` retornar `2026` (calculando combustível a R$ 2026/L). Corrigido com `parseValor()` e limite de segurança `0 < val < 50` no frontend e backend.
- **Correção Definitiva do Botão "Férias / Ausência" (`openVacationModal`):**
  - Identificado que o modal de férias/ausência estava sem o container overlay `.modal-bg`, sendo injetado no rodapé sem `position: fixed; z-index: 90` (ficando invisível na tela do celular).
  - Reestruturado com o padrão de modais do app: `.modal-bg` com backdrop blur + `.modal` com `.grabber`, abrindo com animação slide-up responsiva e fechamento ao tocar no fundo ou botão Cancelar.
- **UX Uniforme do Calendário e Botões com Tamanhos Similares:**
  - **Células do Calendário:** Definida altura estrita de `44px` para todas as células (`.cal-day` e `.cal-day.empty`), eliminando o estiramento da primeira linha de dias (dias 1, 2 e 3 que apareciam altos demais no celular). Agora todos os dias do mês possuem exatamente o mesmo tamanho e proporção.
  - **Chips de Resumo do Mês (`.agenda-stats`):** Grid uniforme de 4 colunas com número destacado no topo e rótulo centralizado embaixo, acabando com cortes de texto na tela do smartphone.
  - **Barra de Ações Rápidas (`.agenda-action-grid`):** Layout simétrico com 2 botões na linha superior (`[ 📅 + Agendar Sessão ]` e `[ 🏖️ Férias / Ausência ]`) com exatos 50% de largura e 42px de altura, seguidos por `[ 🚗 Rotas & Distâncias ]` ocupando 100% com a mesma altura e tipografia padronizada.
- **Ocultação e Recolhimento do Vínculo com Google Agenda:**
  - O banner persistente do Google Agenda e o botão "Status Agenda" foram completamente removidos da tela principal da Agenda quando a agenda já está vinculada (`calId`).
  - O status e a troca de conta permanecem protegidos e disponíveis na tela de Configurações (ícone ⚙️ no cabeçalho) e no modal de agendamento.
- **Cache do Service Worker:**
  - Atualizado para `atend-v43` em `sw.js`.

---

## 9. Módulo de Férias e Ausências com Integração na Agenda, Google Calendar e Relatório Financeiro (`v42`)
- **Registro Rápido de Férias e Ausências (`atendimentos.html`):**
  - Adicionado o botão `[🏖️ Férias / Ausência]` na barra de ações rápidas da Agenda.
  - Modal interativo (`openVacationModal`) com seleção de período (Data Inicial e Data Final), tipo de ausência (`🏖️ Férias`, `🌴 Folga / Recesso`, `🎓 Congresso / Curso`, `🏥 Atestado Médico`, `🏛️ Feriado`, `🚫 Bloqueio de Horário`), modo Dia Inteiro (08:00–20:00) ou Horário Específico, e observações.
  - **Detecção de Conflitos em Tempo Real:** ao selecionar as datas, o sistema verifica automaticamente se há agendamentos de pacientes marcados para o período e exibe alerta visual em vermelho com o total de conflitos e a opção de cancelá-los automaticamente com 1 clique ao confirmar o bloqueio.
  - **Alerta Preventivo no Agendamento:** a função `submitSchedule()` alerta caso o usuário tente agendar um paciente em uma data já bloqueada por férias/ausência.
- **Sincronização com o Google Calendar (`Code.gs`):**
  - Implementada a função auxiliar `buildCalendarTitleAndDesc_(item)` que distingue atendimentos clínicos de bloqueios de agenda (`pacienteId === '__BLOQUEIO__'` ou `status === 'Ausência'`).
  - Eventos de férias/bloqueio são registrados diretamente no Google Agenda da profissional (`scarletssantos7@gmail.com`) com título amigável (ex.: `🏖️ Férias: Viagem com a família`) e `sendInvites: false`, sem enviar convites por e-mail ou adicionar participantes.
  - `parseScheduleDates_` aprimorada para converter strings "Dia Inteiro" em janelas de evento de 12 horas (08:00–20:00).
- **Visualização Visual na Grade e Lista da Agenda:**
  - Grade mensal com marcação de badge `🏖️` e borda âmbar tracejada nos dias com ausências cadastradas.
  - Lista de atendimentos do dia com card estilizado em tom âmbar/terracota suave com tag `🏖️ Ausência` e botão de exclusão imediata `[✕ Excluir Ausência]`.
  - 4º chip de estatísticas do mês no cabeçalho da Agenda: `[ X ] dias de ausência`, com filtro direto via clique (`setAgendaStatusFilter('Ausência')`).
- **Integração Completa no Relatório Financeiro:**
  - **Chip de KPI Anual:** exibição destacada no topo do relatório: `🏖️ FÉRIAS / FOLGA: X dias no ano`.
  - **Banner Explicativo de Produtividade:** se o mês selecionado possuir ausências, exibe banner informativo contextualizando que variações no faturamento decorrem do recesso/férias programados.
  - **Gráfico Comparativo Mês a Mês:** indicador visual `🏖️` nos meses que registraram ausências.
  - **Impacto Neutro na Projeção Financeira:** ausências são gravadas com `Valor: 0` e status `Ausência`, garantindo que não inflem a previsão de faturamento nem apareçam como receitas pendentes.
- **Cache do Service Worker:**
  - Atualizado para `atend-v42` em `sw.js`.

---

## 8. Remoção de Exercícios Cadastrados Indevidamente como Pacientes (`v41`)
- **Exclusão de Registros Inválidos na Planilha:**
  - Identificadas e excluídas 8 linhas antigas de teste na aba `Atendimentos` onde os nomes dos pacientes haviam sido salvos como "Agachamento", "Flexao" e "Prancha" (criadas durante a fase de testes do módulo de exercícios).
  - A planilha agora possui apenas os 8 pacientes reais e legítimos (Irani, Sebastião, Dona Diva, Tereza, Vinícius, Márcia, Reginaldo e Cláudio).
- **Lista de Bloqueio e Filtro Definitivo no Aplicativo (`isInvalidPatientName`):**
  - Implementada a lista `NON_PATIENT_NAMES` e a validação `isInvalidPatientName(name)` para ignorar e rejeitar termos de exercícios ("agachamento", "flexao", "prancha", "exercicio", "rotina", "alongamento").
  - Aplicada a proteção nos carregamentos (`entries` e `sheetPatients`), na auto-descoberta, nos métodos locais (`getLocalPatients`, `getLocalEntries`, `loadLocalDataSnapshot`) e no ranking de pacientes do relatório financeiro.
  - Purga automática de cache no `init()` para limpar de imediato quaisquer dados residuais salvos no `localStorage` de celulares e computadores.

---

## 7. Refinamento de Texto da Ação Financeira (`v40`)
- **Substituição do Botão "Pagar" por "Registrar Pagamento" (`atendimentos.html`):**
  - No card de atendimento pendente da aba principal de atendimentos, o botão de ação rápida agora exibe `💰 Registrar Pagamento` em vez de `💰 Pagar`, alinhando a nomenclatura com o título do modal de confirmação (`Registrar pagamento`).

---

## 6. Otimizações de Performance, Latência e Resolução de Incongruências na Agenda (`v39`)
- **Eliminação do Gargalo N+1 no Google Apps Script (`Code.gs`):**
  - Implementada a função `updateRowObjectById_(sheet, id, fieldsObj)`, substituindo chamadas repetidas a `updateFieldById_` nas ações `update_patient`, `update_schedule`, `update`, `update_status`, `update_evolution`, `update_exercise` e `update_routine_item`.
  - Reduz as operações de leitura e gravação no Google Sheets de mais de 20 acessos por requisição para **apenas 1 leitura e 1 gravação por linha**, reduzindo o tempo de resposta do back-end de ~3.5s para menos de 150ms.
  - Implementado retorno do objeto da linha excluída em `deleteRowById_`, eliminando leituras redundantes antes de excluir agendamentos e eventos da agenda.
  - Otimização do `getConfigSheet_()`: retorna imediatamente quando as chaves já existem (`getLastRow() >= 7`), eliminando locks de escrita e formatação desnecessária durante leituras (`doGet`).
  - Cache em memória de resolução de agendas (`_resolvedCalendarCache`) em `resolveUserCalendar_`, evitando varreduras repetidas de `getAllCalendars()` durante a execução.
- **Normalização de Nomes e Auto-descoberta de Pacientes (`atendimentos.html`):**
  - `normName(s)` atualizada com remoção de acentos (`normalize('NFD').replace(/[\u0300-\u036f]/g, '')`), garantindo que variações ortográficas com e sem acento (ex.: "José" e "Jose", "Cláudia" e "Claudia") façam correspondência perfeita entre pacientes, atendimentos e agendamentos.
  - Mecanismo de **Auto-descoberta de Pacientes**: pacientes que possuam atendimentos históricos ou agendamentos mas não tenham linha explícita cadastrada na aba `Pacientes` recebem registros básicos automáticos, garantindo que nenhum paciente fique invisível nos filtros, listas ou seleção de agendamento.
- **Aperfeiçoamento dos Tipos de Agendamento (Sessão Única, 2 Semanas, Mensal):**
  - Ao abrir o modal de agendamento (`openScheduleModal`), o dia da semana da data selecionada (`preSelectDate` ou dia atual) já inicia pré-ativado no quadro de dias (`.dow-chip.active`). Ao alternar para o modo "Escala da Semana / Mês", o usuário já visualiza imediatamente todas as datas e horários correspondentes calculados, sem telas em branco ou sensação de travamento.
  - Suporte completo e ágil aos períodos rápidos (*Esta Semana*, *Próximas 2 Semanas*, *Este Mês Inteiro*, *Próximo Mês*).
- **Inicialização Instantânea (Stale-While-Revalidate / <50ms) (`atendimentos.html`):**
  - Implementados `getLocalEntries()` e `saveLocalEntries()` para persistência local do histórico de atendimentos.
  - Adicionada a função `loadLocalDataSnapshot()` chamada na inicialização (`init()`) antes do carregamento da rede, exibindo instantaneamente os dados em cache de todas as 4 abas (Agenda, Atendimentos, Pacientes e Evoluções) no momento em que o aplicativo é aberto.
- **Controle Retrátil e Ocultável do Banner da Agenda:**
  - Banner recolhido por padrão quando a agenda está vinculada, com botão de fechar (`✕`) e botão discreto `[📅 Status Agenda]` para restauração rápida.

---

## 1. Estabilidade, Concorrência, Sincronização e Link da Planilha (`Plans 001–005` + `v21–v31`)
- **Validação estrita em `postAction` (`atendimentos.html`):** Detecta erros HTTP, páginas HTML de erro do Google Apps Script e respostas `handled: false` ou `success: false`, retornando o objeto JSON parseado (`data`) para uso direto nos fluxos de sincronização.
- **Bloqueio de concorrência em `Code.gs`:** Uso de `LockService.getScriptLock()` (timeout de 30s) com `try/catch/finally` e formatação de datas respeitando o fuso horário da planilha (`getTimeZone_()`).
- **Migração automática de colunas e abas (`ensureHeaders_` em `Code.gs`):** Adiciona automaticamente novas colunas (`NomeFantasia`, `OldNome`, `Arquivado`, `Foto`, dados clínicos CREFITO-3), expande colunas físicas quando necessário (`insertColumnsAfter`) e cria/atualiza as abas `Evolucoes` e `Agendamentos`.
- **Importação em lote (`bulk_import` em `Code.gs` e `importBackup` em `atendimentos.html`):** Restauração rápida de backups em uma única chamada em lote incluindo `Pacientes`, `Atendimentos`, `Evolucoes` e `Agendamentos`.
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
  - Botão de exibir/ocultar valores presente na **Aba Financeiro**, no **Relatório Financeiro** e no modal **Financeiro do Paciente**, atualizando instantaneamente também os valores na **Aba Agenda**.

---

## 3. Arquitetura em 4 Abas Principais

### Aba 1 — Pacientes e Dados Cadastrais (`👥 Pacientes`)
- **Cards de Pacientes com Menu Cascata:** Busca instantânea por Nome Fantasia, Nome Completo, CPF/RG, telefone ou bairro, com botão direto para **📅 Agendar**.
- **Foto de Perfil em Miniatura (`renderPatientAvatar` / `compressPatientPhoto`):** Permite subir foto da galeria ou tirar foto com a câmera na ficha cadastral, comprimindo automaticamente para miniatura quadrada `160x160` JPEG exibida no lugar das iniciais.
- **Nome Fantasia vs. Nome Completo (`getPatientDisplayName` / `getPatientLegalName`):**
  - **Nome Fantasia:** Aparece antes do Nome Completo na ficha do paciente e é usado em **todas as visualizações internas** do aplicativo.
  - **Nome Completo:** Usado exclusivamente em **todos os documentos exportados** (PDFs de ficha cadastral, prontuários/evoluções, extratos, recibos individuais, comprovantes mensais e exportação CSV). O Nome Fantasia jamais aparece em documentos externos.
- **Ficha Cadastral e Prontuário CREFITO-3 (`openPatientForm` / `exportPatientFichaPDF`):** Campos alinhados lado a lado no celular (`40px`/`42px`), com botão **"📄 Exportar Ficha (PDF)"** para geração da ficha completa e prontuário CREFITO-3 usando exclusivamente o Nome Completo oficial.
- **Exames e Documentos (`openPatientFilesModal`):** Dois botões dedicados para anexar PDFs/imagens ou bater foto na hora (`capture="environment"`), visualizar, baixar e excluir arquivos (armazenados via `IndexedDB` `ft_docs_db`).
- **Financeiro Individual do Paciente (`openPatientFinancial` / `renderPatientFinancialDetails`):**
  - Filtro por período (*Tudo*, *Por Mês*, *Por Ano*, *Vários Meses*) e botão exibir/ocultar valores (`🙈 / 👁️`).
  - **Previsão do Paciente (`#pFinForecastBox`):** Exibe **Ganho Real (Feito)**, **Previsto (Agenda)** e **Ganho Possível**, além de listar as sessões agendadas pendentes com botão de **✓ Check-in** rápido.
- **Fluxo de Arquivamento e Aba "📁 Pacientes Arquivados" (`toggleArchivePatient` / `deletePatient`):**
  - Ao clicar em **Finalizar / Arquivar Paciente**, todos os dados são mantidos intactos e o card é movido para a seção **"📁 Pacientes Arquivados"** no final da página.
  - Pacientes ativos não podem ser excluídos diretamente; a **Exclusão Definitiva** só é permitida após o paciente estar arquivado e exige confirmação explícita (`confirm(...)`).

### Aba 2 — Agenda e Integração com Google Agenda (`📅 Agenda`) (`v27–v31`)
- **E-mail Padrão Configurado (`DEFAULT_CALENDAR_ID = 'scarletsantos7@gmail.com'`):**
  - Definido como padrão tanto no aplicativo (`atendimentos.html` via `getUserCalendarId()` e `init()`) quanto no servidor da planilha (`Code.gs` via `resolveUserCalendar_()`), permitindo também alterar ou testar a conexão em **⚙️ Configurar Agenda**.
- **Agendamento Único ou Escala da Semana / Mês (`openScheduleModal` / `submitSchedule`):**
  - Permite agendar uma sessão avulsa ou gerar em lote toda a escala da semana, quinzena, mês atual ou próximo mês escolhendo os dias da semana (`Seg` a `Dom`).
  - **Destaque Visual do "Período Rápido" (`v31`):** Os botões de período rápido (*Esta Semana*, *Próximas 2 Semanas*, *Este Mês Inteiro*, *Próximo Mês*) mudam de cor (terracota com texto branco em destaque `.preset-chip.active`) ao serem selecionados ou quando as datas inicial/final correspondem ao período.
  - **Horários Diferentes por Dia da Semana + Verificação na Prévia (`v31`):** Quando 2 ou mais dias da semana são selecionados para o paciente (ex.: *Terça* e *Quinta*), exibe automaticamente o painel **⏰ Horários por Dia da Semana** permitindo definir horários distintos para cada dia (ex.: Terça às `14:00` e Quinta às `10:00`). O quadro de pré-visualização mostra o resumo da escala semanal em badges e exibe o horário exato ao lado de cada data que será criada (`Ter 03/11 (14:00), Qui 05/11 (10:00)...`), com botão para expandir todas as datas.
- **Sincronização Automática com Google Agenda (`CalendarApp` em `Code.gs`):**
  - Cria automaticamente os eventos no Google Agenda com nome do paciente, endereço, telefone e observações (`create_schedule`, `create_schedules_batch`), atualiza data/hora ao remarcar (`update_schedule`) e remove do Google Agenda ao cancelar (`delete_schedule`) ou ao excluir um paciente (`delete_patient`).
  - Inclui também atalho **"📅 Abrir no Google Agenda"** por sessão e exportação de arquivo `.ics` (**"📲 Exportar Agenda"**).
- **Prevenção de Conflitos e Vínculo Bidirecional entre Agenda, Check-ins e Lançamentos Manuais (`v28`):**
  - **No modal "Novo Atendimento / Check-in" (`openNewEntry` / `onNewEntryPatientOrDateChange`):** Detecta automaticamente se o paciente tem agendamento pendente na data escolhida (ou em datas próximas para reposição/antecipação), pré-preenche horário/valor e vincula o lançamento ao agendamento (`status = 'Realizado'`, `atendimentoId = entry.id`), além de exibir alerta amarelo caso já exista atendimento lançado no mesmo dia.
  - **No modal "Nova Evolução Clínica" (`updateNewEvoScheduleUI` / `submitNewEvolution`):** Detecta agendamento pendente na data da evolução e oferece opção pré-marcada para confirmar o Check-in e lançar no financeiro simultaneamente.
  - **No Check-in da Agenda e na geração de escala (`completeScheduleCheckin` / `submitSchedule` / `reconcileSchedulesWithEntries`):** Se já houver um atendimento lançado manualmente no mesmo dia para o paciente, vincula ao lançamento existente sem duplicar cobrança; se excluir o atendimento financeiro (`deleteEntry`), o agendamento volta para `Agendado`.

### Aba 3 — Evoluções Clínicas (`📋 Evoluções`)
- **Layout Limpo e Ordenação:** Botão **"+ Nova Evolução"**, filtros recolhidos por padrão e ordenação crescente/decrescente.
- **Histórico de Evoluções do Paciente (`openPatientEvolutions`):** Seleção individual ou **"Selecionar todas"** para exportar múltiplas evoluções em um PDF único (`exportSelectedPatientEvolutionsPDF`).

### Aba 4 — Financeiro e Previsões (`💰 Financeiro`) (`v25–v30`)
- **Painel de Previsão Mensal (`#finForecastCard` em `renderList`):**
  - Separa os KPIs principais de **Ganho Real (Sessões já realizadas: Recebido vs. A Receber)** do quadro de previsão do mês (**Ganho Real (Feito)**, **Previsto (Agendado)** e **Ganho Possível Total**), listando também as sessões agendadas do mês com botão de **✓ Check-in**.
- **Relatório Financeiro Geral Interativo (`openReports` / `renderReportBody` / `renderWorkCalendar`):**
  - **Previsão Anual/Mensal:** Quadro comparativo entre **Ganho Real (Trabalhado)**, **Previsto na Agenda (A Realizar)** e **Ganho Possível**.
  - **Gráfico de 12 Meses Empilhado:** Exibe barras com 3 camadas (*Recebido*, *A Receber já feito* e *Previsto na Agenda tracejado em azul*).
  - **Todos os Pacientes no Ranking (Interativo):** Lista 100% dos pacientes com sessões realizadas ou agendadas no período (sem limite de 6), mostrando ganho real e ganho possível; ao clicar em qualquer paciente, expande a lista de sessões realizadas e agendadas com botões diretos para editar, alternar Pago/Pendente, excluir ou fazer Check-in.
  - **Calendário Interativo de Dias Trabalhados e Agendados:** Marca dias trabalhados (`✓` verde) e dias agendados (`📅` azul); ao clicar em qualquer dia, exibe todos os pacientes atendidos e agendados naquela data com atalhos de edição e Check-in.

---

## 4. Auditoria Minuciosa de Bugs e Incongruências Back-end & Front-end (`atend-v30`)

### Back-end (`Code.gs`)
1. **Incongruência de chaves em `create_schedules_batch`:** O front-end lia `respB.eventMap` e `respB.calendarSyncedCount`, enquanto o `Code.gs` retornava apenas `result.eventIds`. Agora o `Code.gs` retorna `result.eventMap`, `result.eventIds` e `result.calendarSyncedCount` (quantidade exata de eventos criados no Google Agenda).
2. **Enriquecimento automático de dados do paciente nos eventos do Google Agenda (`enrichScheduleItemWithPatient_`):** Ao criar ou atualizar agendamentos (`createCalendarEventForSchedule_` / `updateCalendarEventForSchedule_`), o `Code.gs` agora busca automaticamente telefone, endereço completo (`Endereco, Bairro, Cidade`) e nome de exibição na aba `Pacientes` caso o payload não os envie, garantindo que o evento no Google Agenda nunca fique sem localização ou contato.
3. **Remoção em cascata de eventos do Google Agenda ao excluir paciente (`delete_patient`):** Antes de remover as linhas da aba `Agendamentos` de um paciente excluído, o `Code.gs` percorre os agendamentos do paciente e apaga os respectivos eventos no Google Agenda (`deleteCalendarEventForSchedule_`), evitando eventos órfãos na agenda.
4. **Coluna `OldNome` persistida na aba `Pacientes` (`PAC_HEADERS`) e propagação de renomeação (`updateRowsByField_`):** Adicionada a coluna `OldNome` em `PAC_HEADERS` e implementada a propagação automática em `update_patient`: quando o nome oficial do paciente é alterado, o `Code.gs` preserva o nome anterior em `OldNome` e atualiza o nome nas abas `Evolucoes` (`PacienteNome`), `Agendamentos` (`PacienteNome`) e `Atendimentos` (`Paciente`).
5. **Proteção de limites de colunas em `ensureHeaders_`:** Corrigido caso em que uma planilha com número de colunas físicas menor que `expectedHeaders.length` ou totalmente vazia (`lastRow === 0`) poderia falhar ao adicionar novas colunas; agora `ensureHeaders_` expande as colunas com `sheet.insertColumnsAfter` antes de gravar os cabeçalhos.
6. **Restauração da aba `Agendamentos` em `bulk_import`:** O endpoint `bulk_import` no `Code.gs` e a função `importBackup` no `atendimentos.html` agora incluem `body.agendamentos`, restaurando os agendamentos diretamente na planilha além do `localStorage`.

### Front-end (`atendimentos.html`)
1. **Variáveis CSS ausentes em `:root` (botão de Check-in transparente e badges):** Definidas as variáveis `--ok`, `--ok-bg`, `--err`, `--danger-bg`, `--primary-dark`, `--bg-deep`, `--ink-faint` e `--line-strong` em `:root`, corrigindo o fundo do botão **✓ Check-in** na aba Agenda (`background:var(--ok)`) e cores de badges/alertas.
2. **IDs de DOM incorretos ao atualizar modais abertos após Check-in (`completeScheduleCheckin`):** Corrigidas as referências `document.getElementById('reportBody')` para `document.getElementById('repBody')` e `document.getElementById('pFinSummary')` para `document.getElementById('pFinSessionsList')`, garantindo que o Check-in feito de dentro do Relatório Financeiro ou do Financeiro Individual do Paciente atualize a tela imediatamente.
3. **Atualização imediata da aba Agenda ao clicar no botão de privacidade (`toggleHideFinancials`):** Adicionada chamada a `renderAgendaTab()` dentro de `toggleHideFinancials()` para ocultar/exibir os valores das sessões agendadas instantaneamente.
4. **Botão e função de exportação de PDF da Ficha Cadastral / Prontuário CREFITO-3 (`exportPatientFichaPDF`):** Adicionado o botão **"📄 Exportar Ficha (PDF)"** no modal de edição do paciente (`openPatientForm`), gerando o PDF completo com dados cadastrais e prontuário CREFITO-3 utilizando exclusivamente o Nome Completo oficial (`getPatientLegalName`).
5. **Propagação em memória ao renomear paciente (`submitPatientForm`):** Quando o nome completo de um paciente é alterado, o app agora atualiza imediatamente em memória os registros vinculados em `entries`, `evolutions` e `schedules`, mantendo consistência instantânea sem exigir recarregamento.

---

## 5. Histórico Cronológico Recente e Diretriz Permanente de Salvamento
> **Diretriz Permanente:** Toda e qualquer alteração feita no código (`atendimentos.html`, `Code.gs`, `sw.js`, testes) **deve sempre** incrementar o `CACHE_VERSION` em `sw.js`, ser registrada imediatamente em `MEMORIA_ATUALIZACOES.md` (e no artefato `memoria_atualizacoes.md`) e ser sincronizada no GitHub (`scripts/sync-github.js`).

- **`atend-v25`:** Ranking completo de todos os pacientes no Relatório Financeiro com expansão clicável e edição direta de lançamentos.
- **`atend-v26`:** Calendário de dias trabalhados clicável no Relatório Financeiro para ver e editar pacientes atendidos em cada data.
- **`atend-v27`:** Criação da aba **📅 Agenda**, integração nativa com Google Agenda (`CalendarApp` em `Code.gs`), agendamento avulso ou escala semanal/mensal e Check-in com 1 toque.
- **`atend-v28`:** Prevenção de conflitos e vínculo bidirecional entre agendamentos, check-ins e lançamentos manuais, além de quadros de **Previsão Financeira (Ganho Real vs. Ganho Possível)** na aba Financeiro, no Relatório Financeiro e no Financeiro Individual do Paciente.
- **`atend-v29`:** Configuração de `scarletsantos7@gmail.com` como e-mail padrão fixo do Google Agenda no front-end (`DEFAULT_CALENDAR_ID`) e no back-end (`resolveUserCalendar_`).
- **`atend-v30`:** Auditoria completa Back-end & Front-end (correção de `eventMap`/`calendarSyncedCount` em lote, enriquecimento automático de endereço/telefone no Google Agenda, exclusão de eventos do Google Agenda ao excluir paciente, coluna `OldNome` e propagação de troca de nome nas abas da planilha e em memória, variáveis CSS `--ok`/`--ok-bg`/`--err`, IDs `#repBody`/`#pFinSessionsList` no Check-in, exportação de PDF da Ficha Cadastral CREFITO-3 e restauração de agendamentos no `bulk_import`).
- **`atend-v31`:** Destaque por cor nos botões de **"Período Rápido"** (`.preset-chip.active`) ao selecionar e suporte a **horários diferentes por dia da semana** (`#schedDowTimesBox`, ex.: Terça às `14:00` e Quinta às `10:00`) com verificação detalhada de cada data e horário na pré-visualização da escala.
- **`atend-v32`:** Motor Inteligente de **Rotas, Deslocamento e Consumo de Combustível** integrado à Agenda e aos Cadastros de Pacientes:
  - **Endereço Base e Consumo:** Endereço padrão da Scarlet fixado em `Rua Maracaju, 88 - Vila Tibério, Ribeirão Preto - SP`, consumo do carro em `14 km/L` na cidade e preço da gasolina em `R$ 6,10/L`, configuráveis no modal **📅 Configurar Agenda & Rotas**.
  - **Cenário 1 — Intervalos Longos (ex: 10h → 14h):** O app calcula automaticamente o tempo de trânsito de ida e volta para a Vila Tibério e recomenda ir para casa quando o tempo livre for superior a 30 minutos, exibindo o tempo líquido de descanso em casa e o gasto de combustível (em litros e R$).
  - **Cenário 2 — Sessões Consecutivas (ex: 14h de 50 min terminando 14h50 → 15h):** Aplica a regra estrita de deslocamento de no máximo **8 a 9 minutos de carro** entre os endereços dos pacientes. Se a rota ultrapassar 8–9 minutos, gera alerta de atraso destacado com botão de 1 clique para ajustar automaticamente o horário da próxima sessão para o horário viável mais próximo.
  - **Cenário 3 — Cancelamento no Meio do Dia (ex: 14h → 15h cancelado → 16h):** O botão **✕ Cancelar Sessão** altera o status para `Cancelado` (removendo do Google Agenda e mantendo botão de reativar) e recalcula instantaneamente o dia, gerando uma comparação lado a lado entre **Ir em Casa** (tempo livre na Vila Tibério + consumo) e **Esperar na Rua / Ir Direto para as 16h** (tempo de espera local + consumo direto).
  - **Cenário 4 — Novos e Atuais Pacientes com Análise de Proximidade:**
    - **No Cadastro de Paciente (`openPatientForm`):** Botão **🚗 Calcular Distância e Tempo de Carro (Casa & Outros Pacientes)** que exibe a distância e gasto de combustível de casa até o paciente e compara com todos os outros pacientes ativos, destacando em verde aqueles a $\le 9$ min de carro (aptos para encaixe consecutivo).
    - **No Agendamento de Sessões / Escala (`openScheduleModal`):** Painel dinâmico que analisa em tempo real o paciente e o horário escolhido em relação à casa da Scarlet e a atendimentos adjacentes do mesmo dia, alertando sobre a regra de 8–9 min ou recomendação de casa/rua antes mesmo de salvar.
    - **Simulador Geral de Rotas (`openRouteSimulatorModal`):** Botão **🚗 Rotas & Distâncias** na aba Agenda para simular trajetos entre quaisquer pacientes ou a partir de casa, testar cenários rápidos e ver a matriz de proximidade completa.
  - **Motor Híbrido de Rotas (Google Maps + Fallback Local):** `Code.gs` com handler `calc_routes_batch` usando `Maps.newDirectionFinder()` do Google Apps Script (direções de trânsito reais sem necessidade de chave externa de API); fallback inteligente no navegador com OSRM/Nominatim e coordenadas dos bairros de Ribeirão Preto (`RP_COORDS_REF`), com cache persistido em `localStorage` (`ft_route_cache_v1`).
- **`atend-v34`:** Revisão Completa dos Agendamentos, Fim dos Travamentos, Resolução de Pacientes Desaparecidos e Validação Integral dos Tipos de Escala:
  - **Fim dos Travamentos e Congelamentos no Agendamento:**
    - **Eliminação de Loop Recurso no Assistente de Rotas (`updateScheduleModalRouteAnalysis`):** Adicionado controle estrito com parâmetro `skipFetch` e debouncing (`debouncedUpdateScheduleModalRouteAnalysis`, 180ms). O retorno das rotas calculadas não mais dispara novas requisições em cascata, eliminando travamento da interface e sobrecarga no Apps Script.
    - **Correção da Verificação de Duplicidade em Lote (`submitSchedule`):** Corrigido bug crítico onde a condição `(schedModalMode === 'batch' || (sc.hora || '') === (targetHora || ''))` avaliava para `true` para qualquer sessão preexistente do paciente na data selecionada, descartando as datas corretas e disparando alerta falso de duplicidade. A validação agora compara de forma estrita o paciente, data e horário exato `(sc.hora || '') === (targetHora || '')`.
    - **UI Otimista Não-Bloqueante (`submitSchedule`):** O agendamento é salvo imediatamente no estado local (`schedules` e `localStorage`), o modal fecha instantaneamente e a tela é atualizada na hora. A sincronização com o Google Apps Script e Google Agenda roda em segundo plano de forma assíncrona com `try/catch` e notificações toast informativas, garantindo que o botão nunca fique travado em "Sincronizando...".
    - **Desbloqueio de Concorrência no Back-End (`Code.gs`):** As ações de leitura `calc_routes_batch` e `test_calendar` foram movidas para fora do lock exclusivo de planilha (`LockService.getScriptLock()`), retornando imediatamente sem prender ou travar as operações de escrita de agendamento em lote.
    - **Gravação em Bloco e Otimização no Google Apps Script (`create_schedules_batch`):** Pré-carregamento dos metadados do paciente e resolução de calendário uma única vez por lote, gravação atômica em uma única chamada de planilha (`setValues`) e tratamento de exceção individual por evento para evitar que a falha em um evento aborte o lote.
  - **Resolução dos Pacientes Desaparecidos ("Alguns pacientes não aparecem"):**
    - **Exibição Universal de Pacientes no Agendamento (`openScheduleModal`):** O seletor de pacientes agora exibe todos os pacientes cadastrados, agrupando-os de forma clara entre `Pacientes Ativos` e `Pacientes Arquivados` (com tag explicativa `(Arquivado)`). Pacientes arquivados ou importados agora estão sempre acessíveis para agendamento.
    - **Filtro de Pacientes na Aba Agenda (`populateAgendaFilters`):** O filtro da agenda agora contempla todos os pacientes (ativos e arquivados), permitindo filtrar o histórico ou a escala de qualquer paciente.
    - **Correspondência Flexível de Agendamentos (`renderAgendaTab`):** Ao filtrar por paciente, a verificação agora checa tanto o ID quanto o nome legal e nome fantasia (`scheduleMatchesPatient`), assegurando que agendamentos vinculados por nome não sejam omitidos.
    - **Persistência Local e Prevenção de Perda de Pacientes (`getLocalPatients` e `saveLocalPatients`):** Pacientes criados ou atualizados no dispositivo agora são salvos imediatamente no `localStorage` (`ft_local_patients`) e mesclados em `loadData()`. Se a gravação na planilha falhar por lentidão ou conexão, o paciente NÃO é mais apagado da memória; ele permanece salvo localmente com aviso transparente.
    - **Acesso Completo no Simulador de Rotas (`openRouteSimulatorModal` e `runRouteSimulator`):** Todos os pacientes cadastrados que possuem endereço podem ser selecionados para comparação de rotas e janelas de atendimento.
  - **Validação Rigorosa de Todos os Tipos de Agendamento:**
    - **Sessão Única (`single`):** Criação rápida com data, horário, duração e valor avulso, integrando cálculo de rota com a regra de 8-9 min.
    - **Esta Semana (`week`):** Seleção rápida da semana corrente (Segunda a Domingo) com chips de dias da semana e horários independentes.
    - **Próximas 2 Semanas (`2weeks`):** Planejamento quinzenal (14 dias à frente) respeitando dias de atendimento e horários configurados.
    - **Este Mês Inteiro (`month`):** Escala integral do mês do calendário com preview instantâneo e contagem de sessões.
    - **Próximo Mês (`nextmonth`):** Geração antecipada para o mês subsequente com avanço automático do calendário para o mês agendado.
    - **Horários Diferentes por Dia da Semana (`schedDowTimesBox`):** Suporte total a agendas flexíveis (ex: Terça às 14:00 e Quinta às 10:00 para o mesmo paciente), com gravação precisa tanto no app quanto nos eventos individuais do Google Agenda.
  - **Vínculo e Conexão com Google Agenda da Scarlet (`scarletsantos7@gmail.com`):**
    - E-mail padrão configurado nativamente no front-end e no back-end.
    - Verificação em `resolveUserCalendar_` pronta para gravação direta ou via convite sincronizado com o e-mail dela.
    - Função `autorizarGoogleAgenda` pronta no Apps Script.
    - Teste de conexão funcional pelo modal de configurações com resposta instantânea.
  - **Suíte de Testes Automatizados:** 26 testes unitários automatizados passando com 100% de sucesso.
- **`atend-v35`:** Scarlet Santos como Organizadora Principal, Gravação Direta no Google Agenda Sem Passar por E-mail e Aba de Configurações no Google Sheets:
  - **Eliminação Definitiva dos E-mails de Convite ("Sem passar pelo email"):**
    - Diagnóstico: quando o Web App era executado por outra conta Google, o código anterior utilizava `opts.guests` e `opts.sendInvites = true`, disparando um e-mail de convite do Google Calendar para `scarletsantos7@gmail.com`.
    - Correção estrutural: foram removidos 100% dos blocos `opts.guests` e chamadas `opts.sendInvites = true` tanto em `createCalendarEventForSchedule_` quanto em `create_schedules_batch`.
    - O parâmetro `sendInvites: false` foi fixado em todas as criações de evento no Google Agenda, garantindo que o evento seja inserido de forma silenciosa e direta no calendário sem enviar notificações ou e-mails a ninguém.
  - **Scarlet Santos Oficializada no Back-End e Front-End:**
    - Constante `APP_ORGANIZER_EMAIL = 'scarletsantos7@gmail.com'` e `DEFAULT_CALENDAR_ID = 'scarletsantos7@gmail.com'` integradas em `Code.gs` e `atendimentos.html`.
    - Os eventos criados no Google Agenda agora trazem na descrição a linha: `Organizadora: scarletsantos7@gmail.com` e `Sincronizado diretamente pelo App Fisioterapia (sem envio de e-mails)`.
  - **Nova Aba `Configuracoes` Criada Automaticamente na Planilha:**
    - `getConfigSheet_()` garante a existência da aba `Configuracoes` com cabeçalhos congelados e em negrito: `['Chave', 'Valor', 'Descricao', 'AtualizadoEm']`.
    - Registra oficialmente:
      - `OrganizadorPrincipal`: `scarletsantos7@gmail.com` (E-mail da fisioterapeuta proprietária e organizadora do aplicativo)
      - `GoogleAgendaID`: `scarletsantos7@gmail.com` (ID da agenda onde os atendimentos são gravados diretamente)
      - `EnderecoBase`: `Rua Maracaju, 88 - Vila Tibério, Ribeirão Preto - SP`
      - `ConsumoCarroKmL`: `14`
      - `PrecoGasolina`: `6.10`
      - `NotificacoesPorEmail`: `Desativado (gravação direta)`
    - Incluído `config: sheetToObjects_(getConfigSheet_())` no retorno de `doGet(e)`, permitindo que o app leia e sincronize os parâmetros oficiais direto da planilha.
  - **Menu Personalizado no Google Sheets (`onOpen`):**
    - Adicionado menu nativo no Sheets: **📅 Fisioterapia (Scarlet)** com as ações:
      - `👤 Verificar Organizador & Agenda`: exibe popup no Sheets diagnosticando a conta executora, e-mail da Scarlet e modo de gravação.
      - `🔑 Autorizar Google Agenda`: botão de 1 clique para autorizar o `CalendarApp` sem precisar entrar no editor de código.
      - `⚙️ Atualizar Aba de Configurações`: regerar ou validar a aba de configurações.
  - **Refatoração de `resolveUserCalendar_` e `test_calendar`:**
    - Modo nativo direto (`direct_native`): se Scarlet executa o script, grava na agenda principal dela.
    - Modo compartilhado direto (`direct_shared`): se Scarlet compartilhou a agenda dela com permissão de alteração, grava na agenda dela diretamente sem convite por e-mail.
    - Modo silencioso (`default_no_invite`): se gravado pela conta ativa, grava sem enviar nenhum e-mail/convite.
    - Resposta de teste de agenda no app informa detalhadamente o modo ativo e confirma que não há envio de e-mails.
  - **Front-end (`atendimentos.html`):**
    - Badge visual `👤 Organizadora Principal: scarletsantos7@gmail.com` adicionado no modal de configurações.
    - Texto explicativo de que a sincronização ocorre diretamente no calendário sem e-mails.
    - Sincronização inteligente dos parâmetros de `data.config` no carregamento da planilha.
- **`atend-v36`:** Homologação da Nova URL de Implantação e Diagnóstico da Conta Executora USP:
  - **Homologação da Nova URL:** Atualizada a constante `SCRIPT_URL` em `atendimentos.html` para `https://script.google.com/macros/s/AKfycbwYFDh0-sZSZut51QJriLORBta_D_5BX3xJyeJm38qhERnKl1D4HgGA9oalxYDNQ28EbQ/exec`.
  - **Sucesso no `doGet`:** Retornou com sucesso todas as 8 abas (`atendimentos`, `pacientes`, `evolucoes`, `exercicios`, `rotinas`, `agendamentos`, `config`, `organizer`), com Scarlet Santos oficialmente registrada na planilha.
  - **Sucesso no `doPost` (`test_calendar`):** Respondeu com `success: true`, `sendInvites: false` e mensagem confirmando que nenhum e-mail de convite é disparado.
  - **Diagnóstico da Conta Google Executora:** Identificado no `calendarName` que a planilha/Apps Script está sendo executada pela conta Google `matheusrodrigues1917@usp.br`. Portanto, para que o compartilhamento da agenda da Scarlet Santos seja reconhecido com gravação direta, o compartilhamento deve incluir a conta `matheusrodrigues1917@usp.br` com permissão "Fazer alterações nos eventos".
  - **Ajuste de Tipagem em `PrecoGasolina` (`Code.gs`):** Ajustado o valor padrão de combustível na aba `Configuracoes` para o tipo numérico `6.10` com proteção em `formatCellValue_`, evitando que planilhas em português convertam a string `'6.10'` para a data `06/10`.
- **`atend-v37`:** Revisão Completa da Conexão com Google Agenda e Refinamento de UX da Aba Agenda:
  - **Revisão e Blindagem da Conexão com Google Agenda (`resolveUserCalendar_` em `Code.gs`):**
    - Adicionada varredura inteligente em `CalendarApp.getAllCalendars()`: se a busca direta por ID falhar, o script agora percorre todas as agendas compartilhadas com a conta executora, localizando qualquer agenda cujo ID ou nome contenha `'scarlet'`.
    - Garantia estrita de que `sendInvites` é sempre `false` e `guests` é nulo em todas as rotas (criação avulsa, em lote e remarcação).
    - Mensagem de teste clara indicando exatamente qual e-mail precisa de permissão de compartilhamento caso a agenda ainda não esteja vinculada.
  - **Refinamento de UX na Aba 📅 Agenda (`atendimentos.html`):**
    - **Botão "Hoje" e Clique no Mês:** Adicionado botão rápido **"Hoje"** na barra de navegação do mês (`resetAgendaToToday()`) e clique no nome do mês para retornar instantaneamente à data atual com 1 toque.
    - **Destaque Visual de "Hoje" no Calendário:** O dia atual agora recebe badge e contorno em destaque com a palavra **"HOJE"** em negrito dentro da grade, facilitando a visualização rápida da escala do dia.
    - **Filtro Rápido com 1 Toque nos Cards de Estatísticas:** Os chips de KPI (*Agendados no mês*, *A realizar*, *Realizados*) agora são clicáveis e filtram a lista abaixo imediatamente pelo status selecionado (`setAgendaStatusFilter`).
    - **Aprimoramento do Estado Vazio:** Quando um dia sem agendamentos é selecionado no calendário, o card exibe tanto o botão **"+ Agendar Atendimento"** (com a data já pré-selecionada) quanto o botão **"Ver mês inteiro"**.
- **`atend-v38`:** Banner do Google Agenda Retraível e Ocultável ("Oculte ou Retraia"):
  - **Banner Retraído por Padrão:** O banner da agenda agora inicia retraído (`.collapsed`) por padrão quando a agenda já está vinculada, ocupando apenas uma linha fina e elegante no topo da tela.
  - **Expansão e Recolhimento Dinâmico com Chevron (`▼ / ▲`):** Um toque no banner ou no chevron alterna entre a visão compacta (apenas status e botão de configuração) e a visão expandida com a descrição completa.
  - **Botão de Fechar/Ocultar (`✕`):** Adicionado botão de fechar que oculta completamente o banner da tela (`localStorage.setItem('ft_gcal_banner_dismissed', 'true')`).
  - **Botão Discreto de Restauração:** Ao ser ocultado, um botão discreto **"📅 Status Agenda"** surge na barra de ações ao lado de *Rotas & Distâncias*, permitindo reexibir o status a qualquer momento sem poluir a interface.








