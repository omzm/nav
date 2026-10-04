-- ============================================================
-- nav 安全加固：私密分类/链接仅管理员可读
-- 在 Supabase Dashboard -> SQL Editor 中执行
--
-- 背景：原 SELECT 策略 (is_private = false OR auth.uid() IS NOT NULL)
-- 允许任何登录用户读取私密数据。公开注册已关闭止血，
-- 本次改为纵深防御：公开行所有人可读，私密行仅管理员邮箱可读。
-- 管理员邮箱从现有写策略中动态提取（与 20261004_audit_fixes.sql 同源），
-- 提取失败则中止，不创建半吊子策略。
--
-- 不受影响的路径：
-- - 开门流程：get_nav_private_data / get_nav_snapshot_data 均为
--   SECURITY DEFINER，绕过 RLS，口令校验在函数内完成
-- - 后台工作台：以管理员邮箱登录 Supabase，满足新策略
-- - 访客提交、点击统计：Service Role 绕过 RLS
-- - reorder_links 等 RPC：SECURITY DEFINER，内部自行校验邮箱
--
-- 回滚：把 USING 改回 (is_private = FALSE OR auth.uid() IS NOT NULL)
-- ============================================================

DO $$
DECLARE
  v_admin_email text;
BEGIN
  SELECT regexp_replace(
           COALESCE(pg_get_expr(p.polwithcheck, p.polrelid), pg_get_expr(p.polqual, p.polrelid)),
           '^.*''([^'']+@[^'']+)''.*$',
           '\1'
         )
    INTO v_admin_email
  FROM pg_policy p
  JOIN pg_class c ON c.oid = p.polrelid
  WHERE c.relname = 'links'
    AND p.polname = 'Allow admin to update links';

  IF v_admin_email IS NULL OR v_admin_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION '无法从现有策略中提取有效管理员邮箱（得到 %），迁移中止', v_admin_email;
  END IF;

  DROP POLICY IF EXISTS "Allow public read access on public categories" ON categories;
  DROP POLICY IF EXISTS "Allow public read access on public links" ON links;

  EXECUTE format(
    'CREATE POLICY "Allow public read on public categories" ON categories FOR SELECT USING (is_private = FALSE OR (auth.jwt() ->> ''email'' = %L))',
    v_admin_email
  );
  EXECUTE format(
    'CREATE POLICY "Allow public read on public links" ON links FOR SELECT USING (is_private = FALSE OR (auth.jwt() ->> ''email'' = %L))',
    v_admin_email
  );

  RAISE NOTICE '私密数据读策略已收紧，管理员邮箱: %', v_admin_email;
END
$$;
