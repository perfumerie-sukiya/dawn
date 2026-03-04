#!/usr/bin/env node
/**
 * 画像を Shopify Files へアップロードする汎用スクリプト
 *
 * ブランド（ALBION, Elegance, IGNIS 等）や任意の用途で利用可能。
 * 使い方: scripts/README.md を参照。
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const SHOP = process.env.SHOPIFY_SHOP?.replace(/^https?:\/\//, '').replace(/\/$/, '');
const CLIENT_ID = process.env.SHOPIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET;
const API_VERSION = process.env.SHOPIFY_API_VERSION || '2024-04';

if (!SHOP || !CLIENT_ID || !CLIENT_SECRET) {
  console.error('Error: SHOPIFY_SHOP, SHOPIFY_CLIENT_ID, SHOPIFY_CLIENT_SECRET を .env に設定してください');
  process.exit(1);
}

const DRY_RUN = process.argv.includes('--dry-run');
const configArg = process.argv.find((a) => a.startsWith('--config='));
const CONFIG_PATH = configArg
  ? path.resolve(process.cwd(), configArg.split('=')[1])
  : path.join(__dirname, 'upload-config.json');

/** Client credentials grant で access token を取得（24時間有効） */
async function getAccessToken() {
  const params = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
  });
  const res = await fetch(`https://${SHOP}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  if (!res.ok) {
    throw new Error(`Token error ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  return data.access_token;
}

const graphql = async (query, variables = {}, accessToken) => {
  const res = await fetch(`https://${SHOP}/admin/api/${API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': accessToken,
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) {
    throw new Error(`GraphQL error ${res.status}: ${await res.text()}`);
  }
  return res.json();
};

/** ファイル名を Shopify 用にサニタイズ */
function toShopifyFilename(localPath, prefix = '') {
  const basename = path.basename(localPath);
  const ext = path.extname(basename).toLowerCase();
  const circled = { '\u2460': '1', '\u2461': '2', '\u2462': '3', '\u2463': '4', '\u2464': '5', '\u2465': '6', '\u2466': '7', '\u2467': '8', '\u2468': '9', '\u2469': '10' };
  const safe = basename
    .replace(/\s+/g, '-')
    .replace(/[\u2460-\u2469]/g, (m) => circled[m] || '')
    .replace(/[×]/g, 'x')
    .replace(/[^a-zA-Z0-9._-]/g, '_');
  return `${prefix}${safe}`;
}

/** stagedUploadsCreate → アップロード → fileCreate の2段階 */
async function uploadFile(absPath, shopifyFilename, accessToken) {
  if (!fs.existsSync(absPath)) {
    throw new Error(`File not found: ${absPath}`);
  }

  const stat = fs.statSync(absPath);
  const fileSize = stat.size;
  const ext = path.extname(shopifyFilename).toLowerCase();
  const mimeTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
  };
  const mimeType = mimeTypes[ext] || 'image/jpeg';

  // Step 1: stagedUploadsCreate
  const stagedRes = await graphql(
    `mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
      stagedUploadsCreate(input: $input) {
        stagedTargets {
          url
          resourceUrl
          parameters { name value }
        }
        userErrors { field message }
      }
    }`,
    {
      input: [
        {
          resource: 'IMAGE',
          filename: shopifyFilename,
          mimeType,
          fileSize: String(fileSize),
          httpMethod: 'POST',
        },
      ],
    },
    accessToken
  );

  const errs = stagedRes?.data?.stagedUploadsCreate?.userErrors;
  if (errs?.length) {
    throw new Error(`stagedUploadsCreate: ${JSON.stringify(errs)}`);
  }

  const target = stagedRes?.data?.stagedUploadsCreate?.stagedTargets?.[0];
  if (!target) {
    throw new Error('stagedUploadsCreate: no staged target returned');
  }

  // Step 2: POST file to staged URL
  const formData = new FormData();
  for (const p of target.parameters) {
    formData.append(p.name, p.value);
  }
  const fileBuffer = fs.readFileSync(absPath);
  formData.append('file', new Blob([fileBuffer], { type: mimeType }), shopifyFilename);

  const uploadRes = await fetch(target.url, {
    method: 'POST',
    body: formData,
  });
  if (!uploadRes.ok) {
    throw new Error(`Upload failed ${uploadRes.status}: ${await uploadRes.text()}`);
  }

  // Step 3: fileCreate
  const createRes = await graphql(
    `mutation fileCreate($files: [FileCreateInput!]!) {
      fileCreate(files: $files) {
        files {
          ... on MediaImage {
            id
            image { url }
          }
        }
        userErrors { field message }
      }
    }`,
    {
      files: [
        {
          originalSource: target.resourceUrl,
          contentType: 'IMAGE',
          alt: shopifyFilename,
          filename: shopifyFilename,
          duplicateResolutionMode: 'REPLACE',
        },
      ],
    },
    accessToken
  );

  const createErrs = createRes?.data?.fileCreate?.userErrors;
  if (createErrs?.length) {
    throw new Error(`fileCreate: ${JSON.stringify(createErrs)}`);
  }

  const file = createRes?.data?.fileCreate?.files?.[0];
  const cdnUrl = file?.image?.url;
  const shopifyRef = cdnUrl
    ? `shopify://shop_images/${path.basename(new URL(cdnUrl).pathname)}`
    : `shopify://shop_images/${shopifyFilename}`;

  return { shopifyRef, cdnUrl };
}

