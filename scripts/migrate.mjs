// 部署时自动执行数据库变更：在 `next build` 之前跑完。
//
// 两种情况全自动：
// 1. 空数据库（第一次部署）：先执行 supabase/schema.sql 建全套表结构
//    （schema.sql 已包含全部历史迁移的最终形态）。
//    全程零手工 SQL，填好环境变量部署即可。
// 2. 已有数据库（增量更新）：按文件名顺序执行 supabase/migrations 下
//    未应用过的 SQL（跳过 *_rollback.sql），已应用记录记在
//    schema_migrations 表里，保证只跑一次。
//
// 没有配 DATABASE_URL 时直接跳过（比如本地开发），不报错。
// 迁移失败则退出码为 1，中断构建，避免代码上线了表结构没跟上。

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
      // 空数据库：schema.sql 已包含全部历史迁移的最终形态，一次建全。
      // 管理员邮箱存在 app_config 表中，首次部署由 /admin/setup 向导写入，
      // RLS 策略与 RPC 均动态读取，部署脚本无需再注入邮箱。
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

    let files = [];
    try {
      files = (await readdir(migrationsDir))
        .filter((f) => f.endsWith('.sql') && !f.endsWith('_rollback.sql'))
        .sort();
    } catch (err) {
      // migrations 目录不存在（比如历史迁移已并入 schema.sql）→ 视为无待应用迁移
      if (err.code !== 'ENOENT') throw err;
    }
    const pending = files.filter((f) => !applied.has(f.replace(/\.sql$/, '')));

    if (pending.length === 0) {
      console.log('[migrate] 没有待应用的迁移');
    } else {
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
    }

    // 老部署兼容：NEXT_PUBLIC_ADMIN_EMAIL 有值、但 app_config 里还没有时，
    // 自动迁入数据库（幂等）。新部署不设该变量则跳过，走 /admin/setup 向导。
    const legacyEmail = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || '').trim();
    if (legacyEmail) {
      await client.query(
        `insert into app_config (key, value) values ('admin_email', $1)
         on conflict (key) do nothing`,
        [legacyEmail]
      );
      console.log('[migrate] 管理员邮箱已同步到数据库');
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('[migrate] 迁移失败，中断构建：', err.message);
  process.exit(1);
});
