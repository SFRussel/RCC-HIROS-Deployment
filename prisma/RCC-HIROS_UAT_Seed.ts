// ═══════════════════════════════════════════════════════════════
// RCC-HIROS — UAT Seed (seed-uat.ts)
// Purpose-built database for the IPA/UAT session:
//   3 groups (CCS, COED, HR) · roles Dean/Professor/HR/System Admin
//   2 dean testers (Neil Datu - CCS, Jumar Basco - COED), each with a
//   fully-seeded faculty pool (FULL personnel profiles)
//   2 dedicated employee-tester accounts (basic profile only)
//   Leave showcase queues, open evaluation period, FPAS enabled groups,
//   attendance for the whole month (Nov 1 → Nov 30), certificates.
// Run:  npx prisma migrate reset --force && npx tsx prisma/seed-uat.ts
// All passwords: RCC2026!
// ═══════════════════════════════════════════════════════════════

import { db as prisma } from "../src/lib/db";
import type { EvaluationCriterion } from "../src/generated/prisma/client";
import { hash } from "bcryptjs";
import {
  ALL_PERMISSIONS,
  HR_PERMS,
  DEAN_PERMS,
  PROFESSOR_PERMS,
} from "./permission-sets";

const DEFAULT_PASSWORD = "RCC2026!";

function daysFromNow(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(0, 0, 0, 0);
  return d;
}

