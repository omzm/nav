// 部署时自动同步数据库结构：在 `next build` 之前跑完。
//
// 声明式：supabase/schema.sql 是幂等的结构声明（IF NOT EXISTS / OR REPLACE），
// 每次生产部署都完整执行一遍，新库老库自动对齐到最终状态，全程零手工 SQL。
// 只有数据搬运类变更（回填、数据迁移）才需要写 supabase/migrations 下的
// 单独文件，按文件名顺序执行一次（记录在 schema_migrations 表）。
//
// 注意：Preview 构建不跑（只在 production 跑），避免 PR 预览改动生产库。
// 数据库连不上（比如 Supabase 闲置暂停）时只告警、不中断构建。
//
// 安全：schema.sql 里禁止出现删表/删数据的语句，构建时做冒烟检查
// （正则只能防误写，不能防恶意提交，真正的防线是 PR review），
// 命中直接中断构建。
//
// 没有配 DATABASE_URL 时直接跳过（比如本地开发），不报错。
// 失败则退出码为 1，中断构建，避免代码上线了表结构没跟上。

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

  // 只允许 production 执行：Preview/Development 一律跳过，避免非生产构建改动生产库；
  // 本地（VERCEL_ENV 未设置）仍可手动执行，用于开发调试
  const vercelEnv = process.env.VERCEL_ENV;
  if (vercelEnv && vercelEnv !== 'production') {
    console.log(`[migrate] ${vercelEnv} 环境，跳过数据库同步（只在 production 执行）`);
    return;
  }

  try {
    await client.connect();
  } catch (err) {
    // 连不上库（比如 Supabase 闲置暂停）：只告警，不中断构建
    console.warn('[migrate] 数据库连接失败，跳过结构同步，不中断构建：', err.message);
    return;
  }

  // 防并发构建：多个部署同时跑时串行化（会话级锁，断开自动释放）
  const lockKey = 'nav-schema-migrate';

  try {
    await client.query('select pg_advisory_lock(hashtext($1))', [lockKey]);

    try {
    await client.query(`
      create table if not exists schema_migrations (
        name text primary key,
        applied_at timestamptz default now()
      )
    `);

    // 1. 声明式结构同步：每次部署都跑，幂等
    // schema.sql 用到 pg_cron 做定时清理，先确保扩展存在
    await client.query('create extension if not exists pg_cron');
    const schemaSql = await readFile(join(root, 'supabase', 'schema.sql'), 'utf8');

    // 安全检查（冒烟检查，防误写不防恶意）：结构声明里不允许删表/删列/清空表/无条件删数据
    if (
      /(^|\n)\s*drop\s+(table|schema)\s/i.test(schemaSql) ||
      /(^|\n)\s*truncate(\s+table)?\s/i.test(schemaSql) ||
      /(^|\n)\s*alter\s+table\s+\w+\s+drop\s+column\s/i.test(schemaSql) ||
      /(^|\n)\s*delete\s+from\s+\w+\s*;/i.test(schemaSql)
    ) {
      throw new Error('schema.sql 中禁止出现 DROP TABLE/SCHEMA / TRUNCATE / DROP COLUMN / 无条件 DELETE，请改用 migration 文件处理');
    }

    console.log('[migrate] 同步表结构：supabase/schema.sql');
    await client.query('begin');
    try {
      await client.query(schemaSql);
      await client.query('commit');
      console.log('[migrate] 表结构同步完成');
    } catch (err) {
      await client.query('rollback');
      throw err;
    }

    // 2. 数据迁移：supabase/migrations 下未应用过的 SQL 各跑一次
    const { rows } = await client.query('select name from schema_migrations');
    const applied = new Set(rows.map((r) => r.name));

    let files = [];
    try {
      files = (await readdir(migrationsDir))
        .filter((f) => f.endsWith('.sql') && !f.endsWith('_rollback.sql'))
        .sort();
    } catch (err) {
      // migrations 目录不存在 → 视为无待应用迁移
      if (err.code !== 'ENOENT') throw err;
    }
    const pending = files.filter((f) => !applied.has(f.replace(/\.sql$/, '')));

    if (pending.length === 0) {
      console.log('[migrate] 没有待应用的数据迁移');
    } else {
      for (const file of pending) {
        const name = file.replace(/\.sql$/, '');
        const sql = await readFile(join(migrationsDir, file), 'utf8');
        console.log(`[migrate] 应用数据迁移：${file}`);
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

    // 3. 老部署兼容：NEXT_PUBLIC_ADMIN_EMAIL 有值、但 app_config 里还没有时，
    // 自动迁入数据库（幂等）。新部署不设该变量则跳过，走 /admin/setup 向导。
    // 确认数据库已有邮箱后，可删除该环境变量及本段兼容代码。
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
      // 释放 advisory lock（会话断开也会自动释放，这里显式处理）
      try {
        await client.query('select pg_advisory_unlock(hashtext($1))', [lockKey]);
      } catch {
        // 锁释放失败不影响结果
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
