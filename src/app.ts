import "dotenv/config";
import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import { openapi } from "./swagger";
import { errorHandler } from "./middlewares/error";

import authRoutes from "./routes/auth.routes";
import usuariosRoutes from "./routes/usuarios.routes";
import unidadesRoutes from "./routes/unidades.routes";
import produtosRoutes from "./routes/produtos.routes";
import estoqueRoutes from "./routes/estoque.routes";
import pedidosRoutes from "./routes/pedidos.routes";
import pagamentosRoutes from "./routes/pagamentos.routes";
import fidelidadeRoutes from "./routes/fidelidade.routes";

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get("/", (_req, res) => res.json({ name: "Raízes do Nordeste API", docs: "/docs", health: "/health" }));
  app.get("/health", (_req, res) => res.json({ status: "ok", timestamp: new Date().toISOString() }));
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(openapi));

  app.use("/auth", authRoutes);
  app.use("/usuarios", usuariosRoutes);
  app.use("/unidades", unidadesRoutes);
  app.use("/produtos", produtosRoutes);
  app.use("/estoque", estoqueRoutes);
  app.use("/pedidos", pedidosRoutes);
  app.use("/pagamentos", pagamentosRoutes);
  app.use("/fidelidade", fidelidadeRoutes);

  app.use((_req, res) => res.status(404).json({ error: "Rota não encontrada" }));
  app.use(errorHandler);
  return app;
}
