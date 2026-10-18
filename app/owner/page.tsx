import { redirect } from "next/navigation";
import { isOwner } from "../../src/server";
import OwnerPanel from "../../src/owner-panel";
export const dynamic = "force-dynamic";
export default async function OwnerPage() {
  if (!(await isOwner())) redirect("/owner/login");
  return <OwnerPanel />;
}
