'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { unlockPrivateLinks } from '../../actions/unlockPrivate';
import type { UnlockPrivateResult } from '../../actions/unlockPrivate';
import type { NavCategory } from '../../types';

/**
 * "开门"暗号解锁：口令校验与私密数据下发走服务端（安全修复 S1）。
 * 隐藏交互——搜索框输入口令即尝试开门，无按钮、无弹窗、无提示：
 * 口令正确则展示私密分类；不对或服务异常都静默（它就是个搜索框）。
 *
 * 防抖 150ms 兜底；每次输入即预取，正确口令的 RPC 一返回就直接开门（投机解锁）。
 * 只在用户交互时触发（不随页面加载），爬虫与被动访问不会触发。
 *
 * 本 hook 拥有 searchQuery 状态（解锁成功要清空搜索框，否则口令会把
 * 刚解锁的私密链接过滤掉），调用方通过 handleSearchChange / clearSearchQuery 操作。
 */
export function usePrivateUnlock(): {
  searchQuery: string;
  showPrivate: boolean;
  privateCategories: NavCategory[];
  handleSearchChange: (value: string) => void;
  handleSearchFocus: () => void;
  clearSearchQuery: () => void;
  exitPrivateMode: () => void;
} {
  const [searchQuery, setSearchQuery] = useState('');
  const [showPrivate, setShowPrivate] = useState(false);
  // "开门"成功后由服务端下发的私密分类（不再包含在初始快照中，见安全修复 S1）
  const [privateCategories, setPrivateCategories] = useState<NavCategory[]>([]);
  const [unlocking, setUnlocking] = useState(false);
  const prefetchTimerRef = useRef<number | null>(null);

  const privatePrefetchRef = useRef<{ phrase: string; promise: Promise<UnlockPrivateResult> } | null>(null);
  const latestInputRef = useRef('');
  const showPrivateRef = useRef(false);
  // 本 session 验证通过的口令 + 私密数据：二次解锁直接用缓存，零网络延迟
  const lastPhraseRef = useRef<string | null>(null);
  const privateCategoriesRef = useRef<NavCategory[]>([]);
  useEffect(() => {
    showPrivateRef.current = showPrivate;
  }, [showPrivate]);

  const applyUnlock = useCallback((result: UnlockPrivateResult, phrase: string) => {
    if (!result.ok) return;
    privatePrefetchRef.current = null;
    showPrivateRef.current = true;
    privateCategoriesRef.current = result.categories;
    lastPhraseRef.current = phrase;
    setPrivateCategories(result.categories);
    setShowPrivate(true);
    setSearchQuery(''); // 暗号解锁成功后清空搜索框，否则口令会把私密链接过滤掉
    latestInputRef.current = '';
  }, []);

  const prefetchPrivate = useCallback(
    (phrase: string) => {
      const clean = phrase.trim();
      if (showPrivateRef.current || !clean) return;
      const existing = privatePrefetchRef.current;
      if (existing && existing.phrase === clean) return existing.promise;

      // 投机解锁：口令正确就立即开门，不等防抖，体感接近零延迟
      const promise = unlockPrivateLinks(clean).then(
        (result): UnlockPrivateResult => {
          if (result.ok && !showPrivateRef.current && latestInputRef.current.trim() === clean) {
            applyUnlock(result, clean);
          }
          return result;
        },
        (): UnlockPrivateResult => ({ ok: false, categories: [], reason: 'error' })
      );
      privatePrefetchRef.current = { phrase: clean, promise };
      return promise;
    },
    [applyUnlock]
  );

  const handleUnlock = useCallback(
    async (phrase: string) => {
      const clean = phrase.trim();
      if (showPrivateRef.current || clean.length < 2 || unlocking) return;

      setUnlocking(true);

      try {
        const pending = privatePrefetchRef.current;
        let result =
          pending && pending.phrase === clean
            ? await pending.promise
            : await unlockPrivateLinks(clean);

        // 预取遇到服务异常时重试一次，避免缓存单次网络抖动
        if (!result.ok && result.reason === 'error') {
          privatePrefetchRef.current = null;
          result = await unlockPrivateLinks(clean);
        }

        if (!result.ok) {
          privatePrefetchRef.current = null;
          return; // 暗号不对或服务异常：静默，不打扰搜索体验
        }

        applyUnlock(result, clean);
      } catch (error) {
        console.error('Failed to unlock private links:', error);
      } finally {
        setUnlocking(false);
      }
    },
    [unlocking, applyUnlock]
  );

  // 聚焦搜索框即预取上次验证过的口令（或默认口令），抢在输入完成前把数据拿回来
  const handleSearchFocus = useCallback(() => {
    if (!showPrivateRef.current) {
      prefetchPrivate(lastPhraseRef.current || '开门');
    }
  }, [prefetchPrivate]);

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchQuery(value);
      latestInputRef.current = value;
      const clean = value.trim();
      // 极速路径：与本 session 已验证的口令一致，直接用缓存数据开门，零网络延迟；
      // 同时后台静默 revalidate，保证数据新鲜
      if (
        clean.length >= 2 &&
        lastPhraseRef.current &&
        clean === lastPhraseRef.current &&
        privateCategoriesRef.current.length > 0 &&
        !showPrivateRef.current
      ) {
        applyUnlock({ ok: true, categories: privateCategoriesRef.current }, clean);
        void unlockPrivateLinks(clean).then((result) => {
          if (result.ok && result.categories.length > 0) {
            privateCategoriesRef.current = result.categories;
            setPrivateCategories(result.categories);
          }
        }).catch(() => {});
        return;
      }
      if (clean.length >= 1) {
        prefetchPrivate(clean);
      }
      if (prefetchTimerRef.current) {
        window.clearTimeout(prefetchTimerRef.current);
      }
      prefetchTimerRef.current = window.setTimeout(() => {
        void handleUnlock(latestInputRef.current);
      }, 150);
    },
    [applyUnlock, handleUnlock, prefetchPrivate]
  );

  const clearSearchQuery = useCallback(() => {
    setSearchQuery('');
  }, []);

  const exitPrivateMode = useCallback(() => {
    setShowPrivate(false);
    setSearchQuery('');
  }, []);

  return {
    searchQuery,
    showPrivate,
    privateCategories,
    handleSearchChange,
    handleSearchFocus,
    clearSearchQuery,
    exitPrivateMode,
  };
}
