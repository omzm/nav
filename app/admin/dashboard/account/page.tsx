'use client';

import { useEffect, useState } from 'react';
import {
  Button,
  Card,
  Field,
  Input,
  PasswordInput,
  Spinner,
} from '@/app/admin/_components/ui';
import { toast } from '@/app/admin/_components/ui/toast';
import { IconSave } from '@/app/admin/_components/ui/icons';
import { getAdminAccount, setAdminUsername, updateAdminAccount } from '@/app/actions/updateAdminAccount';

export default function AccountPage() {
  const [currentEmail, setCurrentEmail] = useState('');
  const [currentUsername, setCurrentUsername] = useState('');
  const [loading, setLoading] = useState(true);

  const [newUsername, setNewUsername] = useState('');
  const [usernamePassword, setUsernamePassword] = useState('');
  const [savingUsername, setSavingUsername] = useState(false);

  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    getAdminAccount()
      .then((account) => {
        setCurrentEmail(account.email);
        setCurrentUsername(account.username);
      })
      .catch(() => toast.error('加载账号信息失败'))
      .finally(() => setLoading(false));
  }, []);

  const handleSaveUsername = async () => {
    setSavingUsername(true);
    try {
      const result = await setAdminUsername({ currentPassword: usernamePassword, username: newUsername });
      if (!result.ok) {
        toast.error(result.error || '保存失败');
        return;
      }
      const clean = newUsername.trim();
      setCurrentUsername(clean);
      setNewUsername('');
      setUsernamePassword('');
      toast.success(clean ? '登录用户名已设置，可用用户名或邮箱登录' : '已清除用户名，恢复为仅邮箱登录');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '保存失败');
    } finally {
      setSavingUsername(false);
    }
  };

  const handleSaveEmail = async () => {
    const clean = newEmail.trim();
    if (!clean) {
      toast.error('请输入新邮箱');
      return;
    }
    setSavingEmail(true);
    try {
      const result = await updateAdminAccount({ currentPassword: emailPassword, newEmail: clean });
      if (!result.ok) {
        toast.error(result.error || '保存失败');
        return;
      }
      setCurrentEmail(clean.toLowerCase());
      setNewEmail('');
      setEmailPassword('');
      toast.success('登录邮箱已修改，即时生效');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '保存失败');
    } finally {
      setSavingEmail(false);
    }
  };

  const handleSavePassword = async () => {
    if (newPassword.length < 6) {
      toast.error('新密码至少 6 位');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('两次输入的新密码不一致');
      return;
    }
    setSavingPassword(true);
    try {
      const result = await updateAdminAccount({ currentPassword: oldPassword, newPassword });
      if (!result.ok) {
        toast.error(result.error || '保存失败');
        return;
      }
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('登录密码已修改');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '保存失败');
    } finally {
      setSavingPassword(false);
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
      <h2 className="text-lg font-semibold text-[#1e293b] mb-1 px-5">账号安全</h2>
      <p className="text-sm text-[#64748b] mb-4 px-5">
        修改管理员登录账号与密码。修改即时生效，邮箱修改后当前登录态保持有效。
      </p>

      <div className="space-y-4">
        <Card>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-[#1e293b]">登录用户名</h3>
              <p className="text-sm text-[#64748b] mt-1">
                当前：<span className="font-medium text-[#334155]">{currentUsername || '未设置（仅邮箱登录）'}</span>
              </p>
            </div>
            <Field
              label="用户名"
              hint="2–32 位，可用字母、数字、下划线、连字符、中文；留空保存则清除用户名"
            >
              <Input
                value={newUsername}
                onChange={setNewUsername}
                placeholder={currentUsername ? '输入新用户名，或留空清除' : '例如 admin'}
                autoComplete="username"
              />
            </Field>
            <Field label="当前密码" hint="确认是本人操作">
              <PasswordInput
                value={usernamePassword}
                onChange={setUsernamePassword}
                placeholder="输入当前登录密码"
                autoComplete="current-password"
              />
            </Field>
            <div className="flex gap-2 pt-1">
              <Button
                variant="primary"
                icon={<IconSave aria-hidden="true" />}
                loading={savingUsername}
                onClick={handleSaveUsername}
              >
                保存用户名
              </Button>
            </div>
          </div>
        </Card>

        <Card>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-[#1e293b]">登录邮箱</h3>
              <p className="text-sm text-[#64748b] mt-1">
                当前：<span className="font-medium text-[#334155]">{currentEmail || '—'}</span>
              </p>
            </div>
            <Field label="新邮箱">
              <Input
                value={newEmail}
                onChange={setNewEmail}
                placeholder="输入新的管理员邮箱"
                inputMode="email"
                autoComplete="email"
              />
            </Field>
            <Field label="当前密码" hint="确认是本人操作">
              <PasswordInput
                value={emailPassword}
                onChange={setEmailPassword}
                placeholder="输入当前登录密码"
                autoComplete="current-password"
              />
            </Field>
            <div className="flex gap-2 pt-1">
              <Button
                variant="primary"
                icon={<IconSave aria-hidden="true" />}
                loading={savingEmail}
                onClick={handleSaveEmail}
              >
                保存邮箱
              </Button>
            </div>
          </div>
        </Card>

        <Card>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-[#1e293b]">登录密码</h3>
              <p className="text-sm text-[#64748b] mt-1">至少 6 位，修改后下次登录使用新密码。</p>
            </div>
            <Field label="当前密码">
              <PasswordInput
                value={oldPassword}
                onChange={setOldPassword}
                placeholder="输入当前登录密码"
                autoComplete="current-password"
              />
            </Field>
            <Field label="新密码">
              <PasswordInput
                value={newPassword}
                onChange={setNewPassword}
                placeholder="至少 6 位"
                autoComplete="new-password"
              />
            </Field>
            <Field label="确认新密码">
              <PasswordInput
                value={confirmPassword}
                onChange={setConfirmPassword}
                placeholder="再次输入新密码"
                autoComplete="new-password"
              />
            </Field>
            <div className="flex gap-2 pt-1">
              <Button
                variant="primary"
                icon={<IconSave aria-hidden="true" />}
                loading={savingPassword}
                onClick={handleSavePassword}
              >
                保存密码
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
