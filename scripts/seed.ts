// Usage: npm run db:seed  (applies migrations, then loads demo data)
import { migrate } from "drizzle-orm/libsql/migrator";
import { db } from "../src/db";
import { seedDatabase } from "../src/server/seed";

async function main() {
  await migrate(db, { migrationsFolder: "drizzle" });
  const r = await seedDatabase();
  console.log(`Seeded ${r.students} students, ${r.payments} payments, ${r.reminders} reminder records`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
