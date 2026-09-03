import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { SiteShell } from "@/components/layout/site-shell";

export default function AdminPage() {
  return <SiteShell><AdminDashboard /></SiteShell>;
}
