// 部署时自动同步数据库结构：在 `next build` 之前跑完。
//
// 声明式：supabase/schema.sql 是幂等的结构声明（IF NOT EXISTS / OR REPLACE），
// 每次部署都完整执行一遍，新库老库自动对齐到最终状态，全程零手工 SQL。
// 只有数据搬运类变更（回填、数据迁移）才需要写 supabase/migrations 下的
// 单独文件，按文件名顺序执行一次（记录在 schema_migrations 表）。
//
// 安全：schema.sql 里禁止出现 DROP TABLE / TRUNCATE，构建时自动检查，
// 发现直接中断，避免误删数据。
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
  await client.connect();

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

    // 安全检查：结构声明里不允许删表/清空表/无条件删数据
    // （cron 任务体里的 DELETE 带 WHERE，不会被误杀）
    if (
      /(^|\n)\s*(drop\s+table|truncate(\s+table)?)\s/i.test(schemaSql) ||
      /(^|\n)\s*delete\s+from\s+\w+\s*;/i.test(schemaSql)
    ) {
      throw new Error('schema.sql 中禁止出现 DROP TABLE / TRUNCATE / 无条件 DELETE，请改用 migration 文件处理');
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
    await client.end();
  }
}

main().catch((err) => {
  console.error('[migrate] 迁移失败，中断构建：', err.message);
  process.exit(1);
});
