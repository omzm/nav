'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Button,
  Card,
  Input,
  InputNumber,
  Modal,
  Space,
  Spin,
  Switch,
  Toast,
  Typography,
} from '@douyinfe/semi-ui';
import { IconArrowLeft, IconFolder, IconLock, IconSave } from '@douyinfe/semi-icons';
import { supabase } from '@/app/lib/supabase';
import { revalidateNavSnapshot } from '@/app/actions/revalidateNavSnapshot';
import CategoryIcon from '@/app/components/CategoryIcon';
import IconPicker from '../_components/IconPicker';

const { Text, Title } = Typography;

export default function CategoryForm() {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('');
  const [order, setOrder] = useState(0);
  const [isPrivate, setIsPrivate] = useState(false);
  // 记录加载时的原始私密状态：仅当"公开 -> 私密"转变时才弹出级联确认，避免编辑已是私密的分类时反复打扰
  const [originalIsPrivate, setOriginalIsPrivate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
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
      Toast.error('加载分类失败');
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

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (savingRef.current) return;

    if (!name.trim()) {
      Toast.warning('请填写分类名称');
      return;
    }

    if (!icon.trim()) {
      Toast.warning('请选择或填写分类图标');
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
        Toast.error('查询失败，请重试');
        return;
      }
      publicLinkIds = (publicLinks || []).map((link) => link.id);
      if (publicLinkIds.length > 0) {
        syncPrivate = await new Promise<boolean>((resolve) => {
          Modal.confirm({
            title: '同步设为私密？',
            content: `该分类下还有 ${publicLinkIds.length} 个公开链接，是否同步将它们设为私密？（仅设分类私密不会影响链接自身的公开状态）`,
            okText: '同步设为私密',
            cancelText: '仅分类私密',
            onOk: () => resolve(true),
            onCancel: () => resolve(false),
          });
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

        Toast.success('分类已更新');
      } else {
        const { error } = await supabase.from('categories').insert([payload]);
        if (error) throw error;
        Toast.success('分类已添加');
      }

      await revalidateNavSnapshot();
      router.push('/admin/dashboard/categories');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '保存失败，请重试';
      Toast.error(message);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  if (dataLoading) {
    return (
      <div className="admin-form-page">
        <Spin size="large" tip="正在加载分类..." style={{ width: '100%', padding: '96px 0' }} />
      </div>
    );
  }

  return (
    <div className="admin-form-page">
      <Space vertical spacing={24} style={{ width: '100%' }}>
        <div className="admin-page-head">
          <div>
            <h1 className="admin-page-title">{isEdit ? '编辑分类' : '添加分类'}</h1>
            <p className="admin-page-subtitle">
              设置分类名称、图标与展示方式。
            </p>
          </div>
          <div className="admin-actions-row">
            <Button icon={<IconArrowLeft aria-hidden="true" />} onClick={() => router.back()}>
              返回
            </Button>
          </div>
        </div>

        <Card title="分类信息" bordered={false} className="admin-form-card">
          <form onSubmit={handleSubmit}>
            <div className="admin-form-grid">
              <div className="admin-form-fields">
              <label className="admin-form-field">
                <Text strong><span className="admin-required-mark" aria-hidden="true">*</span>分类名称</Text>
                <Input
                  value={name}
                  onChange={setName}
                  prefix={<IconFolder aria-hidden="true" />}
                  placeholder="例如：开发工具"
                  size="default"
                  showClear
                  required
                  style={{ marginTop: 8 }}
                />
              </label>

              <div className="admin-form-field">
                <Text strong><span className="admin-required-mark" aria-hidden="true">*</span>分类图标</Text>
                <IconPicker value={icon} onChange={setIcon} />
              </div>

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
              </label>
              </div>

              <aside className="admin-form-aside">
              <Card bordered className="admin-form-preview-card" style={{ background: 'var(--semi-color-fill-0)' }}>
                <Space align="center" spacing="medium">
                  <div className="admin-icon-preview">
                    <CategoryIcon icon={icon} />
                  </div>
                  <Space vertical spacing={2} align="start">
                    <Title heading={6} style={{ margin: 0 }}>
                      图标预览
                    </Title>
                    <Text type="tertiary" size="small">
                      {icon.trim() ? '图标预览已生成' : '选择图标后会在这里显示'}
                    </Text>
                  </Space>
                </Space>
              </Card>

              <Card bordered className="admin-form-option-card" style={{ background: 'var(--semi-color-fill-0)' }}>
                <Space align="center" style={{ width: '100%', justifyContent: 'space-between' }}>
                  <Space spacing="medium">
                    <IconLock aria-hidden="true" />
                    <Space vertical spacing={2} align="start">
                      <Text strong>设为私密分类</Text>
                      <Text type="tertiary" size="small">
                        私密分类只会在首页隐私模式中显示。
                      </Text>
                    </Space>
                  </Space>
                  <Switch checked={isPrivate} onChange={setIsPrivate} />
                </Space>
              </Card>
              </aside>

              <Space className="admin-form-actions" wrap>
                <Button onClick={() => router.back()}>取消</Button>
                <Button htmlType="submit" theme="solid" type="primary" icon={<IconSave aria-hidden="true" />} loading={saving}>
                  保存
                </Button>
              </Space>
            </div>
          </form>
        </Card>
      </Space>
    </div>
  );
}
