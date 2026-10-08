'use client';

import { useEffect, useState } from 'react';
import { Button, Card, Input, Space, Spin, Toast, Typography } from '@douyinfe/semi-ui';
import { IconSave, IconRefresh } from '@douyinfe/semi-icons';
import { getAiConfigStatus, saveAiConfig, testAiConnection } from '@/app/actions/aiConfig';

const { Text, Title } = Typography;

export default function AiSettingsPage() {
  const [apiBase, setApiBase] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [hasApiKey, setHasApiKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    getAiConfigStatus()
      .then((status) => {
        setApiBase(status.apiBase);
        setModel(status.model);
        setHasApiKey(status.hasApiKey);
      })
      .catch(() => Toast.error('加载 AI 配置失败'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setTestResult(null);
    try {
      await saveAiConfig({ apiBase, apiKey, model });
      if (apiKey.trim()) {
        setHasApiKey(true);
        setApiKey('');
      }
      Toast.success('AI 配置已保存');
    } catch (error) {
      Toast.error(error instanceof Error ? error.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await testAiConnection();
      setTestResult(result);
      if (result.ok) {
        Toast.success('连接成功');
      } else {
        Toast.error('连接失败');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '连接失败';
      setTestResult({ ok: false, message });
      Toast.error('连接失败');
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <Title heading={4} style={{ marginBottom: 4 }}>
        AI 设置
      </Title>
      <Text type="tertiary" style={{ display: 'block', marginBottom: 16 }}>
        配置 OpenAI 兼容接口后，可在添加/编辑链接时一键生成网站描述。Key 只保存在服务端，不会暴露给前端。
      </Text>

      <Card>
        <label className="admin-form-field">
          <Text strong>API 地址</Text>
          <Input
            value={apiBase}
            onChange={setApiBase}
            placeholder="https://api.deepseek.com"
            showClear
            style={{ marginTop: 8 }}
          />
          <Text type="tertiary" size="small" style={{ marginTop: 4 }}>
            OpenAI 兼容接口的 Base URL，不带 /v1 后缀，程序会自动拼接 /chat/completions
          </Text>
        </label>

        <label className="admin-form-field" style={{ marginTop: 16 }}>
          <Text strong>API Key</Text>
          <Input
            mode="password"
            value={apiKey}
            onChange={setApiKey}
            placeholder={hasApiKey ? '已配置（留空则不修改）' : 'sk-...'}
            style={{ marginTop: 8 }}
          />
        </label>

        <label className="admin-form-field" style={{ marginTop: 16 }}>
          <Text strong>模型名称</Text>
          <Input
            value={model}
            onChange={setModel}
            placeholder="如 deepseek-chat、gpt-4o-mini"
            showClear
            style={{ marginTop: 8 }}
          />
        </label>

        {testResult && (
          <div
            style={{
              marginTop: 16,
              padding: '8px 12px',
              borderRadius: 8,
              fontSize: 13,
              background: testResult.ok ? 'var(--semi-color-success-light-default)' : 'var(--semi-color-danger-light-default)',
              color: testResult.ok ? 'var(--semi-color-success)' : 'var(--semi-color-danger)',
            }}
          >
            {testResult.message}
          </div>
        )}

        <Space style={{ marginTop: 20 }}>
          <Button icon={<IconSave />} type="primary" loading={saving} onClick={handleSave}>
            保存
          </Button>
          <Button icon={<IconRefresh />} loading={testing} onClick={handleTest}>
            测试连接
          </Button>
        </Space>
      </Card>
    </div>
  );
}
