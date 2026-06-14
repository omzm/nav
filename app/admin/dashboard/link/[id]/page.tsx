'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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
  IconLock,
  IconRefresh,
  IconSave,
} from '@douyinfe/semi-icons';
import { supabase, Category, Link as NavLink } from '@/app/lib/supabase';
import { getFallbackFaviconUrl, getFaviconUrl } from '@/app/utils/favicon';
import { revalidateNavSnapshot } from '@/app/actions/revalidateNavSnapshot';
import CategoryIcon from '@/app/components/CategoryIcon';

const { Text, Title } = Typography;

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
    existingLink: NavLink | null;
    continueAdding: boolean;
  }>({ open: false, existingLink: null, continueAdding: false });

  const router = useRouter();
  const params = useParams();

  const linkId = useMemo(() => {
    const value = params.id;
    return Array.isArray(value) ? value[0] : value;
  }, [params.id]);
  const isEdit = Boolean(linkId && linkId !== 'new');
  const iconIsEmoji = Boolean(icon.trim() && /[\p{Emoji}]/u.test(icon.trim()));

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

  const checkDuplicateUrl = async (checkUrl: string): Promise<NavLink | null> => {
    try {
      const { data, error } = await supabase
        .from('links')
        .select('*')
        .eq('url', checkUrl)
        .limit(1);

      if (error) throw error;
      if (data && data.length > 0) {
        if (isEdit && data[0].id === linkId) return null;
        return data[0];
      }
    } catch (error) {
      console.error('检查重复链接失败:', error);
    }

    return null;
  };

  const saveLink = async (continueAdding: boolean) => {
    if (continueAdding) {
      setSaveAndContinueLoading(true);
    } else {
      setSaving(true);
    }

    try {
      const linkData = {
        category_id: categoryId,
        title: title.trim(),
        url: url.trim(),
        description: description.trim(),
        icon: icon.trim() || null,
        order,
        is_private: isPrivate,
      };

      if (isEdit && linkId) {
        const { error } = await supabase.from('links').update(linkData).eq('id', linkId);
        if (error) throw error;
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
      setSaving(false);
      setSaveAndContinueLoading(false);
    }
  };

  const validateAndSave = async (continueAdding = false) => {
    if (!validateForm()) return;

    if (!isEdit) {
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
        <Space align="start" style={{ width: '100%', justifyContent: 'space-between' }} wrap>
          <div>
            <h1 className="admin-page-title">{isEdit ? '编辑链接' : '添加链接'}</h1>
            <p className="admin-page-subtitle">
              维护首页展示的网站信息，图标留空时会自动使用网站 favicon。
            </p>
          </div>
          <Button icon={<IconArrowLeft />} onClick={() => router.back()}>
            返回
          </Button>
        </Space>

        <Card bordered={false} shadows="hover">
          <Space vertical spacing="medium" style={{ width: '100%' }}>
            <label>
              <Text strong>所属分类</Text>
              <Select
                value={categoryId}
                onChange={(value) => void handleCategoryChange(value ? String(value) : '')}
                placeholder="请选择分类"
                prefix={<IconFolder />}
                size="large"
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

            <label>
              <Text strong>网站名称</Text>
              <Input
                value={title}
                onChange={setTitle}
                prefix={<IconLink />}
                placeholder="例如：GitHub"
                size="large"
                showClear
                style={{ marginTop: 8 }}
              />
            </label>

            <label>
              <Text strong>网站 URL</Text>
              <Input
                value={url}
                onChange={setUrl}
                prefix={<IconGlobe />}
                placeholder="https://github.com"
                size="large"
                showClear
                style={{ marginTop: 8 }}
              />
            </label>

            <label>
              <Text strong>网站描述</Text>
              <TextArea
                value={description}
                onChange={setDescription}
                placeholder="简短描述这个网站的用途"
                rows={4}
                showClear
                style={{ marginTop: 8 }}
              />
            </label>

            <Card bordered style={{ background: 'var(--semi-color-fill-0)' }}>
              <Space align="center" spacing="medium">
                <div className="admin-icon-preview" style={{ width: 64, height: 64 }}>
                  {renderIconPreview()}
                </div>
                <Space vertical spacing={4} align="start" style={{ flex: 1 }}>
                  <Title heading={6} style={{ margin: 0 }}>
                    图标预览
                  </Title>
                  <Text type={iconError ? 'danger' : 'tertiary'} size="small">
                    {iconError
                      ? '自动图标获取失败，可以手动填写 Emoji'
                      : icon.trim()
                        ? '正在使用自定义图标'
                        : '留空时自动使用网站 favicon'}
                  </Text>
                  <Space wrap>
                    <Button
                      size="small"
                      icon={<IconRefresh />}
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
              </Space>
            </Card>

            <label>
              <Text strong>自定义图标</Text>
              <Input
                value={icon}
                onChange={setIcon}
                placeholder="可填写 Emoji 或图标 URL，留空自动使用 favicon"
                size="large"
                showClear
                style={{ marginTop: 8 }}
              />
            </label>

            <label>
              <Text strong>排序顺序</Text>
              <InputNumber
                value={order}
                onChange={(value) => setOrder(Number(value) || 0)}
                min={0}
                step={1}
                size="large"
                style={{ width: '100%', marginTop: 8 }}
              />
              <Text type="tertiary" size="small" style={{ display: 'block', marginTop: 6 }}>
                {isEdit ? '数字越小越靠前。' : '选择分类后会自动填入下一个排序值。'}
              </Text>
            </label>

            <Card bordered style={{ background: 'var(--semi-color-fill-0)' }}>
              <Space align="center" style={{ width: '100%', justifyContent: 'space-between' }}>
                <Space spacing="medium">
                  <IconLock style={{ color: 'var(--semi-color-warning)' }} />
                  <Space vertical spacing={2} align="start">
                    <Text strong>设为私密链接</Text>
                    <Text type="tertiary" size="small">
                      私密链接只会在首页隐私模式中显示。
                    </Text>
                  </Space>
                </Space>
                <Switch checked={isPrivate} onChange={setIsPrivate} />
              </Space>
            </Card>

            <Space style={{ width: '100%', justifyContent: 'flex-end' }} wrap>
              <Button onClick={() => router.back()}>取消</Button>
              {!isEdit && (
                <Button
                  icon={<IconSave />}
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
                icon={<IconSave />}
                loading={saving}
                disabled={saveAndContinueLoading}
                onClick={() => void validateAndSave(false)}
              >
                保存
              </Button>
            </Space>
          </Space>
        </Card>
      </Space>
    </div>
  );
}
