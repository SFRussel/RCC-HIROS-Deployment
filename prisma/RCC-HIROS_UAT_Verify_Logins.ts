import { db } from "../src/lib/db";
import { compare } from "bcryptjs";

async function main() {
  const targets = [
    "admin@rcc.edu.ph", "neil.datu@rcc.edu.ph", "jumar.basco@rcc.edu.ph",
    "juan.delacruz@rcc.edu.ph", "liza.bautista@rcc.edu.ph",
    "hr.head@rcc.edu.ph", "hr.staff@rcc.edu.ph",
    "carlos.mendoza@rcc.edu.ph", "pedro.sarmiento@rcc.edu.ph",
  ];
  const rows = await db.employee.findMany({
    where: { email: { in: targets } },
    select: { email: true, passwordHash: true, active: true },
  });
  for (const r of rows) {
    if (!r.passwordHash) {
      console.log("FAIL", r.email, "active=" + r.active, "(no password hash set)");
      continue;
    }
    const ok = await compare("RCC2026!", r.passwordHash);
    console.log(ok ? "PASS" : "FAIL", r.email, "active=" + r.active);
  }
  await db.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
