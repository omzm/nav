'use client';

import { useEffect, useRef, useState } from 'react';
import { TextArea } from '@/app/admin/_components/ui';
import IconFont, { BUILTIN_ICON_NAMES } from '@/app/components/IconFont';
import CategoryIcon from '@/app/components/CategoryIcon';

type IconTab = 'builtin' | 'emoji' | 'svg';

const EMOJI_OPTIONS = [
  '📁', '📂', '🛠️', '🔧', '💻', '🖥️', '📱', '⌨️',
  '🎨', '🖌️', '📚', '📖', '🎓', '💡', '🚀', '⭐',
  '🔥', '🎯', '📌', '📎', '🔗', '🌐', '🔍', '📝',
  '💰', '💳', '🛒', '🎮', '🎬', '🎵', '🎧', '📷',
  '✈️', '🏠', '💼', '📊', '📅', '⏰', '🧰', '🔑',
  '📦', '🎁', '💾', '📡', '🔋', '🔒', '🌙', '☀️',
];

function isSvgCode(value: string) {
  return /^<svg[\s\S]*<\/svg>$/i.test(value.trim());
}

function detectTab(value: string): IconTab {
  const trimmed = value.trim();
  if (!trimmed) return 'builtin';
  if (isSvgCode(trimmed)) return 'svg';
  if (trimmed.startsWith('icon-')) return 'builtin';
  return 'emoji';
}

interface IconPickerProps {
  value: string;
  onChange: (value: string) => void;
}

export default function IconPicker({ value, onChange }: IconPickerProps) {
  const [tab, setTab] = useState<IconTab>(() => detectTab(value));
  // 编辑页异步加载出已有图标时（空 -> 有值），自动切到对应 tab；用户手动切换后不再干预
  const lastExternalValue = useRef(value);
  useEffect(() => {
    const prev = lastExternalValue.current;
    lastExternalValue.current = value;
    if (prev.trim() === '' && value.trim() !== '') {
      setTab(detectTab(value));
    }
  }, [value]);

  const tabs: Array<{ key: IconTab; label: string }> = [
    { key: 'builtin', label: '内置图标' },
    { key: 'emoji', label: 'Emoji' },
    { key: 'svg', label: '自定义 SVG' },
  ];

  return (
    <div>
      <div className="flex gap-2 mt-2 mb-3">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`px-3.5 py-1.5 rounded-full border text-[13px] cursor-pointer transition-colors ${
              tab === key
                ? 'bg-[#2563eb] border-[#2563eb] text-white'
                : 'border-[#e8edf3] text-[#1e293b] hover:border-[#cbd5e1]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'builtin' && (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(44px,1fr))] gap-2 mt-1">
          {BUILTIN_ICON_NAMES.map((name) => {
            const selected = value.trim() === name;
            return (
              <button
                key={name}
                type="button"
                title={name}
                aria-label={`选择图标 ${name}`}
                aria-pressed={selected}
                onClick={() => onChange(name)}
                className={`aspect-square flex items-center justify-center text-[20px] rounded-lg cursor-pointer transition-colors ${
                  selected
                    ? 'border-2 border-[#2563eb] bg-[#eff6ff] text-[#1e293b]'
                    : 'border border-[#e8edf3] text-[#1e293b] hover:border-[#cbd5e1]'
                }`}
              >
                <IconFont name={name} />
              </button>
            );
          })}
        </div>
      )}

      {tab === 'emoji' && (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(44px,1fr))] gap-2 mt-1">
          {EMOJI_OPTIONS.map((emoji) => {
            const selected = value.trim() === emoji;
            return (
              <button
                key={emoji}
                type="button"
                aria-label={`选择表情 ${emoji}`}
                aria-pressed={selected}
                onClick={() => onChange(emoji)}
                className={`aspect-square flex items-center justify-center text-[22px] rounded-lg cursor-pointer transition-colors ${
                  selected
                    ? 'border-2 border-[#2563eb] bg-[#eff6ff]'
                    : 'border border-[#e8edf3] hover:border-[#cbd5e1]'
                }`}
              >
                {emoji}
              </button>
            );
          })}
        </div>
      )}

      {tab === 'svg' && (
        <>
          <TextArea
            value={value}
            onChange={onChange}
            placeholder={
              '从阿里巴巴 iconfont 复制 SVG 代码，例如：\n<svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg"><path d="..." /></svg>'
            }
            rows={8}
            className="mt-1"
          />
          <span className="block mt-1.5 text-xs text-[#64748b]">
            支持从 iconfont 复制的完整 SVG 代码（会自动过滤危险标签与事件属性）。
          </span>
        </>
      )}

      {tab !== 'svg' && value.trim() !== '' && (
        <div className="flex items-center gap-2 mt-2.5">
          <span className="text-xs text-[#64748b]">当前选择：</span>
          <span className="text-[20px] inline-flex">
            <CategoryIcon icon={value} />
          </span>
          <span className="text-xs font-semibold font-mono">
            {value.trim()}
          </span>
        </div>
      )}
    </div>
  );
}
