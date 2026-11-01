# Memória de Atualizações — App Fisioterapia (`matheus-app-fisioterapia`)

Data da consolidação: `01/11/2026`  
Versão do Service Worker: `atend-v31` (`sw.js`)

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


