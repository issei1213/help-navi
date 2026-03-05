/**
 * 会話個別操作APIエンドポイント
 *
 * PATCH /api/conversations/[id]  - 会話タイトルの更新
 * DELETE /api/conversations/[id] - 会話の削除（メッセージのカスケード削除を含む）
 */
import { NextResponse } from "next/server";
import { prisma } from "@/infrastructure/prisma-client";

/** Next.js App Router のルートパラメータ型 */
type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * 会話タイトルを更新する
 *
 * リクエストボディに title（空でない文字列）が必要。
 * 存在しない会話ID の場合は 404 を返す。
 */
export async function PATCH(req: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await req.json().catch(() => ({}));

    // title バリデーション
    if (
      body.title === undefined ||
      typeof body.title !== "string" ||
      body.title.trim() === ""
    ) {
      return NextResponse.json(
        { error: "タイトルは空でない文字列で指定してください" },
        { status: 400 }
      );
    }

    // 会話の存在確認
    const existing = await prisma.conversation.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "会話が見つかりませんでした" },
        { status: 404 }
      );
    }

    const updated = await prisma.conversation.update({
      where: { id },
      data: { title: body.title.trim() },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("会話更新エラー:", error);
    return NextResponse.json(
      { error: "会話の更新に失敗しました" },
      { status: 500 }
    );
  }
}

/**
 * 会話を削除する
 *
 * 関連するメッセージも Prisma の onDelete: Cascade により自動削除される。
 * 存在しない会話ID の場合は 404 を返す。
 */
export async function DELETE(_req: Request, context: RouteContext) {
  try {
    const { id } = await context.params;

    // 会話の存在確認
    const existing = await prisma.conversation.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "会話が見つかりませんでした" },
        { status: 404 }
      );
    }

    await prisma.conversation.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("会話削除エラー:", error);
    return NextResponse.json(
      { error: "会話の削除に失敗しました" },
      { status: 500 }
    );
  }
}
