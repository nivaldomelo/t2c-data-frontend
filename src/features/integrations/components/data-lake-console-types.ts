import type { DataLakeAuthType } from "@/features/integrations/types";

export type DataLakeForm = {
  name: string;
  description: string;
  bucket: string;
  region: string;
  prefix: string;
  auth_type: DataLakeAuthType;
  freshness_sla_hours_default: string;
  freshness_sla_hours_bronze: string;
  freshness_sla_hours_silver: string;
  freshness_sla_hours_gold: string;
  aws_access_key_id: string;
  aws_secret_access_key: string;
  aws_session_token: string;
  role_arn: string;
  is_active: boolean;
};

export type DataLakeScheduleForm = {
  schedule_mode: string;
  schedule_enabled: boolean;
  schedule_every_minutes: string;
  schedule_time: string;
  schedule_day_of_week: string;
  schedule_day_of_month: string;
  schedule_anchor_date: string;
};

export type ConnectionDialogMode = "create" | "edit";
