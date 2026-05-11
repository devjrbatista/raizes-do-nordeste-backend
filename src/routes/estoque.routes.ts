import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { authRequired, requireRole } from "../middlewares/auth";
import { HttpError } from "../middlewares/error";

const router = Router();

router.get("/unidade/:unidadeId", authRequired, requireRole("ADMIN", "GERENTE", "ATENDENTE"), async (req, res) => {
  const data = await prisma.estoque.findMany({
    where: { unidadeId: Number(req.params.unidadeId) },
    include: { produto: true },
  });
  res.json(data);
});

const movSchema = z.object({
  unidadeId: z.number().int(),
  produtoId: z.number().int(),
  tipo: z.enum(["ENTRADA", "SAIDA"]),
  quantidade: z.number().int().positive(),
  motivo: z.string().optional(),
});

router.post("/movimento", authRequired, requireRole("ADMIN", "GERENTE"), async (req, res, next) => {
  try {
    const m = movSchema.parse(req.body);
    const estoque = await prisma.estoque.upsert({
      where: { unidadeId_produtoId: { unidadeId: m.unidadeId, produtoId: m.produtoId } },
      update: {},
      create: { unidadeId: m.unidadeId, produtoId: m.produtoId, quantidade: 0 },
    });
    const novaQtd = m.tipo === "ENTRADA" ? estoque.quantidade + m.quantidade : estoque.quantidade - m.quantidade;
    if (novaQtd < 0) throw new HttpError(400, "Estoque insuficiente para SAIDA");
    await prisma.estoque.update({ where: { id: estoque.id }, data: { quantidade: novaQtd } });
    await prisma.movimentoEstoque.create({ data: { estoqueId: estoque.id, tipo: m.tipo, quantidade: m.quantidade, motivo: m.motivo } });
    res.status(201).json({ message: "Movimento registrado", saldo: novaQtd });
  } catch (e) { next(e); }
});

export default router;
