import { revokeUserApiKey } from "@/lib/api-keys";
import { getAuthenticatedDb } from "@/lib/server-context";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await getAuthenticatedDb();
  if ("error" in context) return context.error;

  const { id } = await params;
  const revoked = await revokeUserApiKey(context.db, {
    userId: context.userId,
    keyId: id,
  });

  if (!revoked) {
    return Response.json(
      { error: "NOT_FOUND", message: "API key not found." },
      { status: 404 },
    );
  }

  return Response.json({ ok: true });
}
