'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button, Card, Input, Modal, NumberInput, Spinner, Switch } from '@/app/admin/_components/ui';
import Field from '@/app/admin/_components/ui/Field';
import { toast } from '@/app/admin/_components/ui/toast';
import { IconFolder, IconSave } from '@/app/admin/_components/ui/icons';
import { supabase } from '@/app/lib/supabase';
import { revalidateNavSnapshot } from '@/app/actions/revalidateNavSnapshot';
import CategoryIcon from '@/app/components/CategoryIcon';
import IconPicker from '../_components/IconPicker';

export default function CategoryForm() {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('');
  const [order, setOrder] = useState(0);
  const [isPrivate, setIsPrivate] = useState(false);
  // 记录加载时的原始私密状态：仅当"公开 -> 私密"转变时才弹出级联确认，避免编辑已是私密的分类时反复打扰
  const [originalIsPrivate, setOriginalIsPrivate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  // 级联私密确认弹窗（替代原来的 Modal.confirm 命令式调用）
  const [cascade, setCascade] = useState<{ count: number; resolve: (value: boolean) => void } | null>(null);
  const router = useRouter();
  const params = useParams();

  const categoryId = useMemo(() => {
    const value = params.id;
    return Array.isArray(value) ? value[0] : value;
  }, [params.id]);
  const isEdit = Boolean(categoryId && categoryId !== 'new');

  const loadCategory = useCallback(async (id: string) => {
    setDataLoading(true);

    try {
      const { data, error } = await supabase.from('categories').select('*').eq('id', id).single();
      if (error) throw error;

      if (data) {
        setName(data.name);
        setIcon(data.icon || '');
        setOrder(data.order);
        setIsPrivate(Boolean(data.is_private));
        setOriginalIsPrivate(Boolean(data.is_private));
      }
    } catch (error) {
      console.error('加载分类失败:', error);
      toast.error('加载分类失败');
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isEdit && categoryId) {
      void loadCategory(categoryId);
    }
  }, [categoryId, isEdit, loadCategory]);

  // 同步互斥：防止快速双击导致重复提交（setState 是异步的，靠 state 守不住）
  const savingRef = useRef(false);

  const closeCascade = (value: boolean) => {
    cascade?.resolve(value);
    setCascade(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (savingRef.current) return;

    if (!name.trim()) {
      toast.warning('请填写分类名称');
      return;
    }

    if (!icon.trim()) {
      toast.warning('请选择或填写分类图标');
      return;
    }

    // 分类从公开变为私密时，先确认是否级联旗下链接，再执行更新：
    // 若先更新分类、用户中途刷新/关闭页面，会留下"私密分类下有公开链接"的不一致
    // （私密链接可能出现在今日热门等公开位置）
    let publicLinkIds: string[] = [];
    let syncPrivate = false;
    if (isEdit && categoryId && isPrivate && !originalIsPrivate) {
      const { data: publicLinks, error: queryError } = await supabase
        .from('links')
        .select('id')
        .eq('category_id', categoryId)
        .eq('is_private', false);
      if (queryError) {
        console.error('查询分类下公开链接失败:', queryError);
        toast.error('查询失败，请重试');
        return;
      }
      publicLinkIds = (publicLinks || []).map((link) => link.id);
      if (publicLinkIds.length > 0) {
        syncPrivate = await new Promise<boolean>((resolve) => {
          setCascade({ count: publicLinkIds.length, resolve });
        });
      }
    }

    savingRef.current = true;
    setSaving(true);

    try {
      const payload = {
        name: name.trim(),
        icon: icon.trim(),
        order,
        is_private: isPrivate,
      };

      if (isEdit && categoryId) {
        const { data: updated, error } = await supabase
          .from('categories')
          .update(payload)
          .eq('id', categoryId)
          .select('id');
        if (error) throw error;
        if (!updated || updated.length === 0) {
          throw new Error('该分类不存在，可能已被删除');
        }

        if (syncPrivate && publicLinkIds.length > 0) {
          const { error: linkError } = await supabase
            .from('links')
            .update({ is_private: true })
            .in('id', publicLinkIds);
          if (linkError) throw linkError;
        }

        toast.success('分类已更新');
      } else {
        const { error } = await supabase.from('categories').insert([payload]);
        if (error) throw error;
        toast.success('分类已添加');
      }

      await revalidateNavSnapshot();
      router.push('/admin/dashboard/categories');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '保存失败，请重试';
      toast.error(message);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  if (dataLoading) {
    return (
      <div className="admin-form-page">
        <div className="w-full py-24 flex flex-col items-center justify-center gap-3">
          <Spinner size="large" />
          <span className="text-sm text-[#64748b]">正在加载分类...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-form-page">
      <div className="flex flex-col gap-6 w-full">
        <div className="admin-page-head">
          <div>
            <h1 className="admin-page-title">{isEdit ? '编辑分类' : '添加分类'}</h1>
            <p className="admin-page-subtitle">
              设置分类名称、图标与展示方式。
            </p>
          </div>
        </div>

        <Card title="分类信息" className="admin-form-card">
          <form onSubmit={handleSubmit}>
            <div className="admin-form-grid">
              <div className="admin-form-fields">
                <Field label="分类名称" required>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8] pointer-events-none">
                      <IconFolder size={15} />
                    </span>
                    <Input
                      value={name}
                      onChange={setName}
                      placeholder="例如：开发工具"
                      required
                      className="pl-9"
                    />
                  </div>
                </Field>

                <Field label="分类图标" required>
                  <IconPicker value={icon} onChange={setIcon} />
                </Field>

                <Field label="排序顺序">
                  <NumberInput
                    value={order}
                    onChange={(value) => setOrder(Number(value) || 0)}
                    min={0}
                    step={1}
                    className="w-full"
                  />
                </Field>
              </div>

              <aside className="admin-form-aside">
                <section className="admin-form-section" aria-label="图标预览">
                  <h3 className="admin-form-section-title">图标预览</h3>
                  <p className="admin-form-section-desc">
                    {icon.trim() ? '图标预览已生成' : '选择图标后会在这里显示'}
                  </p>
                  <div className="admin-icon-preview" style={{ marginTop: 12 }}>
                    <CategoryIcon icon={icon} />
                  </div>
                </section>

                <section className="admin-form-section" aria-label="可见性">
                  <div className="flex items-center justify-between gap-3 w-full">
                    <div>
                      <h3 className="admin-form-section-title">设为私密分类</h3>
                      <p className="admin-form-section-desc">私密分类只会在首页隐私模式中显示。</p>
                    </div>
                    <Switch checked={isPrivate} onChange={setIsPrivate} ariaLabel="设为私密分类" />
                  </div>
                </section>
              </aside>

              <div className="admin-form-actions max-sm:flex-col max-sm:items-stretch">
                <Button onClick={() => router.back()}>取消</Button>
                <Button type="submit" variant="primary" icon={<IconSave size={15} />} loading={saving}>
                  保存
                </Button>
              </div>
            </div>
          </form>
        </Card>
      </div>

      <Modal
        open={cascade !== null}
        onClose={() => closeCascade(false)}
        title="同步设为私密？"
        footer={
          <>
            <Button onClick={() => closeCascade(false)}>仅分类私密</Button>
            <Button variant="primary" onClick={() => closeCascade(true)}>
              同步设为私密
            </Button>
          </>
        }
      >
        该分类下还有 {cascade?.count ?? 0} 个公开链接，是否同步将它们设为私密？（仅设分类私密不会影响链接自身的公开状态）
      </Modal>
    </div>
  );
}
