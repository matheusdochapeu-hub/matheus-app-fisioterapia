# Memória de Atualizações — App Fisioterapia (`matheus-app-fisioterapia`)

Data da consolidação: `04/11/2026`  
Versão do Service Worker: `atend-v61` (`sw.js`)

---

## 29. Aprimoramento de UX na Agenda: Botão Check-in em Evidência e Privacidade no Topo (`v61`)
- **1. Botão Check-in em Evidência Total:**
  - O botão `✓ Fazer Check-in (Atendimento Realizado)` agora é renderizado como elemento principal em destaque no topo das ações do card (`.sched-btn-checkin`), com largura total (100%), gradiente verde esmeralda (`#10b981` a `#059669`), sombra suave e excelente área de toque para uso em trânsito.
- **2. Organização das Ações Secundárias:**
  - As ações `[🩺 Evolução]`, `[✎ Remarcar]`, `[📅 Google Agenda]` e `[✕ Cancelar]` foram organizadas em uma fileira dedicada (`.sched-actions-row`), com altura padronizada (34px), ícones claros e distribuição limpa, eliminando quebras desordenadas de botões.
  - Para atendimentos já "Realizados", o botão `🩺 Evolução Clínica` assume o destaque prioritário.
- **3. Botão de Exibir/Ocultar Valores no Topo da Agenda:**
  - Adicionado no topo da aba Agenda a barra de privacidade com o botão `#agendaEyeToggleBtn` (`🙈 Exibir valores` / `👁️ Ocultar valores`).
  - O botão sincroniza em tempo real com o estado de privacidade global do app, permitindo ocultar ou revelar instantaneamente os valores de cada atendimento (ex.: `R$ ••••` ➔ `R$ 150,00`).
- **Service Worker & Testes:**
  - Versão do Service Worker incrementada para `atend-v61` (`sw.js`).
  - 161 testes automatizados executados e 100% aprovados.

---

## 28. Blindagem e Preservação de Saturação de O2 (SPO2) e Observações contra Sobrescrita (`v60`)
- **1. Diagnóstico do Problema:**
  - As saturações de O2 desapareciam após alguns minutos porque, ao sincronizar com a planilha (`loadData()`), o objeto retornado pelo Apps Script vinha sem o campo `SPO2` (pois a planilha no Google Drive ainda não tinha a coluna atualizada ou rodava versão anterior do script). A função sobrescrevia o registro local apagando a saturação e as observações salvas no aparelho.
- **2. Blindagem e Cache Persistente Multi-Camada (`ft_evo_vitals_cache`):**
  - Implementado cache persistente dedicado no `localStorage` indexado por ID e por chave composta (`pacienteId_data_hora`).
  - Funções `extractEvoSpo2(r)` e `extractEvoObservacoes(r)` adicionadas com tolerância universal a variações de maiúsculas/minúsculas e acentuação (`SPO2`, `spo2`, `SpO2`, `SatO2`, `Saturação`, etc.).
- **3. Reconciliação Não-Destrutiva em `loadData()`.**
  - A planilha oficial agora é mesclada sem apagar sinais vitais locais: se o campo `spo2` ou `observacoes` vier vazio da nuvem, os valores locais são 100% mantidos e restaurados.
- **4. Sincronização Automática em Background (`syncPendingVitalsToSheet`):**
  - Quando a planilha estiver sem SPO2 mas o dispositivo tiver a informação, o app dispara requisição em segundo plano para persistir os dados na planilha oficial.
- **5. Atualização no `Code.gs`:**
  - Corrigido `bulk_import` para mapear colunas 11 (`SPO2`) e 12 (`Observacoes`).
  - Adicionada função `atualizarCabecalhosPlanilha` no menu do Google Sheets.
- **Service Worker & Testes:**
  - Versão do Service Worker incrementada para `atend-v60` (`sw.js`).
  - 157 testes automatizados aprovados (100% de sucesso).

---

## 27. Agenda como Aba Principal/Padrão e Ações Rápidas de Check-in e Evolução nos Cards (`v59`)
- **1. Remoção da Aba Check-in Diário:**
  - Aba de navegação principal reduzida de 5 para 4 abas (`Agenda` -> `Pacientes` -> `Evoluções` -> `Financeiro`), otimizando o espaçamento para telas móveis e desktop.
  - Removido o container de visualização antigo (`#tabCheckinView`).
- **2. Agenda como Aba Principal e Padrão:**
  - A aba `Agenda` agora ocupa a primeira posição na navegação e é definida como a aba inicial padrão do aplicativo (`defaultTab = 'agenda'`).
  - Atualizado o seletor de aba padrão em Configurações (`#defaultTabSelect`) para ter a Agenda como padrão e fallback seguro.
- **3. Botões de Ação Direta nos Cards da Agenda:**
  - **Check-in (`✓ Check-in`):** Para agendamentos com status "Agendado", permite registrar a conclusão imediata do atendimento (`completeScheduleCheckin`) com um único toque, disparando a sincronização financeira e atualização do card.
  - **Evolução (`🩺 Evolução`):** Presente tanto em agendamentos pendentes quanto já realizados, abre o formulário de evolução clínica pré-preenchendo automaticamente o paciente, a data e a hora da sessão (`openNewEvolution(evoPatId, sc.data, sc.hora)`).
