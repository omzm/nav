'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button, Card, Input, Select, Space, Spin, Toast, Typography } from '@douyinfe/semi-ui';
import { IconSave, IconRefresh } from '@douyinfe/semi-icons';
import { fetchAiModels, getAiConfigStatus, saveAiConfig, testAiConnection } from '@/app/actions/aiConfig';

const { Text, Title } = Typography;

/** 把难以理解的错误（服务端崩溃时的 Minified React error）转成可操作的提示 */
function friendlyErrorMessage(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message : fallback;
  if (message.includes('Minified React error')) {
    return '请求异常中断（可能是中转响应异常或网络超时），请检查 API 地址后重试';
  }
  return message;
}

export default function AiSettingsPage() {
  const [apiBase, setApiBase] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [models, setModels] = useState<string[]>([]);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  /** 拉取模型列表；已保存的模型不在列表里时也补上，保证能正常显示 */
  const loadModels = useCallback(
    async (base: string, key: string, currentModel: string) => {
      setFetchingModels(true);
      try {
        const list = await fetchAiModels({ apiBase: base, apiKey: key });
        setModels(currentModel && !list.includes(currentModel) ? [currentModel, ...list] : list);
      } catch (error) {
        Toast.error(friendlyErrorMessage(error, '获取模型列表失败'));
        setModels(currentModel ? [currentModel] : []);
      } finally {
        setFetchingModels(false);
      }
    },
    []
  );

  useEffect(() => {
    getAiConfigStatus()
      .then((status) => {
        setApiBase(status.apiBase);
        setModel(status.model);
        setHasApiKey(status.hasApiKey);
        // 已配置过地址和 Key：自动拉取模型列表
        if (status.apiBase && status.hasApiKey) {
          loadModels(status.apiBase, '', status.model);
        } else if (status.model) {
          setModels([status.model]);
        }
      })
      .catch(() => Toast.error('加载 AI 配置失败'))
      .finally(() => setLoading(false));
  }, [loadModels]);

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
      Toast.error(friendlyErrorMessage(error, '保存失败'));
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
      const message = friendlyErrorMessage(error, '连接失败');
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text strong>模型</Text>
            <Button
              size="small"
              theme="light"
              type="tertiary"
              icon={<IconRefresh />}
              loading={fetchingModels}
              onClick={() => loadModels(apiBase, apiKey, model)}
            >
              获取模型列表
            </Button>
          </div>
          <Select
            value={model || undefined}
            onChange={(value) => setModel(value as string)}
            optionList={models.map((m) => ({ value: m, label: m }))}
            placeholder={fetchingModels ? '正在获取…' : '从列表中选择模型'}
            filter
            loading={fetchingModels}
            style={{ width: '100%', marginTop: 8 }}
          />
          <Text type="tertiary" size="small" style={{ marginTop: 4 }}>
            填好 API 地址和 Key 后点「获取模型列表」，或直接从下拉框选择
          </Text>
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
