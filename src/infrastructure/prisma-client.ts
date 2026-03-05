/**
 * Prismaクライアント管理モジュール
 *
 * シングルトンパターンでPrismaClientインスタンスを管理し、
 * 型安全なPostgreSQLデータベース接続を提供する。
 *
 * 開発環境ではglobalThisにインスタンスをキャッシュし、
 * Next.jsのホットリロード時に接続プールが枯渇することを防止する。
 *
 * @example
 * ```typescript
 * import { prisma } from "@/infrastructure/prisma-client";
 *
 * const users = await prisma.user.findMany();
 * ```
 */
import { PrismaClient } from "@prisma/client";

/** Prismaクライアントのグローバル型拡張 */
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

/**
 * PrismaClientインスタンスを生成する
 *
 * 環境に応じたログレベルを設定する。
 * - 開発環境: query, error, warn（デバッグ支援）
 * - 本番環境: error のみ（パフォーマンス優先）
 *
 * @returns 新しいPrismaClientインスタンス
 */
function createPrismaClient(): PrismaClient {
  try {
    return new PrismaClient({
      log:
        process.env.NODE_ENV === "production"
          ? ["error"]
          : ["query", "error", "warn"],
    });
  } catch (error) {
    const message =
      "[エラー] PrismaClientの初期化に失敗しました。\n" +
      `  接続先: ${process.env.DATABASE_URL || "(DATABASE_URL未設定)"}\n` +
      "  対処方法:\n" +
      "    1. Docker Composeが起動しているか確認してください: docker compose up\n" +
      "    2. .env.local にDATABASE_URLが正しく設定されているか確認してください\n" +
      `  詳細: ${error instanceof Error ? error.message : String(error)}`;
    console.error(message);
    throw error;
  }
}

/**
 * シングルトンPrismaClientインスタンス
 *
 * 開発環境ではglobalThisにキャッシュし、
 * ホットリロード時の接続プール枯渇を防止する。
 * 本番環境では通常のモジュールスコープで管理する。
 */
const prisma: PrismaClient = globalThis.prisma ?? createPrismaClient();

// 開発環境ではglobalThisにキャッシュして再利用
if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = prisma;
}

export { prisma };
