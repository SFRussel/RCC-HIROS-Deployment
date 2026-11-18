// ═══════════════════════════════════════════════════════════════
// RCC-HIROS — UAT fix-up (seed-uat-fix.ts)
// 1. Attendance for the 4 TESTERS (Neil, Jumar, Juan, Liza):
//    • close every still-open clock-in session (clockOutAt = 17:xx
//      of that day) for ALL their days — past and future
//    • DELETE today's record entirely: the clock-in API rejects a
//      new clock-in whenever today's row exists with clockInAt set
//      (even if clocked out), so testers must start the day clean
// 2. Seeded evaluations for the 2 EMPLOYEE testers so "view my
//    results read-only" (Employee guide Task 15 / TC-33) has data:
//    • juan.delacruz  evaluated by neil.datu  (CCS dean)
//    • liza.bautista  evaluated by jumar.basco (COEd dean)
//    Both "submitted", all criteria answered, weighted totalScore.
// Run (in the migrate container):  npx tsx prisma/seed-uat-fix.ts
// ═══════════════════════════════════════════════════════════════

import { db as prisma } from "../src/lib/db";
import type { EvaluationCriterion } from "../src/generated/prisma/client";

const TESTERS = [
  "neil.datu@rcc.edu.ph",
  "jumar.basco@rcc.edu.ph",
  "juan.delacruz@rcc.edu.ph",
  "liza.bautista@rcc.edu.ph",
];

let prandState = 1337;
function prand(): number {
  prandState = (prandState * 1103515245 + 12345) % 2147483648;
  return prandState / 2147483648;
}

async function fixAttendance(employeeIds: string[]) {
  // 1a. Close every open session (clockInAt set, clockOutAt null)
  const open = await prisma.attendance.findMany({
    where: { employeeId: { in: employeeIds }, clockInAt: { not: null }, clockOutAt: null },
    select: { id: true, date: true },
  });
  for (const rec of open) {
    const d = rec.date;
    const out = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 17, Math.floor(prand() * 30));
    await prisma.attendance.update({ where: { id: rec.id }, data: { clockOutAt: out } });
  }
  console.log(`• Attendance: closed ${open.length} open session(s) for the 4 testers`);

  // 1b. Delete TODAY's records so clock-in is possible during the test
  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const removed = await prisma.attendance.deleteMany({
    where: { employeeId: { in: employeeIds }, date: { gte: dayStart, lte: dayEnd } },
  });
  console.log(`• Attendance: removed ${removed.count} record(s) for today (${dayStart.toDateString()}) — testers can Clock In fresh`);

  // Sanity: confirm none of the 4 is "clocked in" anywhere anymore
  const stillOpen = await prisma.attendance.count({
    where: { employeeId: { in: employeeIds }, clockInAt: { not: null }, clockOutAt: null },
  });
  console.log(`• Attendance: open sessions remaining for testers = ${stillOpen} (expected 0)`);
}

