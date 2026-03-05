/**
 * 会話メッセージ取得APIエンドポイント
 *
 * GET /api/conversations/[id]/messages - 指定した会話IDに紐づくメッセージ一覧を取得
 */
import { NextResponse } from "next/server";
import { prisma } from "@/infrastructure/prisma-client";

/** Next.js App Router のルートパラメータ型 */
type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * 会話に紐づくメッセージ一覧を取得する
 *
 * Prisma の include を使用して会話の存在確認とメッセージ取得を一括で行い、
 * N+1問題を防止する。メッセージは作成日時の昇順で返却する。
 */
export async function GET(_req: Request, context: RouteContext) {
  try {
    const { id } = await context.params;

    // 会話の存在確認とメッセージ一括取得
    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            role: true,
            content: true,
            createdAt: true,
          },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "会話が見つかりませんでした" },
        { status: 404 }
      );
    }

    return NextResponse.json(conversation.messages);
  } catch (error) {
    console.error("メッセージ取得エラー:", error);
    return NextResponse.json(
      { error: "メッセージの取得に失敗しました" },
      { status: 500 }
    );
  }
}
