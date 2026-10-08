// 部署时自动执行数据库迁移：在 `next build` 之前跑完 supabase/migrations 下待应用的 SQL。
//
// 原理：
// - 用 DATABASE_URL（postgres 直连，需要 DDL 权限）连接数据库，
//   按文件名顺序执行未应用过的迁移文件（跳过 *_rollback.sql），
//   已应用记录记在 schema_migrations 表里，保证只跑一次。
// - 没有配 DATABASE_URL 时直接跳过（比如本地开发），不报错。
// - 迁移失败则退出码为 1，中断构建，避免代码上线了表结构没跟上。
//
// 首次启用前需做一次手工标记（在 Supabase SQL Editor 执行）：
//   create table if not exists schema_migrations
//     (name text primary key, applied_at timestamptz default now());
//   insert into schema_migrations (name) values
//     ('20261003_private_data_isolation'),
//     ('20261004_audit_fixes'),
//     ('20261004_category_order'),
//     ('20261004_hot_links_fix'),
//     ('20261004_reorder_rpc'),
//     ('20261004_reorder_rpc_auth_fix'),
//     ('20261004_rls_private_admin_only')
//   on conflict do nothing;
// 之后新增的迁移文件放到 supabase/migrations/ 下，部署时自动执行。

import { readdir, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const migrationsDir = join(root, 'supabase', 'migrations');

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.log('[migrate] 未配置 DATABASE_URL，跳过数据库迁移');
    return;
  }

  const client = new pg.Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  try {
    await client.query(`
      create table if not exists schema_migrations (
        name text primary key,
        applied_at timestamptz default now()
      )
    `);

    const { rows } = await client.query('select name from schema_migrations');
    const applied = new Set(rows.map((r) => r.name));

    const files = (await readdir(migrationsDir))
      .filter((f) => f.endsWith('.sql') && !f.endsWith('_rollback.sql'))
      .sort();
    const pending = files.filter((f) => !applied.has(f.replace(/\.sql$/, '')));

    if (pending.length === 0) {
      console.log('[migrate] 没有待应用的迁移');
      return;
    }

    for (const file of pending) {
      const name = file.replace(/\.sql$/, '');
      const sql = await readFile(join(migrationsDir, file), 'utf8');
      console.log(`[migrate] 应用迁移：${file}`);
      await client.query('begin');
      try {
        await client.query(sql);
        await client.query('insert into schema_migrations (name) values ($1)', [name]);
        await client.query('commit');
        console.log(`[migrate] 完成：${file}`);
      } catch (err) {
        await client.query('rollback');
        throw err;
      }
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('[migrate] 迁移失败，中断构建：', err.message);
  process.exit(1);
});
