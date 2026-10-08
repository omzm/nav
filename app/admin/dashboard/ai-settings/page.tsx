'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Card,
  Field,
  Input,
  PasswordInput,
  Select,
  Spinner,
} from '@/app/admin/_components/ui';
import { toast } from '@/app/admin/_components/ui/toast';
import { IconRefresh, IconSave } from '@/app/admin/_components/ui/icons';
import { fetchAiModels, getAiConfigStatus, saveAiConfig, testAiConnection } from '@/app/actions/aiConfig';

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
        toast.error(friendlyErrorMessage(error, '获取模型列表失败'));
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
      .catch(() => toast.error('加载 AI 配置失败'))
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
      toast.success('AI 配置已保存');
    } catch (error) {
      toast.error(friendlyErrorMessage(error, '保存失败'));
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
        toast.success('连接成功');
      } else {
        toast.error('连接失败');
      }
    } catch (error) {
      const message = friendlyErrorMessage(error, '连接失败');
      setTestResult({ ok: false, message });
      toast.error('连接失败');
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="large" />
      </div>
    );
  }

  return (
    <div className="max-w-[640px]">
      <h2 className="text-lg font-semibold text-[#1e293b] mb-1 px-5">AI 设置</h2>
      <p className="text-sm text-[#64748b] mb-4 px-5">
        配置 OpenAI 兼容接口后，可在添加/编辑链接时一键生成网站描述。Key 只保存在服务端，不会暴露给前端。
      </p>

      <Card>
        <div className="space-y-4">
          <Field
            label="API 地址"
            hint="OpenAI 兼容接口的 Base URL，带 /v1 后缀，程序会自动拼接 /chat/completions"
          >
            <Input
              value={apiBase}
              onChange={setApiBase}
              placeholder="https://api.deepseek.com"
            />
          </Field>

          <Field label="API Key">
            <PasswordInput
              value={apiKey}
              onChange={setApiKey}
              placeholder={hasApiKey ? '已配置（留空则不修改）' : 'sk-...'}
            />
          </Field>

          <Field
            label="模型"
            hint="填好 API 地址和 Key 后点「获取模型列表」，或直接从下拉框选择"
            action={
              <Button
                size="small"
                variant="tertiary"
                icon={<IconRefresh />}
                loading={fetchingModels}
                onClick={() => loadModels(apiBase, apiKey, model)}
              >
                获取模型列表
              </Button>
            }
          >
            <Select
              value={model || undefined}
              onChange={(value) => setModel(value as string)}
              options={models.map((m) => ({ value: m, label: m }))}
              placeholder={fetchingModels ? '正在获取…' : '从列表中选择模型'}
              searchable
              loading={fetchingModels}
              className="w-full"
            />
          </Field>

          {testResult && (
            <div
              className={`px-3 py-2 rounded-lg text-[13px] border ${
                testResult.ok
                  ? 'bg-[#f0fdf4] text-[#15803d] border-[#d1f2df]'
                  : 'bg-[#fef2f2] text-[#dc2626] border-[#fecaca]'
              }`}
            >
              {testResult.message}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button icon={<IconSave />} variant="primary" loading={saving} onClick={handleSave}>
              保存
            </Button>
            <Button icon={<IconRefresh />} loading={testing} onClick={handleTest}>
              测试连接
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
