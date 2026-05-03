import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { loadAdminPageData } from "@/services/admin/admin-page-service";

export const dynamic = "force-dynamic";

export default async function AdminPage({
  searchParams,
}: {
  searchParams?: Promise<{
    type?: string;
    scope?: string;
    decision?: string;
    message?: string;
  }>;
}) {
  const pageData = await loadAdminPageData((await searchParams) ?? {});

  return <AdminDashboard {...pageData} />;
}
