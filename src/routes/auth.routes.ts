import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../db";
import { signToken, tokenExpiresIn } from "../utils/jwt";
import { HttpError } from "../middlewares/error";

const router = Router();

const registerSchema = z.object({
  nome: z.string().min(2),
  email: z.string().email(),
  senha: z.string().min(6),
  consenteLgpd: z.boolean(),
  consenteFidelidade: z.boolean().optional(),
});

router.post("/register", async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);
    if (!data.consenteLgpd) throw new HttpError(400, "É necessário aceitar os termos de LGPD");
    const exists = await prisma.usuario.findUnique({ where: { email: data.email } });
    if (exists) throw new HttpError(409, "E-mail já cadastrado");
    const senhaHash = await bcrypt.hash(data.senha, 10);
    const u = await prisma.usuario.create({
      data: { nome: data.nome, email: data.email, senhaHash, role: "CLIENTE", consenteLgpd: true, consenteFidelidade: !!data.consenteFidelidade },
      select: { id: true, nome: true, email: true, role: true },
    });
    res.status(201).json(u);
  } catch (e) { next(e); }
});

const loginSchema = z.object({ email: z.string().email(), senha: z.string().min(1) });

router.post("/login", async (req, res, next) => {
  try {
    const { email, senha } = loginSchema.parse(req.body);
    const u = await prisma.usuario.findUnique({ where: { email } });
    if (!u) throw new HttpError(401, "Credenciais inválidas");
    const ok = await bcrypt.compare(senha, u.senhaHash);
    if (!ok) throw new HttpError(401, "Credenciais inválidas");
    const accessToken = signToken({ sub: u.id, email: u.email, role: u.role });
    res.json({ accessToken, tokenType: "Bearer", expiresIn: tokenExpiresIn, user: { id: u.id, nome: u.nome, role: u.role } });
  } catch (e) { next(e); }
});

router.post("/logout", (_req, res) => {
  // JWT stateless: logout é responsabilidade do cliente (descartar token)
  res.json({ message: "Logout efetuado (descartar token no cliente)" });
});

export default router;
