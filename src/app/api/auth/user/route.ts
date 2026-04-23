import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await currentUser();
    return NextResponse.json({
      id: user?.id,
      email: user?.emailAddresses?.[0]?.emailAddress,
      name: user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.firstName || "User"
    });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
