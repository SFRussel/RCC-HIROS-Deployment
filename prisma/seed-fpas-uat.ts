// ═══════════════════════════════════════════════════════════════
// RCC-HIROS — FPAS UAT Seed (seed-fpas-uat.ts)
// Adds testable FPAS submissions on top of seed-uat.ts.
//
//   • Seeds FpasSubmission rows for the FACULTY POOL only
//     (CCS: Carlos/Rita/Marco · COEd: Ana/Peter/Joyce · HR: Karen/Mark)
//   • Leaves the 4 TESTERS (Neil, Jumar, Juan, Liza) and admin WITHOUT
//     submissions so they exercise the self-fill flow themselves
//     (Dean guide Task 16 / Employee guide Task 13 → TC-36)
//   • Pre-filled pool gives the deans' merged-PDF / ZIP exports
//     (Dean guide Tasks 18–19 → TC-36) real content
//
// formData mirrors src/lib/fpas-form.ts (row fields: title, nature,
// institution, points); totalPoints comes from the app's own
// calculateTotal() so the saved score always matches the UI.
//
// Run (in the migrate container, like the other seeds):
//   npx tsx prisma/seed-fpas-uat.ts
// ═══════════════════════════════════════════════════════════════

import { db as prisma } from "../src/lib/db";
import { calculateTotal, type FpasFormData } from "../src/lib/fpas-form";

const SCHOOL_YEAR = "2026-2027";

let rowCounter = 0;
function row(
  title: string,
  points: number,
  nature = "Participant",
  institution = ""
) {
  rowCounter += 1;
  return {
    id: `uatr${String(rowCounter).padStart(3, "0")}`,
    title,
    nature,
    institution,
    points,
  };
}

interface PersonSpec {
  email: string;
  dateEnteredRcc: string;
  degreeInstitution: string;
  c1: FpasFormData["criteria1"];
  c2: FpasFormData["criteria2"];
  c3: FpasFormData["criteria3"];
  c4: FpasFormData["criteria4"];
  c5: FpasFormData["criteria5"];
  c6: FpasFormData["criteria6"];
}

