// ─────────────────────────────────────────────────────────────────────
// RCC-HIROS — Full UAT profile seed
//
// Fills every employee record with a complete LinkedIn-style profile
// (basic fields + all 9 profileData sections), backfills recent
// attendance, and adds certificates where none exist.
//
// Idempotent: existing values are never overwritten, attendance rows are
// skipped when the (employeeId, date) pair already exists.
//
// Usage (inside the migrate image, same network as db):
//   npx tsx prisma/seed-uat-full.ts
// ─────────────────────────────────────────────────────────────────────

import { db } from "../src/lib/db";

type Row = Record<string, string>;

const MIDDLE_NAMES = ["Santos", "Reyes", "Cruz", "Bautista", "Garcia", "Mendoza", "Torres", "Ramos", "Aquino", "Dizon", "Villanueva", "Sarmiento", "Basco", "Datu", "Sawal", "Villareal"];
const BIRTH_PLACES = ["Manila", "Quezon City", "Cebu City", "Davao City", "Iloilo City", "Batangas City", "Naga City", "Tuguegarao", "Dagupan", "Lucena"];
const ADDRESSES = [
  "12 Mabini St., Barangay San Roque, Quezon City",
  "45 Rizal Ave., Barangay Poblacion, Makati City",
  "8 Del Pilar St., Barangay Malanday, Valenzuela City",
  "77 Bonifacio Ext., Barangay Sta. Cruz, Manila",
  "23 Luna St., Barangay Bagong Silang, Caloocan City",
  "5 Aguinaldo Highway, Barangay Salitran, Dasmarinas",
];
const RELIGIONS = ["Roman Catholic", "Roman Catholic", "Roman Catholic", "Iglesia ni Cristo", "Born Again Christian", "Seventh-day Adventist"];
const BLOOD_TYPES = ["O+", "A+", "B+", "AB+", "O-"];
const CIVIL_STATUS = ["Single", "Married", "Married", "Married", "Widowed"];

const DEGREES = [
  { degree: "Doctor of Philosophy in Education", school: "University of the Philippines Diliman" },
  { degree: "Master of Arts in Teaching", school: "Philippine Normal University" },
  { degree: "Bachelor of Secondary Education", school: "Rizal Technological University" },
  { degree: "Master of Science in Computer Science", school: "De La Salle University" },
  { degree: "Bachelor of Science in Information Technology", school: "Polytechnic University of the Philippines" },
  { degree: "Doctor of Education (Ed.D.)", school: "Centro Escolar University" },
];

const ORGANIZATIONS = [
  "Rizal College of Crafts",
  "St. Scholastica College",
  "Far Eastern University",
  "Technological University of the Philippines",
  "Manila Central University",
];

const SEMINARS = [
  { title: "Outcomes-Based Education and Flexible Learning", scope: "National", nature: "Training-Workshop" },
  { title: "Outcomes-Based Assessment in Higher Education", scope: "Institutional", nature: "Seminar" },
  { title: "Digital Tools for Blended Instruction", scope: "Regional", nature: "Webinar" },
  { title: "Research Writing and Publication Ethics", scope: "National", nature: "Conference" },
  { title: "Data Privacy Act Compliance in Schools", scope: "Institutional", nature: "Orientation" },
];

const AWARDS = [
  { award: "Outstanding Faculty of the Year", institution: "Rizal College of Crafts" },
  { award: "Best Research Paper", institution: "Regional Research Consortium" },
  { award: "Service Excellence Award", institution: "Rizal College of Crafts" },
];

const PUBLICATIONS = [
  { title: "Blended Learning Readiness of Tertiary Faculty", publication: "Philippine Journal of Education Studies", issue: "Vol. 12, No. 2" },
  { title: "Student Engagement in Online Classrooms", publication: "Asia-Pacific Education Review", issue: "Vol. 8, No. 1" },
  { title: "Competency Gaps in IT Graduates", publication: "Journal of Computing Education", issue: "Vol. 5, No. 3" },
];

const ELIGIBILITY = [
  { exam: "Licensure Examination for Teachers (LET)", place: "Professional Regulation Commission", rating: "86.40" },
  { exam: "Civil Service Professional Examination", place: "Civil Service Commission", rating: "84.20" },
  { exam: "Certified IT Professional (Philippines)", place: "IT Professionals Association", rating: "Passed" },
];

