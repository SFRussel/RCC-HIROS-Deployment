// ═══════════════════════════════════════════════════════════════
// RCC-HIROS — Minimal Admin Bootstrap
//
// For a FRESH database on a migrated machine: creates ONLY the
// System Admin role (ALL_PERMISSIONS) and the single admin user
// (EMP-0000, admin@rcc.edu.ph). No demo data, no other employees.
//
// Run via the migrate image:
//   docker compose --env-file .env.production --profile tools \
//     run --rm migrate npx tsx prisma/bootstrap-admin.ts
//
// Matches prisma/seed.ts exactly for these rows (upsert-safe:
// re-running is a harmless no-op).
// ═══════════════════════════════════════════════════════════════

import { db as prisma } from "../src/lib/db";
import { hash } from "bcryptjs";
import { ALL_PERMISSIONS } from "./permission-sets";

const ADMIN_PASSWORD = "RCC2026!"; // change later in-app
const HIRE_DATE = "2026-01-01"; // same as full seed

async function main() {
  console.log("🌱 Bootstrapping System Admin (admin-only, no demo data)...");

  // ── 1. System Admin role — identical flags to seed.ts ──
  console.log("• Creating System Admin role...");
  const role = await prisma.role.upsert({
    where: { name: "System Admin" },
    update: {
      description: "Full system access — bypasses all permission checks",
      scopeAllProfiling: true,
      scopeAllEvaluation: true,
      scopeAllLeave: true,
      scopeAllReports: true,
      scopeAllAttendance: true,
      scopeGroupAttendance: false,
      canSelfApproveLeave: false,
      canChangePassword: true,
      canManageBiometrics: true,
      isSystem: true,
      active: true,
    },
    create: {
      name: "System Admin",
      description: "Full system access — bypasses all permission checks",
      scopeAllProfiling: true,
      scopeAllEvaluation: true,
      scopeAllLeave: true,
      scopeAllReports: true,
      scopeAllAttendance: true,
      scopeGroupAttendance: false,
      canSelfApproveLeave: false,
      canChangePassword: true,
      canManageBiometrics: true,
      isSystem: true,
      active: true,
    },
  });

  // Wipe & rebuild permissions (same pattern as seed.ts + sync-permissions)
  await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
  await prisma.rolePermission.createMany({
    data: ALL_PERMISSIONS.map((identifier) => ({
      roleId: role.id,
      identifier,
      granted: true,
    })),
  });
  console.log(`  ✓ Role ready with ${ALL_PERMISSIONS.length} permissions`);

  // ── 2. Admin employee — fields mirror seed.ts EMP-0000 ──
  console.log("• Creating admin user...");
  const passwordHash = await hash(ADMIN_PASSWORD, 10);
  await prisma.employee.upsert({
    where: { employeeId: "EMP-0000" },
    update: {
      firstName: "System",
      lastName: "Administrator",
      middleName: null,
      email: "admin@rcc.edu.ph",
      phone: "+63 917 000 0000",
      gender: "Male",
      roleId: role.id,
      groupId: null,
      contractType: "Regular",
      active: true,
      passwordHash,
      mustChangePwd: false,
    },
    create: {
      employeeId: "EMP-0000",
      firstName: "System",
      lastName: "Administrator",
      middleName: null,
      email: "admin@rcc.edu.ph",
      phone: "+63 917 000 0000",
      gender: "Male",
      roleId: role.id,
      groupId: null,
      contractType: "Regular",
      active: true,
      passwordHash,
      mustChangePwd: false,
      hireDate: new Date(`${HIRE_DATE}T00:00:00.000Z`),
    },
  });
  console.log("  ✓ admin@rcc.edu.ph / EMP-0000 ready");

  // ── 3. Verify — this MUST print exactly 1 employee ──
  const [roleCount, employeeCount] = await Promise.all([
    prisma.role.count(),
    prisma.employee.count(),
  ]);
  console.log(`📋 Roles: ${roleCount}, Employees: ${employeeCount}`);
  if (employeeCount !== 1) {
    throw new Error(
      `Expected exactly 1 employee after bootstrap, found ${employeeCount}. ` +
        "This database is not fresh — aborting to avoid touching existing data."
    );
  }

  console.log("✅ Bootstrap complete. Login: admin@rcc.edu.ph / RCC2026!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error("❌ Bootstrap failed:", err);
    await prisma.$disconnect();
    process.exit(1);
  });
