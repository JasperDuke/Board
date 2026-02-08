import { NextRequest, NextResponse } from "next/server";

import { getUserFromRequest } from "../../../lib/auth";
import { getMyProjects } from "../../../lib/services/myProjects";

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const projects = await getMyProjects(user.id);

    return NextResponse.json(projects);
  } catch (error) {
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
