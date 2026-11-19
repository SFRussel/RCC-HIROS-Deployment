import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAnyPermission } from "@/lib/auth-token";
import { safeFilePart } from "@/lib/pdf-export";

// ─────────────────────────────────────────────────────────────────────
// GET /api/evaluation-forms/[id]/export
// CSV export of a form's criteria (category, description, max score,
// weight). Gated by evaluation.export_forms; form managers can also
// export since they already own the definition.
// ─────────────────────────────────────────────────────────────────────

function csvCell(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  return `"${s.replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAnyPermission(request, [
      "evaluation.export_forms",
      "evaluation.manage_forms",
    ]);
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const form = await db.evaluationForm.findUnique({
      where: { id },
      include: { criteria: { orderBy: { sortOrder: "asc" } } },
    });
    if (!form) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    const rows: unknown[][] = [
      ["No.", "Category", "Criterion", "Max Score", "Weight"],
      ...form.criteria.map((c, idx) => [
        idx + 1,
        c.category,
        c.description,
        c.maxScore,
        c.weight,
      ]),
    ];
    const csv = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");

    const filename = `EVAL-FORM-${safeFilePart(form.name)}-v${form.version}.csv`;

    await db.auditLog.create({
      data: {
        userId: auth.user.id,
        action: "Export Evaluation Form",
        entity: "EvaluationForm",
        entityId: form.id,
        metadata: JSON.stringify({
          name: form.name,
          criteriaCount: form.criteria.length,
        }),
      },
    });

    return new NextResponse("\uFEFF" + csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[API /evaluation-forms/[id]/export GET] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
