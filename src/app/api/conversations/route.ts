/**
 * 会話一覧取得・新規作成APIエンドポイント
 *
 * GET /api/conversations  - 会話一覧を更新日時の降順で取得（最新50件）
 * POST /api/conversations - 新しい会話セッションを作成
 */
import { NextResponse } from "next/server";
import { prisma } from "@/infrastructure/prisma-client";
import { isValidModelId } from "@/lib/models";

/**
 * 会話一覧を取得する
 *
 * 更新日時の降順で最新50件を返却する。
 * 各項目は id, title, updatedAt を含む。
 */
export async function GET() {
  try {
    const conversations = await prisma.conversation.findMany({
      orderBy: { updatedAt: "desc" },
      take: 50,
      select: {
        id: true,
        title: true,
        updatedAt: true,
        modelId: true,
      },
    });

    return NextResponse.json(conversations);
  } catch (error) {
    console.error("会話一覧取得エラー:", error);
    return NextResponse.json(
      { error: "会話一覧の取得に失敗しました" },
      { status: 500 }
    );
  }
}

/**
 * 新しい会話セッションを作成する
 *
 * リクエストボディに title が含まれない場合、デフォルト値「新しいチャット」が適用される。
 * 空文字またはスペースのみの title は 400 エラーを返す。
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    // title が指定されている場合のバリデーション
    if (body.title !== undefined) {
      if (typeof body.title !== "string" || body.title.trim() === "") {
        return NextResponse.json(
          { error: "タイトルは空文字にできません" },
          { status: 400 }
        );
      }
    }

    // modelId が指定されている場合のバリデーション
    if (body.modelId !== undefined && !isValidModelId(body.modelId)) {
      return NextResponse.json(
        {
          error:
            "指定されたモデルは利用できません。別のモデルを選択してください。",
        },
        { status: 400 }
      );
    }

    const conversation = await prisma.conversation.create({
      data: {
        ...(body.title ? { title: body.title.trim() } : {}),
        ...(body.modelId ? { modelId: body.modelId } : {}),
      },
    });

    return NextResponse.json(conversation, { status: 201 });
  } catch (error) {
    console.error("会話作成エラー:", error);
    return NextResponse.json(
      { error: "会話の作成に失敗しました" },
      { status: 500 }
    );
  }
}
