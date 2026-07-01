import { DatalakesPageClient } from "@/features/datalakes/datalakes-page-client";

export default async function DatalakeTablePage({
  params,
}: {
  params: Promise<{ tableId: string }>;
}) {
  const { tableId } = await params;
  const parsed = Number(tableId);
  return <DatalakesPageClient tableId={Number.isFinite(parsed) ? parsed : null} />;
}