const AFFILIATIONS = [
  { organization: "Philippine Association of Colleges and Universities", position: "Member" },
  { organization: "Council of Deans in Education", position: "Member" },
  { organization: "Computing Society of the Philippines", position: "Member" },
];

function pick<T>(arr: readonly T[], n: number): T {
  return arr[Math.abs(n) % arr.length];
}

function seeded(seed: number) {
  let state = seed % 2147483647;
  if (state <= 0) state += 2147483646;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

function genderFor(firstName: string): string {
  const female = ["Liza", "Grace", "Rita", "Ana", "Joyce", "Maria", "Josefina"];
  return female.includes(firstName) ? "Female" : "Male";
}

function rankFor(roleName: string | null, employmentType: string): string {
  if (roleName === "Dean") return "Professor VI";
  if (roleName === "System Admin") return "Information Technology Officer II";
  if (roleName === "HR Personnel") return "Administrative Officer III";
  if (employmentType === "Non-Teaching") return "Administrative Aide IV";
  return "Assistant Professor II";
}

function buildProfile(index: number, roleName: string | null): Record<string, Row[]> {
  const rnd = seeded(index * 7919 + 13);
  const jitter = (max: number) => Math.floor(rnd() * max);
  const two = (n: number) => String(n).padStart(2, "0");

  return {
    education: [0, 1, 2].map((k) => {
      const d = pick(DEGREES, index + k);
      return { degree: d.degree, dateEarned: String(2005 + jitter(14)), school: d.school };
    }),
    experience: [0, 1, 2].map((k) => ({
      position:
        k === 0
          ? rankFor(roleName, "Teaching")
          : pick(["Instructor I", "Instructor III", "Lecturer", "Research Assistant"], index + k),
      year: `${2008 + k * 4} - ${k === 0 ? "Present" : String(2008 + k * 4 + 3)}`,
      organization: pick(ORGANIZATIONS, index + k),
    })),
    eligibility: [0, 1].map((k) => {
      const e = pick(ELIGIBILITY, index + k);
      return {
        exam: e.exam,
        place: e.place,
        date: `${2006 + jitter(10)}-${two(1 + jitter(12))}-15`,
        rating: e.rating,
      };
    }),
    awards: [0, 1].map((k) => {
      const a = pick(AWARDS, index + k);
      return { award: a.award, year: String(2016 + jitter(8)), institution: a.institution };
    }),
    publications: [0, 1].map((k) => {
      const p = pick(PUBLICATIONS, index + k);
      return { title: p.title, publication: p.publication, issue: p.issue };
    }),
    affiliations: [0, 1].map((k) => {
      const a = pick(AFFILIATIONS, index + k);
      return { organization: a.organization, position: a.position, date: String(2012 + jitter(10)) };
    }),
    seminars: [0, 1, 2].map((k) => {
      const s = pick(SEMINARS, index + k);
      return {
        title: s.title,
        scope: s.scope,
        date: `${2019 + jitter(6)}-${two(1 + jitter(12))}-${two(1 + jitter(27))}`,
        nature: s.nature,
      };
    }),
    accomplishments: [0, 1].map((k) => ({
      function: pick(
        ["Curriculum Review Committee", "Accreditation Task Force", "Research Committee", "Community Extension Program"],
        index + k
      ),
      nature: pick(["Chairperson", "Member", "Coordinator", "Facilitator"], index + k),
    })),
    community: [
      {
        title: pick(["Barangay Literacy Program", "Coastal Clean-Up Drive", "Free Tutorial Sessions", "Tree Planting Activity"], index),
        beneficiaries: pick(["Out-of-school youth", "Barangay residents", "Grade 6 pupils", "Local fisherfolk"], index),
        date: `${2021 + jitter(5)}-${two(1 + jitter(12))}-10`,
        nature: pick(["Outreach", "Extension", "Volunteer Work", "Community Service"], index),
      },
    ],
  };
}

async function main() {
  const employees = await db.employee.findMany({
    include: { role: true },
    orderBy: { employeeId: "asc" },
  });
  console.log(`Employees found: ${employees.length}`);

  const today = new Date();
  let profilesUpdated = 0;
  let attendanceCreated = 0;
  let certificatesCreated = 0;

  for (let i = 0; i < employees.length; i++) {
    const emp = employees[i];
    const roleName = emp.role?.name ?? null;
    const rnd = seeded(i * 104729 + 7);
    const jitter = (max: number) => Math.floor(rnd() * max);

    const birthday = new Date(1972 + jitter(20), jitter(12), 1 + jitter(27));
    const phone = `09${String(170000000 + jitter(80000000)).slice(0, 9)}`;

    // Merge profileData: only add sections that are missing or empty.
    let existing: Record<string, Row[]> = {};
    if (emp.profileData) {
      try {
        existing = JSON.parse(emp.profileData) as Record<string, Row[]>;
      } catch {
        existing = {};
      }
    }
    const merged: Record<string, Row[]> = { ...existing };
    let sectionsAdded = 0;
    for (const [key, rows] of Object.entries(buildProfile(i, roleName))) {
      const current = merged[key];
      if (!Array.isArray(current) || current.length === 0) {
        merged[key] = rows;
        sectionsAdded += 1;
      }
    }

    const patch = {
      ...(emp.middleName ? {} : { middleName: pick(MIDDLE_NAMES, i) }),
      ...(emp.phone ? {} : { phone }),
      ...(emp.address ? {} : { address: pick(ADDRESSES, i) }),
      ...(emp.birthday ? {} : { birthday }),
      ...(emp.gender ? {} : { gender: genderFor(emp.firstName) }),
      ...(emp.placeOfBirth ? {} : { placeOfBirth: pick(BIRTH_PLACES, i) }),
      ...(emp.rank ? {} : { rank: rankFor(roleName, emp.employmentType) }),
      ...(emp.civilStatus ? {} : { civilStatus: pick(CIVIL_STATUS, i) }),
      ...(emp.citizenship ? {} : { citizenship: "Filipino" }),
      ...(emp.religion ? {} : { religion: pick(RELIGIONS, i) }),
      ...(emp.height ? {} : { height: `${155 + jitter(25)} cm` }),
      ...(emp.weight ? {} : { weight: `${52 + jitter(30)} kg` }),
      ...(emp.bloodType ? {} : { bloodType: pick(BLOOD_TYPES, i) }),
      ...(sectionsAdded > 0 ? { profileData: JSON.stringify(merged) } : {}),
    };

    if (Object.keys(patch).length > 0) {
      await db.employee.update({ where: { id: emp.id }, data: patch });
      profilesUpdated += 1;
    }

    // Certificates: two per employee when none exist.
    const certCount = await db.employeeCertificate.count({ where: { employeeId: emp.id } });
    if (certCount === 0) {
      await db.employeeCertificate.createMany({
        data: [
          {
            employeeId: emp.id,
            title: "Certificate of Employment",
            issuer: "Rizal College of Crafts",
            certificateNo: `COE-${emp.employeeId}`,
            issueDate: emp.hireDate ?? new Date(2015, 5, 1),
          },
          {
            employeeId: emp.id,
            title: "Professional Development Certificate",
            issuer: "Philippine Normal University",
            certificateNo: `PD-${emp.employeeId}-${2019 + jitter(5)}`,
            issueDate: new Date(2019 + jitter(5), jitter(12), 1 + jitter(27)),
          },
        ],
      });
      certificatesCreated += 2;
    }

    // Attendance: last 60 calendar days, weekdays only, active employees.
    if (!emp.active) continue;
    for (let back = 1; back <= 60; back++) {
      const day = new Date(today.getFullYear(), today.getMonth(), today.getDate() - back);
      const dow = day.getDay();
      if (dow === 0 || dow === 6) continue;

      const exists = await db.attendance.findUnique({
        where: { employeeId_date: { employeeId: emp.id, date: day } },
        select: { id: true },
      });
      if (exists) continue;

      const y = day.getFullYear();
      const m = day.getMonth();
      const d = day.getDate();
      await db.attendance.create({
        data: {
          employeeId: emp.id,
          date: day,
          clockInAt: new Date(y, m, d, 7, 40 + jitter(35)),
          clockOutAt: new Date(y, m, d, 16, 45 + jitter(30)),
          clockInLat: 14.5995,
          clockInLng: 120.9842,
          clockInOnPremise: true,
          clockInDistance: jitter(60),
          clockOutLat: 14.5995,
          clockOutLng: 120.9842,
          clockOutOnPremise: true,
          clockOutDistance: jitter(60),
          biometricVerified: true,
        },
      });
      attendanceCreated += 1;
    }
  }

  console.log(`Profiles updated:      ${profilesUpdated}`);
  console.log(`Attendance rows added: ${attendanceCreated}`);
  console.log(`Certificates added:    ${certificatesCreated}`);
}

main()
  .then(async () => {
    await db.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await db.$disconnect();
    process.exit(1);
  });