- **4. Transições de Carrossel e Gestos Swipe:**
  - Array de transições atualizado para `['agenda', 'pacientes', 'evolucoes', 'financeiro']`.
- **Service Worker & Testes Automatizados:**
  - Service worker atualizado para `atend-v59` (`sw.js`).
  - 100% dos testes aprovados no test runner nativo do Node.js.

---

## 26. Correção da Aba Inicial Padrão (Check-in Sempre Acessível sem Desvio p/ Agenda) (58)
- **1. Causa Raiz Identificada:**
  - A função updateCheckinTabVisibility() continha a regra if(!hasSched && currentTab === 'checkin') switchMainTab('agenda').
  - Quando o app abria no Check-in (ou quando a lista local de schedules iniciava vazia antes do término de loadData()), o código ocultava o botão de Check-in e forçava imediatamente a transição para a aba Agenda (genda).
- **2. Correção Aplicada:**
  - Removido o desvio forçado e a ocultação da aba Check-in em updateCheckinTabVisibility(). A aba Check-in possui seu próprio empty state amigável com botão de agendamento rápido quando não há pacientes agendados.
  - A aba inicial definida em Configurações (getDefaultTab()) agora é 100% respeitada ao abrir o app e após a carga dos dados.
- **Service Worker & Testes:**
  - Versão do Service Worker incrementada para tend-v58 (sw.js).
  - 100% dos testes aprovados.

---

## 25. Exportação em Lote de Evoluções em PDF por Período e Múltiplos Pacientes (`v57`)
- **1. Botão "Exportar em PDF" na Aba Evoluções:**
  - Adicionado botão de destaque (`#btnExportEvolucoesPDF`) ao lado de `+ Nova Evolução` no topo da aba Evoluções (`#tabEvolucoesView`).
- **2. Modal Inteligente de Exportação em Lote (`openExportEvolutionsBatchModal`):**
  - **Filtro Temporal Dinâmico:** Seletor por botões rápidos com suporte a:
    - *Dia específico:* Seletor de data pontual.
    - *Semana:* Seletor de data de referência com cálculo automático do intervalo semanal completo de Segunda a Domingo (`getWeekBounds`).
    - *Mês:* Seletor de Mês e Ano.
    - *Ano:* Seletor de Ano completo.
    - *Todo o Período:* Exportação de todo o histórico sem restrição temporal.
  - **Seleção de Pacientes:** Lista com checkboxes individuais e botão mestre "Selecionar todos".
  - **Contadores em Tempo Real:** Atualização imediata do badge de contagem de evoluções por paciente no período (`(X evoluções)`) e do total geral no botão de confirmação.
- **3. Estrutura do Documento PDF Gerado (`submitExportEvolutionsBatchPDF` / `renderEvolutionsToPDF`):**
  - Fundo branco limpo, sem planos de fundo nem marcas d'água.
  - Cabeçalho padronizado `Prontuário Fisioterapêutico · Evoluções` com identificação do paciente e período exportado.
  - Sinais vitais com inclusão obrigatória de `SPO2` formatada (`SPO2: XX%`).
  - Bloco de `OBSERVAÇÕES` incluído sempre que preenchido.
  - Separação por paciente com quebra de página (`doc.addPage()`) e carimbo profissional com data de emissão ao final de cada registro.
  - Nome do arquivo padronizado: `evolucoes_[Nome]_[periodo].pdf` (individual) ou `evolucoes_lote_[N]_pacientes_[periodo].pdf` (múltiplos).

---

## 24. Aba Inicial Padrão Configurável (Check-in como Padrão com Escolha em Configurações) (`v56`)
- **1. Check-in Diário Estabelecido como Aba Inicial Padrão:**
  - Ao carregar ou abrir o aplicativo, a aba ativa inicial agora é padronizada para o **Check-in Diário** (`checkin`), garantindo acesso imediato aos atendimentos do dia.
- **2. Seletor de Aba Inicial no Painel de Configurações:**
  - Adicionado campo seletor (`#defaultTabSelect`) no formulário de Configurações permitindo à usuária escolher livremente qual tela deve ser carregada por padrão:
    - *Check-in Diário* (padrão recomendado)
    - *Pacientes*
    - *Agenda*
    - *Evoluções*
    - *Financeiro*
- **3. Persistência e Sincronização Local:**
  - A preferência é salva no objeto de configuração (`config.defaultTab`) e em `localStorage.getItem('ft_default_tab')`.
  - Função `getDefaultTab()` implementada com validação estrita das 5 abas e fallback seguro para `'checkin'`.
  - Ao salvar as configurações, o aplicativo já transiciona imediatamente para a aba selecionada.
- **Service Worker & Testes Automatizados:**
  - Service worker atualizado para `atend-v56` em `sw.js`.
  - 136 testes automatizados cobrindo a seleção, persistência e fallback de abas.

---

## 23. Remoção de Planos de Fundo e Marcas D'água na Exportação de PDFs (`v55`)
- **1. Fundo Limpo e Profissional em Todos os PDFs:**
  - Removido completamente o plano de fundo decorativo com flores, folhas e transparência (`marcaDaguaOutono`) que era desenhado no canvas de todos os PDFs exportados.
  - Eliminadas as invocações de plano de fundo em todas as quebras de página e paginações de:
    - *Extrato Financeiro do Paciente* (`exportPatientStatement`).
    - *Prontuário de Evoluções Clínicas* (`renderEvolutionsToPDF`).
    - *Comprovante Consolidado e Mensal de Sessões* (`exportMonthlyStatementsPDF`).
    - *Recibo Individual de Sessão* (`generateReceipt`).
    - *Relatório Financeiro Anual e Mensal* (`exportFinancialReportPDF`).
