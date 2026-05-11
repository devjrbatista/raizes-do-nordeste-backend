import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { authRequired, requireRole } from "../middlewares/auth";

const router = Router();

router.get("/", async (_req, res) => {
  res.json(await prisma.produto.findMany({ where: { ativo: true } }));
});

router.get("/:id", async (req, res) => {
  const p = await prisma.produto.findUnique({ where: { id: Number(req.params.id) } });
  if (!p) return res.status(404).json({ error: "Produto não encontrado" });
  res.json(p);
});

const schema = z.object({
  nome: z.string(),
  descricao: z.string().optional(),
  preco: z.number().positive(),
  categoria: z.string(),
});

router.post("/", authRequired, requireRole("ADMIN", "GERENTE"), async (req, res, next) => {
  try {
    const data = schema.parse(req.body);
    res.status(201).json(await prisma.produto.create({ data }));
  } catch (e) { next(e); }
});

router.put("/:id", authRequired, requireRole("ADMIN", "GERENTE"), async (req, res, next) => {
  try {
    const data = schema.partial().parse(req.body);
    res.json(await prisma.produto.update({ where: { id: Number(req.params.id) }, data }));
  } catch (e) { next(e); }
});

router.delete("/:id", authRequired, requireRole("ADMIN"), async (req, res, next) => {
  try {
    await prisma.produto.update({ where: { id: Number(req.params.id) }, data: { ativo: false } });
    res.status(204).send();
  } catch (e) { next(e); }
});

export default router;
