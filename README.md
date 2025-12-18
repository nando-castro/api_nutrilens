# Nutrilens 🍽️
**Autores:** Fernando Castro • Amanda Felix

Aplicação web para análise de refeições por imagem, cálculo aproximado de calorias e histórico diário.

## Tecnologias

### Backend
- NestJS (Node.js)
- Prisma ORM
- Multer (upload de imagens)
- JWT (autenticação)
- class-validator / class-transformer (validação)

### Banco de dados
- PostgreSQL
- Migrations via Prisma

## Requisitos
- Node.js (versão recomendada: 18+)
- PostgreSQL (versão recomendada: 14+)
- pnpm, npm ou yarn

## Como rodar localmente

### 1) Clonar e instalar
```bash
git clone https://github.com/nando-castro/api_nutrilens.git
cd api_nutrilens
cp .env.example .env
pnpm install
npx prisma generate
npx prisma migrate dev
pnpm run start:dev
```

## Variáveis de ambiente

 - DATABASE_URL="postgresql://USER:PASS@HOST:PORT/DB"
 - JWT_SECRET="secret"
 - JWT_EXPIRES_IN="1d"
 - GOOGLE_APPLICATION_CREDENTIALS="/home/user/credentials/nutrilens.json"


## Estrutura do projeto

 - src/auth (JWT, guards)
 - src/meals (controller/service/dto)
 - src/food (análise por imagem)
 - src/shared/prisma (PrismaService)
 - uploads/meals (arquivos salvos)

 - src/screens/FoodAnalyzeScreen.tsx
 - src/screens/MealsHistoryScreen.tsx
 - src/layout/AppShell.tsx
 - src/auth/auth.api.ts

# Modelo de dados (resumo)

 - User
 - Meal
 - MealItem
   
    Ver diagrama ER abaixo.

## Endpoints principais (resumo)

 - POST /auth/register
 - POST /auth/login
 - GET /meals?date=YYYY-MM-DD
 - POST /meals (multipart: image + data)
 - GET /meals/:id
 - DELETE /meals/:id
 - POST /food/analyze (multipart: file)

    Ver documentação completa da API abaixo.

# Telas e funcionalidades da aplicação:
 - Tela de registro
 - Tela de login
 - Tela de análise
 - Resultado da análise (lista de itens)
 - Modal de adicionar alimento manual
 - Histórico por dia
 - Modal de detalhes da refeição

## Vídeo demonstrativo

Link: 

## Decisões técnicas

 - NestJS + Prisma: produtividade e segurança (ORM, migrations)
 - Upload local via Multer: simples para ambiente acadêmico
 - Histórico por dia via query date (performance e UX)
 - DTOs e validação no backend para garantir consistência

## Segurança implementada

 - JWT (Bearer Token)
 - Senhas com hash (bcrypt)
 - Validações no backend (DTO)
 - Controle de acesso por usuário (userId)

## Melhorias futuras

 - Metas diárias e gráficos semanais/mensais
 - Macros (proteína/carb/gordura)
 - Storage em S3/Cloudinary
 - App mobile (React Native)
 - Sugestões com IA (dieta/alertas)

---

## 2) Documentação completa da API

```md
# API - Nutrilens

## Autenticação
Todos os endpoints (exceto login/register) exigem:
Authorization: Bearer <token>

-------------------------------------------------------------------------------------------------------------------

## POST /auth/register

{
  "name": "Dev",
  "email": "dev@teste.com",
  "password": "123456"
}

Regras:
- Email deve ser único
- Senha com no mínimo 6 caracteres

Respostas:
 - 201: Criado com sucesso

{
  "user": {
    "id": "63378b4d-c9a8-4de3-a27f-ea812ccca93b",
    "name": "Dev",
    "email": "dev@teste.com"
  },
  "accessToken": "jwt_token_aqui"
}

 - 400: Email já cadastrado

{
  "message": "E-mail já cadastrado.",
  "error": "Bad Request",
  "statusCode": 400
}

-------------------------------------------------------------------------------------------------------------------

## POST /auth/login

{
  "email": "dev@teste.com",
  "password": "123456"
}

Regras:
- Email deve ser único
- Senha com no mínimo 6 caracteres

Respostas:

 - 200: Login realizado

{
  "user": {
    "id": "63378b4d-c9a8-4de3-a27f-ea812ccca93b",
    "name": "Dev",
    "email": "dev@teste.com"
  },
  "accessToken": "jwt_token_aqui"
}


 - 401: Credenciais inválidas

{
  "message": "Credenciais inválidas.",
  "error": "Unauthorized",
  "statusCode": 401
}

Validade do Token:
 - Token válido por 24 horas;
 - Após expiração, é necessário realizar login novamente


-------------------------------------------------------------------------------------------------------------------


## POST /meals
Cria uma refeição com itens e (opcionalmente) imagem.

### Content-Type
multipart/form-data

### Campos (FormData)
- image: arquivo (opcional) (image/*)
- data: string JSON (obrigatório)

### Exemplo data (JSON)
{
  "type": "snack",
  "takenAt": "2025-12-18T14:06:30.849Z",
  "items": [
    { "name":"Fruta", "grams":100, "caloriesPer100g":67, "confidence":0.98, "source":"vision" }
  ]
}

### Respostas
- 201: Meal criada (com items, totalCalories, imagePath)
- 400: validação falhou
- 401: não autenticado

-------------------------------------------------------------------------------------------------------------------

## GET /meals?date=YYYY-MM-DD
Lista refeições do usuário no dia.

### Params
- date (obrigatório): YYYY-MM-DD

### Respostas
- 200: Array<Meal>
- 400/401

-------------------------------------------------------------------------------------------------------------------

## DELETE /meals/:id
Remove refeição do usuário autenticado.

- 200: { ok: true }
- 403: não pertence ao usuário
- 404: não encontrada

-------------------------------------------------------------------------------------------------------------------

## POST /food/analyze
Recebe uma imagem e retorna itens detectados.

### multipart/form-data
- file: imagem

### Resposta 200
{
  "mensagem": "...",
  "itens": [
    { "nome":"Kiwi", "caloriasPorPorcao":51, "porcaoDescricao":"100g", "confianca":0.96 }
  ]
}

-------------------------------------------------------------------------------------------------------------------

```

## 3) Diagrama ER

```md

  USER {
    uuid id
    string name
    string email
    string passwordHash
    datetime createdAt
  }

  MEAL {
    uuid id
    uuid userId
    string type
    datetime takenAt
    string imagePath
    int totalCalories
    datetime createdAt
    datetime updatedAt
  }

  MEAL_ITEM {
    uuid id
    uuid mealId
    string name
    int grams
    int caloriesPer100g
    int calories
    float confidence
    string source
    datetime createdAt
    datetime updatedAt
  }