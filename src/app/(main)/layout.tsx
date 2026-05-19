import SidebarWrapper from "@/components/SidebarWrapper";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SidebarWrapper />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </>
  );
}
