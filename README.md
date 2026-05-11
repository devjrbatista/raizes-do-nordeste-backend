# Raízes do Nordeste - API Back-End

Este projeto foi desenvolvido como parte do Projeto Multidisciplinar da UNINTER, com foco na trilha Back-End. A aplicação simula a API de uma rede de lanchonetes multicanal chamada “Raízes do Nordeste”, permitindo autenticação de usuários, gerenciamento de pedidos, controle de estoque, fidelidade e pagamentos mock.

## 🛠 Stack

- **Node.js + Express + TypeScript** — servidor HTTP
- **Prisma ORM + SQLite** — persistência (sem instalação extra)
- **JWT + bcrypt** — autenticação stateless e hash de senha
- **Zod** — validação de entrada
- **Swagger/OpenAPI** — documentação interativa em `/docs`
- **Vitest + Supertest** — testes automatizados

## 🚀 Como rodar (passo-a-passo)

```bash
cd backend
copy .env.example .env
npm install
npm run setup       # cria o banco, aplica migrations e roda o seed
npm run dev         # inicia em http://localhost:3333
```

Acesse o Swagger em **http://localhost:3333/docs**.

### Rodar os testes
```bash
npm test
```

## 👥 Usuários de teste (senha: `Senha@123`)

| Email                  | Role      |
|------------------------|-----------|
| admin@raizes.com       | ADMIN     |
| gerente@raizes.com     | GERENTE   |
| atendente@raizes.com   | ATENDENTE |
| cliente@raizes.com     | CLIENTE   |

## 📐 Arquitetura (camadas)

```
backend/
├── prisma/
│   ├── schema.prisma     # DER: Usuario, Unidade, Produto, Estoque, Pedido, ItemPedido, Pagamento, Promocao
│   └── seed.ts           # Dados iniciais
├── src/
│   ├── server.ts         # Bootstrap HTTP
│   ├── app.ts            # Express app (rotas + middlewares)
│   ├── swagger.ts        # OpenAPI spec
│   ├── db.ts             # Prisma client singleton
│   ├── middlewares/
│   │   ├── auth.ts       # JWT + RBAC (requireRole)
│   │   └── error.ts      # Tratamento global de erros
│   ├── utils/jwt.ts      # Sign/verify JWT
│   └── routes/
│       ├── auth.routes.ts
│       ├── usuarios.routes.ts
│       ├── unidades.routes.ts
│       ├── produtos.routes.ts
│       ├── estoque.routes.ts
│       ├── pedidos.routes.ts        # Fluxo crítico (transação atômica)
│       ├── pagamentos.routes.ts     # Mock do gateway externo
│       └── fidelidade.routes.ts
├── tests/api.test.ts                # Testes (positivos e negativos)
└── postman_collection.json
```

## 🔐 Segurança e LGPD

- Senhas armazenadas com **bcrypt** (hash + salt). Nunca em texto plano.
- **JWT Bearer** em rotas protegidas (`Authorization: Bearer <token>`).
- **RBAC**: middleware `requireRole(...)` controla acesso por perfil.
  - `ADMIN`: tudo. `GERENTE`: produtos/estoque/status. `ATENDENTE`: status de pedidos. `CLIENTE`: próprios pedidos.
- **Consentimento LGPD** explícito no cadastro (`consenteLgpd`) e específico para fidelização (`consenteFidelidade`).
- Respostas **nunca** retornam `senhaHash` (uso de `select` no Prisma).
- Cliente só acessa **seus próprios** pedidos (filtro de tenancy no controller).

## 📡 Endpoints principais

