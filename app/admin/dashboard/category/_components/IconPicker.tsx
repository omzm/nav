'use client';

import { useEffect, useRef, useState } from 'react';
import { TextArea, Typography } from '@douyinfe/semi-ui';
import IconFont, { BUILTIN_ICON_NAMES } from '@/app/components/IconFont';
import CategoryIcon from '@/app/components/CategoryIcon';

const { Text } = Typography;

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
      <div style={{ display: 'flex', gap: 8, marginTop: 8, marginBottom: 12 }}>
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            style={{
              padding: '6px 14px',
              borderRadius: 999,
              border: '1px solid var(--semi-color-border)',
              background: tab === key ? 'var(--semi-color-primary)' : 'transparent',
              color: tab === key ? '#fff' : 'var(--semi-color-text-1)',
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'builtin' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(44px, 1fr))',
            gap: 8,
            marginTop: 4,
          }}
        >
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
                style={{
                  aspectRatio: '1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                  borderRadius: 8,
                  border: selected
                    ? '2px solid var(--semi-color-primary)'
                    : '1px solid var(--semi-color-border)',
                  background: selected ? 'var(--semi-color-primary-light-default)' : 'transparent',
                  cursor: 'pointer',
                  color: 'var(--semi-color-text-1)',
                }}
              >
                <IconFont name={name} />
              </button>
            );
          })}
        </div>
      )}

      {tab === 'emoji' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(44px, 1fr))',
            gap: 8,
            marginTop: 4,
          }}
        >
          {EMOJI_OPTIONS.map((emoji) => {
            const selected = value.trim() === emoji;
            return (
              <button
                key={emoji}
                type="button"
                aria-label={`选择表情 ${emoji}`}
                aria-pressed={selected}
                onClick={() => onChange(emoji)}
                style={{
                  aspectRatio: '1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 22,
                  borderRadius: 8,
                  border: selected
                    ? '2px solid var(--semi-color-primary)'
                    : '1px solid var(--semi-color-border)',
                  background: selected ? 'var(--semi-color-primary-light-default)' : 'transparent',
                  cursor: 'pointer',
                }}
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
            showClear
            style={{ marginTop: 4 }}
          />
          <Text type="tertiary" size="small" style={{ display: 'block', marginTop: 6 }}>
            支持从 iconfont 复制的完整 SVG 代码（会自动过滤危险标签与事件属性）。
          </Text>
        </>
      )}

      {tab !== 'svg' && value.trim() !== '' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
          <Text type="tertiary" size="small">当前选择：</Text>
          <span style={{ fontSize: 20, display: 'inline-flex' }}>
            <CategoryIcon icon={value} />
          </span>
          <Text strong size="small" style={{ fontFamily: 'monospace' }}>
            {value.trim()}
          </Text>
        </div>
      )}
    </div>
  );
}
