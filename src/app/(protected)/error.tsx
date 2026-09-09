"use client";

import { Button } from "@/components/ui/Button";
import { routes } from "@/lib/routes";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md text-center text-gray-800">
        <h1 className="text-2xl font-bold">Something went wrong.</h1>
        <p className="mt-2 text-gray-600">
          Please try again or contact the admin.
        </p>
        <div className="mt-4 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
          <Button type="button" onClick={reset}>
            Try again
          </Button>
          <Button asChild variant="secondary">
            <a href={routes.myProjects()}>Back to projects</a>
          </Button>
        </div>
      </div>
    </div>
  );
}
