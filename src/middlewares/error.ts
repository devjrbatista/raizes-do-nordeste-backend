import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: "Validação falhou", detalhes: err.errors });
  }
  if (err?.status && err?.message) {
    return res.status(err.status).json({ error: err.message });
  }
  console.error(err);
  return res.status(500).json({ error: "Erro interno do servidor" });
}

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