async function main() {
  const configPath = path.isAbsolute(CONFIG_PATH) ? CONFIG_PATH : path.join(ROOT, CONFIG_PATH);
  if (!fs.existsSync(configPath)) {
    console.error(`Config not found: ${configPath}`);
    console.error('See scripts/README.md for usage.');
    process.exit(1);
  }

  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const files = config.files || [];
  const basePath = path.join(ROOT, config.basePath || 'docs/albion');
  const prefix = config.prefix ?? '';

  // マッピング出力先: 明示指定 > 設定ファイルと同じディレクトリに -mapping.json
  const configDir = path.dirname(configPath);
  const configBasename = path.basename(configPath, path.extname(configPath));
  const defaultMappingPath = path.join(configDir, `${configBasename.replace(/-config$/, '')}-mapping.json`);
  const mappingPath = config.mappingOutput
    ? path.isAbsolute(config.mappingOutput)
      ? config.mappingOutput
      : path.join(ROOT, config.mappingOutput)
    : defaultMappingPath;

  let accessToken = null;
  if (!DRY_RUN) {
    accessToken = await getAccessToken();
  }

  const mapping = {};

  for (const entry of files) {
    const localPath = entry.localPath || entry.path;
    const shopifyFilename = entry.shopifyFilename || toShopifyFilename(localPath, prefix);
    const absLocal = path.isAbsolute(localPath) ? localPath : path.join(basePath, localPath);

    if (!fs.existsSync(absLocal)) {
      console.warn(`Skip (not found): ${localPath}`);
      continue;
    }

    if (DRY_RUN) {
      console.log(`[dry-run] would upload: ${localPath} -> shopify://shop_images/${shopifyFilename}`);
      mapping[shopifyFilename] = `shopify://shop_images/${shopifyFilename}`;
      continue;
    }

    try {
      const { shopifyRef } = await uploadFile(absLocal, shopifyFilename, accessToken);
      console.log(`Uploaded: ${localPath} -> ${shopifyRef}`);
      mapping[shopifyFilename] = shopifyRef;
    } catch (e) {
      console.error(`Failed ${localPath}:`, e.message);
    }
  }

  if (Object.keys(mapping).length === 0) {
    console.log('No files processed.');
    return;
  }

  fs.writeFileSync(mappingPath, JSON.stringify(mapping, null, 2), 'utf8');
  console.log(`\nMapping saved: ${mappingPath}`);
  console.log('\nマッピングの内容をテンプレート JSON の該当ブロック（image/image_sp 等）に反映してください。');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