const PEOPLE: PersonSpec[] = [
  // ── CCS faculty pool ──────────────────────────────────────────
  {
    email: "carlos.mendoza@rcc.edu.ph",
    dateEnteredRcc: "2015-06-01",
    degreeInstitution: "MS Information Technology - Holy Angel University",
    c1: { studentEvaluation: 4.5, classroomPerformance: 3.5, gradeSubmission: 2.5, gradeAccuracy: 2, classRecordSubmission: 2, gradingSheetSubmission: 2, syllabiSubmission: 2, syllabiFormat: true, syllabiObjectives: true, syllabiReferences: true, testPaperSubmission: 1.5, testItemQuality: 1.5, testAdministration: 1.5 },
    c2: { absences: 3, tardiness: 4, schoolActivities: 3, facultyMeetings: 3, libraryVisits: 2 },
    c3: {
      graduateDegree: [row("Master of Science in Information Technology", 9, "Graduated with academic distinction", "Holy Angel University")],
      facultyDevelopment: [row("Institutional Faculty Development Workshop 2026", 2, "Resource speaker")],
      seminars: [row("Seminar on Outcome-Based Education", 1.5, "Participant"), row("CHED Regional Teaching Conference", 1.5, "Participant")],
      specialStudies: [row("Short Course: Applied Data Analytics", 1, "Completed 40 hours")],
      awards: [row("Faculty of the Year (College of Computer Studies)", 2, "AY 2025-2026", "RCC")],
      professionalOrgs: [row("Philippine Society of IT Educators", 1, "Member", "PSITE Region III")],
    },
    c4: {
      discoveries: [],
      publications: [row("Blended Learning Effectiveness in Philippine Colleges", 3, "Journal article, 2025")],
      researchStudies: [row("Campus Wi-Fi Utilization Study", 2, "Institutional research, ongoing")],
      researchArticles: [row("AI Tutors for Programming Courses", 2, "Refereed article, 2024")],
    },
    c5: {
      adviser: [row("BSIT Capstone Advising, 12 students", 2, "AY 2025-2026")],
      coach: [row("Regional Programming Competition", 1, "Team coach - 2nd place")],
      officialFunctions: [row("Accreditation Working Committee", 2, "Document lead")],
    },
    c6: {
      projectsInitiated: [row("Peer Programming Mentoring Program", 2, "Initiator")],
      projectsParticipated: [row("Community Computer Literacy Outreach", 2, "Volunteer trainer")],
      memberships: [row("Knights of Columbus", 2, "Member", "5 years")],
    },
  },
  // ── CCS: Rita ────────────────────────────────────────────────
  {
    email: "rita.villareal@rcc.edu.ph",
    dateEnteredRcc: "2019-01-07",
    degreeInstitution: "MS Information Technology - Holy Angel University (units)",
    c1: { studentEvaluation: 4, classroomPerformance: 3, gradeSubmission: 2, gradeAccuracy: 2, classRecordSubmission: 2, gradingSheetSubmission: 2, syllabiSubmission: 1.5, syllabiFormat: true, syllabiObjectives: true, syllabiReferences: false, testPaperSubmission: 1, testItemQuality: 1, testAdministration: 1 },
    c2: { absences: 2, tardiness: 3, schoolActivities: 2, facultyMeetings: 3, libraryVisits: 1 },
    c3: {
      graduateDegree: [],
      facultyDevelopment: [row("Institutional Faculty Development Workshop 2026", 2, "Participant")],
      seminars: [row("Seminar on Outcome-Based Education", 1.5, "Participant")],
      specialStudies: [],
      awards: [],
      professionalOrgs: [row("Philippine Society of IT Educators", 1, "Member", "PSITE Region III")],
    },
    c4: { discoveries: [], publications: [], researchStudies: [row("Attendance Analytics Pilot Study", 2, "Departmental research")], researchArticles: [] },
    c5: { adviser: [], coach: [], officialFunctions: [row("Foundation Day Committee", 2, "Member")] },
    c6: {
      projectsInitiated: [],
      projectsParticipated: [row("ICT Literacy Outreach Program", 2, "Volunteer")],
      memberships: [],
    },
  },
  // ── CCS: Marco ───────────────────────────────────────────────
  {
    email: "marco.torres@rcc.edu.ph",
    dateEnteredRcc: "2017-08-14",
    degreeInstitution: "MA Educational Management - Republic Central Colleges",
    c1: { studentEvaluation: 4.5, classroomPerformance: 4, gradeSubmission: 2, gradeAccuracy: 2, classRecordSubmission: 2, gradingSheetSubmission: 2, syllabiSubmission: 2, syllabiFormat: true, syllabiObjectives: true, syllabiReferences: true, testPaperSubmission: 1, testItemQuality: 1, testAdministration: 1 },
    c2: { absences: 4, tardiness: 4, schoolActivities: 3, facultyMeetings: 3, libraryVisits: 2 },
    c3: {
      graduateDegree: [row("MA Educational Management", 9, "Thesis track - in progress", "RCC Graduate School")],
      facultyDevelopment: [row("Institutional Faculty Development Workshop 2026", 2, "Participant")],
      seminars: [row("Campus Journalism Advisers Training", 1.5, "Participant"), row("First Aid & Safety Seminar", 1.5, "Participant")],
      specialStudies: [],
      awards: [],
      professionalOrgs: [row("Philippine Society of IT Educators", 1, "Member", "PSITE Region III")],
    },
    c4: { discoveries: [], publications: [row("Micro-Credentials for IT Students", 3, "Conference paper, 2025")], researchStudies: [], researchArticles: [] },
    c5: { adviser: [row("Student Organization Adviser", 2, "CCS Student Council")], coach: [], officialFunctions: [row("Enrollment Committee", 2, "Registrar liaison")] },
    c6: { projectsInitiated: [], projectsParticipated: [row("Tree Planting Drive", 2, "Volunteer")], memberships: [row("Parish Youth Council", 2, "Adviser", "8 years")] },
  },
  // ── COEd faculty pool ────────────────────────────────────────
  {
    email: "ana.villanueva@rcc.edu.ph",
    dateEnteredRcc: "2014-06-02",
    degreeInstitution: "MA Education (English) - Holy Angel University",
    c1: { studentEvaluation: 4.5, classroomPerformance: 4, gradeSubmission: 2.5, gradeAccuracy: 2.5, classRecordSubmission: 2, gradingSheetSubmission: 2, syllabiSubmission: 2, syllabiFormat: true, syllabiObjectives: true, syllabiReferences: true, testPaperSubmission: 1, testItemQuality: 1, testAdministration: 1.5 },
    c2: { absences: 4, tardiness: 4, schoolActivities: 2, facultyMeetings: 3, libraryVisits: 2 },
    c3: {
      graduateDegree: [row("MA Education major in English", 9, "Graduated cum laude", "Holy Angel University")],
      facultyDevelopment: [row("Institutional Faculty Development Workshop 2026", 2, "Facilitator")],
      seminars: [row("National Reading Convention", 1.5, "Participant"), row("Licensure Exam Review Seminar", 1.5, "Resource person")],
      specialStudies: [row("Diploma Course: Special Needs Education", 1, "18 units earned")],
      awards: [row("Outstanding Faculty (College of Education)", 2, "AY 2024-2025", "RCC"), row("10 Years of Service Award", 2, "2024", "RCC")],
      professionalOrgs: [row("Reading Association of the Philippines", 1, "Member", "RAP")],
    },
    c4: { discoveries: [], publications: [row("Phonics Instruction in Early Grades", 3, "Journal article, 2026"), row("Bridging Literacy Gaps", 2, "Magazine feature, 2025")], researchStudies: [row("Reading Proficiency Longitudinal Study", 2, "Institutional research")], researchArticles: [] },
    c5: { adviser: [row("Practice Teaching Supervision", 2, "18 student teachers")], coach: [row("Inter-School Debate Festival", 1, "Coach - champion")], officialFunctions: [row("Commencement Exercises Committee", 2, "Program lead")] },
    c6: { projectsInitiated: [row("Reading Remediation Program", 2, "Program lead")], projectsParticipated: [row("Book Donation Drive", 1, "Volunteer")], memberships: [row("Rotary Club of Angeles", 2, "Member", "6 years")] },
  },
  // ── COEd: Peter ──────────────────────────────────────────────
  {
    email: "peter.santos@rcc.edu.ph",
    dateEnteredRcc: "2020-11-09",
    degreeInstitution: "BSE Mathematics - Republic Central Colleges",
    c1: { studentEvaluation: 3.5, classroomPerformance: 3, gradeSubmission: 2, gradeAccuracy: 1.5, classRecordSubmission: 2, gradingSheetSubmission: 2, syllabiSubmission: 1.5, syllabiFormat: true, syllabiObjectives: true, syllabiReferences: false, testPaperSubmission: 1, testItemQuality: 1, testAdministration: 1 },
    c2: { absences: 2, tardiness: 2, schoolActivities: 2, facultyMeetings: 3, libraryVisits: 1 },
    c3: {
      graduateDegree: [],
      facultyDevelopment: [row("Institutional Faculty Development Workshop 2026", 2, "Participant")],
      seminars: [row("Numeracy Intervention Seminar", 1.5, "Participant")],
      specialStudies: [],
      awards: [],
      professionalOrgs: [],
    },
    c4: { discoveries: [], publications: [], researchStudies: [], researchArticles: [] },
    c5: { adviser: [], coach: [row("Intramurals Mathematics Quiz Bowl", 1, "Coach")], officialFunctions: [row("Sports Fest Committee", 2, "Member")] },
    c6: { projectsInitiated: [], projectsParticipated: [row("Brigada Eskwela", 1, "Volunteer")], memberships: [] },
  },
  // ── COEd: Joyce ──────────────────────────────────────────────
  {
    email: "joyce.ramos@rcc.edu.ph",
    dateEnteredRcc: "2016-06-06",
    degreeInstitution: "MA Science Education - Holy Angel University",
    c1: { studentEvaluation: 4.5, classroomPerformance: 4, gradeSubmission: 2, gradeAccuracy: 2, classRecordSubmission: 2, gradingSheetSubmission: 2, syllabiSubmission: 2, syllabiFormat: true, syllabiObjectives: true, syllabiReferences: true, testPaperSubmission: 1, testItemQuality: 1, testAdministration: 1 },
    c2: { absences: 4, tardiness: 4, schoolActivities: 3, facultyMeetings: 3, libraryVisits: 2 },
    c3: {
      graduateDegree: [row("MA Science Education", 9, "Graduated, comprehensive exam passed", "Holy Angel University")],
      facultyDevelopment: [row("Institutional Faculty Development Workshop 2026", 2, "Participant")],
      seminars: [row("STEM Teaching National Convention", 1.5, "Participant"), row("Laboratory Safety Training", 1.5, "Participant")],
      specialStudies: [],
      awards: [row("Research Presenter of the Year (nominee)", 2, "AY 2025-2026", "RCC")],
      professionalOrgs: [row("Science Teachers Association", 1, "Member", "STA-Pampanga")],
    },
    c4: { discoveries: [], publications: [row("Inquiry-Based Science Labs", 3, "Journal article, 2026")], researchStudies: [row(" Modular vs Traditional Lab Instruction", 2, "Action research")], researchArticles: [] },
    c5: { adviser: [row("Science Club Adviser", 2, "Campus science club")], coach: [row("Regional Science Quiz", 1, "Coach - 3rd place")], officialFunctions: [row("Laboratory Inventory Committee", 2, "Lead")] },
    c6: { projectsInitiated: [], projectsParticipated: [row("Coastal Cleanup Drive", 2, "Volunteer")], memberships: [row("Women's Guild", 2, "Secretary", "7 years")] },
  },
  // ── HR pool ──────────────────────────────────────────────────
  {
    email: "karen.dizon@rcc.edu.ph",
    dateEnteredRcc: "2021-03-01",
    degreeInstitution: "BS Psychology - Holy Angel University",
    c1: { studentEvaluation: 3, classroomPerformance: 3, gradeSubmission: 2, gradeAccuracy: 2, classRecordSubmission: 1.5, gradingSheetSubmission: 1.5, syllabiSubmission: 1, syllabiFormat: true, syllabiObjectives: true, syllabiReferences: false, testPaperSubmission: 0.5, testItemQuality: 0.5, testAdministration: 0.5 },
    c2: { absences: 3, tardiness: 3, schoolActivities: 2, facultyMeetings: 3, libraryVisits: 1 },
    c3: {
      graduateDegree: [],
      facultyDevelopment: [row("HR Best Practices Workshop 2026", 2, "Participant")],
      seminars: [row("Civil Service HR Seminar", 1.5, "Participant")],
      specialStudies: [],
      awards: [],
      professionalOrgs: [],
    },
    c4: { discoveries: [], publications: [], researchStudies: [], researchArticles: [] },
    c5: { adviser: [], coach: [], officialFunctions: [row("Orientation Committee", 2, "Logistics lead")] },
    c6: { projectsInitiated: [], projectsParticipated: [row("Employee Wellness Fair", 1, "Volunteer")], memberships: [] },
  },
  {
    email: "mark.aquino@rcc.edu.ph",
    dateEnteredRcc: "2022-08-15",
    degreeInstitution: "BS Information Systems - Republic Central Colleges",
    c1: { studentEvaluation: 3, classroomPerformance: 2.5, gradeSubmission: 2, gradeAccuracy: 1.5, classRecordSubmission: 1.5, gradingSheetSubmission: 1.5, syllabiSubmission: 1, syllabiFormat: true, syllabiObjectives: false, syllabiReferences: false, testPaperSubmission: 0.5, testItemQuality: 0.5, testAdministration: 0.5 },
    c2: { absences: 2, tardiness: 3, schoolActivities: 2, facultyMeetings: 2, libraryVisits: 1 },
    c3: {
      graduateDegree: [],
      facultyDevelopment: [],
      seminars: [row("Records Management Seminar", 1.5, "Participant")],
      specialStudies: [],
      awards: [],
      professionalOrgs: [],
    },
    c4: { discoveries: [], publications: [], researchStudies: [], researchArticles: [] },
    c5: { adviser: [], coach: [], officialFunctions: [row("Enrollment Records Desk", 2, "Committee member")] },
    c6: { projectsInitiated: [], projectsParticipated: [row("Records Digitization Initiative", 2, "Encoder")], memberships: [] },
  },
];

