import "dotenv/config";
import { createApp } from "./app";

const port = Number(process.env.PORT || 3333);
const app = createApp();

app.listen(port, () => {
  console.log(`🚀 API rodando em http://localhost:${port}`);
  console.log(`📚 Swagger: http://localhost:${port}/docs`);
});
