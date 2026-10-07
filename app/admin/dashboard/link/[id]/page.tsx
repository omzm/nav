'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Button,
  Card,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Spin,
  Switch,
  TextArea,
  Toast,
  Typography,
} from '@douyinfe/semi-ui';
import {
  IconArrowLeft,
  IconFolder,
  IconGlobe,
  IconImage,
  IconLink,
  IconRefresh,
  IconSave,
} from '@douyinfe/semi-icons';
import { supabase, Category } from '@/app/lib/supabase';
import { getFallbackFaviconUrl, getFaviconUrl } from '@/app/utils/favicon';
import { revalidateNavSnapshot } from '@/app/actions/revalidateNavSnapshot';
import CategoryIcon from '@/app/components/CategoryIcon';
import { isEmojiIcon } from '@/app/admin/_components/LinkIcon';

const { Text } = Typography;

/**
 * 规范化 URL 用于去重比对：host 小写、去掉末尾斜杠。
 * 解析失败（如输入不完整）时回退为去首尾空格的原字符串。
 */
function normalizeUrlForCompare(raw: string): string {
  const trimmed = raw.trim();
  try {
    const parsed = new URL(trimmed);
    parsed.hostname = parsed.hostname.toLowerCase();
    let result = parsed.toString();
    // https://a.com/ 与 https://a.com 视为同一地址
    if (result.length > 1 && result.endsWith('/')) {
      result = result.slice(0, -1);
    }
    return result;
  } catch {
    return trimmed;
  }
}

function loadImage(src: string) {
  return new Promise<boolean>((resolve) => {
    const image = new Image();
    image.onload = () => resolve(true);
    image.onerror = () => resolve(false);
    image.src = src;
  });
}

