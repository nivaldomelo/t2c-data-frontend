import { useEffect, useState } from "react";

import { PlatformStrategicReport } from "@/features/dashboard/components/platform-strategic-report";
import { trackPlatformEvent } from "@/features/platform/client";
import { useApiQuery } from "@/lib/use-api-query";
import type { StrategicSummary } from "@/features/dashboard/types";

export default function DashboardStrategyPage() {
  const [days, setDays] = useState(30);

  useEffect(() => {
    void trackPlatformEvent({
      event_name: "page_view",
      module_name: "dashboard",
      page_path: "/dashboard/strategy",
      metadata: { view: "strategy", window_days: days },
    });
  }, [days]);

  const { data, isLoading, error } = useApiQuery<StrategicSummary>(
    ["dashboard", "strategic-summary", days],
    `/v1/dashboard/strategic/summary?days=${encodeURIComponent(String(days))}`,
  );

  return (
    <PlatformStrategicReport
      days={days}
      error={error ? error.message : ""}
      loading={isLoading}
      onDaysChange={setDays}
      summary={data ?? null}
    />
  );
}