- **2. Ajuste de Cabeçalho e Compatibilidade:**
  - A função `marcaDaguaOutono(doc, pageW, pageH)` foi convertida em um no-op seguro que não executa chamadas gráficas ao jsPDF (`doc.ellipse`, `doc.circle`, `doc.setGState`), preservando a compatibilidade sem poluir o documento.
  - `receiptHeader` ajustado para utilizar o nome oficial da Fisioterapeuta Responsável (`Scarlet Feitosa Santos`) e renderizar fundo branco puro com contraste profissional e economia de tinta/impressão.
- **Service Worker & Testes Automatizados:**
  - Service worker atualizado para `atend-v55` em `sw.js`.
  - Suíte de testes automatizados expandida cobrindo a verificação de ausência de planos de fundo e no-op de marca d'água.

---

## 22. Correção da Tela em Branco, Resolução de Sintaxe e Fechamento do Carrossel (`v54`)
- **1. Diagnóstico do Problema da Tela em Branco:**
  - Após a injeção dos efeitos de transição do carrossel, um fragmento de código residual com `catch(e){}` permaneceu solto dentro da função `switchMainTab`.
  - Esse fragmento provocava um erro fatal de sintaxe (`SyntaxError: Unexpected token 'catch'`) durante o carregamento inicial da tag `<script>`, impedindo que o motor de JavaScript do navegador executasse a função `init()` e desocultasse a tela `#mainScreen` (`display: none`).
  - Adicionalmente, o container `<div id="tabsCarouselViewport">` necessitava do fechamento de sua respectiva tag `</div>` no final das abas principais.
- **2. Correções Definitivas Aplicadas:**
  - Remoção completa do fragmento residual e reescrita atômica e limpa da função `switchMainTab`.
  - Fechamento formal do container do carrossel (`opens=643, closes=643` balanceados perfeitamente).
  - Execução de script de validação de sintaxe via Node.js (`node -c`) sobre o código do app, atestando 100% de conformidade sintática e compilabilidade sem erros.
- **Service Worker & Testes Automatizados:**
  - Service worker atualizado para `atend-v54` em `sw.js` para invalidação imediata do cache nos dispositivos.
  - 119 testes automatizados aprovados com 100% de sucesso.

---

## 21. Navegação de Datas na Aba Check-in Diário (Hoje, D+1, D-1, etc.) (`v53`)
- **1. Navegação Rápida entre Dias:**
  - Inseridos botões direcionais **`[◀]`** e **`[▶]`** no cabeçalho do Check-in para alternar facilmente entre o dia atual, dias futuros (`D+1`, `D+2`, `D+3`...) e dias anteriores (`D-1`, `D-2`...).
  - Adicionado seletor nativo de calendário com 1 toque no título da data, permitindo saltar instantaneamente para qualquer dia específico.
- **2. Indicadores Relativos Inteligentes:**
  - Badge dinâmico indicando o contexto do dia selecionado:
    - `Hoje` (azul)
    - `Amanhã (D+1)` (verde)
    - `Ontem (D-1)` (âmbar)
    - `D+N` (roxo) ou `D-N` (cinza)
  - Botão de atalho rápido **`[📅 Voltar p/ Hoje]`** visível sempre que o usuário estiver consultando uma data diferente de hoje.
  - Subtítulo com resumo estatístico em tempo real do dia selecionado (ex.: "3 a realizar • 1 realizado").
- **3. Filtragem e Ações por Data:**
  - O Check-in exibe os pacientes agendados especificamente para a data em visualização.
  - Permite realizar check-in retroativo em atendimentos pendentes de dias anteriores ou antecipar confirmações.
  - Empty state contextualizado para dias sem agendamento com o botão `+ Agendar Paciente neste dia` (preenchendo a data selecionada automaticamente).
- **Service Worker & Testes Automatizados:**
  - Service worker atualizado para `atend-v53` em `sw.js`.
  - 49 testes unitários aprovados com 100% de sucesso.

---

## 20. Efeito Visual de Swipe Views / Carrossel Interativo entre Abas (`v52`)
- **1. Carrossel Visual em Tela Cheia:**
  - As 5 abas principais do aplicativo passam a operar como um carrossel visual (`Swipe Views / Carousel`), com viewport dedicado (`.tabs-carousel-viewport`).
  - Ao alternar entre abas (seja por toque nas abas do topo ou deslizando a tela), o conteúdo desliza de forma fluida:
    - Aba seguinte desliza suavemente da direita para a esquerda (`swipe-in-right`).
    - Aba anterior desliza suavemente da esquerda para a direita (`swipe-in-left`).
- **2. Acompanhamento Físico do Dedo em Tempo Real (Touch Drag Follow):**
  - Ao arrastar horizontalmente, a tela acompanha a posição do dedo milimetricamente (`translate3d(Xpx, 0, 0)`).
  - Inclui efeito elástico nas extremidades (Check-in e Financeiro) com resistência progressiva.
  - Se o usuário arrasta e solta sem atingir o limiar, o carrossel retorna à posição original com amortecimento mola (`cubic-bezier(0.25, 1, 0.5, 1)`).