async function main() {
  console.log(`Seeding FPAS test submissions for school year ${SCHOOL_YEAR}...\n`);

  for (const spec of PEOPLE) {
    const emp = await prisma.employee.findFirst({
      where: { email: spec.email },
      select: { id: true, firstName: true, lastName: true, active: true, group: { select: { code: true } } },
    });
    if (!emp) {
      console.log(`⚠️  ${spec.email} not found — skipping (run seed-uat.ts first)`);
      continue;
    }
    if (!emp.active) {
      console.log(`⚠️  ${spec.email} is inactive — skipping (inactive staff must not appear in FPAS exports)`);
      continue;
    }

    const data: FpasFormData = {
      header: {
        name: `${emp.firstName} ${emp.lastName}`,
        department: emp.group?.code ?? "",
        dateEnteredRcc: spec.dateEnteredRcc,
        degreeInstitution: spec.degreeInstitution,
        schoolYear: SCHOOL_YEAR,
      },
      criteria1: spec.c1,
      criteria2: spec.c2,
      criteria3: spec.c3,
      criteria4: spec.c4,
      criteria5: spec.c5,
      criteria6: spec.c6,
    };
    const total = Math.round(calculateTotal(data) * 10) / 10;

    await prisma.fpasSubmission.upsert({
      where: { employeeId_schoolYear: { employeeId: emp.id, schoolYear: SCHOOL_YEAR } },
      create: { employeeId: emp.id, schoolYear: SCHOOL_YEAR, formData: JSON.stringify(data), totalPoints: total },
      update: { formData: JSON.stringify(data), totalPoints: total },
    });

    console.log(`✅ ${emp.firstName} ${emp.lastName} (${emp.group?.code ?? "?"}) — ${total} pts`);
  }

  const count = await prisma.fpasSubmission.count({ where: { schoolYear: SCHOOL_YEAR } });
  console.log(`\n✅ FPAS seed complete — ${count} submission(s) for ${SCHOOL_YEAR}`);
  console.log("   Testers (Neil, Jumar, Juan, Liza) intentionally left WITHOUT submissions");
  console.log("   so they can test the self-fill flow (TC-36 tasks 13/16).");
}

main()
  .catch((e) => {
    console.error("❌ FPAS seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
