/**
 * S3ファイル操作ツール定義
 *
 * infrastructure層のS3クライアントを利用して、
 * S3互換ストレージのファイル操作をMastraエージェントのツールとして提供する。
 */
import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { listObjects, getObject, putObject } from "@/infrastructure/s3-client";

/**
 * S3 ファイル一覧取得ツール
 * バケット内のオブジェクト一覧を取得する
 */
export const s3ListObjectsTool = createTool({
  id: "s3-list-objects",
  description: "S3バケット内のオブジェクト一覧を取得する",
  inputSchema: z.object({
    prefix: z.string().optional().describe("プレフィックス（フォルダパス）"),
    maxKeys: z.number().optional().default(20).describe("取得件数"),
  }),
  outputSchema: z.object({
    objects: z.array(
      z.object({
        key: z.string(),
        size: z.number(),
        lastModified: z.string(),
      })
    ),
  }),
  execute: async (input) => {
    const objects = await listObjects({
      prefix: input.prefix,
      maxKeys: input.maxKeys,
    });
    return { objects };
  },
});

/**
 * S3 ファイル読み取りツール
 * バケットからファイルの内容を読み取る
 */
export const s3GetObjectTool = createTool({
  id: "s3-get-object",
  description: "S3バケットからファイルの内容を読み取る",
  inputSchema: z.object({
    key: z.string().describe("オブジェクトキー（ファイルパス）"),
  }),
  outputSchema: z.object({
    content: z.string(),
    contentType: z.string(),
    size: z.number(),
  }),
  execute: async (input) => {
    return await getObject(input.key);
  },
});

/**
 * S3 ファイルアップロードツール
 * バケットにファイルをアップロードする
 */
export const s3PutObjectTool = createTool({
  id: "s3-put-object",
  description: "S3バケットにファイルをアップロードする",
  inputSchema: z.object({
    key: z.string().describe("オブジェクトキー（ファイルパス）"),
    content: z.string().describe("ファイル内容"),
    contentType: z
      .string()
      .optional()
      .default("text/plain")
      .describe("Content-Type"),
  }),
  outputSchema: z.object({
    key: z.string(),
    success: z.boolean(),
  }),
  execute: async (input) => {
    return await putObject(input.key, input.content, input.contentType);
  },
});

/**
 * エクスポートされるS3ツール群
 */
export const s3Tools = {
  s3ListObjects: s3ListObjectsTool,
  s3GetObject: s3GetObjectTool,
  s3PutObject: s3PutObjectTool,
};