- **Service Worker & Testes Automatizados:**
  - Service worker atualizado para `atend-v52` em `sw.js`.
  - 47 testes unitários passando com 100% de sucesso.

---

## 19. Check-in como Aba Inicial, Proporcionalidade das Abas, Desaparecimento pós Check-in e Navegação por Swipe (`v51`)
- **1. Check-in como Aba Inicial (à Esquerda de Pacientes):**
  - O Check-in agora é posicionado como a primeira aba no cabeçalho superior (`#tabBtnCheckin`), localizado à esquerda de "Pacientes", tornando-se a aba inicial padrão do aplicativo (`currentTab = 'checkin'`).
- **2. Cabeçalho das Abas Proporcional e Anti-Quebra:**
  - Corrigida a desproporção visual do cabeçalho de abas (`.main-tabs` e `.main-tab`):
    - `line-height: 1`, `white-space: nowrap` e `flex: 1 1 0%` com distribuição uniforme entre as 5 abas.
    - Eliminada completamente a quebra de linha de "Check-in" (que quebrava em "Check-\nin") e o corte lateral de "Financeiro".
    - Suporte a rolagem horizontal com momentum (`overflow-x: auto; scrollbar-width: none`) e auto-scroll suave para centralizar a aba ativa em telas menores.
- **3. Desaparecimento de Pacientes com Check-in Realizado:**
  - Quando o check-in é confirmado (`doCheckinFromTab`), o card sofre uma leve animação de saída e o paciente **some da tela de Check-in**, desobstruindo a lista diária.
  - O atendimento segue disponível e acessível em todas as outras abas ("Agenda", "Pacientes", "Evoluções" e "Financeiro").
  - Ao concluir todos os check-ins do dia, o app exibe um card comemorativo amigável indicando a conclusão das sessões de hoje.
- **4. Navegação por Gestos (Swipe) entre Abas:**
  - Implementado motor de gestos por toque (`initSwipeNavigation`):
    - Arrastar da direita para a esquerda: avança para a próxima aba (`Check-in -> Pacientes -> Agenda -> Evoluções -> Financeiro`).
    - Arrastar da esquerda para a direita: retorna para a aba anterior.
    - Proteção inteligente: toques dentro de formulários (inputs/textareas/selects), modais ou rolagens verticais não acionam a troca de aba.
- **Service Worker & Testes Automatizados:**
  - Service worker atualizado para `atend-v51` em `sw.js`.
  - Suíte expandida para 47 testes unitários passando com 100% de sucesso.

---

## 18. Visualização Padrão Hoje, Check-in Diário, SPO2, Google Agenda e Limpeza de Planilhas (`v50`)
- **1. Visualização Padrão da Agenda para o Dia Vigente e Botão Evidente Mês/Hoje:**
  - `agendaSelectedDay` inicializado como padrão na data atual (`isoDate(new Date())`), evitando poluição visual com dezenas de pacientes de outros dias logo ao abrir.
  - Inserido botão de alternância rápida em evidência na barra de filtros: `[📅 Ver mês inteiro]` / `[📅 Ver apenas hoje]` (`#agendaToggleScopeBtn`), permitindo alternar instantaneamente entre a visão do dia vigente e o panorama mensal.
- **2. Tempo de Deslocamento Zero para Pacientes com Mesmo Endereço:**
  - Pacientes atendidos no mesmo local (ex.: Irani e Sebastião na Rua André Rebouças 1044) agora retornam `distanceKm: 0`, `durationMin: 0` e `sameLocation: true`.
  - O conector entre atendimentos no mesmo endereço passa a exibir badge verde amigável `"📍 Mesmo endereço / Sem deslocamento (0 min • 0 km)"`, eliminando falsos alarmes de atraso e trânsito.
- **3. Google Agenda — Blindagem da Conta USP, Título Limpo e Cores Automáticas:**
  - **Blindagem contra gravação em contas `@usp.br` / `matheusrodrigues1917@usp.br`:** Bloqueio estrito no backend (`Code.gs`) e frontend. Eventos são criados única e exclusivamente na agenda da fisioterapeuta (`scarletsantos7@gmail.com`).
  - **Formato Estrito do Título:** O título do evento na Google Agenda agora contém estritamente o `nome do paciente` e nada mais (removidos prefixos como "Fisioterapia:" ou marcadores "✓").
  - **Atribuição Automática de Cor por Paciente:** Cada paciente recebe automaticamente e de forma determinística uma cor visual única (`colorId` de 1 a 11 do Google Calendar), mantendo identificação visual imediata na grade da agenda.
- **4. Evoluções — Saturação de Oxigênio (SPO2), Copiar Conduta Anterior e Observações:**
  - Adicionado campo **SPO2 (Saturação de Oxigênio)** em todas as evoluções clínicas, com exibição destacada no formato `SPO2: 98%` no card e persistência no Google Sheets (`EVO_HEADERS`).
  - Adicionado botão **`[✏️ Editar]`** diretamente dentro do histórico de evoluções dos pacientes (`openPatientEvolutions`), permitindo ajustes clínicos rápidos sem precisar navegar para a aba geral.
  - Adicionado botão **`[📋 Copiar conduta anterior]`** no formulário de nova evolução: preenche instantaneamente o campo com a última conduta registrada para aquele paciente.
  - Adicionada área dedicada **"Observações"** logo abaixo de "Condutas Fisioterapêuticas" tanto na criação/edição quanto na visualização dos cards e sincronização com a planilha.
