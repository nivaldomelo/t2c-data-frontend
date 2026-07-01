import { DQSubnav } from "@/components/data-quality/dq-subnav";
import { DataObservabilityPage } from "@/features/data-observability/components/data-observability-page";

export default function ObservabilityPage() {
  return (
    <div className="space-y-5">
      <DQSubnav />
      <DataObservabilityPage />
    </div>
  );
}
