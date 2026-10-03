-- ============================================================
-- nav 优化 P2-3：拖拽排序批量更新 RPC
-- 在 Supabase Dashboard -> SQL Editor 中执行
--
-- 改动说明：
-- 1. 新增 reorder_links(p_ordered_ids uuid[])：按数组顺序批量更新 links 表的 "order"，
--    后台拖拽排序从 N 次逐条 UPDATE 降为 1 次 RPC 调用。
-- 2. 新增 reorder_categories(p_ordered_ids uuid[])：同上，作用于 categories 表。
--
-- 安全说明：
-- - 两个函数均为 SECURITY DEFINER（绕过 RLS），因此函数内部自行做管理员鉴权：
--   调用者的 JWT 邮箱必须与 RLS 写策略（"Allow admin to update links/categories"）
--   中配置的管理员邮箱一致，否则直接报错拒绝。未配置/解析失败时 fail closed。
-- - 仅授予 authenticated 角色执行权限，匿名用户连调用入口都没有。
--
-- 向后兼容：本迁移只新增两个函数，不修改任何现有表、策略或函数。
-- ============================================================

-- 批量更新链接排序
CREATE OR REPLACE FUNCTION reorder_links(p_ordered_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_email text := auth.jwt() ->> 'email';
  v_admin_email text;
BEGIN
  -- 管理员鉴权：从 RLS 写策略定义中提取管理员邮箱（与表级写权限同源）
  SELECT regexp_replace(
           pg_get_expr(p.polwithcheck, p.polrelid),
           '^.*''([^'']+@[^'']+)''.*$',
           '\1'
         )
    INTO v_admin_email
  FROM pg_policy p
  JOIN pg_class c ON c.oid = p.polrelid
  WHERE c.relname = 'links'
    AND p.polname = 'Allow admin to update links';

  IF v_caller_email IS NULL OR v_admin_email IS NULL
     OR lower(v_caller_email) IS DISTINCT FROM lower(v_admin_email) THEN
    RAISE EXCEPTION '未授权：仅管理员可调整链接排序';
  END IF;

  -- 按数组顺序批量写入 order（unnest with ordinality 取出下标）
  UPDATE links AS l
  SET "order" = ordered.rn::integer
  FROM (
    SELECT u.id, u.ord AS rn
    FROM unnest(p_ordered_ids) WITH ORDINALITY AS u(id, ord)
  ) AS ordered
  WHERE l.id = ordered.id;
END;
$$;

-- 批量更新分类排序
CREATE OR REPLACE FUNCTION reorder_categories(p_ordered_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_email text := auth.jwt() ->> 'email';
  v_admin_email text;
BEGIN
  -- 管理员鉴权：从 RLS 写策略定义中提取管理员邮箱（与表级写权限同源）
  SELECT regexp_replace(
           pg_get_expr(p.polwithcheck, p.polrelid),
           '^.*''([^'']+@[^'']+)''.*$',
           '\1'
         )
    INTO v_admin_email
  FROM pg_policy p
  JOIN pg_class c ON c.oid = p.polrelid
  WHERE c.relname = 'categories'
    AND p.polname = 'Allow admin to update categories';

  IF v_caller_email IS NULL OR v_admin_email IS NULL
     OR lower(v_caller_email) IS DISTINCT FROM lower(v_admin_email) THEN
    RAISE EXCEPTION '未授权：仅管理员可调整分类排序';
  END IF;

  -- 按数组顺序批量写入 order（unnest with ordinality 取出下标）
  UPDATE categories AS c
  SET "order" = ordered.rn::integer
  FROM (
    SELECT u.id, u.ord AS rn
    FROM unnest(p_ordered_ids) WITH ORDINALITY AS u(id, ord)
  ) AS ordered
  WHERE c.id = ordered.id;
END;
$$;

-- 执行权限：仅已登录用户可调用，匿名用户拒绝
REVOKE ALL ON FUNCTION reorder_links(uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION reorder_categories(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION reorder_links(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION reorder_categories(uuid[]) TO authenticated;
