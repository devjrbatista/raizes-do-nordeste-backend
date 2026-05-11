import { Router } from "express";
import { prisma } from "../db";
import { authRequired } from "../middlewares/auth";

const router = Router();

router.get("/me", authRequired, async (req, res) => {
  const u = await prisma.usuario.findUnique({
    where: { id: req.user!.sub },
    select: { id: true, nome: true, email: true, role: true, pontosFidelidade: true, consenteFidelidade: true, createdAt: true },
  });
  res.json(u);
});

export default router;
