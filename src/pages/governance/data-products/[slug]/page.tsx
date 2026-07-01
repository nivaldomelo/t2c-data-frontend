import { SemanticProductDetailPage } from "@/features/semantic/components/product-detail-page";

export default async function GovernanceDataProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <SemanticProductDetailPage slug={decodeURIComponent(slug)} />;
}
