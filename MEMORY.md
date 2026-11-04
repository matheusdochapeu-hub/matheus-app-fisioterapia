# Memória Persistente do Projeto — App Fisioterapia Scarlet (`matheus-app-fisioterapia`)

Este documento registra de forma definitiva a arquitetura, regras de negócio aprendidas, decisões técnicas e histórico consolidado do aplicativo de fisioterapia domiciliar da Dra. Scarlet Feitosa Santos.

---

## 📌 Identificação e Tecnologias
- **Repositório:** `matheusdochapeu-hub/matheus-app-fisioterapia` (Branch: `main`)
- **PWA & Front-End:** Single Page Application (SPA) em HTML5/Vanilla JavaScript + CSS moderno (sem dependências de frameworks externos pesados).
- **Back-End / API:** Google Apps Script (`Code.gs`) integrado ao Google Sheets como banco de dados em nuvem.
- **Service Worker:** `atend-v54` (`sw.js`).
- **Suíte de Testes:** Node.js native test runner (`node --test test/helpers.test.js`) com 100% de aprovação (119 testes integrados).

---

## 🏛️ Estrutura e Ordem das Abas Principais

A interface é composta por 5 abas com proporção uniforme de 20%, sem quebra de texto (`white-space: nowrap`) e navegação fluida por toque e gestos:

1. **`Check-in` (Aba Inicial Padrão):**
   - Atendimento diário ágil para rotina clínica em trânsito.
   - Navegação temporal dinâmica: Dia atual (`Hoje`), dias futuros (`D+1`, `D+2`...) e anteriores (`D-1`, `D-2`...) via botões direcionais `[◀]` e `[▶]`.
   - Seletor nativo de calendário com 1 toque no título da data e botão `[📅 Voltar p/ Hoje]`.
   - **Regra de ouro:** Assim que o check-in é realizado (`Confirmar Atendimento`), o paciente **desaparece imediatamente** da lista do dia (permanecendo acessível nas abas Agenda, Pacientes, Evoluções e Financeiro).
   - Card comemorativo quando todos os atendimentos do dia forem concluídos.

2. **`Pacientes`:**
   - Gestão cadastral completa, anamnese, busca rápida, prontuário individual e histórico do paciente.

3. **`Agenda`:**
   - Exibição por padrão **apenas do dia vigente**.
   - Botão em evidência para alternância rápida: `[📅 Ver apenas hoje]` / `[📅 Ver mês inteiro]` (`#agendaToggleScopeBtn`).
   - Calendário mensal com destaque visual para o dia atual ("HOJE") e chips de KPI interativos.
   - Alertas inteligentes de trânsito, tempo de deslocamento e estimativa de combustível.

4. **`Evoluções`:**
   - Registro de prontuário clínico com campo obrigatório de **SPO2 (Saturação de Oxigênio)** no formato `SPO2: XX%`.
   - Campo dedicado para **Observações** logo abaixo de Condutas.
   - Botão **`[📋 Copiar conduta anterior]`** que puxa automaticamente a última conduta clínica do mesmo paciente.
   - Botão **`[✏️ Editar]`** disponível tanto no feed geral de evoluções quanto no histórico clínico de cada paciente.

5. **`Financeiro`:**
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
