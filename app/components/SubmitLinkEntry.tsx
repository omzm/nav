'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { submitLink } from '@/app/actions/submitLink';

export interface SubmitCategory {
  id: string;
  name: string;
  isPrivate: boolean;
}

interface SubmitLinkEntryProps {
  categories: SubmitCategory[];
  enabled: boolean;
  defaultCategoryId?: string | null;
}

const STORAGE_KEY = 'nav-submit-password';

const ERROR_MESSAGES: Record<string, string> = {
  not_configured: '提交功能未启用',
  wrong_password: '密码错误，请重新输入',
  invalid_url: '链接地址无效，请输入完整的 http(s) 地址',
  invalid_category: '请选择分类',
  duplicate: '该链接已经收录过了',
  rate_limited: '提交太频繁，请稍后再试',
  server_error: '提交失败，请稍后重试',
};

export default function SubmitLinkEntry({ categories, enabled, defaultCategoryId }: SubmitLinkEntryProps) {
  const [open, setOpen] = useState(false);
  const [verified, setVerified] = useState(false);
  const [password, setPassword] = useState('');
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState(defaultCategoryId || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successCount, setSuccessCount] = useState(0);
  // portal 需要 document，挂载后才渲染弹窗（SSR 安全）
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 同一标签页内记住密码，免得每提交一条都要输一次；关掉标签页即失效
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) setVerified(true);
    } catch {
      // sessionStorage 不可用时降级为每次输入
    }
  }, []);

  useEffect(() => {
    if (open) {
      setError('');
      setSuccessCount(0);
      if (defaultCategoryId) setCategoryId(defaultCategoryId);
    }
  }, [open, defaultCategoryId]);

  const close = useCallback(() => {
    setOpen(false);
    setError('');
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, close]);

  const handleSubmit = async () => {
    const activePassword = verified
      ? (() => {
          try {
            return sessionStorage.getItem(STORAGE_KEY) || '';
          } catch {
            return '';
          }
        })()
      : password;

    if (!verified && !activePassword) {
      setError('请输入提交密码');
      return;
    }
    if (!url.trim()) {
      setError('请填写链接地址');
      return;
    }
    if (!categoryId) {
      setError('请选择分类');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const result = await submitLink({
        password: activePassword,
        url: url.trim(),
        title: title.trim(),
        description: description.trim(),
        categoryId,
      });

      if (result.ok) {
        if (!verified && activePassword) {
          try {
            sessionStorage.setItem(STORAGE_KEY, activePassword);
          } catch {
            // 忽略存储失败
          }
          setVerified(true);
          setPassword('');
        }
        setUrl('');
        setTitle('');
        setDescription('');
        setSuccessCount((count) => count + 1);
        return;
      }

      if (result.error === 'wrong_password') {
        try {
          sessionStorage.removeItem(STORAGE_KEY);
        } catch {
          // 忽略
        }
        setVerified(false);
        setPassword('');
      }
      setError(ERROR_MESSAGES[result.error] || '提交失败，请稍后重试');
    } catch {
      setError('提交失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  const clearVerification = () => {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // 忽略
    }
    setVerified(false);
    setPassword('');
  };

  if (!enabled) return null;

  const inputClass =
    'w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent';

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        提交收录
      </button>

      {open && mounted
        ? createPortal(
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
              onClick={close}
              role="dialog"
              aria-modal="true"
              aria-label="提交收录"
            >
          <div
            className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-800 shadow-2xl overflow-hidden"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">提交收录</h3>
              <button
                onClick={close}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label="关闭"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-5 py-4 space-y-3.5 max-h-[70vh] overflow-y-auto">
              {successCount > 0 && (
                <div className="px-3 py-2 text-sm rounded-lg bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                  提交成功{successCount > 1 ? `（已提交 ${successCount} 条）` : ''}，可继续提交
                </div>
              )}
              {error && (
                <div className="px-3 py-2 text-sm rounded-lg bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300">
                  {error}
                </div>
              )}

              {verified ? (
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>密码已验证，本标签页内免输</span>
                  <button onClick={clearVerification} className="text-blue-600 dark:text-blue-400 hover:underline">
                    清除
                  </button>
                </div>
              ) : (
                <label className="block">
                  <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    提交密码
                  </span>
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="请输入提交密码"
                    className={inputClass}
                    autoComplete="off"
                  />
                </label>
              )}

              <label className="block">
                <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  链接地址 <span className="text-red-500">*</span>
                </span>
                <input
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  placeholder="https://example.com"
                  inputMode="url"
                  className={inputClass}
                />
              </label>

              <label className="block">
                <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  标题 <span className="text-gray-400 font-normal">（留空则用域名）</span>
                </span>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="网站名称"
                  maxLength={100}
                  className={inputClass}
                />
              </label>

              <label className="block">
                <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">描述</span>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="一句话介绍（可选）"
                  rows={2}
                  maxLength={500}
                  className={`${inputClass} resize-none`}
                />
              </label>

              <label className="block">
                <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  分类 <span className="text-red-500">*</span>
                </span>
                <select
                  value={categoryId}
                  onChange={(event) => setCategoryId(event.target.value)}
                  className={inputClass}
                >
                  <option value="">请选择分类</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                      {category.isPrivate ? '（私密）' : ''}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flex gap-2.5 px-5 py-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={close}
                className="flex-1 px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white transition-colors"
              >
                {submitting ? '提交中…' : '提交'}
              </button>
            </div>
          </div>
        </div>,
            document.body
          )
        : null}
    </>
  );
}
