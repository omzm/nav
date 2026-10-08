# 后台 Tailwind UI Kit（替代 Semi UI）

位置：`app/admin/_components/ui/`。所有组件都是 `'use client'`。

## 导入方式

```tsx
import { Button, Input, TextArea, Select, Switch, Checkbox, Modal, Drawer, Dropdown, Card, Badge, Spinner, Empty, Field } from '@/app/admin/_components/ui';
import { PasswordInput, NumberInput } from '@/app/admin/_components/ui';
import { toast, ToastProvider } from '@/app/admin/_components/ui/toast';
import { IconXxx } from '@/app/admin/_components/ui/icons';
```

`<ToastProvider />` 必须在后台布局挂载一次（app/admin/layout.tsx）。

## 组件 API

### Button
```tsx
<Button variant="primary" | "default" | "tertiary" | "danger" | "text"  // 默认 default
        size="small" | "default"   // 默认 default
        loading={bool} icon={<IconXxx/>} disabled onClick>
  文案
</Button>
```
- Semi 对应关系：`type="primary"` → `variant="primary"`；`theme="light" type="tertiary"` → `variant="tertiary"`；`theme="solid" type="danger"` → `variant="danger"`；`type="danger"`（描边红）→ `variant="danger"`。

### Input / PasswordInput / TextArea / NumberInput
```tsx
<Input value={x} onChange={setX} placeholder />
```
- **值直传**：onChange 直接给 string 值（不是 event），和 Select/Switch/Checkbox 全 kit 一致。

### Select
```tsx
<Select value={v} onChange={(v: string) => setV(v)}
        options={[{ value, label }]}
        placeholder searchable  // searchable 开启搜索过滤
        loading disabled />
```
- onChange 直接给 string 值。

### Switch
```tsx
<Switch checked={b} onChange={(b: boolean) => setB(b)} />
```

### Checkbox
```tsx
<Checkbox checked={b} onChange={(b: boolean) => setB(b)} indeterminate={bool} label="文案" />
```
- 表头全选的半选态用 `indeterminate`。

### Modal
```tsx
<Modal open={open} onClose={() => setOpen(false)} title="标题" footer={<><Button>取消</Button><Button variant="primary">确定</Button></>}>
  内容
</Modal>
```
- 自带 ESC 关闭、点遮罩关闭、body 滚动锁定、挂载到 body。

### Drawer
```tsx
<Drawer open={open} onClose={...} width={280} side="left">{children}</Drawer>
```
- 用于移动端导航抽屉（替代 Semi SideSheet）。

### Dropdown
```tsx
<Dropdown trigger={<Button size="small" icon={<IconMore/>} aria-label="更多" />}
          items={[
            { key: 'edit', label: '编辑', onClick: () => ... },
            { key: 'del', label: '删除', danger: true, onClick: () => ... },
          ]} />
```

### Card
```tsx
<Card title="标题" extra={<Button>操作</Button>}>内容</Card>
```

### Badge（替代 Tag）
```tsx
<Badge color="blue"|"green"|"red"|"amber"|"purple"|"gray">文案</Badge>
```

### Spinner / Empty
```tsx
<Spinner size="small"|"default"|"large" />
<Empty title="暂无数据" description="..." action={<Button>新建</Button>} />
```

### Field（表单项，替代 .admin-form-field）
```tsx
<Field label="网站名称" required hint="提示文字" action={<Button size="small">AI 生成</Button>}>
  <Input ... />
</Field>
```

### toast
```tsx
import { toast } from '@/app/admin/_components/ui/toast';
toast.success('已保存'); toast.error('失败'); toast.warning('注意'); toast.info('提示');
```

### icons
`app/admin/_components/ui/icons.tsx`：IconMenu, IconSearch, IconPlus, IconEdit, IconDelete, IconRefresh,
IconChevronDown/Up/Right/Left, IconArrowRight, IconMore, IconX, IconCheck, IconLink, IconGlobe, IconImage,
IconFolder, IconHistogram, IconExit, IconExternalOpen, IconLock, IconEye, IconEyeClosed, IconHandle,
IconFilter, IconBulb, IconSave, IconSetting, IconDownload, IconKey, IconMail, IconError, IconPreview,
IconFont, IconTab, IconUrl。用 `size` prop 调大小，默认 16。

## 重写页面的铁律

1. **逻辑一字不改**：所有 state、数据请求、supabase 调用、server action 调用、校验、跳转逻辑原样保留，只换 UI 渲染。
2. **禁止 import 任何 `@douyinfe/semi-ui` / `@douyinfe/semi-icons`**。
3. 样式只用 Tailwind；主题色用 `#2563eb` 系（primary）、`#1e293b`（正文）、`#64748b`（次要文字）、边框 `#e8edf3`。
4. `Typography.Text` → 普通 `<span>` + Tailwind；`Space` → flex + gap。
5. 表格：用原生 `<table>` + Tailwind 手写（thead th / tbody td），保持原有列和操作。
6. 移动端卡片列表保持原有结构和交互（多选、上移/下移、更多菜单）。
7. 改完跑 `npx tsc --noEmit` 必须通过。
