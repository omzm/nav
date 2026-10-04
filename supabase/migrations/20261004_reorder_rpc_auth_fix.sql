-- ============================================================
-- nav 修复：reorder_links / reorder_categories 管理员鉴权失效
-- 在 Supabase Dashboard -> SQL Editor 中执行
--
-- 根因：
--   两个 RPC 用 pg_get_expr(p.polwithcheck, ...) 从 RLS 写策略中提取
--   管理员邮箱做鉴权。但 UPDATE 策略的表达式存放在 polqual
--   （USING 子句）中，polwithcheck（WITH CHECK 子句）为 NULL，
--   导致 v_admin_email 恒为 NULL，鉴权永远失败，任何排序调用
--   都会报「未授权：仅管理员可调整排序」。
--   受影响：后台桌面端拖拽排序、手机端上移/下移、批量移动分类。
--
-- 修复：
--   用 COALESCE(polwithcheck, polqual) 取表达式，INSERT 策略走
--   polwithcheck、UPDATE/DELETE 策略走 polqual，两者都为空时仍
--   fail closed（拒绝执行），安全姿态不变。
--
-- 向后兼容：只重建两个函数，不修改表、策略或其它函数。
-- ============================================================

CREATE OR REPLACE FUNCTION reorder_links(p_ordered_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_email text := auth.jwt() ->> 'email';
  v_admin_email text;
  v_policy_expr text;
BEGIN
  -- 管理员鉴权：从 RLS 写策略定义中提取管理员邮箱（与表级写权限同源）
  -- UPDATE/DELETE 策略的表达式在 polqual，INSERT 策略的在 polwithcheck
  SELECT COALESCE(
           pg_get_expr(p.polwithcheck, p.polrelid),
           pg_get_expr(p.polqual, p.polrelid)
         )
    INTO v_policy_expr
  FROM pg_policy p
  JOIN pg_class c ON c.oid = p.polrelid
  WHERE c.relname = 'links'
    AND p.polname = 'Allow admin to update links';

  SELECT regexp_replace(
           v_policy_expr,
           '^.*''([^'']+@[^'']+)''.*$',
           '\1'
         )
    INTO v_admin_email;

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

CREATE OR REPLACE FUNCTION reorder_categories(p_ordered_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_email text := auth.jwt() ->> 'email';
  v_admin_email text;
  v_policy_expr text;
BEGIN
  -- 管理员鉴权：从 RLS 写策略定义中提取管理员邮箱（与表级写权限同源）
  SELECT COALESCE(
           pg_get_expr(p.polwithcheck, p.polrelid),
           pg_get_expr(p.polqual, p.polrelid)
         )
    INTO v_policy_expr
  FROM pg_policy p
  JOIN pg_class c ON c.oid = p.polrelid
  WHERE c.relname = 'categories'
    AND p.polname = 'Allow admin to update categories';

  SELECT regexp_replace(
           v_policy_expr,
           '^.*''([^'']+@[^'']+)''.*$',
           '\1'
         )
    INTO v_admin_email;

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

-- 执行权限保持不变：仅已登录用户可调用
REVOKE ALL ON FUNCTION reorder_links(uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION reorder_categories(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION reorder_links(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION reorder_categories(uuid[]) TO authenticated;
