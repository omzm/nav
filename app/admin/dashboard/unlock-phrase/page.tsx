'use client';

import { useEffect, useState } from 'react';
import {
  Button,
  Card,
  Field,
  PasswordInput,
  Spinner,
} from '@/app/admin/_components/ui';
import { toast } from '@/app/admin/_components/ui/toast';
import { IconSave } from '@/app/admin/_components/ui/icons';
import { getUnlockPhrase, saveUnlockPhrase } from '@/app/actions/unlockPhrase';

export default function UnlockPhrasePage() {
  const [phrase, setPhrase] = useState('');
  const [isDefault, setIsDefault] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getUnlockPhrase()
      .then((status) => {
        // 默认口令下输入框留空并提示，避免把"开门"明文摆在界面上
        setPhrase(status.isDefault ? '' : status.phrase);
        setIsDefault(status.isDefault);
      })
      .catch(() => toast.error('加载解锁口令失败'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    const clean = phrase.trim();
    if (!clean) {
      toast.error('口令不能为空');
      return;
    }
    setSaving(true);
    try {
      await saveUnlockPhrase(clean);
      setIsDefault(clean === '开门');
      toast.success('解锁口令已保存，首页立即生效');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '保存失败');
    } finally {
      setSaving(false);
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
      <h2 className="text-lg font-semibold text-[#1e293b] mb-1 px-5">解锁口令</h2>
      <p className="text-sm text-[#64748b] mb-4 px-5">
        访客在首页输入该口令后可查看私密收藏。保存后立即生效。
        {isDefault ? '当前为默认口令「开门」。' : '已自定义口令。'}
        注意：这只是"暗号门"式的便捷查看方式，不做强安全隔离。
      </p>

      <Card>
        <div className="space-y-4">
          <Field
            label="私密收藏口令"
            hint="1–32 个字符；如需恢复默认口令，直接填写「开门」保存"
          >
            <PasswordInput
              value={phrase}
              onChange={setPhrase}
              placeholder={isDefault ? '开门（默认口令）' : '输入新口令'}
            />
          </Field>

          <div className="flex gap-2 pt-1">
            <Button icon={<IconSave />} variant="primary" loading={saving} onClick={handleSave}>
              保存
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
