'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Button,
  Card,
  Field,
  Input,
  Modal,
  NumberInput,
  Select,
  Spinner,
  Switch,
  TextArea,
} from '@/app/admin/_components/ui';
import { toast } from '@/app/admin/_components/ui/toast';
import {
  IconBulb,
  IconFolder,
  IconGlobe,
  IconImage,
  IconLink,
  IconRefresh,
  IconSave,
} from '@/app/admin/_components/ui/icons';
import { supabase, Category } from '@/app/lib/supabase';
import { getFallbackFaviconUrl, getFaviconUrl } from '@/app/utils/favicon';
import { revalidateNavSnapshot } from '@/app/actions/revalidateNavSnapshot';
import { generateSiteDescription } from '@/app/actions/aiDescribe';
import CategoryIcon from '@/app/components/CategoryIcon';
import { isEmojiIcon } from '@/app/admin/_components/LinkIcon';

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

function loadImage(src: string, timeoutMs = 8000) {
  return new Promise<boolean>((resolve) => {
    let done = false;
    const finish = (ok: boolean) => {
      if (!done) {
        done = true;
        resolve(ok);
      }
    };
    const image = new Image();
    image.onload = () => finish(true);
    image.onerror = () => finish(false);
    // 服务器只建连不响应时兜底，避免 loading 永久转圈
    setTimeout(() => finish(false), timeoutMs);
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
  const [aiGenerating, setAiGenerating] = useState(false);

  /** AI 生成网站描述：需要先填网站名称和 URL，生成后填入描述框 */
  const handleAiGenerateDescription = useCallback(async () => {
    if (!title.trim()) {
      toast.warning('请先填写网站名称');
      return;
    }
    if (!url.trim()) {
      toast.warning('请先填写网站 URL');
      return;
    }
    setAiGenerating(true);
    try {
      const text = await generateSiteDescription({ title: title.trim(), url: url.trim() });
      setDescription(text);
      toast.success('描述已生成，可再手动调整');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '生成失败');
    } finally {
      setAiGenerating(false);
    }
  }, [title, url]);

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
      toast.error('加载分类失败');
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
      toast.error('加载链接失败');
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
      toast.warning('请选择所属分类');
      return false;
    }
    if (!title.trim()) {
      toast.warning('请填写网站名称');
      return false;
    }
    if (!url.trim()) {
      toast.warning('请填写网站 URL');
      return false;
    }
    try {
      new URL(url.trim());
    } catch {
      toast.warning('请输入完整有效的 URL');
      return false;
    }
    if (!description.trim()) {
      toast.warning('请填写网站描述');
      return false;
    }
    return true;
  };

  const handleAutoFetchIcon = async () => {
    if (!url.trim()) {
      toast.warning('请先填写网站 URL');
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
      toast.success('图标获取成功');
      return;
    }

    const fallbackUrl = getFallbackFaviconUrl(url.trim());
    const fallbackOk = await loadImage(fallbackUrl);

    setIconPreview(fallbackOk ? fallbackUrl : '');
    setIconError(!fallbackOk);
    setIconLoading(false);

    if (fallbackOk) {
      toast.success('已使用备用图标');
    } else {
      toast.error('图标获取失败，可以手动填写 Emoji');
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

  const saveLink = async (continueAdding: boolean, skipDuplicateCheck = false) => {
    if (savingRef.current) return;
    savingRef.current = true;

    if (continueAdding) {
      setSaveAndContinueLoading(true);
    } else {
      setSaving(true);
    }

    try {
      // 新建与编辑都做 URL 去重检查（编辑时排除自身）；去重检查与写入共用一次 loading，不闪烁
      if (!skipDuplicateCheck) {
        const existing = await checkDuplicateUrl(url.trim());
        if (existing) {
          setDuplicateDialog({
            open: true,
            existingLink: existing,
            continueAdding,
          });
          return;
        }
      }

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
        toast.success('链接已更新');
      } else {
        const { error } = await supabase.from('links').insert([linkData]);
        if (error) throw error;
        toast.success('链接已添加');
      }

      await revalidateNavSnapshot();

      if (continueAdding && !isEdit) {
        await resetForm();
      } else {
        router.push('/admin/dashboard/links');
      }
    } catch (error) {
      console.error('保存链接失败:', error);
      toast.error('保存失败，请重试');
    } finally {
      savingRef.current = false;
      setSaving(false);
      setSaveAndContinueLoading(false);
    }
  };

  const validateAndSave = async (continueAdding = false) => {
    if (!validateForm()) return;
    await saveLink(continueAdding);
  };

  const renderIconPreview = () => {
    if (iconLoading) {
      return <Spinner size="default" />;
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

    return <IconImage size={32} style={{ color: '#64748b' }} />;
  };

  const closeDuplicateDialog = () => {
    setDuplicateDialog({ open: false, existingLink: null, continueAdding: false });
  };

  if (dataLoading) {
    return (
      <div className="admin-form-page">
        <div className="w-full flex flex-col items-center justify-center gap-3 py-24 text-sm text-[#64748b]">
          <Spinner size="large" />
          正在加载链接…
        </div>
      </div>
    );
  }

  return (
    <div className="admin-form-page">
      <Modal
        title="链接已存在"
        open={duplicateDialog.open}
        onClose={closeDuplicateDialog}
        footer={
          <>
            <Button onClick={closeDuplicateDialog}>取消</Button>
            <Button
              variant="primary"
              onClick={() => {
                const continueAdding = duplicateDialog.continueAdding;
                closeDuplicateDialog();
                void saveLink(continueAdding, true);
              }}
            >
              仍然保存
            </Button>
          </>
        }
      >
        <p className="text-sm text-[#475569] leading-relaxed">
          这个 URL 已经存在：
          {duplicateDialog.existingLink
            ? `“${duplicateDialog.existingLink.title}”（${duplicateDialog.existingLink.url}）`
            : ''}
          。确认仍然保存吗？
        </p>
      </Modal>

      <div className="flex flex-col gap-6 w-full">
        <div className="admin-page-head">
          <div>
            <h1 className="admin-page-title">{isEdit ? '编辑链接' : '添加链接'}</h1>
            <p className="admin-page-subtitle">
              填写网站信息，选择一个合适的分类。
            </p>
          </div>
        </div>

        <Card title="链接信息" className="admin-form-card">
          <div className="admin-form-grid">
            <div className="admin-form-fields">
              <Field label="所属分类" required className="admin-form-field">
                <div className="relative">
                  <Select
                    value={categoryId}
                    onChange={(value) => void handleCategoryChange(value ? String(value) : '')}
                    placeholder="请选择分类"
                    className="w-full [&_button]:pl-9"
                    options={categories.map((category) => ({
                      value: category.id,
                      searchText: category.name,
                      label: (
                        <span className="flex items-center gap-2">
                          <CategoryIcon icon={category.icon} />
                          {category.name}
                        </span>
                      ),
                    }))}
                  />
                  <IconFolder
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8] pointer-events-none"
                  />
                </div>
              </Field>

              <Field label="网站名称" required className="admin-form-field">
                <div className="relative">
                  <Input
                    value={title}
                    onChange={setTitle}
                    placeholder="例如：GitHub"
                    className="pl-9"
                  />
                  <IconLink
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8] pointer-events-none"
                  />
                </div>
              </Field>

              <Field label="网站 URL" required className="admin-form-field">
                <div className="relative">
                  <Input
                    value={url}
                    onChange={setUrl}
                    placeholder="https://github.com"
                    className="pl-9"
                  />
                  <IconGlobe
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8] pointer-events-none"
                  />
                </div>
              </Field>

              <Field
                label="网站描述"
                required
                className="admin-form-field"
                action={
                  <Button
                    size="small"
                    variant="tertiary"
                    icon={<IconBulb />}
                    loading={aiGenerating}
                    onClick={handleAiGenerateDescription}
                  >
                    AI 生成
                  </Button>
                }
              >
                <TextArea
                  value={description}
                  onChange={setDescription}
                  placeholder="简短描述这个网站的用途"
                  rows={4}
                />
              </Field>

              <Field label="自定义图标" className="admin-form-field">
                <Input
                  value={icon}
                  onChange={setIcon}
                  placeholder="Emoji 或图片链接，留空自动获取"
                />
              </Field>

              <Field
                label="排序顺序"
                className="admin-form-field"
                hint={isEdit ? '数字越小越靠前。' : '选择分类后会自动填入下一个排序值。'}
              >
                <NumberInput
                  value={order}
                  onChange={(value) => setOrder(Number(value) || 0)}
                  min={0}
                  step={1}
                />
              </Field>
            </div>

            <aside className="admin-form-aside">
              <section className="admin-form-section" aria-label="图标预览">
                <h3 className="admin-form-section-title">图标预览</h3>
                <p className={`admin-form-section-desc ${iconError ? 'text-[#dc2626]' : ''}`}>
                  {iconError
                    ? '自动图标获取失败，可以手动填写 Emoji'
                    : icon.trim()
                      ? '正在使用自定义图标'
                      : '自动获取网站图标'}
                </p>
                <div className="flex items-center gap-4 mt-3">
                  <div className="admin-icon-preview" style={{ width: 64, height: 64 }}>
                    {renderIconPreview()}
                  </div>
                  <div className="flex flex-wrap gap-2">
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
                      variant="tertiary"
                      onClick={() => window.open('https://emojipedia.org', '_blank', 'noopener,noreferrer')}
                    >
                      打开 Emojipedia
                    </Button>
                  </div>
                </div>
              </section>

              <section className="admin-form-section" aria-label="可见性">
                <div className="flex items-center justify-between gap-3 w-full">
                  <div>
                    <h3 className="admin-form-section-title">设为私密链接</h3>
                    <p className="admin-form-section-desc">私密链接只会在首页隐私模式中显示。</p>
                  </div>
                  <Switch checked={isPrivate} onChange={setIsPrivate} ariaLabel="设为私密链接" />
                </div>
              </section>
            </aside>

            <div className="admin-form-actions">
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
                variant="primary"
                icon={<IconSave />}
                loading={saving}
                disabled={saveAndContinueLoading}
                onClick={() => void validateAndSave(false)}
              >
                保存
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
