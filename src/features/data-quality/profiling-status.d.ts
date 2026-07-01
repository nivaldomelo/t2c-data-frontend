export type ProfilingRunLike = {
  status?: string | null;
  execution_engine?: string | null;
  queued_at?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
  error_message?: string | null;
};

export type ProfilingStatusTone = "neutral" | "accent" | "success" | "warning" | "danger";

export type ProfilingStatusPresentation = {
  state: string;
  tone: ProfilingStatusTone;
  label: string;
  detail: string;
};

export type BuildProfilingStatusInput = {
  runLoading: boolean;
  currentRun: ProfilingRunLike | null;
  hasActiveRun: boolean;
};

export function buildProfilingStatus(input: BuildProfilingStatusInput): ProfilingStatusPresentation;

declare const profilingStatus: {
  buildProfilingStatus: typeof buildProfilingStatus;
};

export default profilingStatus;
