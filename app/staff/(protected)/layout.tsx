import { redirect } from "next/navigation";
import StaffFrame from "@/components/staff/StaffFrame";
import { getStaffSession } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export default async function ProtectedStaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getStaffSession().catch(() => null);
  if (!session) redirect("/staff/login");

  return (
    <StaffFrame role={session.role} email={session.email}>
      {children}
    </StaffFrame>
  );
}
