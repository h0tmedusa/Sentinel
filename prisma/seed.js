import { prisma } from '../lib/prisma.js';
import { hashPassword } from '../lib/auth.js';

async function main() {
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'SentinelAdmin2026!';
  const analystPassword = process.env.SEED_ANALYST_PASSWORD || 'SentinelAnalyst2026!';

  const adminHash = await hashPassword(adminPassword);
  const analystHash = await hashPassword(analystPassword);

  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {
      role: 'ADMIN',
      passwordHash: adminHash,
    },
    create: {
      username: 'admin',
      role: 'ADMIN',
      passwordHash: adminHash,
    },
  });

  const analyst = await prisma.user.upsert({
    where: { username: 'analyst' },
    update: {
      role: 'ANALYST',
      passwordHash: analystHash,
    },
    create: {
      username: 'analyst',
      role: 'ANALYST',
      passwordHash: analystHash,
    },
  });

  console.log('Seeded users successfully:');
  console.log(`- ${admin.username} (${admin.role})`);
  console.log(`- ${analyst.username} (${analyst.role})`);
}

main()
  .catch((e) => {
    console.error('Error seeding users:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
