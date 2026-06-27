# GymDesk — Demo Video Script

**Duração:** < 3 minutos (regra do hackathon — juízes param ao 3m)  
**Língua:** Inglês (obrigatório pelas regras)  
**Perspectiva:** Aluno — browser em modo mobile (390px, DevTools)  
**Upload:** YouTube público (obrigatório)  
**Conta demo:** user1.mygymdesk@gmail.com / MyGymDesk

---

## TIMELINE

| Tempo | Cena |
|---|---|
| 0:00–0:12 | Abertura — o problema |
| 0:12–0:30 | Login como aluno (Google OAuth) |
| 0:30–0:55 | Home — ver treino do dia |
| 0:55–1:25 | Check-in — registar cargas |
| 1:25–1:45 | Editar o check-in |
| 1:45–2:05 | Assessment — ver progressão |
| 2:05–2:35 | AWS Console — provar DynamoDB |
| 2:35–2:50 | Fecho — stack + escalabilidade |

---

## ROTEIRO COMPLETO

---

### [0:00–0:12] ABERTURA

**Ecrã:** Slide simples ou fundo preto com texto  
**Texto em ecrã:** *"Gym teachers still manage students in WhatsApp and spreadsheets."*

**Narração:**
> "Gym teachers still manage their students in WhatsApp messages and spreadsheets.
> GymDesk fixes that — built on Vercel and AWS DynamoDB."

---

### [0:12–0:30] LOGIN — ALUNO NO TELEMÓVEL

**Ecrã:** Browser em modo mobile (iPhone 14 Pro, 390px). Abrir o URL do app. Mostrar a página de login.

**Acção:** Clicar em "Sign in with Google" → completar o Google OAuth → chegar à Home.

**Narração:**
> "A student opens the app on their phone. One tap with Google — they're in."

---

### [0:30–0:55] HOME — TREINO DO DIA

**Ecrã:** Página Home com o card do grupo de treino de hoje (ex: Grupo A — Peito e Tríceps).

**Acção:** Mostrar o card expandido com a lista de exercícios. Scroll lento para mostrar os exercícios. Clicar numa secção colapsável para expandir.

**Narração:**
> "On the Home screen, they see today's training group — assigned by their teacher.
> The exercises, the groups, everything in one place. No spreadsheet, no message thread."

---

### [0:55–1:25] CHECK-IN — REGISTAR CARGAS

**Ecrã:** Clicar no botão de check-in. O diálogo abre com a lista de exercícios e campos de carga.

**Acção:** Preencher os pesos para cada exercício (ex: Supino 60kg, Agachamento 80kg, Rosca 30kg). Confirmar. Toast de sucesso aparece.

**Narração:**
> "After finishing their set, the student logs the weight used for each exercise.
> That data goes directly into AWS DynamoDB — a single PutItem write, durable across three availability zones."

*⚠️ Importante: mencionar DynamoDB explicitamente aqui — é requisito das regras.*

---

### [1:25–1:45] EDITAR O CHECK-IN

**Ecrã:** Voltar à Home. Clicar novamente no botão de check-in do mesmo grupo.

**Acção:** O diálogo reabre em modo edição — campos já preenchidos com os valores anteriores. Alterar um valor (ex: Supino 60 → 65kg). Guardar.

**Narração:**
> "Entered the wrong weight? The app detects today's check-in already exists
> and opens it in edit mode. DynamoDB's UpdateItem replaces the record — no duplicates."

---

### [1:45–2:05] ASSESSMENT — PROGRESSÃO

**Ecrã:** Navegar para a página Assessment. Mostrar métricas corporais (peso, IMC, massa muscular). Descer para a secção de cargas registadas.

**Acção:** Mostrar o histórico de cargas com datas — várias semanas visíveis.

**Narração:**
> "On the Assessment page, the student sees their body metrics and their full load history.
> Week over week — getting stronger, tracked automatically."

---

### [2:05–2:35] AWS CONSOLE — PROVA DO DYNAMODB

**Ecrã:** Cortar para o AWS Console. DynamoDB → Tables.

**Acção:**
1. Mostrar as quatro tabelas: `gymdesk-checkins`, `gymdesk-perfis`, `gymdesk-avaliacoes`, `gymdesk-programas-treino`
2. Clicar em `gymdesk-checkins` → "Explore table items"
3. Mostrar o item recém-criado com os atributos: `userId`, `grupoLetra`, `cargas`, `data`

**Narração:**
> "Here's the proof — AWS DynamoDB, four tables, PAY_PER_REQUEST billing.
> The check-in we just logged is right here — userId, exercise group, loads, timestamp.
> No cluster to manage. No capacity to provision. Zero cost at zero traffic."

*⚠️ Este é o momento mais importante do vídeo para os juízes técnicos.*

---

### [2:35–2:50] FECHO

**Ecrã:** Voltar ao app. Mostrar a Home com o check-in confirmado.

**Narração:**
> "GymDesk — Vercel for the frontend, AWS DynamoDB for the data.
> From one gym to a thousand — the stack scales without touching a single config file."

**Texto em ecrã (fade in):**
> *GymDesk · Vercel + AWS DynamoDB · #H0Hackathon*

---

## NOTAS DE GRAVAÇÃO

**Setup técnico:**
- Browser: Chrome, DevTools → modo mobile iPhone 14 Pro (390×844, 3x DPR)
- Zoom: 100% para boa legibilidade no vídeo
- Tema: Dark mode se disponível no app
- Resolução de gravação: 1080p mínimo

**Fluxo da gravação:**
1. Gravar a parte do app primeiro (cenas 2–6) num só take se possível
2. Gravar a parte do AWS Console separadamente (cena 7)
3. Editar as duas partes com um corte limpo a ~2:05

**O que NÃO mostrar:**
- Passwords no ecrã (usar Google OAuth flow — não digitar password)
- URLs internas ou tokens de sessão
- Erros ou estados de loading lentos (gravar em boa ligação)

**Música:**
- Sem música com copyright — usar royalty-free ou sem música
- Narração limpa é suficiente

**Legenda:**
- Adicionar legendas em inglês (aumenta acessibilidade e pontuação de Design)

**Descrição do YouTube (copiar):**
```
GymDesk — fitness management app for gym teachers and students.
Built on Vercel + AWS DynamoDB (PAY_PER_REQUEST).

Submitted to H0: Hack the Zero Stack with Vercel v0 and AWS Databases.
Created for the purposes of entering this hackathon.

#H0Hackathon #AWS #DynamoDB #Vercel #Angular
```
