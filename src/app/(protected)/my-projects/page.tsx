import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { verifyAuthToken } from "@/lib/auth";
import { getMyProjects } from "@/lib/services/myProjects";

import CreateProjectTrigger from "./CreateProjectTrigger";
import { MyProjectsTable } from "./MyProjectsTable";

export default async function MyProjectsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  if (!token) {
    redirect("/login");
  }

  const payload = verifyAuthToken(token);

  if (!payload?.userId) {
    redirect("/login");
  }

  const projects = await getMyProjects(payload.userId);

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-50">
              My Projects
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Your active projects and recent activity
            </p>
          </div>
          <CreateProjectTrigger />
        </header>

        <MyProjectsTable
          projects={projects}
          createAction={<CreateProjectTrigger />}
        />
      </div>
    </main>
  );
}
