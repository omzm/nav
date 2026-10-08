// 部署时自动执行数据库迁移：在 `next build` 之前跑完数据库结构变更。
//
// 两种情况全自动：
// 1. 空数据库（第一次部署）：先执行 supabase/schema.sql 建基线表，
//    再按文件名顺序执行 supabase/migrations 下全部迁移（跳过 *_rollback.sql）。
//    全程零手工 SQL，填好环境变量部署即可。
// 2. 已有数据库（增量更新）：只执行 schema_migrations 表里没记过的迁移文件，
//    每个迁移跑完记一条，保证只跑一次。
//
// 已应用记录记在 schema_migrations 表里。
// 没有配 DATABASE_URL 时直接跳过（比如本地开发），不报错。
// 迁移失败则退出码为 1，中断构建，避免代码上线了表结构没跟上。
//
// 注意：已存在的老数据库在首次启用前需手工标记一次（Supabase SQL Editor）：
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
// 新建的空数据库不需要这一步。

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

    // 空数据库：先跑 schema.sql 建基线，再跑全部迁移，全程零手工
    const { rows: tables } = await client.query(
      "select 1 from information_schema.tables where table_schema = 'public' and table_name = 'links'"
    );
    if (tables.length === 0) {
      console.log('[migrate] 检测到空数据库，先执行 supabase/schema.sql 建表');
      // schema.sql 用到 pg_cron 做定时清理，新项目默认没启用扩展，先装上
      await client.query('create extension if not exists pg_cron');
      const schemaSql = await readFile(join(root, 'supabase', 'schema.sql'), 'utf8');
      await client.query('begin');
      try {
        await client.query(schemaSql);
        await client.query('commit');
        console.log('[migrate] 基线表结构创建完成');
      } catch (err) {
        await client.query('rollback');
        throw err;
      }
    }

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
