-- Optional: migrate the sample/default category icons from emoji to iconfont class names.
-- Run only if these category names exist in your database and your Alibaba iconfont
-- project contains the matching Font class names.

UPDATE categories SET icon = 'icon-code' WHERE name IN ('开发工具', '开发', '编程工具');
UPDATE categories SET icon = 'icon-tool' WHERE name IN ('工具');
UPDATE categories SET icon = 'icon-design' WHERE name IN ('设计资源', '设计');
UPDATE categories SET icon = 'icon-book' WHERE name IN ('学习平台', '学习资源', '学习');
UPDATE categories SET icon = 'icon-lightning' WHERE name IN ('效率工具', '效率');
UPDATE categories SET icon = 'icon-cloud' WHERE name IN ('云服务', '云服务商');
UPDATE categories SET icon = 'icon-robot' WHERE name IN ('AI工具', 'AI 工具', '人工智能');
UPDATE categories SET icon = 'icon-link' WHERE name IN ('论坛', '社区', '交流');
UPDATE categories SET icon = 'icon-server' WHERE name IN ('服务器', '主机', 'VPS');
UPDATE categories SET icon = 'icon-cloud' WHERE name IN ('云盘', '网盘');
UPDATE categories SET icon = 'icon-globe' WHERE name IN ('域名');
UPDATE categories SET icon = 'icon-pen' WHERE name IN ('代写工具', '写作工具');
