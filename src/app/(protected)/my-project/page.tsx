import Link from "next/link";

import { Button } from "@/components/ui/Button";
import { routes } from "@/lib/routes";

export default function LegacyMyProjectRedirectPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <div className="max-w-md space-y-3 rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
        <h1 className="text-xl font-semibold">This workspace route has moved</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Your projects live at <span className="font-semibold">My Projects</span>. Use the link below to head there.
        </p>
        <div className="pt-2">
          <Button asChild>
            <Link href={routes.myProjects()}>Go to My Projects</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
