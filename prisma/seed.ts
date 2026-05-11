import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seed iniciado...");

  // Limpar (ordem importa por FK)
  await prisma.pagamento.deleteMany();
  await prisma.itemPedido.deleteMany();
  await prisma.pedido.deleteMany();
  await prisma.movimentoEstoque.deleteMany();
  await prisma.estoque.deleteMany();
  await prisma.produto.deleteMany();
  await prisma.unidade.deleteMany();
  await prisma.promocao.deleteMany();
  await prisma.usuario.deleteMany();

  const senhaPadrao = await bcrypt.hash("Senha@123", 10);

  // Usuários (um de cada role)
  const [admin, gerente, atendente, cliente] = await Promise.all([
    prisma.usuario.create({ data: { nome: "Admin Geral", email: "admin@raizes.com", senhaHash: senhaPadrao, role: "ADMIN", consenteLgpd: true } }),
    prisma.usuario.create({ data: { nome: "Maria Gerente", email: "gerente@raizes.com", senhaHash: senhaPadrao, role: "GERENTE", consenteLgpd: true } }),
    prisma.usuario.create({ data: { nome: "João Atendente", email: "atendente@raizes.com", senhaHash: senhaPadrao, role: "ATENDENTE", consenteLgpd: true } }),
    prisma.usuario.create({ data: { nome: "Ana Cliente", email: "cliente@raizes.com", senhaHash: senhaPadrao, role: "CLIENTE", consenteLgpd: true, consenteFidelidade: true } }),
  ]);

  // Unidades
  const recife = await prisma.unidade.create({ data: { nome: "Raízes Recife Centro", cidade: "Recife", endereco: "Av. Conde da Boa Vista, 100" } });
  const fortaleza = await prisma.unidade.create({ data: { nome: "Raízes Fortaleza Beira-Mar", cidade: "Fortaleza", endereco: "Av. Beira Mar, 500" } });

  // Produtos
  const produtos = await Promise.all([
    prisma.produto.create({ data: { nome: "Tapioca de Carne de Sol", descricao: "Recheada com queijo coalho", preco: 22.90, categoria: "Tapiocas" } }),
    prisma.produto.create({ data: { nome: "Cuscuz Nordestino", descricao: "Com ovos e manteiga de garrafa", preco: 18.50, categoria: "Pratos" } }),
    prisma.produto.create({ data: { nome: "Acarajé", descricao: "Com vatapá e camarão", preco: 25.00, categoria: "Pratos" } }),
    prisma.produto.create({ data: { nome: "Suco de Cajá", descricao: "300ml natural", preco: 9.90, categoria: "Bebidas" } }),
  ]);

  // Estoque por unidade
  for (const u of [recife, fortaleza]) {
    for (const p of produtos) {
      await prisma.estoque.create({ data: { unidadeId: u.id, produtoId: p.id, quantidade: 50 } });
    }
  }

  // Promoção
  await prisma.promocao.create({ data: { nome: "Bem-vindo", descricao: "10% no primeiro pedido", percentual: 10 } });

  console.log("✅ Seed concluído.");
  console.log("Logins (senha: Senha@123):");
  console.log("  admin@raizes.com | gerente@raizes.com | atendente@raizes.com | cliente@raizes.com");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
