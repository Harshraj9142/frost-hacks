import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import NotificationModel from "@/models/Notification";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "10");
    const unreadOnly = searchParams.get("unreadOnly") === "true";

    await connectDB();

    const query: any = { userId: session.user.id };
    if (unreadOnly) {
      query.isRead = false;
    }

    const notifications = await NotificationModel.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const unreadCount = await NotificationModel.countDocuments({
      userId: session.user.id,
      isRead: false,
    });

    return NextResponse.json({
      notifications,
      unreadCount,
    });
  } catch (error: any) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { notificationIds } = await req.json();

    await connectDB();

    // Mark notifications as read
    await NotificationModel.updateMany(
      {
        _id: { $in: notificationIds },
        userId: session.user.id,
      },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
        },
      }
    );

    return NextResponse.json({
      message: "Notifications marked as read",
    });
  } catch (error: any) {
    console.error("Error updating notifications:", error);
    return NextResponse.json(
      { error: "Failed to update notifications" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectDB();

    // Delete all read notifications
    await NotificationModel.deleteMany({
      userId: session.user.id,
      isRead: true,
    });

    return NextResponse.json({
      message: "Read notifications cleared",
    });
  } catch (error: any) {
    console.error("Error deleting notifications:", error);
    return NextResponse.json(
      { error: "Failed to delete notifications" },
      { status: 500 }
    );
  }
}
