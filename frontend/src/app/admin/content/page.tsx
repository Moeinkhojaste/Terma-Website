import { AdminContentPage } from "@/features/admin/admin-operations-pages";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function Page() {
  return <AdminContentPage />;
}
