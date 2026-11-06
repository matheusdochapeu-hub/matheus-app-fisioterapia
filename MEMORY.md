# Memória Persistente do Projeto — App Fisioterapia Scarlet (`matheus-app-fisioterapia`)

Este documento registra de forma definitiva a arquitetura, regras de negócio aprendidas, decisões técnicas e histórico consolidado do aplicativo de fisioterapia domiciliar da Dra. Scarlet Feitosa Santos.

---

## 📌 Identificação e Tecnologias
- **Repositório:** `matheusdochapeu-hub/matheus-app-fisioterapia` (Branch: `main`)
- **PWA & Front-End:** Single Page Application (SPA) em HTML5/Vanilla JavaScript + CSS moderno (sem dependências de frameworks externos pesados).
- **Back-End / API:** Google Apps Script (`Code.gs`) integrado ao Google Sheets como banco de dados em nuvem.
- **Service Worker:** `atend-v63` (`sw.js`).
- **Suíte de Testes:** Node.js native test runner (`node --test test/helpers.test.js`) com 100% de aprovação.

---

## 🛡️ Blindagem de Sinais Vitais (SPO2 e Observações) contra Sobrescrita da Planilha
- **Causa Raiz Resolvida:** Quando a planilha oficial retornava dados sem a coluna SPO2 preenchida (seja por delay de sincronização, ausência do cabeçalho no Sheets ou versão anterior do Web App no Google Apps Script), a função `loadData()` sobrescrevia o registro local com valores em branco.
- **Cache Persistente Dedicado:** Implementado `ft_evo_vitals_cache` que armazena a saturação de O2 e observações indexados tanto pelo ID da evolução quanto pela chave composta `[pacienteId + '_' + data + '_' + hora]`.
- **Reconciliação Não-Destrutiva:** Durante a carga de dados, se o registro vindo da planilha oficial estiver com SPO2 ou observações em branco, os valores locais e do cache são estritamente preservados.
- **Auto-Sync em Background:** `syncPendingVitalsToSheet()` envia automaticamente `update_evolution` para gravar os sinais vitais na planilha assim que o backend estiver atualizado.

---

## 🏛️ Estrutura e Ordem das Abas Principais

A interface é composta por 4 abas com proporção uniforme de 25%, sem quebra de texto (`white-space: nowrap`) e navegação fluida por toque e gestos:

1. **`Agenda` (Aba Principal e Padrão):**
   - Central de operações e agendamentos clínicos diários e mensais.
   - **Ações Rápidas por Paciente nos Cards da Agenda:**
     - **`[✓ Fazer Check-in]` (Em Grande Evidência):** Botão principal de destaque total no card (`.sched-btn-checkin`), com gradiente verde esmeralda, sombra suave e alvo de toque amplo, permitindo confirmar a sessão imediatamente com 1 toque.
     - **Linha de Ações Secundárias Organizadas (`.sched-actions-row`):** Fileira alinhada contendo `[🩺 Evolução]` (destaque clínico), `[✎ Remarcar]`, `[📅 Google Agenda]` e `[✕ Cancelar]` com altura uniforme e espaçamento perfeito.
     - **`[🩺 Evolução]`**: Botão que abre instantaneamente o formulário de evolução clínica (`openNewEvolution`) com paciente, data e hora do atendimento automaticamente preenchidos.
     - Ações adicionais de gerenciamento: `[✎ Remarcar]`, `[📅 Google Agenda]`, `[✕ Cancelar]` e `[🗑 Excluir]`.
   - Botões de privacidade no topo (`#agendaEyeToggleBtn`) e na barra de filtros ao lado de "Ver mês inteiro" (`#agendaRowEyeToggleBtn`): permite alternar entre exibir ou ocultar os valores financeiros dos cards da Agenda instantaneamente.
   - Exibição por padrão **apenas do dia vigente**.
   - Botão em evidência para alternância rápida: `[📅 Ver apenas hoje]` / `[📅 Ver mês inteiro]` (`#agendaToggleScopeBtn`).
   - Calendário mensal com destaque visual para o dia atual ("HOJE") e chips de KPI interativos.
   - Alertas inteligentes de trânsito, tempo de deslocamento e estimativa de combustível.

2. **`Pacientes`:**
   - Gestão cadastral completa, anamnese, busca rápida, prontuário individual e histórico do paciente.

