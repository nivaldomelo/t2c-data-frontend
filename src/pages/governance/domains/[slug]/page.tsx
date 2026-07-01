import { SemanticDomainDetailPage } from "@/features/semantic/components/domain-detail-page";

export default async function GovernanceDomainDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <SemanticDomainDetailPage slug={decodeURIComponent(slug)} />;
}
