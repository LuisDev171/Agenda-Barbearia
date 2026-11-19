# Agenda Barber

Sistema de agendamento online para barbearia. O cliente marca o horário pelo celular em 4 passos e o dono acompanha tudo em um painel.

Feito em HTML, CSS e JavaScript puro (sem bibliotecas), instalável como app (PWA).

## O que o cliente faz (`index.html`)
1. Escolhe o serviço
2. Escolhe o profissional (ou "sem preferência")
3. Escolhe o dia e um horário livre
4. Digita nome e WhatsApp e recebe a comanda de confirmação

Na comanda ele pode avisar a barbearia pelo WhatsApp, salvar no calendário (.ics) e cancelar o horário.

## O que o dono faz (`painel.html`)
- **Agenda do dia:** concluir, cancelar e mandar lembrete pelo WhatsApp
- **Novo horário:** marcar um cliente do balcão ou bloquear um horário
- **Resumo:** faturamento do mês, ticket médio, últimos 7 dias, ranking por profissional e por serviço
- **Serviços e equipe:** cadastrar, editar e apagar
- **Ajustes:** horário de funcionamento, pausa de almoço, dias abertos, link do cliente, QR Code e cartaz para imprimir
- Painel protegido por senha

## Como abrir no VS Code
1. Abra a pasta no VS Code (File > Open Folder).
2. Instale a extensão **Live Server**.
3. Clique com o botão direito em `index.html` > **Open with Live Server**.
4. O painel do dono fica em `painel.html` (na primeira vez ele pede para criar uma senha).
5. Em Ajustes > Demonstração, use "Carregar dados de exemplo" para ver o sistema cheio.

## Estrutura
```
index.html        página do cliente
painel.html       painel do dono
css/style.css     visual
js/data.js        regras: horários livres, conflitos, agendamentos
js/cliente.js     fluxo do cliente
js/painel.js      painel do dono
js/qr.js          gerador de QR Code (MIT, Kazuhiko Arase)
supabase.sql      banco na nuvem para várias barbearias
sw.js, manifest   instalação como app
```

## Modo atual e próximo passo
Hoje os dados ficam salvos **no navegador** (localStorage). Isso funciona para demonstrar e para uma barbearia que usa tudo no mesmo aparelho, mas o cliente em outro celular ainda não vê os horários ocupados.

Para virar um serviço com várias barbearias (SaaS), o `supabase.sql` já traz as tabelas com regras de segurança (RLS): cada dono só enxerga a própria loja e o cliente só vê horários ocupados, sem dados de outras pessoas. Falta criar o projeto no Supabase e trocar a camada `js/data.js` para ler e gravar nele.

## Publicar
Arraste a pasta no Netlify (ou suba os arquivos no GitHub Pages). Ao publicar uma versão nova, troque `VERSION` em `sw.js`.

---
Desenvolvido por Luis Dev · (12) 99249-8702 · @luisrlq171
