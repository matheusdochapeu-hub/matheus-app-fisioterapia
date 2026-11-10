# AGENTS.md — Atendimentos · Fisioterapia (uso privado)

> Contexto para agentes de IA. Escopo: **esta pasta**.

## O que é

PWA de controle de atendimentos domiciliares de fisioterapia, feito **exclusivamente
para a Scarlet** (esposa do Matheus): pacientes, prontuário CREFITO, evoluções,
financeiro e recibos. Instalado no celular dela.

**Este app é de uso privado e single-tenant.** Não confundir com `../fisioflow`, que é o
produto multi-tenant que será oferecido a terceiros. A decisão é manter os dois separados —
**não unifique as pastas** e não replique mudanças automaticamente de um para o outro.

## Stack

- PWA em HTML/CSS/vanilla JS (SPA), mobile-first.
- Backend: Google Apps Script (`Code.gs`) + Google Sheets **da própria Scarlet**.

## Rodar localmente

```powershell
python -m http.server 8000   # abrir http://localhost:8000
```

## Testes

```powershell
node --test test/**/*.test.js   # 74 testes
```

## Deploy

- GitHub Pages a partir da `main`:
  <https://matheusdochapeu-hub.github.io/matheus-app-fisioterapia/>
- Sem CI hoje (ponto de melhoria).

## Arquivos-chave

| Arquivo | Papel |
|---|---|
| `index.html` | SPA (pacientes, agenda, financeiro) |
| `atendimentos.html` | Tela legada de atendimentos |
| `Code.gs` | Backend Apps Script (planilha da Scarlet) |
| `sw.js` | Service Worker (`atend-vN`) |
| `MEMORY.md` | Decisões e correções históricas |
| `MEMORIA_ATUALIZACOES.md` | Registro de versões |

## Regras críticas

1. **Nunca trocar a URL do Apps Script** desta pasta pela do FisioFlow — são planilhas
   diferentes. Trocar isso mistura dados de pacientes de dois contextos.
2. **Sinais vitais (SpO2) e observações não podem ser sobrescritos** por planilha com
   campos vazios (existe cache `ft_evo_vitals_cache` para isso). Preserve a lógica.
3. Ao publicar assets, **incrementar `CACHE_NAME`** no `sw.js`.
4. Dados reais de pacientes são sensíveis: não usar em testes nem em capturas de tela.

## Vizinhança (ecossistema)

- `../fisioflow` — produto comercial, código irmão (mesma origem, propósitos distintos).
- `../matrix` — consome o faturamento clínico da Scarlet via `satellite-connectors.js`.
