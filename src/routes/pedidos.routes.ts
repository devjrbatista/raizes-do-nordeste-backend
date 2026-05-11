import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { authRequired, requireRole } from "../middlewares/auth";
import { HttpError } from "../middlewares/error";

const router = Router();

const CANAIS = ["APP", "TOTEM", "BALCAO", "PICKUP", "WEB"] as const;
const STATUS_VALIDOS = ["RECEBIDO", "EM_PREPARO", "PRONTO", "ENTREGUE", "CANCELADO"] as const;

const createSchema = z.object({
  canalPedido: z.enum(CANAIS),
  unidadeId: z.number().int(),
  itens: z.array(z.object({
    produtoId: z.number().int(),
    quantidade: z.number().int().positive(),
  })).min(1),
  pontosUsados: z.number().int().nonnegative().optional(),
});

// Criar pedido (cliente autenticado) - dá baixa em estoque, calcula total, gera pontos
router.post("/", authRequired, async (req, res, next) => {
  try {
    const data = createSchema.parse(req.body);
    const clienteId = req.user!.sub;

    const result = await prisma.$transaction(async (tx) => {
      let total = 0;
      const itensProcessados: { produtoId: number; quantidade: number; precoUnitario: number; estoqueId: number }[] = [];

      for (const it of data.itens) {
        const estoque = await tx.estoque.findUnique({
          where: { unidadeId_produtoId: { unidadeId: data.unidadeId, produtoId: it.produtoId } },
          include: { produto: true },
        });
        if (!estoque) throw new HttpError(400, `Produto ${it.produtoId} indisponível nesta unidade`);
        if (estoque.quantidade < it.quantidade) throw new HttpError(400, `Estoque insuficiente para ${estoque.produto.nome}`);
        total += estoque.produto.preco * it.quantidade;
        itensProcessados.push({ produtoId: it.produtoId, quantidade: it.quantidade, precoUnitario: estoque.produto.preco, estoqueId: estoque.id });
      }

      // Resgate de pontos: 1 ponto = R$0,10
      const pontosUsados = data.pontosUsados ?? 0;
      if (pontosUsados > 0) {
        const cliente = await tx.usuario.findUnique({ where: { id: clienteId } });
        if (!cliente || cliente.pontosFidelidade < pontosUsados) throw new HttpError(400, "Pontos insuficientes");
        if (!cliente.consenteFidelidade) throw new HttpError(400, "Cliente sem consentimento de fidelidade");
        const desconto = pontosUsados * 0.10;
        total = Math.max(0, total - desconto);
        await tx.usuario.update({ where: { id: clienteId }, data: { pontosFidelidade: { decrement: pontosUsados } } });
      }

      // Pontos ganhos: 1 ponto a cada R$10
      const pontosGanhos = Math.floor(total / 10);

      const pedido = await tx.pedido.create({
        data: {
          clienteId,
          unidadeId: data.unidadeId,
          canalPedido: data.canalPedido,
          status: "RECEBIDO",
          total,
          pontosGanhos,
          pontosUsados,
          itens: { create: itensProcessados.map(i => ({ produtoId: i.produtoId, quantidade: i.quantidade, precoUnitario: i.precoUnitario })) },
        },
        include: { itens: true },
      });

      // Baixa de estoque + movimento
      for (const i of itensProcessados) {
        await tx.estoque.update({ where: { id: i.estoqueId }, data: { quantidade: { decrement: i.quantidade } } });
        await tx.movimentoEstoque.create({ data: { estoqueId: i.estoqueId, tipo: "SAIDA", quantidade: i.quantidade, motivo: `Pedido #${pedido.id}` } });
      }

      // Crédito de pontos (com consentimento)
      const cliente = await tx.usuario.findUnique({ where: { id: clienteId } });
      if (cliente?.consenteFidelidade && pontosGanhos > 0) {
        await tx.usuario.update({ where: { id: clienteId }, data: { pontosFidelidade: { increment: pontosGanhos } } });
      }

      return pedido;
    });

    res.status(201).json(result);
  } catch (e) { next(e); }
});

// Listar/filtrar pedidos
router.get("/", authRequired, async (req, res) => {
  const { canalPedido, status, unidadeId } = req.query;
  const where: any = {};
  if (canalPedido) where.canalPedido = String(canalPedido);
  if (status) where.status = String(status);
  if (unidadeId) where.unidadeId = Number(unidadeId);
  // CLIENTE vê apenas seus pedidos
  if (req.user!.role === "CLIENTE") where.clienteId = req.user!.sub;
  const pedidos = await prisma.pedido.findMany({ where, include: { itens: true, pagamento: true }, orderBy: { createdAt: "desc" } });
  res.json(pedidos);
});

router.get("/:id", authRequired, async (req, res, next) => {
  try {
    const pedido = await prisma.pedido.findUnique({ where: { id: Number(req.params.id) }, include: { itens: { include: { produto: true } }, pagamento: true, unidade: true } });
    if (!pedido) throw new HttpError(404, "Pedido não encontrado");
    if (req.user!.role === "CLIENTE" && pedido.clienteId !== req.user!.sub) throw new HttpError(403, "Acesso negado");
    res.json(pedido);
  } catch (e) { next(e); }
});

// Atualizar status (cozinha → pronto → entregue / cancelado)
const statusSchema = z.object({ status: z.enum(STATUS_VALIDOS) });
const TRANSICOES: Record<string, string[]> = {
  RECEBIDO: ["EM_PREPARO", "CANCELADO"],
  EM_PREPARO: ["PRONTO", "CANCELADO"],
  PRONTO: ["ENTREGUE", "CANCELADO"],
  ENTREGUE: [],
  CANCELADO: [],
};

router.patch("/:id/status", authRequired, requireRole("ADMIN", "GERENTE", "ATENDENTE"), async (req, res, next) => {
  try {
    const { status } = statusSchema.parse(req.body);
    const pedido = await prisma.pedido.findUnique({ where: { id: Number(req.params.id) } });
    if (!pedido) throw new HttpError(404, "Pedido não encontrado");
    if (!TRANSICOES[pedido.status].includes(status)) {
      throw new HttpError(400, `Transição inválida: ${pedido.status} → ${status}`);
    }
    const updated = await prisma.pedido.update({ where: { id: pedido.id }, data: { status } });
    res.json(updated);
  } catch (e) { next(e); }
});

export default router;
