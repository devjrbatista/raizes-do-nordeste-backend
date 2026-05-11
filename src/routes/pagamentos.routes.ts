import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { authRequired } from "../middlewares/auth";
import { HttpError } from "../middlewares/error";

const router = Router();

const schema = z.object({
  pedidoId: z.number().int(),
  metodo: z.enum(["PIX", "CARTAO", "DINHEIRO"]),
});

// Mock de gateway externo de pagamento
async function gatewayMock(valor: number, metodo: string) {
  // Simula latência e resposta determinística
  await new Promise(r => setTimeout(r, 200));
  // Recusa apenas se valor for 0 (ou cartão com valor < 1, regra arbitrária para teste)
  const aprovado = valor > 0;
  return {
    transactionId: `MOCK-${Date.now()}-${Math.floor(Math.random() * 9999)}`,
    status: aprovado ? "APROVADO" : "RECUSADO",
    metodo,
    valor,
    timestamp: new Date().toISOString(),
  };
}

router.post("/", authRequired, async (req, res, next) => {
  try {
    const { pedidoId, metodo } = schema.parse(req.body);
    const pedido = await prisma.pedido.findUnique({ where: { id: pedidoId }, include: { pagamento: true } });
    if (!pedido) throw new HttpError(404, "Pedido não encontrado");
    if (req.user!.role === "CLIENTE" && pedido.clienteId !== req.user!.sub) throw new HttpError(403, "Acesso negado");
    if (pedido.pagamento && pedido.pagamento.status === "APROVADO") throw new HttpError(409, "Pedido já pago");

    const gw = await gatewayMock(pedido.total, metodo);

    const pagamento = await prisma.pagamento.upsert({
      where: { pedidoId },
      create: {
        pedidoId,
        metodo,
        status: gw.status,
        valor: pedido.total,
        transactionId: gw.transactionId,
        payloadGateway: JSON.stringify(gw),
      },
      update: {
        metodo, status: gw.status, valor: pedido.total,
        transactionId: gw.transactionId, payloadGateway: JSON.stringify(gw),
      },
    });

    res.status(201).json({ pagamento, gateway: gw });
  } catch (e) { next(e); }
});

router.get("/pedido/:pedidoId", authRequired, async (req, res, next) => {
  try {
    const p = await prisma.pagamento.findUnique({ where: { pedidoId: Number(req.params.pedidoId) } });
    if (!p) throw new HttpError(404, "Pagamento não encontrado");
    res.json(p);
  } catch (e) { next(e); }
});

export default router;