3. **`Evoluções`:**
   - Registro de prontuário clínico com campo obrigatório de **SPO2 (Saturação de Oxigênio)** no formato `SPO2: XX%`.
   - Campo dedicado para **Observações** logo abaixo de Condutas.
   - Botão **`[📋 Copiar conduta anterior]`** que puxa automaticamente a última conduta clínica do mesmo paciente.
   - Botão **`[✏️ Editar]`** disponível tanto no feed geral de evoluções quanto no histórico clínico de cada paciente.
   - Botão **`[📄 Exportar em PDF]`** no topo da aba: exporta evoluções em lote permitindo selecionar o período (**Dia específico**, **Semana**, **Mês**, **Ano** ou **Todo o período**) e filtrar por um ou múltiplos pacientes com contadores dinâmicos de evoluções por paciente em tempo real.

4. **`Financeiro`:**
   - Controle de honorários, sessões realizadas vs pendentes, previsão mensal e relatório de ausências/férias.

---

## 📱 Gestos & Interatividade (Swipe Views / Carousel)
- **Arrasto em Tela Cheia:** Transição contínua entre abas arrastando horizontalmente a tela para a esquerda ou direita.
- **Acompanhamento Físico em Tempo Real:** O carrossel acompanha milimetricamente o movimento do dedo (`translate3d`), com resistência elástica nas pontas e retorno suave por amortecimento (`cubic-bezier`).
- **Navegação Bidirecional Inteligente:** Abas seguintes deslizam da direita para a esquerda e abas anteriores da esquerda para a direita.

---

## 🔒 Regras de Negócio Críticas & Google Agenda
1. **Isolamento Absoluto de Contas:**
   - **NUNCA** criar ou sincronizar eventos na conta `matheusrodrigues1917@usp.br`.
   - Todos os eventos da agenda pertencem e devem ser gravados exclusivamente na agenda de **`scarletsantos7@gmail.com`**.
2. **Formatação Estrita no Calendário:**
   - O título do evento no Google Agenda deve ser estritamente o **Nome do Paciente** (sem emojis, prefixos ou marcadores desnecessários).
   - Atribuição automática e determinística de cores por paciente (paleta de 1 a 11).
   - Criação direta e silenciosa sem envio de notificações ou e-mails de convite (`sendInvites: false`, `guests: null`).
3. **Regra de Mesmo Endereço (Deslocamento Zero):**
   - Pacientes atendidos no mesmo local/residência (ex: Dona Irani e Seu Sebastião) possuem tempo de deslocamento calculado como **0 min** e distância **0 km** ("📍 Mesmo endereço / Sem deslocamento").

---

## 🛠️ Resoluções Técnicas e Prevenção de Regressões
- **Bug da Tela em Branco:** Um fragmento órfão `catch(e){}` dentro de `switchMainTab` impedia a compilação do JavaScript da página, impedindo que `init()` exibisse `#mainScreen`. A função foi reescrita de forma atômica e limpa, e o container `#tabsCarouselViewport` foi devidamente fechado.
- **Proteção de Modais:** Proteção temporal `_modalOpenTs` com 350ms em `closeModalBg` impede que toques no celular fechem acidentalmente os modais de cadastro e edição no primeiro clique.
- **Sincronização Multi-Dispositivo:** Ao abrir no celular ou computador, a versão mais recente da planilha do Google Sheets sempre prevalece sobre os caches locais de IndexedDB/localStorage.
- **Limpeza de Planilhas:** As abas obsoletas `exercicios` e `rotinas` foram descontinuadas do fluxo ativo.
- **PDFs sem Planos de Fundo:** Todos os PDFs exportados (Extrato, Prontuário de Evoluções, Comprovantes, Recibos e Relatórios) são gerados com fundo branco puro, limpo e profissional, sem marcas d'água decorativas, flores ou folhas (`marcaDaguaOutono` desativada).
- **Aba Inicial Configurável:** A aba inicial ao abrir o app é por padrão o `Check-in Diário`, com seletor no painel de Configurações (`#defaultTabSelect`) permitindo ao usuário escolher livremente qualquer uma das 5 abas (`getDefaultTab()`), com persistência local e fallback seguro.
- **Exportação em Lote de Evoluções em PDF:** Função `openExportEvolutionsBatchModal` com suporte a filtros temporais (`dia`, `semana` com intervalo de segunda a domingo, `mes`, `ano` e `todo`), seleção de múltiplos pacientes, contagem reativa por paciente e cálculo de total no botão de geração, gerando prontuários limpos e individuais por paciente com `SPO2`, `Observações`, cabeçalho sem marcas d'água e carimbo profissional com data de emissão.

- **Aba Check-in Sempre Acessível e Fixada:** O botão e a aba Check-in permanecem permanentemente visíveis e acessíveis na barra de navegação, mesmo se não houver agendamentos na data ou no banco local. O redirecionamento forçado para a Agenda em updateCheckinTabVisibility foi removido, respeitando rigorosamente a aba padrão configurada pelo usuário (getDefaultTab()).
