import { auth, signOut } from "@/auth";
import Sidebar from "./Sidebar";

export default async function SidebarWrapper() {
  const session = await auth();

  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <Sidebar
      role={session?.user?.role ?? "RECRUITER"}
      userName={session?.user?.name ?? ""}
      userEmail={session?.user?.email ?? ""}
      signOutAction={handleSignOut}
    />
  );
}