async function createEvaluation(
  periodId: string,
  formId: string,
  criteria: EvaluationCriterion[],
  employeeId: string,
  evaluatorId: string,
  targetAvg: number,
  remarks: string
) {
  // Remove any previous evaluation of this employee in this period
  const existing = await prisma.evaluation.findMany({
    where: { periodId, employeeId },
    select: { id: true },
  });
  if (existing.length) {
    await prisma.evaluationResponse.deleteMany({ where: { evaluationId: { in: existing.map((e) => e.id) } } });
    await prisma.evaluation.deleteMany({ where: { id: { in: existing.map((e) => e.id) } } });
  }

  const count = criteria.length;
  const targetSum = Math.round(targetAvg * count);
  const scores: number[] = Array(count).fill(Math.floor(targetAvg));
  let currentSum = Math.floor(targetAvg) * count;
  let guard = 0;
  while (currentSum < targetSum && guard < 2000) {
    const idx = Math.floor(prand() * count);
    if (scores[idx] < 5) { scores[idx]++; currentSum++; }
    guard++;
  }
  guard = 0;
  while (currentSum > targetSum && guard < 2000) {
    const idx = Math.floor(prand() * count);
    if (scores[idx] > 1) { scores[idx]--; currentSum--; }
    guard++;
  }
  for (let i = scores.length - 1; i > 0; i--) {
    const j = Math.floor(prand() * (i + 1));
    [scores[i], scores[j]] = [scores[j], scores[i]];
  }

  const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);
  const weightedSum = criteria.reduce((sum, c, i) => sum + c.weight * scores[i], 0);
  const totalScore = Number((weightedSum / totalWeight).toFixed(2));

  const submittedAt = new Date();
  submittedAt.setDate(submittedAt.getDate() - 3);
  submittedAt.setHours(15, 0, 0, 0);

  const ev = await prisma.evaluation.create({
    data: {
      periodId,
      formId,
      evaluatorId,
      employeeId,
      status: "submitted",
      totalScore,
      remarks,
      submittedAt,
      responses: {
        create: criteria.map((c, i) => ({
          criterionId: c.id,
          score: scores[i],
          comments: i % 3 === 0 ? "Consistently performs well in this area." : null,
        })),
      },
    },
  });
  console.log(`✅ Evaluation created: employee=${employeeId} evaluator=${evaluatorId} score=${totalScore} responses=${count} status=submitted (id=${ev.id})`);
}

async function main() {
  // ── Resolve testers by email ────────────────────────────────
  const testers = await prisma.employee.findMany({
    where: { email: { in: TESTERS } },
    select: { id: true, firstName: true, lastName: true, email: true },
  });
  if (testers.length !== 4) {
    throw new Error(`Expected 4 testers, found ${testers.length} — run seed-uat.ts first`);
  }
  const ids = testers.map((t) => t.id);
  const byEmail = Object.fromEntries(testers.map((t) => [t.email!, t]));
  console.log(`Testers: ${testers.map((t) => `${t.firstName} ${t.lastName}`).join(", ")}\n`);

  // ── 1. Attendance fix ───────────────────────────────────────
  await fixAttendance(ids);
  console.log("");

  // ── 2. Evaluations for the employee testers ─────────────────
  const period = await prisma.evaluationPeriod.findFirst({ where: { name: "UAT Evaluation Period 2026" } });
  if (!period) throw new Error("UAT Evaluation Period 2026 not found — run seed-uat.ts first");
  const form = await prisma.evaluationForm.findUnique({ where: { id: "eval-form-faculty-2026" } });
  if (!form) throw new Error("Faculty Evaluation 2026 form not found — run seed-uat.ts first");
  const criteria = await prisma.evaluationCriterion.findMany({
    where: { formId: form.id },
    orderBy: { sortOrder: "asc" },
  });

  await createEvaluation(
    period.id, form.id, criteria,
    byEmail["juan.delacruz@rcc.edu.ph"].id,
    byEmail["neil.datu@rcc.edu.ph"].id,
    4.2,
    "Juan handles his classes well and submits requirements on time.\n\n---\n\nEncourage joining more professional development activities this year."
  );
  await createEvaluation(
    period.id, form.id, criteria,
    byEmail["liza.bautista@rcc.edu.ph"].id,
    byEmail["jumar.basco@rcc.edu.ph"].id,
    4.5,
    "Liza's lesson preparation is thorough and her classroom results are consistently strong."
  );

  // Sanity counts
  const [evalCount, respCount] = await Promise.all([
    prisma.evaluation.count({ where: { periodId: period.id } }),
    prisma.evaluationResponse.count(),
  ]);
  console.log(`\n✅ Fix-up complete — period now has ${evalCount} evaluation(s), ${respCount} response row(s)`);
}

main()
  .catch((e) => {
    console.error("❌ UAT fix-up failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
