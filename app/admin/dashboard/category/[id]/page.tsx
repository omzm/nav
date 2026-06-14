'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Button,
  Card,
  Input,
  InputNumber,
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

const { Text, Title } = Typography;

export default function CategoryForm() {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('');
  const [order, setOrder] = useState(0);
  const [isPrivate, setIsPrivate] = useState(false);
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
        setIcon(data.icon);
        setOrder(data.order);
        setIsPrivate(Boolean(data.is_private));
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

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!name.trim()) {
      Toast.warning('请填写分类名称');
      return;
    }

    if (!icon.trim()) {
      Toast.warning('请填写分类图标');
      return;
    }

    setSaving(true);

    try {
      const payload = {
        name: name.trim(),
        icon: icon.trim(),
        order,
        is_private: isPrivate,
      };

      if (isEdit && categoryId) {
        const { error } = await supabase.from('categories').update(payload).eq('id', categoryId);
        if (error) throw error;
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
        <Space align="start" style={{ width: '100%', justifyContent: 'space-between' }} wrap>
          <div>
            <h1 className="admin-page-title">{isEdit ? '编辑分类' : '添加分类'}</h1>
            <p className="admin-page-subtitle">
              分类用于组织首页导航区域，排序数字越小越靠前。
            </p>
          </div>
          <Button icon={<IconArrowLeft />} onClick={() => router.back()}>
            返回
          </Button>
        </Space>

        <Card bordered={false} shadows="hover">
          <form onSubmit={handleSubmit}>
            <Space vertical spacing="medium" style={{ width: '100%' }}>
              <label>
                <Text strong>分类名称</Text>
                <Input
                  value={name}
                  onChange={setName}
                  prefix={<IconFolder />}
                  placeholder="例如：开发工具"
                  size="large"
                  showClear
                  required
                  style={{ marginTop: 8 }}
                />
              </label>

              <label>
                <Text strong>图标 class</Text>
                <Input
                  value={icon}
                  onChange={setIcon}
                  placeholder="例如：icon-code，也可以填写 Emoji"
                  size="large"
                  showClear
                  required
                  style={{ marginTop: 8 }}
                />
                <Text type="tertiary" size="small" style={{ display: 'block', marginTop: 6 }}>
                  支持 iconfont 的 Font class，也兼容 Emoji。
                </Text>
              </label>

              <Card bordered style={{ background: 'var(--semi-color-fill-0)' }}>
                <Space align="center" spacing="medium">
                  <div className="admin-icon-preview">
                    <CategoryIcon icon={icon} />
                  </div>
                  <Space vertical spacing={2} align="start">
                    <Title heading={6} style={{ margin: 0 }}>
                      图标预览
                    </Title>
                    <Text type="tertiary" size="small">
                      {icon ? icon : '输入图标后会在这里显示'}
                    </Text>
                  </Space>
                </Space>
              </Card>

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
              </label>

              <Card bordered style={{ background: 'var(--semi-color-fill-0)' }}>
                <Space align="center" style={{ width: '100%', justifyContent: 'space-between' }}>
                  <Space spacing="medium">
                    <IconLock style={{ color: 'var(--semi-color-warning)' }} />
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

              <Space style={{ width: '100%', justifyContent: 'flex-end' }} wrap>
                <Button onClick={() => router.back()}>取消</Button>
                <Button
                  htmlType="submit"
                  theme="solid"
                  type="primary"
                  icon={<IconSave />}
                  loading={saving}
                >
                  保存
                </Button>
              </Space>
            </Space>
          </form>
        </Card>
      </Space>
    </div>
  );
}
