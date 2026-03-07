/**
 * FLOW U-USER-ID: Миграция существующих пользователей с UUID на 8-значный id
 * Запуск: npx tsx prisma/scripts/backfill-user-ids.ts
 *
 * Для каждой записи users с id в формате UUID (содержит '-'):
 * 1. Генерирует уникальный 8-значный id
 * 2. Обновляет sessions, accounts, trades, transactions
 * 3. Обновляет users.id
 */

import { PrismaClient } from '@prisma/client';
import { generateUserId } from '../src/utils/userId.js';

const prisma = new PrismaClient();

function isUuid(id: string): boolean {
  return id.includes('-') && id.length > 10;
}

async function main() {
  const users = await prisma.user.findMany();
  const toMigrate = users.filter((u) => isUuid(u.id));

  if (toMigrate.length === 0) {
    console.log('No users with UUID format found. Nothing to migrate.');
    return;
  }

  console.log(`Found ${toMigrate.length} users to migrate from UUID to 8-digit id.`);

  const usedIds = new Set(users.filter((u) => !isUuid(u.id)).map((u) => u.id));

  for (const user of toMigrate) {
    let newId: string = generateUserId();
    while (usedIds.has(newId)) {
      newId = generateUserId();
    }
    usedIds.add(newId);

    await prisma.$transaction(async (tx) => {
      // 1. Create new user row with new id
      await tx.user.create({
        data: {
          id: newId,
          email: user.email,
          password: user.password,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          firstName: user.firstName,
          lastName: user.lastName,
          nickname: user.nickname,
          phone: user.phone,
          country: user.country,
          dateOfBirth: user.dateOfBirth,
          avatarUrl: user.avatarUrl,
          twoFactorSecret: user.twoFactorSecret,
          twoFactorEnabled: user.twoFactorEnabled,
          twoFactorBackupCodes: user.twoFactorBackupCodes,
        },
      });
      // 2. Update FKs to point to new user
      await tx.session.updateMany({ where: { userId: user.id }, data: { userId: newId } });
      await tx.account.updateMany({ where: { userId: user.id }, data: { userId: newId } });
      await tx.trade.updateMany({ where: { userId: user.id }, data: { userId: newId } });
      await tx.transaction.updateMany({ where: { userId: user.id }, data: { userId: newId } });
      // 3. Delete old user row
      await tx.user.delete({ where: { id: user.id } });
    });

    console.log(`Migrated ${user.email}: ${user.id} -> ${newId}`);
  }

  console.log('Done.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
