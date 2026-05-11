import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";

const app = createApp();

describe("Auth & Authorization", () => {
  let tokenCliente = "";
  let tokenGerente = "";

  beforeAll(async () => {
    const r1 = await request(app).post("/auth/login").send({ email: "cliente@raizes.com", senha: "Senha@123" });
    tokenCliente = r1.body.accessToken;
    const r2 = await request(app).post("/auth/login").send({ email: "gerente@raizes.com", senha: "Senha@123" });
    tokenGerente = r2.body.accessToken;
  });

  it("login válido retorna token", () => {
    expect(tokenCliente).toBeTruthy();
  });

  it("login inválido retorna 401", async () => {
    const r = await request(app).post("/auth/login").send({ email: "cliente@raizes.com", senha: "errada" });
    expect(r.status).toBe(401);
  });

  it("acesso sem token retorna 401", async () => {
    const r = await request(app).get("/usuarios/me");
    expect(r.status).toBe(401);
  });

  it("CLIENTE não pode atualizar status do pedido (403)", async () => {
    const r = await request(app).patch("/pedidos/1/status")
      .set("Authorization", `Bearer ${tokenCliente}`)
      .send({ status: "EM_PREPARO" });
    expect([403, 404]).toContain(r.status);
  });

  it("GERENTE pode acessar estoque", async () => {
    const r = await request(app).get("/estoque/unidade/1").set("Authorization", `Bearer ${tokenGerente}`);
    expect(r.status).toBe(200);
  });
});

describe("Pedidos - fluxo crítico", () => {
  let token = "";
  let pedidoId = 0;

  beforeAll(async () => {
    const r = await request(app).post("/auth/login").send({ email: "cliente@raizes.com", senha: "Senha@123" });
    token = r.body.accessToken;
  });

  it("cria pedido com canalPedido obrigatório", async () => {
    const r = await request(app).post("/pedidos")
      .set("Authorization", `Bearer ${token}`)
      .send({ canalPedido: "TOTEM", unidadeId: 1, itens: [{ produtoId: 1, quantidade: 1 }] });
    expect(r.status).toBe(201);
    expect(r.body.canalPedido).toBe("TOTEM");
    pedidoId = r.body.id;
  });

  it("rejeita pedido sem canalPedido (400)", async () => {
    const r = await request(app).post("/pedidos")
      .set("Authorization", `Bearer ${token}`)
      .send({ unidadeId: 1, itens: [{ produtoId: 1, quantidade: 1 }] });
    expect(r.status).toBe(400);
  });

  it("filtra pedidos por canalPedido", async () => {
    const r = await request(app).get("/pedidos?canalPedido=TOTEM").set("Authorization", `Bearer ${token}`);
    expect(r.status).toBe(200);
    expect(Array.isArray(r.body)).toBe(true);
  });

  it("processa pagamento mock", async () => {
    const r = await request(app).post("/pagamentos")
      .set("Authorization", `Bearer ${token}`)
      .send({ pedidoId, metodo: "PIX" });
    expect(r.status).toBe(201);
    expect(r.body.pagamento.status).toBe("APROVADO");
  });
});