function dayTime(daysFromNowVal: number, hours: number, minutes = 0): Date {
  const d = daysFromNow(daysFromNowVal);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

/** deterministic pseudo-random for reproducible data */
let seedState = 42;
function prand(): number {
  seedState = (seedState * 1103515245 + 12345) % 2147483648;
  return seedState / 2147483648;
}

async function upsertRole(
  name: string,
  description: string,
  opts: {
    scopeAllProfiling?: boolean;
    scopeAllEvaluation?: boolean;
    scopeAllLeave?: boolean;
    scopeAllReports?: boolean;
    scopeAllAttendance?: boolean;
    scopeGroupAttendance?: boolean;
    canSelfApproveLeave?: boolean;
    canChangePassword?: boolean;
    canManageBiometrics?: boolean;
    isSystem?: boolean;
  },
  permissions: string[]
) {
  const role = await prisma.role.upsert({
    where: { name },
    update: {
      description,
      scopeAllProfiling: opts.scopeAllProfiling ?? false,
      scopeAllEvaluation: opts.scopeAllEvaluation ?? false,
      scopeAllLeave: opts.scopeAllLeave ?? false,
      scopeAllReports: opts.scopeAllReports ?? false,
      scopeAllAttendance: opts.scopeAllAttendance ?? false,
      scopeGroupAttendance: opts.scopeGroupAttendance ?? false,
      canSelfApproveLeave: opts.canSelfApproveLeave ?? false,
      canChangePassword: opts.canChangePassword ?? false,
      canManageBiometrics: opts.canManageBiometrics ?? false,
      isSystem: opts.isSystem ?? false,
      active: true,
    },
    create: {
      name,
      description,
      scopeAllProfiling: opts.scopeAllProfiling ?? false,
      scopeAllEvaluation: opts.scopeAllEvaluation ?? false,
      scopeAllLeave: opts.scopeAllLeave ?? false,
      scopeAllReports: opts.scopeAllReports ?? false,
      scopeAllAttendance: opts.scopeAllAttendance ?? false,
      scopeGroupAttendance: opts.scopeGroupAttendance ?? false,
      canSelfApproveLeave: opts.canSelfApproveLeave ?? false,
      canChangePassword: opts.canChangePassword ?? false,
      canManageBiometrics: opts.canManageBiometrics ?? false,
      isSystem: opts.isSystem ?? false,
      active: true,
    },
  });
  await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
  await prisma.rolePermission.createMany({
    data: permissions.map((identifier) => ({
      roleId: role.id,
      identifier,
      granted: true,
    })),
  });
  return role;
}

interface SeedEmployee {
  employeeId: string;
  firstName: string;
  lastName: string;
  middleName: string | null;
  email: string;
  phone: string;
  gender: string;
  groupId: string | null;
  roleId: string;
  contractType: string;
  contractTypeId?: string | null;
  employmentType?: string;
  salary?: number;
  address?: string | null;
  birthday?: Date | null;
  placeOfBirth?: string | null;
  rank?: string | null;
  civilStatus?: string | null;
  citizenship?: string | null;
  religion?: string | null;
  height?: string | null;
  weight?: string | null;
  bloodType?: string | null;
  profileData?: string | null;
}

async function main() {
  console.log("🌱 Seeding RCC-HIROS UAT database...");

  // ═════════════════════════════════════════════════════════════
  // 1. Groups — CCS, COED, HR
  // ═════════════════════════════════════════════════════════════
  console.log("• Creating groups...");
  const ccs = await prisma.group.upsert({
    where: { code: "CCS" },
    update: { name: "College of Computer Studies", description: "CCS faculty & staff", active: true },
    create: { name: "College of Computer Studies", code: "CCS", description: "CCS faculty & staff", active: true },
  });
  const coed = await prisma.group.upsert({
    where: { code: "COED" },
    update: { name: "College of Education", description: "CoEd faculty & staff", active: true },
    create: { name: "College of Education", code: "COED", description: "CoEd faculty & staff", active: true },
  });
  const hrGroup = await prisma.group.upsert({
    where: { code: "HR" },
    update: { name: "Human Resource Department", description: "HR Office", active: true },
    create: { name: "Human Resource Department", code: "HR", description: "HR Office", active: true },
  });

  // ═════════════════════════════════════════════════════════════
  // 2. Roles — System Admin, HR Personnel, Dean, Professor
  // ═════════════════════════════════════════════════════════════
  console.log("• Creating roles...");
  const systemAdmin = await upsertRole(
    "System Admin",
    "Full system access — bypasses all permission checks",
    {
      scopeAllProfiling: true,
      scopeAllEvaluation: true,
      scopeAllLeave: true,
      scopeAllReports: true,
      scopeAllAttendance: true,
      canChangePassword: true,
      canManageBiometrics: true,
      isSystem: true,
    },
    ALL_PERMISSIONS
  );
  const hrPersonnel = await upsertRole("HR Personnel", "HR office — records admin, L2 leave approver", {
    scopeAllProfiling: true,
    scopeAllEvaluation: true,
    scopeAllLeave: true,
    scopeAllReports: true,
    scopeAllAttendance: true,
    canChangePassword: true,
    canManageBiometrics: true,
  }, HR_PERMS);
  const dean = await upsertRole("Dean", "Department head — L1 leave approver, evaluates faculty", {
    scopeGroupAttendance: true,
  }, DEAN_PERMS);
  const professor = await upsertRole("Professor", "Faculty / employee — self-service role", {}, PROFESSOR_PERMS);

  // ═════════════════════════════════════════════════════════════
  // 3. Contract types (needed for full-profile personnel records)
  // ═════════════════════════════════════════════════════════════
  console.log("• Creating contract types...");
  const regularCT = await prisma.contractType.upsert({
    where: { code: "REG" },
    update: { name: "Regular", active: true },
    create: { name: "Regular", code: "REG", active: true },
  });
  await prisma.contractType.upsert({
    where: { code: "CTR" },
    update: { name: "Contractual", active: true },
    create: { name: "Contractual", code: "CTR", active: true },
  });
  await prisma.contractType.upsert({
    where: { code: "PT" },
    update: { name: "Part-Time", active: true },
    create: { name: "Part-Time", code: "PT", active: true },
  });

  // ═════════════════════════════════════════════════════════════
  // 4. Employees — 7 test-day accounts (basic profile) +
  //    faculty/HR pools (FULL personnel profiles)
  // ═════════════════════════════════════════════════════════════
  console.log("• Creating employees (password: RCC2026!)...");
  const passwordHash = await hash(DEFAULT_PASSWORD, 10);

  /** Helper: build the profileData JSON blob for pool members. */
  function profileBlob(sections: Record<string, Record<string, string>[]>): string {
    return JSON.stringify(sections);
  }

  /** Section pools — used to fill EVERY profileData section for dummy staff. */
  const SECTION_POOLS: Record<string, Record<string, string>[]> = {
    education: [
      { degree: "BS Information Technology", dateEarned: "2007", school: "Holy Angel University" },
      { degree: "BS Computer Science", dateEarned: "2012", school: "University of the Assumption" },
      { degree: "BEEd", dateEarned: "2009", school: "Holy Angel University" },
      { degree: "BSEd English", dateEarned: "2011", school: "Republic Central Colleges" },
      { degree: "MA Education (Administration)", dateEarned: "2016", school: "Angeles University Foundation" },
      { degree: "MS Information Technology", dateEarned: "2018", school: "Don Honorio Ventura State University" },
      { degree: "BS Human Resource Management", dateEarned: "2010", school: "Holy Angel University" },
      { degree: "BS Psychology", dateEarned: "2016", school: "Angeles University Foundation" },
    ],
    experience: [
      { position: "IT Instructor", year: "2016-2026", organization: "Republic Central Colleges" },
      { position: "Junior Developer", year: "2011-2016", organization: "Angeles IT Solutions Inc." },
      { position: "Elementary Teacher", year: "2009-2017", organization: "DepEd Angeles City" },
      { position: "HR Assistant", year: "2011-2014", organization: "Zenith Manufacturing Corp." },
      { position: "Customer Service Representative", year: "2013-2016", organization: "Sutherland Clark" },
      { position: "Academic Coordinator", year: "2018-2026", organization: "Republic Central Colleges" },
      { position: "Records Officer", year: "2015-2019", organization: "Provincial Government of Pampanga" },
    ],
    eligibility: [
      { exam: "Civil Service Professional", place: "San Fernando, Pampanga", date: "2011-10-16", rating: "85.30" },
      { exam: "LET (Professional)", place: "San Fernando, Pampanga", date: "2013-09-29", rating: "86.75" },
      { exam: "Civil Service Sub-Professional", place: "Angeles City", date: "2010-04-18", rating: "81.90" },
      { exam: "LET (Elementary)", place: "San Fernando, Pampanga", date: "2009-09-27", rating: "90.20" },
      { exam: "TESDA NC II - Computer Systems Servicing", place: "Angeles City", date: "2017-06-11", rating: "Passed" },
      { exam: "Civil Service Professional", place: "San Fernando, Pampanga", date: "2015-10-18", rating: "83.45" },
    ],
    awards: [
      { award: "Faculty of the Year", year: "2024", institution: "RCC College of Computer Studies" },
      { award: "Outstanding Employee Award", year: "2023", institution: "Republic Central Colleges" },
      { award: "Service Excellence Award", year: "2025", institution: "RCC Human Resource Department" },
      { award: "Best Adviser - Student Organization", year: "2022", institution: "RCC Office of Student Affairs" },
      { award: "Loyalty Award (10 Years of Service)", year: "2024", institution: "Republic Central Colleges" },
      { award: "Outstanding Faculty Award", year: "2025", institution: "RCC College of Education" },
    ],
    publications: [
      { title: "Adoption of ERP Systems in Small Colleges", publication: "Philippine Journal of IT Education", issue: "Vol. 14 (2023)" },
      { title: "Code-Switching in Philippine Classrooms", publication: "Language & Learning Review", issue: "Vol. 8 (2024)" },
      { title: "Digital Literacy Among Public School Youth", publication: "RCC Research Digest", issue: "Vol. 5 (2025)" },
      { title: "Faculty Productivity and Work Attitudes", publication: "Journal of Philippine Education", issue: "Vol. 21 (2022)" },
      { title: "Gamified Learning in Tertiary Mathematics", publication: "Asia-Pacific Education Review", issue: "Vol. 12 (2024)" },
      { title: "Records Management Practices in Private HEIs", publication: "PAHRIS Journal", issue: "Vol. 3 (2023)" },
    ],
    affiliations: [
      { organization: "Philippine Society of IT Educators", position: "Member", date: "2018" },
      { organization: "Mathematics Teachers Association of the Philippines", position: "Member", date: "2020" },
      { organization: "PAHRIS - Pampanga Chapter", position: "Treasurer", date: "2023" },
      { organization: "Council of Deans and Educators of Central Luzon", position: "Member", date: "2021" },
      { organization: "Philippine Association for Teacher Education", position: "Member", date: "2019" },
      { organization: "RCC Faculty Club", position: "Board Member", date: "2022" },
    ],
    seminars: [
      { title: "National IT Convention", scope: "National", date: "2024-05-18", nature: "Conference" },
      { title: "AI in Education Workshop", scope: "Regional", date: "2025-03-10", nature: "Workshop" },
      { title: "Labor Standards & DOLE Compliance Update", scope: "Regional", date: "2025-07-19", nature: "Seminar" },
      { title: "Inquiry-Based Teaching Training", scope: "Regional", date: "2025-01-25", nature: "Training" },
      { title: "Data Privacy Act Compliance Seminar", scope: "Local", date: "2024-09-14", nature: "Seminar" },
      { title: "Research Writing Bootcamp", scope: "Local", date: "2025-02-21", nature: "Bootcamp" },
      { title: "Personnel Records Management Seminar", scope: "Local", date: "2025-06-08", nature: "Seminar" },
      { title: "National Reading Program Seminar", scope: "National", date: "2024-11-15", nature: "Seminar" },
    ],
    accomplishments: [
      { function: "Chaired the accreditation self-survey committee", nature: "Institutional quality assurance" },
      { function: "Digitized five years of personnel files", nature: "Records management modernization" },
      { function: "Designed the department's OJT monitoring workflow", nature: "Curriculum support" },
      { function: "Coordinated the school-wide faculty development week", nature: "Human resource development" },
      { function: "Streamlined the leave application tracking process", nature: "Office process improvement" },
    ],
    community: [
      { title: "Digital Literacy Outreach", beneficiaries: "Barangay youth", date: "2025-08-22", nature: "Volunteer training" },
      { title: "Math Tutorial Program", beneficiaries: "Grade 6 pupils", date: "2025-10-05", nature: "Community service" },
      { title: "Blood Donation Drive", beneficiaries: "Philippine Red Cross", date: "2025-03-14", nature: "Volunteer" },
      { title: "Feeding Program", beneficiaries: "Indigent families", date: "2024-12-07", nature: "Volunteer" },
      { title: "Computer Literacy for Senior Citizens", beneficiaries: "Senior citizens association", date: "2025-05-17", nature: "Volunteer training" },
      { title: "Coastal Clean-Up", beneficiaries: "Local LGU", date: "2024-09-21", nature: "Volunteer" },
    ],
  };

  const FULL_SECTIONS = ["education", "experience", "eligibility", "awards", "publications", "affiliations", "seminars", "accomplishments", "community"];

  /** deterministic pick of `count` distinct rows from a pool */
  function pickRows(pool: Record<string, string>[], count: number): Record<string, string>[] {
    const out: Record<string, string>[] = [];
    const used = new Set<number>();
    let guard = 0;
    while (out.length < count && guard < 200) {
      const i = Math.floor(prand() * pool.length);
      if (!used.has(i)) { used.add(i); out.push(pool[i]); }
      guard++;
    }
    return out;
  }

  /** Fill EVERY section: keep the hand-written anchors, top up with random rows. */
  function fullProfile(given: Record<string, Record<string, string>[]>): string {
    const result: Record<string, Record<string, string>[]> = {};
    for (const key of FULL_SECTIONS) {
      const base = given[key] ?? [];
      const pool = SECTION_POOLS[key];
      const want = base.length === 0 ? 1 + (prand() < 0.35 ? 1 : 0) : 1;
      result[key] = [...base, ...pickRows(pool, want)];
    }
    return JSON.stringify(result);
  }

  const employees: SeedEmployee[] = [
    // ── test-day accounts: BASIC PROFILE ONLY ──
    { employeeId: "EMP-0100", firstName: "System", lastName: "Administrator", middleName: null, email: "admin@rcc.edu.ph", phone: "+63 917 010 0100", gender: "Male", groupId: null, roleId: systemAdmin.id, contractType: "Regular" },
    { employeeId: "EMP-0101", firstName: "Neil", lastName: "Datu", middleName: "P.", email: "neil.datu@rcc.edu.ph", phone: "+63 917 010 0101", gender: "Male", groupId: ccs.id, roleId: dean.id, contractType: "Regular" },
    { employeeId: "EMP-0102", firstName: "Jumar", lastName: "Basco", middleName: null, email: "jumar.basco@rcc.edu.ph", phone: "+63 917 010 0102", gender: "Male", groupId: coed.id, roleId: dean.id, contractType: "Regular" },
    { employeeId: "EMP-0103", firstName: "Juan", lastName: "Dela Cruz", middleName: "M.", email: "juan.delacruz@rcc.edu.ph", phone: "+63 917 010 0103", gender: "Male", groupId: ccs.id, roleId: professor.id, contractType: "Regular" },
    { employeeId: "EMP-0104", firstName: "Liza", lastName: "Bautista", middleName: null, email: "liza.bautista@rcc.edu.ph", phone: "+63 917 010 0104", gender: "Female", groupId: coed.id, roleId: professor.id, contractType: "Regular" },
    { employeeId: "EMP-0105", firstName: "Jeremiah", lastName: "Sawal", middleName: null, email: "hr.head@rcc.edu.ph", phone: "+63 917 010 0105", gender: "Male", groupId: hrGroup.id, roleId: hrPersonnel.id, contractType: "Regular", employmentType: "Non-Teaching", salary: 45000, address: "456 Nepo Quadrant, Angeles City, Pampanga", birthday: new Date("1988-04-12"), placeOfBirth: "Angeles City, Pampanga", rank: "HR Officer II", civilStatus: "Married", citizenship: "Filipino", religion: "Roman Catholic", height: "5\u00b27\u0022", weight: "68 kg", bloodType: "O+", contractTypeId: regularCT.id, profileData: fullProfile({
      education: [{ degree: "BS Human Resource Management", dateEarned: "2010", school: "Holy Angel University" }],
      experience: [{ position: "HR Officer", year: "2014-2026", organization: "Republic Central Colleges" }, { position: "HR Assistant", year: "2011-2014", organization: "Zenith Manufacturing Corp." }],
      eligibility: [{ exam: "Civil Service Professional", place: "San Fernando, Pampanga", date: "2011-10-16", rating: "85.30" }],
      seminars: [{ title: "Labor Standards & DOLE Compliance Update", scope: "Regional", date: "2025-07-19", nature: "Seminar" }],
    }) },
    { employeeId: "EMP-0106", firstName: "Grace", lastName: "Mendoza", middleName: null, email: "hr.staff@rcc.edu.ph", phone: "+63 917 010 0106", gender: "Female", groupId: hrGroup.id, roleId: hrPersonnel.id, contractType: "Regular", employmentType: "Non-Teaching", salary: 38000, address: "88 Malaya St., Balibago, Angeles City", birthday: new Date("1992-09-03"), placeOfBirth: "San Fernando, Pampanga", rank: "HR Assistant", civilStatus: "Single", citizenship: "Filipino", religion: "Roman Catholic", height: "5\u00b23\u0022", weight: "54 kg", bloodType: "B+", contractTypeId: regularCT.id, profileData: fullProfile({
      education: [{ degree: "BS Business Administration (HRM)", dateEarned: "2014", school: "Angeles University Foundation" }],
      experience: [{ position: "HR Assistant", year: "2016-2026", organization: "Republic Central Colleges" }],
      seminars: [{ title: "207 Records Management Workshop", scope: "Local", date: "2024-10-02", nature: "Workshop" }],
    }) },
    // ── CCS faculty pool (EMP-0110 inactive on purpose) — FULL PROFILES ──
    { employeeId: "EMP-0107", firstName: "Carlos", lastName: "Mendoza", middleName: "R.", email: "carlos.mendoza@rcc.edu.ph", phone: "+63 917 010 0107", gender: "Male", groupId: ccs.id, roleId: professor.id, contractType: "Regular", employmentType: "Teaching", salary: 42000, address: "12 Sto. Rosario St., Angeles City, Pampanga", birthday: new Date("1985-06-21"), placeOfBirth: "Angeles City, Pampanga", rank: "Instructor III", civilStatus: "Married", citizenship: "Filipino", religion: "Roman Catholic", height: "5\u00b28\u0022", weight: "70 kg", bloodType: "A+", contractTypeId: regularCT.id, profileData: fullProfile({
      education: [{ degree: "BS Information Technology", dateEarned: "2007", school: "Holy Angel University" }, { degree: "MS Computer Science (units earned)", dateEarned: "2015", school: "Clark International University" }],
      experience: [{ position: "IT Instructor", year: "2016-2026", organization: "Republic Central Colleges" }, { position: "Junior Developer", year: "2011-2016", organization: "Angeles IT Solutions Inc." }],
      seminars: [{ title: "National IT Convention", scope: "National", date: "2024-05-18", nature: "Conference" }],
      awards: [{ award: "Faculty of the Year", year: "2024", institution: "RCC College of Computer Studies" }],
    }) },
    { employeeId: "EMP-0108", firstName: "Rita", lastName: "Villareal", middleName: null, email: "rita.villareal@rcc.edu.ph", phone: "+63 917 010 0108", gender: "Female", groupId: ccs.id, roleId: professor.id, contractType: "Regular", employmentType: "Teaching", salary: 40000, address: "7 Diamond Subd., Balibago, Angeles City", birthday: new Date("1990-11-08"), placeOfBirth: "Mabalacat, Pampanga", rank: "Instructor II", civilStatus: "Single", citizenship: "Filipino", religion: "Born Again Christian", height: "5\u00b24\u0022", weight: "52 kg", bloodType: "AB+", contractTypeId: regularCT.id, profileData: fullProfile({
      education: [{ degree: "BS Computer Science", dateEarned: "2012", school: "University of the Assumption" }],
      experience: [{ position: "Programming Instructor", year: "2018-2026", organization: "Republic Central Colleges" }],
      seminars: [{ title: "AI in Education Workshop", scope: "Regional", date: "2025-03-10", nature: "Workshop" }],
      community: [{ title: "Digital Literacy Outreach", beneficiaries: "Barangay youth", date: "2025-08-22", nature: "Volunteer training" }],
    }) },
    { employeeId: "EMP-0109", firstName: "Marco", lastName: "Torres", middleName: null, email: "marco.torres@rcc.edu.ph", phone: "+63 917 010 0109", gender: "Male", groupId: ccs.id, roleId: professor.id, contractType: "Regular", employmentType: "Teaching", salary: 46000, address: "21 Pandan St., Angeles City", birthday: new Date("1982-02-15"), placeOfBirth: "Manila", rank: "Assistant Professor I", civilStatus: "Married", citizenship: "Filipino", religion: "Roman Catholic", height: "5\u00b29\u0022", weight: "75 kg", bloodType: "O-", contractTypeId: regularCT.id, profileData: fullProfile({
      education: [{ degree: "BS Information Management", dateEarned: "2004", school: "Don Honorio Ventura State University" }, { degree: "MBA", dateEarned: "2012", school: "Angeles University Foundation" }],
      experience: [{ position: "Department Coordinator / Instructor", year: "2013-2026", organization: "Republic Central Colleges" }],
      publications: [{ title: "Adoption of ERP Systems in Small Colleges", publication: "Philippine Journal of IT Education", issue: "Vol. 14 (2023)" }],
      eligibility: [{ exam: "Civil Service Professional", place: "San Fernando, Pampanga", date: "2006-03-12", rating: "88.50" }],
    }) },
    { employeeId: "EMP-0110", firstName: "Pedro", lastName: "Sarmiento", middleName: null, email: "pedro.sarmiento@rcc.edu.ph", phone: "+63 917 010 0110", gender: "Male", groupId: ccs.id, roleId: professor.id, contractType: "Regular", employmentType: "Teaching", salary: 36000, address: "5 Purok 3, Cutud, San Fernando", birthday: new Date("1993-07-30"), placeOfBirth: "San Fernando, Pampanga", rank: "Instructor I", civilStatus: "Single", citizenship: "Filipino", religion: "Roman Catholic", height: "5\u00b27\u0022", weight: "63 kg", bloodType: "B-", contractTypeId: regularCT.id, profileData: fullProfile({
      education: [{ degree: "BS Information Technology", dateEarned: "2015", school: "Republic Central Colleges" }],
      experience: [{ position: "IT Instructor", year: "2019-2026", organization: "Republic Central Colleges" }],
    }) },
    // ── COED faculty pool — FULL PROFILES ──
    { employeeId: "EMP-0111", firstName: "Ana", lastName: "Villanueva", middleName: "L.", email: "ana.villanueva@rcc.edu.ph", phone: "+63 917 010 0111", gender: "Female", groupId: coed.id, roleId: professor.id, contractType: "Regular", employmentType: "Teaching", salary: 44000, address: "33 Santo Domingo St., Angeles City", birthday: new Date("1987-01-19"), placeOfBirth: "Guagua, Pampanga", rank: "Assistant Professor I", civilStatus: "Married", citizenship: "Filipino", religion: "Roman Catholic", height: "5\u00b25\u0022", weight: "58 kg", bloodType: "A-", contractTypeId: regularCT.id, profileData: fullProfile({
      education: [{ degree: "BEEd, Cum Laude", dateEarned: "2009", school: "Holy Angel University" }, { degree: "MA Education (Administration)", dateEarned: "2016", school: "Angeles University Foundation" }],
      experience: [{ position: "Master Teacher I", year: "2017-2026", organization: "Republic Central Colleges" }, { position: "Elementary Teacher", year: "2009-2017", organization: "DepEd Angeles City" }],
      eligibility: [{ exam: "LET (Elementary)", place: "San Fernando, Pampanga", date: "2009-09-27", rating: "90.20" }],
      awards: [{ award: "Outstanding Faculty Award", year: "2025", institution: "RCC College of Education" }],
      seminars: [{ title: "National Reading Program Seminar", scope: "National", date: "2024-11-15", nature: "Seminar" }],
    }) },
    { employeeId: "EMP-0112", firstName: "Peter", lastName: "Santos", middleName: null, email: "peter.santos@rcc.edu.ph", phone: "+63 917 010 0112", gender: "Male", groupId: coed.id, roleId: professor.id, contractType: "Regular", employmentType: "Teaching", salary: 38000, address: "9 Sampaguita St., Mabalacat City", birthday: new Date("1991-05-04"), placeOfBirth: "Mabalacat City, Pampanga", rank: "Instructor II", civilStatus: "Single", citizenship: "Filipino", religion: "Iglesia ni Cristo", height: "5\u00b210\u0022", weight: "72 kg", bloodType: "O+", contractTypeId: regularCT.id, profileData: fullProfile({
      education: [{ degree: "BSEd Mathematics", dateEarned: "2013", school: "Don Honorio Ventura State University" }],
      experience: [{ position: "Mathematics Instructor", year: "2019-2026", organization: "Republic Central Colleges" }],
      seminars: [{ title: "Inquiry-Based Math Teaching Training", scope: "Regional", date: "2025-01-25", nature: "Training" }],
      community: [{ title: "Math Tutorial Program", beneficiaries: "Grade 6 pupils", date: "2025-10-05", nature: "Community service" }],
    }) },
    { employeeId: "EMP-0113", firstName: "Joyce", lastName: "Ramos", middleName: null, email: "joyce.ramos@rcc.edu.ph", phone: "+63 917 010 0113", gender: "Female", groupId: coed.id, roleId: professor.id, contractType: "Regular", employmentType: "Teaching", salary: 39000, address: "14 Lourdes Sur, Angeles City", birthday: new Date("1989-08-23"), placeOfBirth: "Angeles City, Pampanga", rank: "Instructor III", civilStatus: "Married", citizenship: "Filipino", religion: "Roman Catholic", height: "5\u00b22\u0022", weight: "55 kg", bloodType: "A+", contractTypeId: regularCT.id, profileData: fullProfile({
      education: [{ degree: "BSEd English", dateEarned: "2011", school: "Republic Central Colleges" }, { degree: "MA English Language Teaching (units)", dateEarned: "2021", school: "Holy Angel University" }],
      experience: [{ position: "English Instructor", year: "2015-2026", organization: "Republic Central Colleges" }],
      publications: [{ title: "Code-Switching in Philippine Classrooms", publication: "Language & Learning Review", issue: "Vol. 8 (2024)" }],
      eligibility: [{ exam: "LET (Secondary)", place: "San Fernando, Pampanga", date: "2011-09-25", rating: "86.75" }],
    }) },
    // ── HR pool — FULL PROFILES ──
    { employeeId: "EMP-0114", firstName: "Karen", lastName: "Dizon", middleName: null, email: "karen.dizon@rcc.edu.ph", phone: "+63 917 010 0114", gender: "Female", groupId: hrGroup.id, roleId: professor.id, contractType: "Regular", employmentType: "Non-Teaching", salary: 34000, address: "20 Villa Teresa Subd., Angeles City", birthday: new Date("1994-12-11"), placeOfBirth: "Angeles City, Pampanga", rank: "HR Clerk", civilStatus: "Single", citizenship: "Filipino", religion: "Roman Catholic", height: "5\u00b21\u0022", weight: "50 kg", bloodType: "AB-", contractTypeId: regularCT.id, profileData: fullProfile({
      education: [{ degree: "BS Psychology", dateEarned: "2016", school: "Angeles University Foundation" }],
      experience: [{ position: "HR Clerk", year: "2018-2026", organization: "Republic Central Colleges" }],
      seminars: [{ title: "Personnel Records Management Seminar", scope: "Local", date: "2025-06-08", nature: "Seminar" }],
    }) },
    { employeeId: "EMP-0115", firstName: "Mark", lastName: "Aquino", middleName: null, email: "mark.aquino@rcc.edu.ph", phone: "+63 917 010 0115", gender: "Male", groupId: hrGroup.id, roleId: professor.id, contractType: "Regular", employmentType: "Non-Teaching", salary: 35000, address: "3 Salakot Hills, Angeles City", birthday: new Date("1996-03-28"), placeOfBirth: "Tarlac City", rank: "Records Assistant", civilStatus: "Single", citizenship: "Filipino", religion: "Roman Catholic", height: "5\u00b26\u0022", weight: "64 kg", bloodType: "B+", contractTypeId: regularCT.id, profileData: fullProfile({
      education: [{ degree: "BS Office Administration", dateEarned: "2018", school: "Ospital ng Angeles College" }],
      experience: [{ position: "Records Assistant", year: "2019-2026", organization: "Republic Central Colleges" }],
      accomplishments: [{ function: "Digitized 5 years of personnel files", nature: "Records management modernization" }],
    }) },
  ];

  const createdEmployees: Record<string, string> = {}; // employeeId -> db id
  for (const emp of employees) {
    const inactive = emp.employeeId === "EMP-0110"; // CCS negative-test member
    const common = {
      firstName: emp.firstName, lastName: emp.lastName, middleName: emp.middleName,
      email: emp.email, phone: emp.phone, gender: emp.gender,
      groupId: emp.groupId, roleId: emp.roleId, contractType: emp.contractType,
      active: !inactive, passwordHash, mustChangePwd: false,
    };
    const full = {
      contractTypeId: emp.contractTypeId ?? null,
      employmentType: emp.employmentType ?? "Teaching",
      salary: emp.salary ?? 0,
      address: emp.address ?? null,
      birthday: emp.birthday ?? null,
      placeOfBirth: emp.placeOfBirth ?? null,
      rank: emp.rank ?? null,
      civilStatus: emp.civilStatus ?? null,
      citizenship: emp.citizenship ?? null,
      religion: emp.religion ?? null,
      height: emp.height ?? null,
      weight: emp.weight ?? null,
      bloodType: emp.bloodType ?? null,
      profileData: emp.profileData ?? null,
    };
    const created = await prisma.employee.upsert({
      where: { employeeId: emp.employeeId },
      update: { ...common, ...full },
      create: {
        employeeId: emp.employeeId,
        ...common,
        ...full,
        hireDate: new Date("2026-01-01T00:00:00.000Z"),
      },
    });
    createdEmployees[emp.employeeId] = created.id;
  }

  // ═════════════════════════════════════════════════════════════
  // 5. Leave types
  // ═════════════════════════════════════════════════════════════
  console.log("• Creating leave types...");
  const sickLeave = await prisma.leaveType.upsert({
    where: { code: "SL" },
    update: { name: "Sick Leave", defaultDays: 10, active: true },
    create: { name: "Sick Leave", code: "SL", defaultDays: 10, active: true },
  });
  const vacationLeave = await prisma.leaveType.upsert({
    where: { code: "VL" },
    update: { name: "Vacation Leave", defaultDays: 15, active: true },
    create: { name: "Vacation Leave", code: "VL", defaultDays: 15, active: true },
  });
  const emergencyLeave = await prisma.leaveType.upsert({
    where: { code: "EL" },
    update: { name: "Emergency Leave", defaultDays: 5, active: true },
    create: { name: "Emergency Leave", code: "EL", defaultDays: 5, active: true },
  });
  const leaveTypes = [sickLeave, vacationLeave, emergencyLeave];

  // ═════════════════════════════════════════════════════════════
  // 6. Leave balances
  //    juan.delacruz: VL 14/15 used → only 1 day left (over-balance test)
  // ═════════════════════════════════════════════════════════════
  console.log("• Creating leave balances...");
  await prisma.leaveBalance.deleteMany({});

  const usedMap: Record<string, Record<string, number>> = {
    "EMP-0103": { SL: 0, VL: 14, EL: 0 },
    "EMP-0104": { SL: 1, VL: 2, EL: 0 },
    "EMP-0107": { SL: 0, VL: 3, EL: 1 },
    "EMP-0108": { SL: 2, VL: 1, EL: 0 },
    "EMP-0109": { SL: 0, VL: 0, EL: 0 },
    "EMP-0110": { SL: 0, VL: 0, EL: 0 },
    "EMP-0111": { SL: 1, VL: 4, EL: 0 },
    "EMP-0112": { SL: 0, VL: 2, EL: 1 },
    "EMP-0113": { SL: 3, VL: 0, EL: 0 },
    "EMP-0114": { SL: 0, VL: 1, EL: 0 },
    "EMP-0115": { SL: 1, VL: 0, EL: 0 },
    "EMP-0101": { SL: 1, VL: 2, EL: 0 },
    "EMP-0102": { SL: 0, VL: 1, EL: 0 },
    "EMP-0105": { SL: 2, VL: 3, EL: 0 },
    "EMP-0106": { SL: 0, VL: 1, EL: 1 },
  };
  for (const emp of employees) {
    for (const lt of leaveTypes) {
      const used = usedMap[emp.employeeId]?.[lt.code] ?? 0;
      await prisma.leaveBalance.create({
        data: {
          employeeId: createdEmployees[emp.employeeId],
          leaveTypeId: lt.id,
          year: 2026,
          totalDays: lt.defaultDays,
          usedDays: used,
        },
      });
    }
  }

  // ═════════════════════════════════════════════════════════════
  // 7. Leave requests — dean queues + workflow history
  // ═════════════════════════════════════════════════════════════
  console.log("• Creating leave requests (UAT showcase)...");
  await prisma.leaveApproval.deleteMany({});
  await prisma.leaveRequest.deleteMany({});

  const u = (id: string) => createdEmployees[id];
  const ccsDeanId = u("EMP-0101");
  const coedDeanId = u("EMP-0102");
  const hrHeadId = u("EMP-0105");

  async function addRequest(
    no: string,
    empId: string,
    typeId: string,
    startOff: number,
    endOff: number,
    workdays: number,
    reason: string,
    status: string,
    approvals: Array<{ level: number; approverId: string; status: string; remarks?: string; off?: number; hour?: number }> = []
  ) {
    const req = await prisma.leaveRequest.create({
      data: {
        requestNo: no,
        employeeId: u(empId),
        leaveTypeId: typeId,
        startDate: daysFromNow(startOff),
        endDate: daysFromNow(endOff),
        workdays,
        reason,
        status,
      },
    });
    for (const a of approvals) {
      await prisma.leaveApproval.create({
        data: {
          leaveRequestId: req.id,
          level: a.level,
          approverId: a.approverId,
          status: a.status,
          remarks: a.remarks ?? null,
          actedAt: a.off !== undefined ? dayTime(a.off, a.hour ?? 10, 0) : null,
        },
      });
    }
    return req;
  }

  // ── CCS queue: 2 pending L1 for the CCS dean ──
  await addRequest("LR-U001", "EMP-0107", vacationLeave.id, 5, 7, 3,
    "Family outing in Subic — planned months ahead.", "pending_l1");
  await addRequest("LR-U002", "EMP-0108", sickLeave.id, 2, 3, 2,
    "Fever and colds — advised rest by the clinic.", "pending_l1");
  // ── CCS pending L2 (dean approved, awaiting HR) ──
  await addRequest("LR-U003", "EMP-0109", emergencyLeave.id, 8, 8, 1,
    "Emergency house repair after a leak.", "pending_l2", [
    { level: 1, approverId: ccsDeanId, status: "approved", remarks: "Approved — emergency leave, understandable.", off: -2, hour: 9 },
  ]);
  // ── CCS history ──
  await addRequest("LR-U004", "EMP-0107", vacationLeave.id, -20, -18, 3,
    "Provincial trip to visit relatives.", "approved", [
    { level: 1, approverId: ccsDeanId, status: "approved", remarks: "Approved.", off: -25, hour: 10 },
    { level: 2, approverId: hrHeadId, status: "approved", remarks: "Approved by HR.", off: -24, hour: 11 },
  ]);
  await addRequest("LR-U005", "EMP-0108", emergencyLeave.id, -45, -45, 1,
    "Personal matter.", "rejected", [
    { level: 1, approverId: ccsDeanId, status: "rejected", remarks: "Exam week — please file after finals.", off: -47, hour: 14 },
  ]);

  // ── COED queue: 2 pending L1 for the CoEd dean ──
  await addRequest("LR-U006", "EMP-0111", vacationLeave.id, 6, 8, 3,
    "Beach trip with family.", "pending_l1");
  await addRequest("LR-U007", "EMP-0112", sickLeave.id, 1, 2, 2,
    "Dizziness — check-up scheduled.", "pending_l1");
  // ── COED pending L2 ──
  await addRequest("LR-U008", "EMP-0113", vacationLeave.id, 12, 14, 3,
    "Wedding attendance in Baguio.", "pending_l2", [
    { level: 1, approverId: coedDeanId, status: "approved", remarks: "Approved — classes covered.", off: -1, hour: 15 },
  ]);
  // ── COED history ──
  await addRequest("LR-U009", "EMP-0111", sickLeave.id, -30, -30, 1,
    "Migraine.", "approved", [
    { level: 1, approverId: coedDeanId, status: "approved", remarks: "Approved.", off: -31, hour: 9 },
    { level: 2, approverId: hrHeadId, status: "approved", remarks: "Approved by HR.", off: -30, hour: 10 },
  ]);
  await addRequest("LR-U010", "EMP-0112", vacationLeave.id, -50, -48, 3,
    "Personal errand.", "rejected", [
    { level: 1, approverId: coedDeanId, status: "rejected", remarks: "Enrollment period — too busy.", off: -52, hour: 13 },
  ]);

  // ── Employee testers' own history ──
  await addRequest("LR-U011", "EMP-0103", vacationLeave.id, -15, -14, 2,
    "Anniversary dinner and short trip.", "approved", [
    { level: 1, approverId: ccsDeanId, status: "approved", remarks: "Approved.", off: -18, hour: 10 },
    { level: 2, approverId: hrHeadId, status: "approved", remarks: "Approved by HR.", off: -17, hour: 9 },
  ]);
  await addRequest("LR-U012", "EMP-0104", emergencyLeave.id, -40, -40, 1,
    "Child's school emergency.", "approved", [
    { level: 1, approverId: coedDeanId, status: "approved", remarks: "Approved.", off: -41, hour: 10 },
    { level: 2, approverId: hrHeadId, status: "approved", remarks: "Approved by HR.", off: -40, hour: 11 },
  ]);

  // ── Cancelled example ──
  await addRequest("LR-U013", "EMP-0109", vacationLeave.id, 20, 22, 3,
    "Trip plan (withdrawn).", "cancelled");

  // ═════════════════════════════════════════════════════════════
  // 8. Evaluation form + 34 criteria (verbatim from the standard seed)
  // ═════════════════════════════════════════════════════════════
  console.log("• Creating evaluation form + criteria...");
  const evalForm = await prisma.evaluationForm.upsert({
    where: { id: "eval-form-faculty-2026" },
    update: { name: "Faculty Evaluation 2026", version: 1, active: true },
    create: { id: "eval-form-faculty-2026", name: "Faculty Evaluation 2026", version: 1, active: true },
  });

  const defaultCriteria: Array<{
    category: string;
    description: string;
    weight: number;
    sortOrder: number;
  }> = [
    // I. Communication Skills (4 items)
    {
      category: "I. Communication Skills",
      description: "Pronounces words clearly and distinctly.",
      weight: 1.0,
      sortOrder: 1,
    },
    {
      category: "I. Communication Skills",
      description: "Speaks clearly enough to be understood easily.",
      weight: 1.0,
      sortOrder: 2,
    },
    {
      category: "I. Communication Skills",
      description: "Has good command of English or Filipino.",
      weight: 1.0,
      sortOrder: 3,
    },
    {
      category: "I. Communication Skills",
      description: "Has a well-modulated voice.",
      weight: 1.0,
      sortOrder: 4,
    },
    // II. Instructional Skills (7 items)
    {
      category: "II. Instructional Skills",
      description: "Uses a variety of methods and techniques to facilitate learning.",
      weight: 1.0,
      sortOrder: 5,
    },
    {
      category: "II. Instructional Skills",
      description: "Presents the subject matter clearly and systematically.",
      weight: 1.0,
      sortOrder: 6,
    },
    {
      category: "II. Instructional Skills",
      description: "Adjusts to the students' learning pace without sacrificing completeness of the course.",
      weight: 1.0,
      sortOrder: 7,
    },
    {
      category: "II. Instructional Skills",
      description: "Provokes critical, creative, and reflective thinking.",
      weight: 1.0,
      sortOrder: 8,
    },
    {
      category: "II. Instructional Skills",
      description: "Encourages students' active participation in the discussions.",
      weight: 1.0,
      sortOrder: 9,
    },
    {
      category: "II. Instructional Skills",
      description: "Uses teaching aids/devices like illustrations, diagrams, etc.",
      weight: 1.0,
      sortOrder: 10,
    },
    {
      category: "II. Instructional Skills",
      description: "Elicits correct responses through skillful questioning.",
      weight: 1.0,
      sortOrder: 11,
    },
    // III. Knowledge of the Subject-Matter (5 items)
    {
      category: "III. Knowledge of the Subject-Matter",
      description: "Discusses the lesson with mastery.",
      weight: 1.0,
      sortOrder: 12,
    },
    {
      category: "III. Knowledge of the Subject-Matter",
      description: "Follows the course syllabus.",
      weight: 1.0,
      sortOrder: 13,
    },
    {
      category: "III. Knowledge of the Subject-Matter",
      description: "Relates subject matter to other subjects and to previous knowledge and experiences.",
      weight: 1.0,
      sortOrder: 14,
    },
    {
      category: "III. Knowledge of the Subject-Matter",
      description: "Relates subject matter to the vision, mission, and objectives of the college.",
      weight: 1.0,
      sortOrder: 15,
    },
    {
      category: "III. Knowledge of the Subject-Matter",
      description: "Integrates values in the lessons.",
      weight: 1.0,
      sortOrder: 16,
    },
    // IV. Classroom Management (6 items)
    {
      category: "IV. Classroom Management",
      description: "Maintains class discipline.",
      weight: 1.0,
      sortOrder: 17,
    },
    {
      category: "IV. Classroom Management",
      description: "Sees to it that the room is clean and orderly.",
      weight: 1.0,
      sortOrder: 18,
    },
    {
      category: "IV. Classroom Management",
      description: "Comes to class on time.",
      weight: 1.0,
      sortOrder: 19,
    },
    {
      category: "IV. Classroom Management",
      description: "Dismisses class on time.",
      weight: 1.0,
      sortOrder: 20,
    },
    {
      category: "IV. Classroom Management",
      description: "Is always present in class.",
      weight: 1.0,
      sortOrder: 21,
    },
    {
      category: "IV. Classroom Management",
      description: "Enforces school rules and regulations consistently.",
      weight: 1.0,
      sortOrder: 22,
    },
    // V. Professional Qualities (5 items)
    {
      category: "V. Professional Qualities",
      description: "Respects students' opinions.",
      weight: 1.0,
      sortOrder: 23,
    },
    {
      category: "V. Professional Qualities",
      description: "Maintains good working relations with students.",
      weight: 1.0,
      sortOrder: 24,
    },
    {
      category: "V. Professional Qualities",
      description: "Is fair in giving grades.",
      weight: 1.0,
      sortOrder: 25,
    },
    {
      category: "V. Professional Qualities",
      description: "Is firm and consistent — strict but reasonable in dealing with students.",
      weight: 1.0,
      sortOrder: 26,
    },
    {
      category: "V. Professional Qualities",
      description: "Returns corrected test papers and projects promptly.",
      weight: 1.0,
      sortOrder: 27,
    },
    // VI. Personal Qualities (3 items)
    {
      category: "VI. Personal Qualities",
      description: "Dresses neatly and appropriately.",
      weight: 1.0,
      sortOrder: 28,
    },
    {
      category: "VI. Personal Qualities",
      description: "Demonstrates calmness and poise.",
      weight: 1.0,
      sortOrder: 29,
    },
    {
      category: "VI. Personal Qualities",
      description: "Is physically and mentally fit to teach.",
      weight: 1.0,
      sortOrder: 30,
    },
    // VII. Classwork Design (For Online Classroom) (4 items)
    {
      category: "VII. Classwork Design (For Online Classroom)",
      description: "Presents an instructional plan/syllabus geared towards the attainment of learning outcomes.",
      weight: 1.0,
      sortOrder: 31,
    },
    {
      category: "VII. Classwork Design (For Online Classroom)",
      description: "Uses modules to organize classwork content.",
      weight: 1.0,
      sortOrder: 32,
    },
    {
      category: "VII. Classwork Design (For Online Classroom)",
      description: "Provides equal access of learning materials to all students.",
      weight: 1.0,
      sortOrder: 33,
    },
    {
      category: "VII. Classwork Design (For Online Classroom)",
      description: "Organizes assignments, activities and related due dates.",
      weight: 1.0,
      sortOrder: 34,
    },
  ];

  await prisma.evaluationResponse.deleteMany({});
  await prisma.evaluation.deleteMany({});
  await prisma.evaluationCriterion.deleteMany({ where: { formId: evalForm.id } });
  const createdCriteria: EvaluationCriterion[] = [];
  for (const c of defaultCriteria) {
    const criterion = await prisma.evaluationCriterion.create({
      data: {
        formId: evalForm.id,
        category: c.category,
        description: c.description,
        maxScore: 5,
        weight: c.weight,
        sortOrder: c.sortOrder,
      },
    });
    createdCriteria.push(criterion);
  }

  // ═════════════════════════════════════════════════════════════
  // 9. Evaluation period — OPEN for the test session
  // ═════════════════════════════════════════════════════════════
  console.log("• Creating evaluation period (open)...");
  await prisma.evaluationPeriod.deleteMany({});
  const openPeriod = await prisma.evaluationPeriod.create({
    data: {
      id: "eval-period-uat-2026",
      formId: evalForm.id,
      name: "UAT Evaluation Period 2026",
      startDate: daysFromNow(-7),
      endDate: daysFromNow(30),
      status: "open",
      groupIds: JSON.stringify([ccs.id, coed.id]),
      targetRoleIds: JSON.stringify([professor.id]),
      openedAt: new Date(),
      createdBy: u("EMP-0100"),
    },
  });

  // ═════════════════════════════════════════════════════════════
  // 10. Evaluation submissions — 1 per college so "view results" has data
  // ═════════════════════════════════════════════════════════════
  console.log("• Creating evaluation submissions...");

  async function createEvaluation(
    periodId: string,
    employeeId: string,
    evaluatorId: string,
    targetAvg: number,
    remarks: string | null
  ) {
    const count = createdCriteria.length;
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
    const totalWeight = createdCriteria.reduce((sum, c) => sum + c.weight, 0);
    const weightedSum = createdCriteria.reduce((sum, c, i) => sum + c.weight * scores[i], 0);
    const totalScore = Number((weightedSum / totalWeight).toFixed(2));

    await prisma.evaluation.create({
      data: {
        periodId,
        formId: evalForm.id,
        evaluatorId,
        employeeId,
        status: "submitted",
        totalScore,
        remarks,
        submittedAt: dayTime(-3, 15, 0),
        responses: {
          create: createdCriteria.map((c, i) => ({
            criterionId: c.id,
            score: scores[i],
            comments: i % 3 === 0 ? "Consistently performs well in this area." : null,
          })),
        },
      },
    });
  }

  await createEvaluation(openPeriod.id, u("EMP-0107"), ccsDeanId, 4.4,
    "Carlos demonstrates strong instructional skills and consistent classroom management.\n\n---\n\nSuggest attending more faculty development seminars.");
  await createEvaluation(openPeriod.id, u("EMP-0111"), coedDeanId, 4.6,
    "Ana's demonstration lessons are exemplary and well-prepared. Students respond very well to her methods.");

  // ═════════════════════════════════════════════════════════════
  // 11. Attendance — the WHOLE MONTH (Nov 1 → Nov 30), all staff
  // ═════════════════════════════════════════════════════════════
  console.log("• Creating attendance records (whole month Nov 1-30)...");
  await prisma.attendance.deleteMany({});

  const campusLat = 15.1428;
  const campusLng = 120.5886;

  const monthStart = new Date(2026, 10, 1); // Nov 1, 2026
  const monthEnd = new Date(2026, 10, 30); // Nov 30, 2026 — full month per user request
  const today = daysFromNow(0);

  for (const emp of employees) {
    if (emp.employeeId === "EMP-0110") continue; // inactive
    if (emp.employeeId === "EMP-0100") continue; // admin not in attendance demo
    for (let d = new Date(monthStart); d <= monthEnd; d.setDate(d.getDate() + 1)) {
      // occasional absences for realistic reports
      if (prand() < 0.08) continue;
      const y = d.getFullYear(), m = d.getMonth(), day = d.getDate();
      const inH = 7 + Math.floor(prand() * 2);           // 7:00–8:59
      const inM = Math.floor(prand() * 59);
      const isToday = (y === today.getFullYear() && m === today.getMonth() && day === today.getDate());
      const record: Record<string, unknown> = {
        employeeId: createdEmployees[emp.employeeId],
        date: new Date(y, m, day),
        clockInAt: new Date(y, m, day, inH, inM),
        clockInLat: campusLat,
        clockInLng: campusLng,
        clockInOnPremise: true,
        clockInDistance: 0,
        biometricVerified: true,
        manuallyEdited: false,
      };
      const clockedOut = !isToday || prand() > 0.5;
      if (clockedOut) {
        record.clockOutAt = new Date(y, m, day, 17 + Math.floor(prand() * 1), Math.floor(prand() * 30));
        record.clockOutLat = campusLat;
        record.clockOutLng = campusLng;
        record.clockOutOnPremise = true;
        record.clockOutDistance = 0;
      }
      await prisma.attendance.create({ data: record as never });
    }
  }

  // ═════════════════════════════════════════════════════════════
  // 12. Certificates
  // ═════════════════════════════════════════════════════════════
  console.log("• Creating employee certificates...");
  await prisma.employeeCertificate.deleteMany({});

  const certData = [
    { empId: "EMP-0103", title: "Certified Java Developer", issuer: "Oracle University", certNo: "ORA-JAVA-2024-001", issueDate: new Date("2024-03-15") },
    { empId: "EMP-0104", title: "Teaching Excellence Award", issuer: "RCC Academic Council", certNo: "RCC-TEA-2025-042", issueDate: new Date("2025-06-20") },
    { empId: "EMP-0107", title: "Data Science Fundamentals", issuer: "Coursera / IBM", certNo: "COU-DS-2025-889", issueDate: new Date("2025-01-10") },
    { empId: "EMP-0107", title: "Certified Cloud Practitioner", issuer: "AWS", certNo: "AWS-CCP-2025-114", issueDate: new Date("2025-04-18") },
    { empId: "EMP-0108", title: "TESDA Trainers Methodology", issuer: "TESDA", certNo: "TESDA-TM-2024-789", issueDate: new Date("2024-05-22") },
    { empId: "EMP-0111", title: "Professional Teacher License", issuer: "PRC", certNo: "PRC-LPT-2019-552", issueDate: new Date("2019-08-12") },
    { empId: "EMP-0112", title: "Special Education Seminar", issuer: "DepEd Region III", certNo: "DEPED-SPED-2025-071", issueDate: new Date("2025-02-20") },
    { empId: "EMP-0105", title: "Certified HR Professional", issuer: "HR Philippines", certNo: "HRP-CHRP-2023-781", issueDate: new Date("2023-06-15") },
  ];
  for (const cert of certData) {
    await prisma.employeeCertificate.create({
      data: {
        employeeId: createdEmployees[cert.empId],
        title: cert.title,
        issuer: cert.issuer,
        certificateNo: cert.certNo,
        issueDate: cert.issueDate,
      },
    });
  }

  // ═════════════════════════════════════════════════════════════
  // 13. System settings — premises, biometrics, FPAS enabled groups
  // ═════════════════════════════════════════════════════════════
  console.log("• Creating system settings...");
  const premisesValue = JSON.stringify({
    lat: 15.1428,
    lng: 120.5886,
    radiusMeters: 200,
    label: "Republic Central Colleges - Angeles",
  });
  await prisma.systemSetting.upsert({
    where: { key: "premises_config" },
    update: { value: premisesValue, category: "attendance" },
    create: { key: "premises_config", value: premisesValue, category: "attendance" },
  });
  await prisma.systemSetting.upsert({
    where: { key: "biometrics_enabled" },
    update: {},
    create: { key: "biometrics_enabled", value: "true", category: "biometrics" },
  });
  await prisma.systemSetting.upsert({
    where: { key: "fpas_enabled_groups" },
    update: { value: JSON.stringify([ccs.id, coed.id, hrGroup.id]), category: "fpas" },
    create: { key: "fpas_enabled_groups", value: JSON.stringify([ccs.id, coed.id, hrGroup.id]), category: "fpas" },
  });

  // ═════════════════════════════════════════════════════════════
  // Done — credentials
  // ═════════════════════════════════════════════════════════════
  console.log("");
  console.log("✅ UAT seed complete!");
  console.log("");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🔑 TEST-DAY LOGIN CREDENTIALS (password: RCC2026!)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("admin@rcc.edu.ph          → System Admin (setup, FPAS config, CSV grant)");
  console.log("neil.datu@rcc.edu.ph      → Dean, College of Computer Studies   (DEAN TESTER 1)");
  console.log("jumar.basco@rcc.edu.ph    → Dean, College of Education          (DEAN TESTER 2)");
  console.log("juan.delacruz@rcc.edu.ph  → Professor, CCS  (EMPLOYEE TESTER 1 — 1 VL day left!)");
  console.log("liza.bautista@rcc.edu.ph  → Professor, COED (EMPLOYEE TESTER 2)");
  console.log("hr.head@rcc.edu.ph        → HR Personnel, HR Dept (L2 approver, records, CSV export)");
  console.log("hr.staff@rcc.edu.ph       → HR Personnel, HR Dept (second HR)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("");
  console.log("📋 Dean queues:");
  console.log("  CCS dean  → LR-U001 (Carlos, VL) + LR-U002 (Rita, SL) pending L1;  LR-U003 pending L2");
  console.log("  COED dean → LR-U006 (Ana, VL)   + LR-U007 (Peter, SL) pending L1; LR-U008 pending L2");
  console.log("  HR head   → LR-U003 (CCS) + LR-U008 (COED) pending L2");
  console.log("  Employees → 1 approved request each in history; juan has 14/15 VL used");
  console.log("  Inactive member: EMP-0110 Pedro Sarmiento (hidden from dean lists)");
  console.log("  Evaluation period 'UAT Evaluation Period 2026' is OPEN (CCS + COED, Professors)");
  console.log("  Attendance: whole month (Nov 1 → Nov 30) for all staff except admin/inactive");
  console.log("");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
