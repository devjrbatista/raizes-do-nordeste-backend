import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { authRequired, requireRole } from "../middlewares/auth";

const router = Router();

router.get("/", async (_req, res) => {
  const unidades = await prisma.unidade.findMany({ where: { ativo: true } });
  res.json(unidades);
});

router.get("/:id", async (req, res) => {
  const u = await prisma.unidade.findUnique({ where: { id: Number(req.params.id) } });
  if (!u) return res.status(404).json({ error: "Unidade não encontrada" });
  res.json(u);
});

router.get("/:id/cardapio", async (req, res) => {
  const id = Number(req.params.id);
  const cardapio = await prisma.estoque.findMany({
    where: { unidadeId: id, quantidade: { gt: 0 }, produto: { ativo: true } },
    include: { produto: true },
  });
  res.json(cardapio.map(e => ({
    produtoId: e.produtoId,
    nome: e.produto.nome,
    descricao: e.produto.descricao,
    preco: e.produto.preco,
    categoria: e.produto.categoria,
    disponivel: e.quantidade,
  })));
});

const createSchema = z.object({ nome: z.string(), cidade: z.string(), endereco: z.string() });
router.post("/", authRequired, requireRole("ADMIN"), async (req, res, next) => {
  try {
    const data = createSchema.parse(req.body);
    const u = await prisma.unidade.create({ data });
    res.status(201).json(u);
  } catch (e) { next(e); }
});

export default router;
