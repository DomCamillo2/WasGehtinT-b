import { requireInternalAdmin } from "@/lib/admin-guard";
import { validateSupabaseAdminConfig } from "@/lib/supabase/validate";
import { type AdminDashboardData, loadAdminDashboardData } from "@/services/admin/admin-dashboard-service";

export type AdminPageSearchParams = {
  type?: string;
  scope?: string;
  decision?: string;
  message?: string;
};

export type AdminActionNotice =
  | {
      type: "success" | "error";
      message: string;
    }
  | null;

export type AdminConfigState = ReturnType<typeof validateSupabaseAdminConfig>;

export type AdminPageData = {
  adminConfig: AdminConfigState;
  actionNotice: AdminActionNotice;
  dashboard: AdminDashboardData;
};

function getActionNotice(searchParams: AdminPageSearchParams): AdminActionNotice {
  if (typeof searchParams.message !== "string" || searchParams.message.trim().length === 0) {
    return null;
  }

  return {
    type: searchParams.type === "success" ? "success" : "error",
    message: searchParams.message.trim(),
  };
}

export async function loadAdminPageData(searchParams: AdminPageSearchParams = {}): Promise<AdminPageData> {
  await requireInternalAdmin();

  return {
    adminConfig: validateSupabaseAdminConfig(),
    actionNotice: getActionNotice(searchParams),
    dashboard: await loadAdminDashboardData(),
  };
}