export default function LinkForm() {
  const [categoryId, setCategoryId] = useState('');
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('');
  const [order, setOrder] = useState(0);
  const [isPrivate, setIsPrivate] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveAndContinueLoading, setSaveAndContinueLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [iconPreview, setIconPreview] = useState('');
  const [iconLoading, setIconLoading] = useState(false);
  const [iconError, setIconError] = useState(false);
  const [duplicateDialog, setDuplicateDialog] = useState<{
    open: boolean;
    existingLink: { id: string; url: string; title: string } | null;
    continueAdding: boolean;
  }>({ open: false, existingLink: null, continueAdding: false });

  const router = useRouter();
  const params = useParams();

  const linkId = useMemo(() => {
    const value = params.id;
    return Array.isArray(value) ? value[0] : value;
  }, [params.id]);
  const isEdit = Boolean(linkId && linkId !== 'new');
  const iconIsEmoji = Boolean(icon.trim() && isEmojiIcon(icon.trim()));
  // 从分类页"添加链接"带过来的预设分类（?category=），只在新建时应用一次
  const presetCategoryApplied = useRef(false);
  // 同步互斥：防止快速双击导致重复提交（setState 是异步的，靠 state 守不住）
  const savingRef = useRef(false);

  const loadCategories = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('order', { ascending: true });

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('加载分类失败:', error);
      Toast.error('加载分类失败');
    }
  }, []);

  const handleCategoryChange = useCallback(
    async (nextCategoryId: string) => {
      setCategoryId(nextCategoryId);

      if (isEdit || !nextCategoryId) return;

      try {
        const { count, error } = await supabase
          .from('links')
          .select('*', { count: 'exact', head: true })
          .eq('category_id', nextCategoryId);

        if (error) throw error;
        setOrder((count || 0) + 1);
      } catch (error) {
        console.error('获取分类链接数量失败:', error);
      }
    },
    [isEdit]
  );

  // 新建链接时：若 URL 带有 ?category= 预设分类，待分类列表加载完成后自动选中
  useEffect(() => {
    if (isEdit || presetCategoryApplied.current || categories.length === 0) return;
    const presetId = new URLSearchParams(window.location.search).get('category');
    if (presetId && categories.some((category) => category.id === presetId)) {
      presetCategoryApplied.current = true;
      void handleCategoryChange(presetId);
    }
  }, [categories, handleCategoryChange, isEdit]);

  const loadLink = useCallback(async (id: string) => {
    setDataLoading(true);

    try {
      const { data, error } = await supabase.from('links').select('*').eq('id', id).single();
      if (error) throw error;

      if (data) {
        setCategoryId(data.category_id);
        setTitle(data.title);
        setUrl(data.url);
        setDescription(data.description);
        setIcon(data.icon || '');
        setOrder(data.order);
        setIsPrivate(Boolean(data.is_private));
      }
    } catch (error) {
      console.error('加载链接失败:', error);
      Toast.error('加载链接失败');
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    if (isEdit && linkId) {
      void loadLink(linkId);
    }
  }, [isEdit, linkId, loadLink]);

  useEffect(() => {
    const customIcon = icon.trim();

    if (customIcon) {
      setIconError(false);
      if (iconIsEmoji || /^https?:\/\//i.test(customIcon)) {
        setIconPreview(customIcon);
      } else {
        setIconPreview('');
      }
      return;
    }

    if (url.trim()) {
      setIconPreview(getFaviconUrl(url.trim()));
      setIconError(false);
      return;
    }

    setIconPreview('');
    setIconError(false);
  }, [icon, iconIsEmoji, url]);

  const validateForm = () => {
    if (!categoryId) {
      Toast.warning('请选择所属分类');
      return false;
    }
    if (!title.trim()) {
      Toast.warning('请填写网站名称');
      return false;
    }
    if (!url.trim()) {
      Toast.warning('请填写网站 URL');
      return false;
    }
    try {
      new URL(url.trim());
    } catch {
      Toast.warning('请输入完整有效的 URL');
      return false;
    }
    if (!description.trim()) {
      Toast.warning('请填写网站描述');
      return false;
    }
    return true;
  };

  const handleAutoFetchIcon = async () => {
    if (!url.trim()) {
      Toast.warning('请先填写网站 URL');
      return;
    }

    setIcon('');
    setIconLoading(true);
    setIconError(false);

    const primaryUrl = getFaviconUrl(url.trim());
    const primaryOk = await loadImage(primaryUrl);

    if (primaryOk) {
      setIconPreview(primaryUrl);
      setIconLoading(false);
      Toast.success('图标获取成功');
      return;
    }

    const fallbackUrl = getFallbackFaviconUrl(url.trim());
    const fallbackOk = await loadImage(fallbackUrl);

    setIconPreview(fallbackOk ? fallbackUrl : '');
    setIconError(!fallbackOk);
    setIconLoading(false);

    if (fallbackOk) {
      Toast.success('已使用备用图标');
    } else {
      Toast.error('图标获取失败，可以手动填写 Emoji');
    }
  };

  const resetForm = async () => {
    setTitle('');
    setUrl('');
    setDescription('');
    setIcon('');
    setOrder(0);
    setIsPrivate(false);
    setIconPreview('');
    setIconError(false);

    if (categoryId) {
      await handleCategoryChange(categoryId);
    }
  };

  const checkDuplicateUrl = async (checkUrl: string): Promise<{ id: string; url: string; title: string } | null> => {
    try {
      const normalizedInput = normalizeUrlForCompare(checkUrl);

      // 存量 URL 已规范化（host 小写、无尾斜杠），精确匹配即可；自排除编辑中的行
      const { data, error } = await supabase
        .from('links')
        .select('id,url,title')
        .eq('url', normalizedInput)
        .limit(2);

      if (error) throw error;

      const duplicate = (data || []).find((link) => !(isEdit && link.id === linkId));

      return duplicate || null;
    } catch (error) {
      console.error('检查重复链接失败:', error);
    }

    return null;
  };

  const saveLink = async (continueAdding: boolean) => {
    if (savingRef.current) return;
    savingRef.current = true;

    if (continueAdding) {
      setSaveAndContinueLoading(true);
    } else {
      setSaving(true);
    }

    try {
      const linkData = {
        category_id: categoryId,
        title: title.trim(),
        url: normalizeUrlForCompare(url.trim()),
        description: description.trim(),
        icon: icon.trim() || null,
        order,
        is_private: isPrivate,
      };

      if (isEdit && linkId) {
        const { data: updated, error } = await supabase
          .from('links')
          .update(linkData)
          .eq('id', linkId)
          .select('id');
        if (error) throw error;
        if (!updated || updated.length === 0) {
          throw new Error('该链接不存在，可能已被删除');
        }
        Toast.success('链接已更新');
      } else {
        const { error } = await supabase.from('links').insert([linkData]);
        if (error) throw error;
        Toast.success('链接已添加');
      }

      await revalidateNavSnapshot();

      if (continueAdding && !isEdit) {
        await resetForm();
      } else {
        router.push('/admin/dashboard/links');
      }
    } catch (error) {
      console.error('保存链接失败:', error);
      Toast.error('保存失败，请重试');
    } finally {
      savingRef.current = false;
      setSaving(false);
      setSaveAndContinueLoading(false);
    }
  };

  const validateAndSave = async (continueAdding = false) => {
    if (!validateForm()) return;

    // 新建与编辑都做 URL 去重检查（编辑时排除自身）
    if (continueAdding) {
      setSaveAndContinueLoading(true);
    } else {
      setSaving(true);
    }

    const existing = await checkDuplicateUrl(url.trim());

    setSaving(false);
    setSaveAndContinueLoading(false);

    if (existing) {
      setDuplicateDialog({
        open: true,
        existingLink: existing,
        continueAdding,
      });
      return;
    }

    await saveLink(continueAdding);
  };

  const renderIconPreview = () => {
    if (iconLoading) {
      return <Spin size="middle" />;
    }

    if (iconIsEmoji) {
      return <span style={{ fontSize: 28 }}>{icon.trim()}</span>;
    }

    if (iconPreview && !iconError) {
      return (
        <span
          aria-label="图标预览"
          role="img"
          style={{
            width: 36,
            height: 36,
            backgroundImage: `url("${iconPreview}")`,
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            backgroundSize: 'contain',
          }}
        />
      );
    }

    return <IconImage size="extra-large" style={{ color: 'var(--semi-color-text-2)' }} />;
  };

  if (dataLoading) {
    return (
      <div className="admin-form-page">
        <Spin size="large" tip="正在加载链接..." style={{ width: '100%', padding: '96px 0' }} />
      </div>
    );
  }

  return (
    <div className="admin-form-page">
      <Modal
        title="链接已存在"
        visible={duplicateDialog.open}
        okText="仍然保存"
        cancelText="取消"
        onOk={() => {
          const continueAdding = duplicateDialog.continueAdding;
          setDuplicateDialog({ open: false, existingLink: null, continueAdding: false });
          void saveLink(continueAdding);
        }}
        onCancel={() => setDuplicateDialog({ open: false, existingLink: null, continueAdding: false })}
      >
        <Text>
          这个 URL 已经存在：
          {duplicateDialog.existingLink
            ? `“${duplicateDialog.existingLink.title}”（${duplicateDialog.existingLink.url}）`
            : ''}
          。确认仍然保存吗？
        </Text>
      </Modal>

      <Space vertical spacing={24} style={{ width: '100%' }}>
        <div className="admin-page-head">
          <div>
            <h1 className="admin-page-title">{isEdit ? '编辑链接' : '添加链接'}</h1>
            <p className="admin-page-subtitle">
              填写网站信息，选择一个合适的分类。
            </p>
          </div>
          <div className="admin-actions-row">
            <Button icon={<IconArrowLeft aria-hidden="true" />} onClick={() => router.back()}>
              返回
            </Button>
          </div>
        </div>

        <Card title="链接信息" bordered={false} className="admin-form-card">
          <div className="admin-form-grid">
            <div className="admin-form-fields">
            <label className="admin-form-field">
              <Text strong><span className="admin-required-mark" aria-hidden="true">*</span>所属分类</Text>
              <Select
                value={categoryId}
                onChange={(value) => void handleCategoryChange(value ? String(value) : '')}
                placeholder="请选择分类"
                prefix={<IconFolder aria-hidden="true" />}
                size="default"
                style={{ width: '100%', marginTop: 8 }}
              >
                {categories.map((category) => (
                  <Select.Option key={category.id} value={category.id}>
                    <Space spacing={8}>
                      <CategoryIcon icon={category.icon} />
                      {category.name}
                    </Space>
                  </Select.Option>
                ))}
              </Select>
            </label>

            <label className="admin-form-field">
              <Text strong><span className="admin-required-mark" aria-hidden="true">*</span>网站名称</Text>
              <Input
                value={title}
                onChange={setTitle}
                prefix={<IconLink aria-hidden="true" />}
                placeholder="例如：GitHub"
                size="default"
                showClear
                style={{ marginTop: 8 }}
              />
            </label>

            <label className="admin-form-field">
              <Text strong><span className="admin-required-mark" aria-hidden="true">*</span>网站 URL</Text>
              <Input
                value={url}
                onChange={setUrl}
                prefix={<IconGlobe aria-hidden="true" />}
                placeholder="https://github.com"
                size="default"
                showClear
                style={{ marginTop: 8 }}
              />
            </label>

            <label className="admin-form-field">
              <Text strong><span className="admin-required-mark" aria-hidden="true">*</span>网站描述</Text>
              <TextArea
                value={description}
                onChange={setDescription}
                placeholder="简短描述这个网站的用途"
                rows={4}
                showClear
                style={{ marginTop: 8 }}
              />
            </label>

            <label className="admin-form-field">
              <Text strong>自定义图标</Text>
              <Input
                value={icon}
                onChange={setIcon}
                placeholder="Emoji 或图片链接，留空自动获取"
                size="default"
                showClear
                style={{ marginTop: 8 }}
              />
            </label>

            <label className="admin-form-field">
              <Text strong>排序顺序</Text>
              <InputNumber
                value={order}
                onChange={(value) => setOrder(Number(value) || 0)}
                min={0}
                step={1}
                size="default"
                style={{ width: '100%', marginTop: 8 }}
              />
              <Text type="tertiary" size="small" style={{ display: 'block', marginTop: 6 }}>
                {isEdit ? '数字越小越靠前。' : '选择分类后会自动填入下一个排序值。'}
              </Text>
            </label>
            </div>

            <aside className="admin-form-aside">
              <section className="admin-form-section" aria-label="图标预览">
                <h3 className="admin-form-section-title">图标预览</h3>
                <p className="admin-form-section-desc" style={iconError ? { color: 'var(--semi-color-danger)' } : undefined}>
                  {iconError
                    ? '自动图标获取失败，可以手动填写 Emoji'
                    : icon.trim()
                      ? '正在使用自定义图标'
                      : '自动获取网站图标'}
                </p>
                <Space align="center" spacing="medium" style={{ marginTop: 12 }}>
                  <div className="admin-icon-preview" style={{ width: 64, height: 64 }}>
                    {renderIconPreview()}
                  </div>
                  <Space wrap>
                    <Button
                      size="small"
                      icon={<IconRefresh aria-hidden="true" />}
                      loading={iconLoading}
                      disabled={!url.trim()}
                      onClick={() => void handleAutoFetchIcon()}
                    >
                      重新获取
                    </Button>
                    <Button
                      size="small"
                      theme="borderless"
                      onClick={() => window.open('https://emojipedia.org', '_blank', 'noopener,noreferrer')}
                    >
                      打开 Emojipedia
                    </Button>
                  </Space>
                </Space>
              </section>

              <section className="admin-form-section" aria-label="可见性">
                <Space align="center" style={{ width: '100%', justifyContent: 'space-between' }}>
                  <div>
                    <h3 className="admin-form-section-title">设为私密链接</h3>
                    <p className="admin-form-section-desc">私密链接只会在首页隐私模式中显示。</p>
                  </div>
                  <Switch checked={isPrivate} onChange={setIsPrivate} aria-label="设为私密链接" />
                </Space>
              </section>
            </aside>

            <Space className="admin-form-actions" wrap>
              <Button onClick={() => router.back()}>取消</Button>
              {!isEdit && (
                <Button
                  icon={<IconSave aria-hidden="true" />}
                  loading={saveAndContinueLoading}
                  disabled={saving}
                  onClick={() => void validateAndSave(true)}
                >
                  保存并继续
                </Button>
              )}
              <Button
                theme="solid"
                type="primary"
                icon={<IconSave aria-hidden="true" />}
                loading={saving}
                disabled={saveAndContinueLoading}
                onClick={() => void validateAndSave(false)}
              >
                保存
              </Button>
            </Space>
          </div>
        </Card>
      </Space>
    </div>
  );
}