- **5. Aba "Check-in" de Uso Diário e Rápido:**
  - Criada nova aba principal **"Check-in"** (`#tabBtnCheckin` / `#tabCheckinView`).
  - A aba surge automaticamente na barra de navegação superior assim que houver pelo menos um paciente agendado (`schedules.length > 0`).
  - Apresenta cabeçalho com data, dia da semana e relógio digital ao vivo, o botão `+ Registrar atendimento` e a lista simplificada dos pacientes agendados para o dia de hoje.
  - Embaixo de cada paciente agendado, há exclusivamente o botão verde `[✓ Fazer Check-in]` (ou status `[✅ Check-in Concluído]` com opção de desfazer), tornando a rotina de atendimento ultra-rápida.
- **6. Limpeza das Tabelas do Google Sheets:**
  - Abas desnecessárias `Exercicios` e `Rotinas` foram removidas da estrutura da planilha (`cleanupUnusedSheets_()`), tornando as chamadas do Google Apps Script mais rápidas e leves.
- **Service Worker & Testes Automatizados:**
  - Service worker atualizado para `atend-v50` em `sw.js`.
  - 44 testes unitários automatizados passando com 100% de sucesso.

---

## 17. Sincronização em Tempo Real Multi-Dispositivo (Celular <-> Computador) e Autoridade da Planilha (`v49`)
- **Diagnóstico do Problema ("alterei no celular e não apareceu no computador"):**
  1. *Subordinação Invertida do Cache Local:* Em `loadData()`, os arrays `localScheds`, `localEvos` e os metadados `meta` no `localStorage` do computador eram aplicados após os dados da planilha, sobrepondo os dados atualizados vindos da nuvem com cópias antigas em cache no computador.
  2. *Cache HTTP Agressivo no Navegador:* Requisições `GET` ao endpoint `/exec` do Apps Script sofriam cache de redirecionamento 302 em navegadores desktop/mobile por falta de cabeçalhos de controle e timestamp.
  3. *Ausência de Gatilhos de Retomada de Foco:* Ao alternar entre o celular e a aba do computador já aberta em segundo plano, nenhum evento disparava a revalidação dos dados.
- **Soluções Implementadas:**
  - **Autoridade Absoluta da Planilha:** A planilha Google Sheets é a única e definitiva fonte da verdade (`Single Source of Truth`). Ao carregar dados frescos, `sheetPatients`, `sheetScheds`, `sheetEvos` e `entries` atualizam forçadamente os caches locais do dispositivo (`saveLocal...`), garantindo que qualquer alteração feita no celular se reflita imediatamente no computador.
  - **Anti-Cache Rigoroso na Rede:** `loadData` agora anexa `_t=Date.now()` a cada requisição e utiliza a diretiva `{ method: 'GET', cache: 'no-store' }`, forçando o navegador a sempre consultar os dados ao vivo no Google Sheets.
  - **Motor de Sincronização Automática em Foco (`visibilitychange` & `focus`):**
    - Adicionado ouvinte de `document.visibilitychange` e `window.focus` com debounce inteligente de 10s. Ao voltar para a aba do computador, o sistema revalida silenciosamente os dados sem piscar ou travar a tela.
    - Polling suave em segundo plano a cada 45 segundos para manter abas abertas sempre atualizadas.
    - Pausa automática de sincronização enquanto o usuário estiver com qualquer modal ou formulário aberto preenchendo dados.
- **Service Worker & Testes Automatizados:**
  - Service worker atualizado para `atend-v49` em `sw.js`.
  - 39 testes unitários passando com 100% de sucesso.

---

## 16. Correção Definitiva da Abertura de Modais no Primeiro Toque (`v48`)
- **Diagnóstico do Problema ("clicar três vezes para abrir"):**
  - *Causa 1 (Ghost click / colisão com animação de entrada):* Ao chamar `openModal(html)`, o `.modal-bg` era injetado com `position: fixed; inset: 0` enquanto o `.modal` filho iniciava sua animação `@keyframes slideUp` em `translateY(100%)` (fora da tela visível). Em toques de tela mobile e cliques rápidos, eventos sintéticos de clique disparavam no `.modal-bg`. Como `closeModalBg(ev)` checava apenas `ev.target === ev.currentTarget`, o evento era interpretado como toque fora do modal e executava `closeModal()` imediatamente em menos de 50ms, fazendo o modal fechar antes de ser percebido pelo usuário.
  - *Causa 2 (Descompasso de histórico e `popstate`):* O contador `_pendingBack` acumulava atrasos assíncronos de `history.back()`. Quando o modal era reaberto, o evento `popstate` retardado disparava e encontrava `root.innerHTML.trim() !== ''`, chamando `closeModal(true)` instantaneamente. Somente na terceira tentativa a pilha de histórico estabilizava e o modal permanecia aberto.