| Método | Rota                              | Auth         | Descrição |
|--------|-----------------------------------|--------------|-----------|
| POST   | /auth/register                    | público      | Cadastro de cliente (exige consenteLgpd) |
| POST   | /auth/login                       | público      | Login → JWT |
| GET    | /usuarios/me                      | autenticado  | Meu perfil |
| GET    | /unidades                         | público      | Lista de unidades ativas |
| GET    | /unidades/:id/cardapio            | público      | Cardápio com estoque |
| GET    | /produtos                         | público      | Catálogo |
| POST   | /produtos                         | ADMIN/GER.   | Criar produto |
| POST   | /estoque/movimento                | ADMIN/GER.   | Entrada/Saída |
| GET    | /estoque/unidade/:id              | staff        | Estoque por unidade |
| POST   | /pedidos                          | autenticado  | Criar pedido (canalPedido obrigatório) |
| GET    | /pedidos?canalPedido=TOTEM        | autenticado  | Filtro por canal/status/unidade |
| PATCH  | /pedidos/:id/status               | staff        | Atualizar status (com transição válida) |
| POST   | /pagamentos                       | autenticado  | Solicita pagamento mock |
| GET    | /fidelidade/saldo                 | autenticado  | Saldo de pontos |

## 🛒 Fluxo crítico: criação de pedido

1. Valida payload (Zod) — exige `canalPedido` ENUM.
2. Em **transação atômica** (`prisma.$transaction`):
   - Verifica estoque por unidade para cada item; falha → 400.
   - Calcula `total` somando `precoUnitario × quantidade`.
   - Aplica `pontosUsados` (1 ponto = R$ 0,10) se cliente consentiu fidelidade.
   - Cria `Pedido` + `ItemPedido[]` com status `RECEBIDO`.
   - **Decrementa estoque** e registra `MovimentoEstoque` tipo SAIDA.
   - Credita pontos ganhos (1 a cada R$ 10) se houver consentimento.
3. Retorna 201 com pedido completo.

### Transição de status permitida
```
RECEBIDO → EM_PREPARO → PRONTO → ENTREGUE
   ↓           ↓           ↓
              CANCELADO (até PRONTO)
```

## 💳 Pagamento (mock)

`POST /pagamentos` chama um **gateway simulado** (`gatewayMock`) que retorna
`{ transactionId, status, metodo, valor, timestamp }`. O payload completo é
armazenado em `Pagamento.payloadGateway` (rastreabilidade). Não há integração real.

## 📋 Plano de testes (`tests/api.test.ts`)

Cobre os cenários **obrigatórios** do roteiro:

| # | Cenário | Esperado |
|---|---------|----------|
| 1 | Login válido | 200 + token |
| 2 | Login inválido | 401 |
| 3 | Acesso sem token | 401 |
| 4 | CLIENTE tentando atualizar status | 403 |
| 5 | GERENTE acessa estoque | 200 |
| 6 | Criar pedido com canalPedido | 201 |
| 7 | Criar pedido sem canalPedido | 400 |
| 8 | Filtrar pedidos por canal | 200 |
| 9 | Pagamento mock | 201 + APROVADO |

A **collection do Postman** (`postman_collection.json`) replica os mesmos cenários para validação manual.

## 🎯 Multicanalidade

O campo `canalPedido` é **obrigatório** na criação e aceita: `APP | TOTEM | BALCAO | PICKUP | WEB`.
A query `GET /pedidos?canalPedido=TOTEM` permite consolidação por canal.

## 📝 Decisões técnicas

- **SQLite** escolhido para *zero-config* (arquivo `dev.db`) — fácil reprodutibilidade pelo corretor. Para produção: trocar `provider = "postgresql"` no `schema.prisma`.
- **Enums como String** (limitação SQLite); validação garantida por Zod.
- **JWT stateless**: logout é responsabilidade do cliente (descartar token). Para revogação real, adicionar blacklist em Redis.

## ⚠️ Dificuldades encontradas

Durante o desenvolvimento foram enfrentados desafios relacionados à autenticação JWT, integração entre rotas protegidas e validação de permissões por perfil (RBAC). Também houve ajustes na configuração do Swagger para envio correto do token Bearer nas rotas autenticadas.

## 📚 Conclusão

O projeto permitiu aplicar conceitos importantes do desenvolvimento back-end moderno, incluindo autenticação JWT, documentação com Swagger, modelagem de banco de dados com Prisma ORM e criação de APIs RESTful organizadas em camadas.