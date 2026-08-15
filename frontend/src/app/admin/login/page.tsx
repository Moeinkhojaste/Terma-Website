import { AdminLoginPage } from "@/features/admin/admin-login-page";

type PageProps = {
  searchParams: Promise<{ reason?: string }>;
};

export default async function Page({ searchParams }: PageProps) {
  const { reason } = await searchParams;
  return <AdminLoginPage sessionMessage={reason === "expired"} />;
}
