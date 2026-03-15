import { signIn } from "@/auth";
import { LogIn } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-10 w-full max-w-sm shadow-2xl text-center space-y-6">
        {/* Logo mark */}
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
            <LogIn className="w-7 h-7 text-white" />
          </div>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-white">Waypoint Admin</h1>
          <p className="text-slate-400 text-sm mt-1">Sign in to access your dashboard</p>
        </div>

        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/admin/dashboard" });
          }}
        >
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-50 text-slate-800 font-semibold px-6 py-3 rounded-xl shadow transition-colors"
          >
            {/* Google "G" icon */}
            <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
              <g fill="none" fillRule="evenodd">
                <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
                <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
              </g>
            </svg>
            Sign in with Google
          </button>
        </form>

        <p className="text-slate-500 text-xs">
          Access restricted to authorized accounts only.
        </p>
      </div>
    </div>
  );
}
