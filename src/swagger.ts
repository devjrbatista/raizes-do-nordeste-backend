export const openapi = {
  openapi: "3.0.0",
  info: {
    title: "Raízes do Nordeste API",
    version: "1.0.0",
    description: "API REST da rede de lanchonetes Raízes do Nordeste. Projeto Multidisciplinar UNINTER - Trilha Back-End.",
  },
  servers: [{ url: "http://localhost:3333" }],
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    "/auth/register": {
      post: {
        tags: ["Auth"], summary: "Cadastro de cliente", security: [],
        requestBody: { required: true, content: { "application/json": { example: { nome: "Ana", email: "ana@x.com", senha: "Senha@123", consenteLgpd: true, consenteFidelidade: true } } } },
        responses: { "201": { description: "Criado" }, "400": { description: "Validação" }, "409": { description: "E-mail já existe" } },
      },
    },
    "/auth/login": {
      post: {
        tags: ["Auth"], summary: "Login (retorna JWT)", security: [],
        requestBody: { required: true, content: { "application/json": { example: { email: "cliente@raizes.com", senha: "Senha@123" } } } },
        responses: { "200": { description: "OK", content: { "application/json": { example: { accessToken: "jwt...", tokenType: "Bearer", expiresIn: 3600 } } } }, "401": { description: "Inválido" } },
      },
    },
    "/auth/logout": { post: { tags: ["Auth"], summary: "Logout (cliente descarta token)", responses: { "200": { description: "OK" } } } },
    "/usuarios/me": { get: { tags: ["Usuarios"], summary: "Dados do usuário logado", responses: { "200": { description: "OK" }, "401": { description: "Sem token" } } } },
    "/unidades": { get: { tags: ["Unidades"], summary: "Listar unidades", security: [], responses: { "200": { description: "OK" } } } },
    "/unidades/{id}/cardapio": {
      get: {
        tags: ["Unidades"], summary: "Cardápio da unidade (com estoque)", security: [],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { "200": { description: "OK" } },
      },
    },
    "/produtos": {
      get: { tags: ["Produtos"], summary: "Listar produtos", security: [], responses: { "200": { description: "OK" } } },
      post: { tags: ["Produtos"], summary: "Criar produto (ADMIN/GERENTE)", responses: { "201": { description: "Criado" }, "403": { description: "Sem permissão" } } },
    },
    "/estoque/movimento": {
      post: {
        tags: ["Estoque"], summary: "Entrada/Saída de estoque (ADMIN/GERENTE)",
        requestBody: { content: { "application/json": { example: { unidadeId: 1, produtoId: 1, tipo: "ENTRADA", quantidade: 10, motivo: "Reposição" } } } },
        responses: { "201": { description: "OK" }, "400": { description: "Estoque insuficiente" } },
      },
    },
    "/pedidos": {
      get: {
        tags: ["Pedidos"], summary: "Listar/filtrar pedidos",
        parameters: [
          { name: "canalPedido", in: "query", schema: { type: "string", enum: ["APP","TOTEM","BALCAO","PICKUP","WEB"] } },
          { name: "status", in: "query", schema: { type: "string" } },
          { name: "unidadeId", in: "query", schema: { type: "integer" } },
        ],
        responses: { "200": { description: "OK" } },
      },
      post: {
        tags: ["Pedidos"], summary: "Criar pedido",
        requestBody: { required: true, content: { "application/json": { example: { canalPedido: "TOTEM", unidadeId: 1, itens: [{ produtoId: 1, quantidade: 2 }], pontosUsados: 0 } } } },
        responses: { "201": { description: "Criado" }, "400": { description: "Estoque insuficiente / validação" }, "401": { description: "Sem token" } },
      },
    },
    "/pedidos/{id}/status": {
      patch: {
        tags: ["Pedidos"], summary: "Atualizar status (ATENDENTE/GERENTE/ADMIN)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: { content: { "application/json": { example: { status: "EM_PREPARO" } } } },
        responses: { "200": { description: "OK" }, "400": { description: "Transição inválida" }, "403": { description: "Sem permissão" } },
      },
    },
    "/pagamentos": {
      post: {
        tags: ["Pagamentos"], summary: "Solicitar pagamento (mock de gateway externo)",
        requestBody: { content: { "application/json": { example: { pedidoId: 1, metodo: "PIX" } } } },
        responses: { "201": { description: "Processado", content: { "application/json": { example: { pagamento: { id: 1, status: "APROVADO", transactionId: "MOCK-..." }, gateway: { status: "APROVADO" } } } } } },
      },
    },
    "/fidelidade/saldo": { get: { tags: ["Fidelidade"], summary: "Consultar saldo de pontos", responses: { "200": { description: "OK" } } } },
    "/fidelidade/consentimento": {
      put: {
        tags: ["Fidelidade"], summary: "Atualizar consentimento de fidelidade (LGPD)",
        requestBody: { content: { "application/json": { example: { consente: true } } } },
        responses: { "200": { description: "OK" } },
      },
    },
  },
};