- **Solução Implementada:**
  - **Janela de Proteção Temporal por Timestamp (`_modalOpenTs`):** Ao abrir qualquer modal, registra-se `_modalOpenTs = Date.now()`.
  - **Blindagem em `closeModalBg`:** Qualquer evento de clique no backdrop ocorrido há menos de 350ms da abertura do modal é sumariamente ignorado (`if(Date.now() - _modalOpenTs < 350) return;`). Toques intencionais de fechamento após a animação de entrada continuam funcionando com total perfeição.
  - **Blindagem em `popstate`:** Eventos residuais de `popstate` disparados dentro de 350ms da abertura são descartados, eliminando a corrida assíncrona entre o fechamento de um modal anterior e a abertura do novo.
  - **Eliminação do Contador `_pendingBack`:** Substituído por sincronização de estado limpa e direta com `history.state` e controle temporal atômico.
  - **Atributo `type="button"`:** Adicionado explicitamente a todos os botões de ação principais para prevenir qualquer comportamento padrão espúrio em navegadores mobile.
- **Service Worker & Testes Automatizados:**
  - Service worker atualizado para `atend-v48` em `sw.js`.
  - 37 testes unitários passando com 100% de sucesso, incluindo novos testes dedicados à proteção contra fechamento prematuro e clique no backdrop.

---

## 15. Nova Implantação do Google Apps Script e Eliminação Definitiva da Duplicidade de Pacientes (`v47`)
- **Homologação e Conexão da Nova Implantação:**
  - Atualizada a constante `SCRIPT_URL` em `atendimentos.html` para o novo endpoint de produção: `https://script.google.com/macros/s/AKfycbz9uHQZiq_eNMs7pA4_uiI_qLxcrkG7BuW_ThjLt7yRh7cBuHT3Pg8B2nIn402JrlO7Vw/exec`.
  - Executados testes automatizados ao vivo via GET e POST (`test_calendar`), confirmando integridade operacional, retorno dos 8 pacientes da planilha e sincronização nativa com Google Agenda.
  - Implementada migração automática transparente em `init()` para atualizar a configuração salva no navegador de qualquer dispositivo para o novo endpoint.
- **Eliminação Definitiva da Duplicidade de Pacientes:**
  - *Diagnóstico do Bug:* Quando pacientes eram criados provisoriamente em cache local (`pac_auto_...`), a mesclagem em `loadData()` comparava apenas o `id` estrito. Ao receber os pacientes oficiais da planilha (`p1786...`), o sistema adicionava os dois registros lado a lado (ex.: "Dona Diva" oficial e "Dona Diva" local), duplicando todos os nomes nos selects e listas.
  - *Motor Canônico de Deduplicação (`deduplicatePatientsList`):* Unifica registros com mesmo ID, mesmo nome (`normName(nome)`) ou cruzamento com `nomeFantasia`/`oldNome`. O ID oficial da planilha tem precedência sobre IDs auto-gerados (`pac_auto_...`), mesclando telefones, endereços e demais metadados sem perda de informação.
  - *Purga Imediata no Dispositivo:* Aplicada em `init()` sobre `ft_local_patients` no `localStorage`, eliminando duplicatas residuais de celulares e navegadores em 0ms.
  - *Filtro de Segurança nos Selects:* Aplicada blindagem defensiva com `filterUniqueForOptions` em `openScheduleModal`, `populatePatientFilter`, `populateAgendaFilters`, `populateEvolutionsFilters`, `openNewEntry`, `openNewEvolution` e `renderPatientsTab`, garantindo que nenhuma opção duplicada seja renderizada.
- **Service Worker & Testes Automatizados:**
  - Service worker atualizado para `atend-v47` em `sw.js`.
  - 38 testes unitários passando com 100% de sucesso (3 novos testes adicionados especificamente para cenários de deduplicação e mesclagem de IDs).

---

## 14. Correção do Modal de Férias, do Agendador e do Sumiço de Pacientes (`v46`)
- **Modal de Férias / Ausência travando (`atendimentos.html`):**
  - *Causa 1 (travamento de tela):* `getVacationDatesRange` e a checagem de conflitos geravam um array de dias a cada alteração de data. Ao digitar o ano no campo de data (ex.: `0002` ou `20267`), o período virava milhares de anos e o navegador congelava. Agora há `vacationSpanDays` (valida formato e ordem) e limite de `VAC_MAX_DAYS = 120` dias por registro; conflitos usam comparação direta de datas (`getVacationConflicts`), sem arrays.
  - *Causa 2 (gravação inválida):* `create_schedule` e `update_schedule` eram enviados como `{ action, item: {...} }`, mas o `Code.gs` lê os campos na raiz. Resultado: linha vazia na aba `Agendamentos` e nenhum evento no Google Agenda para ausência de 1 dia. O front agora envia payload plano e o `Code.gs` também aceita `item` (sobe os campos para a raiz).
  - *Causa 3:* a resposta do servidor usa `calendarEventId`, mas o front lia só `eventId` e nunca guardava o ID do evento; excluir a ausência não removia do Google Agenda. Corrigido (aceita ambas as chaves).
  - Sincronização em lotes de 10 dias (antes: 1 requisição com todos os dias segurando o lock da planilha); sem lembrete popup em bloqueios; cancelamento de conflitos usa a lista capturada na hora (antes procurava por texto na observação).
  - Validação de horário (término após o início) e feedback quando parte da sincronização falha.
