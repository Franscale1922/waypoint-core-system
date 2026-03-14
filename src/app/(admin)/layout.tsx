import { Sidebar } from "@/components/Sidebar";
import { auth, signOut } from "@/auth";
import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/admin/login");
  }

  return (
    <div className="flex min-h-screen">
      <div className="flex flex-col">
        <Sidebar />
        {/* Signed-in user footer */}
        <div className="mt-auto p-4 border-t border-slate-700 bg-slate-900">
          <div className="flex items-center gap-3 mb-3">
            {session.user.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={session.user.image}
                alt={session.user.name ?? "User"}
                className="w-8 h-8 rounded-full"
              />
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {session.user.name}
              </p>
              <p className="text-xs text-slate-400 truncate">
                {session.user.email}
              </p>
            </div>
          </div>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/admin/login" });
            }}
          >
            <button
              type="submit"
              className="w-full flex items-center gap-2 text-slate-400 hover:text-white text-sm px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </form>
        </div>
      </div>
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
