/**
 * S3クライアント管理モジュール
 *
 * AWS SDK（@aws-sdk/client-s3）を使用してS3互換ストレージ（MinIO）への
 * 接続と操作をラップして提供する。
 */
import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";

/** S3オブジェクト情報 */
export interface S3ObjectInfo {
  /** オブジェクトキー */
  key: string;
  /** ファイルサイズ（バイト） */
  size: number;
  /** 最終更新日時（ISO 8601形式） */
  lastModified: string;
}

/** S3オブジェクト内容 */
export interface S3ObjectContent {
  /** ファイル内容 */
  content: string;
  /** Content-Type */
  contentType: string;
  /** ファイルサイズ（バイト） */
  size: number;
}

/**
 * S3クライアントの初期化
 * MinIOエンドポイント向けにforcePathStyleを有効にする
 */
function createS3Client(): S3Client {
  return new S3Client({
    endpoint: process.env.S3_ENDPOINT || "http://localhost:9000",
    region: process.env.S3_REGION || "us-east-1",
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID || "minioadmin",
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "minioadmin",
    },
    forcePathStyle: true,
  });
}

/**
 * バケット名を取得するヘルパー
 */
function getBucketName(): string {
  return process.env.S3_BUCKET_NAME || "default-bucket";
}

/**
 * バケット内のオブジェクト一覧を取得する
 *
 * @param options - プレフィックスと取得件数のオプション
 * @returns オブジェクト情報の配列
 */
export async function listObjects(options?: {
  prefix?: string;
  maxKeys?: number;
}): Promise<S3ObjectInfo[]> {
  const client = createS3Client();
  const command = new ListObjectsV2Command({
    Bucket: getBucketName(),
    Prefix: options?.prefix,
    MaxKeys: options?.maxKeys,
  });

  const response = await client.send(command);
  return (response.Contents || []).map((obj) => ({
    key: obj.Key || "",
    size: obj.Size || 0,
    lastModified: obj.LastModified?.toISOString() || "",
  }));
}

/**
 * バケットからファイルの内容を読み取る
 *
 * @param key - オブジェクトキー（ファイルパス）
 * @returns オブジェクトの内容情報
 */
export async function getObject(key: string): Promise<S3ObjectContent> {
  const client = createS3Client();
  const command = new GetObjectCommand({
    Bucket: getBucketName(),
    Key: key,
  });

  const response = await client.send(command);
  const bodyContent = (await response.Body?.transformToString()) || "";

  return {
    content: bodyContent,
    contentType: response.ContentType || "application/octet-stream",
    size: response.ContentLength || 0,
  };
}

/**
 * バケットにファイルをアップロードする
 *
 * @param key - オブジェクトキー（ファイルパス）
 * @param content - ファイル内容
 * @param contentType - Content-Type（デフォルト: text/plain）
 * @returns アップロード結果
 */
export async function putObject(
  key: string,
  content: string,
  contentType?: string
): Promise<{ key: string; success: boolean }> {
  const client = createS3Client();
  const command = new PutObjectCommand({
    Bucket: getBucketName(),
    Key: key,
    Body: content,
    ContentType: contentType || "text/plain",
  });

  await client.send(command);

  return { key, success: true };
}