- **Pacientes sumindo / sem endereço (`atendimentos.html` e `Code.gs`):**
  - O filtro `!isInvalidPatientName(nomeFantasia)` tratava **Nome Fantasia vazio como inválido**: pacientes sem apelido eram descartados da lista, apagados do cache local no `init()` e recriados em branco (sem endereço/telefone) pela auto-descoberta. O `doGet` e o `create_patient` do `Code.gs` tinham o mesmo problema. Criada `isNonPatientRecord` / `isInvalidOptionalName_` (Nome Fantasia é opcional).
  - Linhas de férias/ausência (`🏖️ Férias`, etc.) eram promovidas a "pacientes" pela auto-descoberta. Agora são ignoradas (`isBlockLabelName`) e purgadas do cache.
  - Linhas fantasma (sem ID/data) na aba `Agendamentos` são ignoradas ao carregar; `create_schedule` rejeita payload sem `id`/`data`.
- **Agendador:**
  - Férias/ausências não entram mais no cálculo de rotas entre pacientes (agenda do dia e análise do modal de agendamento) — antes geravam cartões "cadastre o endereço de 🏖️ Férias".
  - Horário vazio deixou de gerar evento de dia inteiro (08:00–20:00) no Google Agenda (validação em `submitSchedule`).
  - Corrida entre `closeModal()` e `openModal()` (ex.: `closeModal();openPatientForm()`): o `popstate` atrasado do `history.back()` fechava o modal recém-aberto. Corrigido com o contador `_pendingBack`.
  - Proteção contra `getRouteSyncOrApprox` nulo na análise de rota do modal.
- **Service Worker & Testes:** `atend-v46`; 35 testes unitários passando (4 novos: pacientes sem Nome Fantasia, rótulos de ausência, `isBlockSchedule`, limite do período de férias).
- **Ação manual necessária:** republicar o `Code.gs` no Apps Script (nova implantação) para ativar `item` na raiz, validação de `create_schedule` e o filtro de Nome Fantasia no `doGet`. Linhas vazias antigas na aba `Agendamentos` podem ser apagadas manualmente.

---

## 13. Harmonização Visual da Agenda, Calendário Uniforme, Ocultação de Vínculo e Sanitização Rigorosa de Pacientes (`v45`)
- **Harmonização e Uniformidade de Tamanhos na Agenda (UX Perfeita):**
  - **Grade de Ações 2x2 com Proporções Rigorosas:** Transformada a barra de ações em uma grade equilibrada de 2x2 (`.agenda-action-grid` com `grid-template-columns: 1fr 1fr`), contendo 4 botões de dimensões rigorosamente padronizadas (`height: 42px; min-height: 42px; max-height: 42px; width: 100%`):
    1. `[📅 + Agendar Sessão]` (Primário destacado)
    2. `[🏖️ Férias / Ausência]` (Tom suave âmbar com destaque)
    3. `[🚗 Rotas & Distâncias]` (Secundário/ghost)
    4. `[⚙️ Google Agenda]` (Com badge dinâmico de status `✓` verde quando vinculado ou `⚠️` quando não vinculado)
  - **Cards de Estatísticas (KPIs) Otimizados:** 4 cards padronizados (`Total Mês`, `A Realizar`, `Realizados`, `Ausências`) com labels concisos que eliminam truncamento (`...`) e quebras desiguais em qualquer tela mobile.
  - **Calendário com Células e Semanas Perfeitas (`grid-auto-rows: 44px`):** Adicionado `grid-auto-rows: 44px;` ao `.cal-grid` e padronizadas todas as células `.cal-day` e `.cal-day.empty` para `height: 44px; min-height: 44px; max-height: 44px; box-sizing: border-box; overflow: hidden;`. O primeiro dia do mês e os dias vazios anteriores não distorcem mais nem esticam a primeira semana, garantindo alinhamento milimétrico em todas as linhas.
- **Ocultação e Recolhimento Completo do Banner Google Agenda:**
  - Quando a agenda do Google está vinculada (`calId`), o banner volumoso do topo é totalmente ocultado da interface principal, mantendo a tela limpa e focada no calendário de atendimentos.
  - O acesso e status de sincronização são mantidos de forma elegante através do botão `⚙️ Google Agenda` da grade de ações.
- **Eliminação de Exercícios na Lista de Pacientes (Agachamento, Flexão, Prancha):**
  - Aperfeiçoada a função `normName` para remover acentos diacríticos (`normalize('NFD')`), garantindo que variações acentuadas como "Flexão" correspondam com precisão.
  - Expandida a lista de proteção `NON_PATIENT_NAMES` (`agachamento`, `flexao`, `prancha`, `exercicio`, `rotina`, `alongamento`, `__bloqueio__`, etc.).
  - Aplicada a verificação `isInvalidPatientName` na iteração `patients.forEach` dos relatórios financeiros (`renderFinancialReports`), impedindo que nomes de exercícios apareçam no ranking com 0 sessões e R$ 0,00.
  - Adicionada a função `isInvalidPatientName_` no backend `Code.gs` para filtrar pacientes em `doGet` e bloquear tentativas de inserção ou atualização indevida em `create_patient` e `update_patient`.
