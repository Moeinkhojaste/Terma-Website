import { AdminCmsEditor } from "@/features/admin/cms/admin-cms-editor";
export default async function Page({ params }: { params: Promise<{ id: string }> }) { return <AdminCmsEditor id={(await params).id} />; }
