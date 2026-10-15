# App de Controle de Atendimentos - Fisioterapia Domiciliar

App para celular que controla pacientes atendidos e valores a receber, com os dados salvos em uma planilha do Google Sheets.

## O que o app faz

- Cadastro de pacientes (nome, telefone, valor padrão da sessão e forma de pagamento)
- Lançamento de atendimentos com lista suspensa de pacientes, data, horário e valor (o valor já vem preenchido pelo padrão da paciente)
- Registro da localização do atendimento pelo GPS do celular, com link do Google Maps no comprovante
- Edição e exclusão de atendimentos lançados
- Registro de pagamento com data
- Resumo mensal por paciente (esperado x recebido x pendente)
- Comprovante em PDF por sessão
- Comprovante mensal em PDF por paciente ou com o resumo de todos os pacientes

## Arquivos

- `atendimentos.html`: o app (arquivo único, abre direto no navegador do celular)
- `Code.gs`: conector do Google Apps Script que lê e grava na planilha

## Instalação

1. Crie uma planilha nova no Google Sheets.
2. Abra **Extensões > Apps Script**, apague o código padrão e cole o conteúdo de `Code.gs`. Salve.
3. Clique em **Implantar > Nova implantação**, tipo **App da Web**. Em "Executar como" escolha **Eu** e em "Quem pode acessar" escolha **Qualquer pessoa**. Autorize o acesso quando o Google pedir.
4. Copie o link terminado em `/exec`.
5. Hospede o `atendimentos.html` em qualquer serviço de hospedagem de páginas estáticas (por exemplo GitHub Pages) e abra o endereço no celular.
6. Na primeira abertura, cole o link `/exec` e preencha o nome da profissional (e CREFITO/PIX, se quiser que apareçam nos recibos).

O script cria sozinho as abas **Atendimentos** e **Pacientes** na planilha.

## Atualizando o script

Sempre que o `Code.gs` for alterado, cole a nova versão no Apps Script e publique uma nova versão em **Implantar > Gerenciar implantações > Editar > Nova versão**. O link `/exec` continua o mesmo.

## Observações

- A configuração (link do script e dados da profissional) fica salva no navegador do aparelho. Use sempre o mesmo navegador ou atalho.
- A localização exige que o navegador tenha permissão de acesso ao GPS e que a página seja aberta por HTTPS.
