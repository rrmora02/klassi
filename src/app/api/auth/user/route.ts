import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await currentUser();

    // Get primary email or first email
    const primaryEmail = user?.emailAddresses?.find(e => e.id === user.primaryEmailAddressId)?.emailAddress ||
                        user?.emailAddresses?.[0]?.emailAddress;

    return NextResponse.json({
      id: user?.id,
      email: primaryEmail,
      name: user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.firstName || user?.emailAddresses?.[0]?.emailAddress || "User"
    });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