- **Concordância Gramatical no Filtro de Pacientes:**
  - Substituída a opção `<option value="">Todas as pacientes</option>` por `<option value="">Todos os pacientes</option>`, mantendo coerência com pacientes do gênero masculino e padrão geral da interface.
- **Otimização Local-First no Registro de Férias/Ausências:**
  - `submitVacationBlock` atualiza o estado local (`schedules`), fecha o modal e exibe o toast de confirmação imediatamente, realizando a sincronização com o Google Apps Script e Google Calendar em segundo plano, eliminando qualquer risco de travamento da interface.
- **Service Worker & Testes Automatizados:**
  - Service worker atualizado para `atend-v45` em `sw.js`.
  - 27 testes unitários automatizados passando com 100% de sucesso.

---

## 12. Auditoria Profunda de Código, Eliminação de Erro de Sintaxe e Otimização Geral
- **Detecção e Correção Imediata de Erro de Sintaxe (`Unexpected token '}'`):**
  - Identificadas linhas residuais duplicadas de fechamento (`icsBtn.style.display... } }`) na função `updateGCalBannerUI` em `atendimentos.html`. O erro de sintaxe impedia a execução adequada do script em determinados navegadores e foi corrigido de imediato.
- **Eliminação de Operação Redundante em `delete_schedule` (`Code.gs`):**
  - A função `delete_schedule` executava uma chamada duplicada desnecessária a `deleteRowById_`. Removida a linha redundante, acelerando a exclusão de agendamentos.
- **Otimização do Back-end no FisioFlow (`updateRowObjectById_`):**
  - Implementada a função de atualização atômica `updateRowObjectById_` em `fisioflow/Code.gs`, substituindo mais de 20 chamadas individuais por requisição em `update_patient`, `update_schedule`, `update_evolution`, `update_exercise` e `update_routine_item`.
  - Redução drástica das operações de leitura e gravação no Google Sheets para **apenas 1 leitura e 1 gravação por linha**, baixando a latência do back-end de ~3,5s para menos de 150ms.
- **Blindagem de `JSON.parse` em Cache Local:**
  - Todas as chamadas de leitura do `localStorage` foram inspecionadas e envolvidas em blocos `try/catch` defensivos com fallbacks seguros.
- **Auditoria de Ações e Integração API:**
  - Auditadas todas as ações da API entre o front-end e o back-end do Google Apps Script: 100% de paridade e conformidade, sem ações órfãs ou não tratadas.
- **Testes Automatizados:**
  - 27 testes unitários passando em `matheus-app-fisioterapia` e 32 testes unitários passando em `fisioflow`.

---

## 11. Auditoria e Validação Completa do Motor de Rotas, Deslocamento e Combustível (`v44`)
- **Testes ao Vivo no Back-end do Google Apps Script (`calc_routes_batch`):**
  - Executados testes diretamente no endpoint de produção (`https://script.google.com/macros/s/AKfycbwYFDh0-sZSZut51QJriLORBta_D_5BX3xJyeJm38qhERnKl1D4HgGA9oalxYDNQ28EbQ/exec`), validando que o `Maps.newDirectionFinder()` do Google Apps Script calcula trajetos reais com precisão turn-by-turn de trânsito em Ribeirão Preto:
    - *Vila Tibério &rarr; Centro (Rua General Osório, 500):* **4,0 km · 11 min**
    - *Centro &rarr; Jd. Botânico (Av. Prof. João Fiúsa, 1500):* **4,3 km · 11 min**
    - *Jd. Botânico &rarr; Bonfim Paulista:* **7,0 km · 8 min**
    - *Vila Tibério &rarr; USP Monte Alegre (Av. Bandeirantes, 3900):* **4,7 km · 9 min**
- **Correção de Crash no Simulador de Rotas (`TypeError`):**
  - *Identificação:* Caso um paciente tivesse endereço não cadastrado ou bairro não catalogado, a função `getRouteSyncOrApprox` retornava `null`. No método `runRouteSimulator`, a expressão `r.distanceKm` causava `TypeError: Cannot read properties of null (reading 'distanceKm')`, travando a renderização do simulador.
  - *Solução:* Tratamento defensivo rigoroso com fallback urbano automático (`4.5 km · 12 min`) enquanto a rota exata é calculada via API do Google Maps, impedindo qualquer travamento de tela.
- **Ampliação da Cobertura de Bairros de Ribeirão Preto (`RP_COORDS_REF`):**
  - Expandida a tabela de coordenadas para 19 regiões e bairros chave da cidade (incluindo Vila Seixas, Boulevard, Santa Úrsula, Jardim Paulistano, Palmares, Shopping Iguatemi, Ribeirão Verde, San Marco / Recanto das Acácias e Cândido Portinari).
- **Tratamento de Estado Vazio no Ranking de Proximidade:**
  - Quando os pacientes ainda não possuem endereços cadastrados, o assistente exibe um card explicativo amigável orientando o usuário a preencher o endereço ou bairro na ficha do paciente.
- **Testes Automatizados de Rotas:**
  - Adicionados testes específicos no `test/helpers.test.js` para `findApproxCoordsRP`, `haversineRoadEstimate`, `getRouteSyncOrApprox`, `calcFuelMetrics` e tolerância a dados vazios (total de 27 testes passando 100%).
- **Cache do Service Worker:**
  - Atualizado para `atend-v44` em `sw.js`.

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








