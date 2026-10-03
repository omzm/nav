/**
 * 管理员会话签发与校验（服务端专用）。
 *
 * 对应安全修复 S2：后台鉴权从"纯客户端校验"改为服务端签发的
 * HttpOnly Cookie，会话由 middleware 在边缘侧校验。
 *
 * - Token 格式：v1.<email>.<exp>.<hmac-sha256>
 * - 使用 WebCrypto 实现，同时兼容 Edge Runtime（middleware）
 *   与 Node Runtime（server actions）。
 */

export const ADMIN_COOKIE_NAME = 'nav_admin';

/** 管理员会话有效期：7 天（秒） */
export const ADMIN_SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

function getSessionSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;

  if (!secret) {
    throw new Error(
      'ADMIN_SESSION_SECRET 未配置：请在环境变量中设置一个随机长字符串后重启应用（后台将拒绝所有访问）'
    );
  }

  return secret;
}

/** 管理员邮箱未配置时直接抛错 —— fail closed，绝不放行 */
export function getRequiredAdminEmail(): string {
  const email = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || '').trim();

  if (!email) {
    throw new Error(
      'NEXT_PUBLIC_ADMIN_EMAIL 未配置：拒绝所有后台访问，请先配置管理员邮箱'
    );
  }

  return email;
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

/** 常量时间比较，避免时序攻击 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;

  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return diff === 0;
}

/** 签发管理员会话 token */
export async function signAdminToken(email: string): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + ADMIN_SESSION_TTL_SECONDS;
  const payload = `v1.${email}.${exp}`;
  const signature = await hmacSha256Hex(getSessionSecret(), payload);

  return `${payload}.${signature}`;
}

/**
 * 校验管理员会话 token，成功返回 token 中的邮箱，失败返回 null。
 * 注意：调用方仍需确认该邮箱是管理员（签发时已做过校验）。
 */
export async function verifyAdminToken(token: string | null | undefined): Promise<string | null> {
  try {
    if (!token) return null;

    const parts = token.split('.');
    if (parts.length !== 4) return null;

    const [version, email, expRaw, signature] = parts;
    if (version !== 'v1' || !email || !signature) return null;

    const exp = Number(expRaw);
    if (!Number.isFinite(exp) || exp * 1000 < Date.now()) return null;

    const expected = await hmacSha256Hex(getSessionSecret(), `v1.${email}.${exp}`);

    if (!timingSafeEqual(expected, signature)) return null;

    return email;
  } catch {
    return null;
  }
}
