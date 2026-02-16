/**
 * Cloudflare Workers API
 * 导航网站后端
 */

// CORS 头部
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json;charset=UTF-8'
};

// 简单的密码哈希验证（生产环境建议使用 bcrypt）
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function verifyPassword(password, storedHash) {
  const hash = await hashPassword(password);
  return hash === storedHash;
}

// 返回 JSON 响应
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: corsHeaders
  });
}

// 处理 OPTIONS 请求
function handleOptions() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders
  });
}

export default {
  async fetch(request, env) {
    // 处理 CORS 预检请求
    if (request.method === 'OPTIONS') {
      return handleOptions();
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // 路由处理
      if (path === '/api/sites' || path === '/api/sites.php') {
        return handleSites(request, env);
      } else if (path === '/api/auth' || path === '/api/auth.php') {
        return handleAuth(request, env);
      } else if (path === '/api/install' || path === '/api/install.php') {
        return handleInstall(request, env);
      } else {
        return jsonResponse({ success: false, message: '接口不存在' }, 404);
      }
    } catch (error) {
      console.error('Error:', error);
      return jsonResponse({
        success: false,
        message: '服务器错误: ' + error.message
      }, 500);
    }
  }
};

// 处理网站管理
async function handleSites(request, env) {
  const method = request.method;

  // GET - 获取所有网站
  if (method === 'GET') {
    const categories = await env.DB.prepare(
      'SELECT slug, name, icon FROM categories ORDER BY sort_order'
    ).all();

    const result = {};

    for (const category of categories.results) {
      const sites = await env.DB.prepare(
        'SELECT id, name, url FROM sites WHERE category_slug = ? ORDER BY sort_order, id'
      ).bind(category.slug).all();

      result[category.slug] = sites.results;
    }

    return jsonResponse({ success: true, message: '获取成功', data: result });
  }

  // POST - 添加网站
  if (method === 'POST') {
    const data = await request.json();

    if (!data.name || !data.url || !data.category) {
      return jsonResponse({ success: false, message: '缺少必要参数' }, 400);
    }

    // 获取当前分类的最大 sort_order
    const maxSort = await env.DB.prepare(
      'SELECT IFNULL(MAX(sort_order), 0) as max_sort FROM sites WHERE category_slug = ?'
    ).bind(data.category).first();

    const result = await env.DB.prepare(
      'INSERT INTO sites (name, url, category_slug, sort_order) VALUES (?, ?, ?, ?)'
    ).bind(data.name, data.url, data.category, (maxSort.max_sort || 0) + 1).run();

    return jsonResponse({
      success: true,
      message: '添加成功',
      data: { id: result.meta.last_row_id }
    });
  }

  // PUT - 更新网站
  if (method === 'PUT') {
    const data = await request.json();

    if (!data.id || !data.name || !data.url) {
      return jsonResponse({ success: false, message: '缺少必要参数' }, 400);
    }

    await env.DB.prepare(
      'UPDATE sites SET name = ?, url = ?, category_slug = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind(data.name, data.url, data.category, data.id).run();

    return jsonResponse({ success: true, message: '更新成功' });
  }

  // DELETE - 删除网站
  if (method === 'DELETE') {
    const data = await request.json();

    if (!data.id) {
      return jsonResponse({ success: false, message: '缺少网站ID' }, 400);
    }

    await env.DB.prepare(
      'DELETE FROM sites WHERE id = ?'
    ).bind(data.id).run();

    return jsonResponse({ success: true, message: '删除成功' });
  }

  return jsonResponse({ success: false, message: '不支持的请求方法' }, 405);
}

// 处理认证
async function handleAuth(request, env) {
  const url = new URL(request.url);
  const action = url.searchParams.get('action');
  const data = await request.json();

  // 验证密码
  if (action === 'verify') {
    if (!data.password) {
      return jsonResponse({ success: false, message: '请输入密码' }, 400);
    }

    const setting = await env.DB.prepare(
      'SELECT setting_value FROM settings WHERE setting_key = ?'
    ).bind('admin_password').first();

    if (!setting) {
      // 如果没有密码，设置默认密码
      const defaultHash = await hashPassword('admin123');
      await env.DB.prepare(
        'INSERT INTO settings (setting_key, setting_value) VALUES (?, ?)'
      ).bind('admin_password', defaultHash).run();

      const isValid = await verifyPassword(data.password, defaultHash);
      return jsonResponse({
        success: isValid,
        message: isValid ? '验证成功' : '密码错误'
      });
    }

    const isValid = await verifyPassword(data.password, setting.setting_value);
    return jsonResponse({
      success: isValid,
      message: isValid ? '验证成功' : '密码错误'
    });
  }

  // 修改密码
  if (action === 'change') {
    if (!data.currentPassword || !data.newPassword) {
      return jsonResponse({ success: false, message: '缺少必要参数' }, 400);
    }

    // 验证当前密码
    const setting = await env.DB.prepare(
      'SELECT setting_value FROM settings WHERE setting_key = ?'
    ).bind('admin_password').first();

    if (!setting) {
      return jsonResponse({ success: false, message: '密码未设置' }, 400);
    }

    const isValid = await verifyPassword(data.currentPassword, setting.setting_value);
    if (!isValid) {
      return jsonResponse({ success: false, message: '当前密码错误' }, 400);
    }

    // 更新密码
    const newHash = await hashPassword(data.newPassword);
    await env.DB.prepare(
      'UPDATE settings SET setting_value = ?, updated_at = CURRENT_TIMESTAMP WHERE setting_key = ?'
    ).bind(newHash, 'admin_password').run();

    return jsonResponse({ success: true, message: '密码修改成功' });
  }

  return jsonResponse({ success: false, message: '无效的请求' }, 400);
}

// 处理安装（用于初始化数据）
async function handleInstall(request, env) {
  // 这个接口可以用来重置数据或检查状态
  return jsonResponse({
    success: true,
    message: '数据库已就绪',
    info: '请使用 wrangler d1 execute 命令初始化数据库'
  });
}
