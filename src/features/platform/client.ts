import { platformSdk } from "@/features/platform/sdk";
import type { PlatformUsageEventInput } from "@/features/platform/types";

export async function trackPlatformEvent(payload: PlatformUsageEventInput): Promise<void> {
  await platformSdk.trackPlatformEvent(payload);
}
