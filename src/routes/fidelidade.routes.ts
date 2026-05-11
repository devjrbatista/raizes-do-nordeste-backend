import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { authRequired } from "../middlewares/auth";
import { HttpError } from "../middlewares/error";

const router = Router();

router.get("/saldo", authRequired, async (req, res) => {
  const u = await prisma.usuario.findUnique({
    where: { id: req.user!.sub },
    select: { pontosFidelidade: true, consenteFidelidade: true },
  });
  res.json(u);
});

const consentSchema = z.object({ consente: z.boolean() });
router.put("/consentimento", authRequired, async (req, res, next) => {
  try {
    const { consente } = consentSchema.parse(req.body);
    const u = await prisma.usuario.update({
      where: { id: req.user!.sub },
      data: { consenteFidelidade: consente },
      select: { pontosFidelidade: true, consenteFidelidade: true },
    });
    res.json(u);
  } catch (e) { next(e); }
});

export default router;
