# 数据中心运行监控大屏

基于 **Vue 3 + Vite + TypeScript + ECharts + DataV + Pinia** 的数据中心运行监控可视化大屏。
数据存储于 MySQL（Docker 封装），后端 Express API 提供 REST 服务，前端通过 `DataService` 接口消费数据。

## 技术栈

### 前端
- 框架：Vue 3（`<script setup>` + TS）
- 构建：Vite 5
- 图表：ECharts 5
- 大屏装饰：@kjgl77/datav-vue3
- 状态：Pinia
- 请求：axios（http 模式）

### 后端
- 运行时：Node.js 20 + Express
- 数据库：MySQL 8.0（Docker）
- 驱动：mysql2

## 大屏模块

- **顶部指标卡（7 个）**：主机总数 / 在线主机 / 平均CPU / 平均内存 / 网络入流量 / 磁盘写入 / 告警数，均带环比涨跌箭头
- **实时告警模块**：严重/告警分级计数 + 可点击的告警明细列表（点击下钻定位主机）
- **中上三栏趋势**：CPU 使用率（user/sys/idle）、内存利用率、网络流量，含 80%/85% 阈值警戒线
- **中部均衡分区**：磁盘写入吞吐（峰值高亮）、TOP 主机排行（CPU/内存/网络/负载 切换）、主机状态环形图（在线/告警/严重/离线 + 占比%）、机房区域负载（CPU/内存/网络 维度切换）
- **底部主机明细表**：加宽展示，CPU≥70% 或 内存≥80% 行红色高亮，点击行/TOP/告警可联动选中
- **全局时间筛选**：今日 / 近7天 / 近30天，所有趋势图与聚合联动刷新

## 目录结构（模块化）

```
.
├── docker-compose.yml      # MySQL 8.0 + Backend 一键启动
├── db/
│   ├── 01-schema.sql       # 建库建表（4 张表）
│   └── 02-tables.sql       # 表结构备份
├── server/
│   ├── Dockerfile          # 后端镜像
│   ├── package.json
│   └── src/
│       ├── index.js        # Express + 12 个 REST 端点
│       ├── db.js           # MySQL 连接池
│       └── init.js         # 首次启动自动导入 JSON 数据
├── src/
│   ├── components/
│   │   ├── charts/        # BaseChart / TrendChart / PieChart / BarChart / RegionChart
│   │   └── common/        # PanelBox / ScreenHeader / TimeFilter / KpiCard / AlertPanel / DataTable
│   ├── composables/       # useChart / usePolling
│   ├── services/          # DataService 抽象 + Mock / Http 实现 + 工厂
│   ├── stores/            # Pinia：hostStore / monitorStore
│   ├── mock/              # 4 张表的 JSON 数据（后端初始化用）
│   ├── styles/            # 全局样式
│   ├── utils/             # logger / format / theme(配色与阈值)
│   ├── test/              # 测试桩 setup
│   ├── types/             # 全局类型
│   ├── views/             # pc 大屏
│   ├── router/            # 路由
│   ├── App.vue / main.ts
│   └── vite-env.d.ts
└── scripts/                # 导入 / 转换 / 调试脚本
```

> 告警阈值与高危配色集中在 `src/utils/theme.ts`（`THRESHOLD` / `STATUS_COLOR`），可统一调参。
> 后端 `server/src/index.js` 中的 `THRESHOLD` 与前端保持一致。

## Docker 一键启动

```bash
# 启动 MySQL + Backend
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止
docker-compose down
```

### 服务说明

| 服务 | 镜像 | 端口 | 说明 |
|------|------|------|------|
| mysql | mysql:8.0 | 3307→3306 | 数据持久化卷 `mysql-data` |
| backend | 自定义构建 | 3000→3000 | Express API，首次启动自动导入数据 |

### MySQL 配置

与用户提供的 `docker run` 命令完全一致：
```bash
docker run -d \
  --name mysql8 \
  --restart unless-stopped \
  -p 3307:3306 \
  -e MYSQL_ROOT_PASSWORD=123456 \
  -e TZ=Asia/Shanghai \
  -v mysql-data:/var/lib/mysql \
  mysql:8.0 \
  --character-set-server=utf8mb4 \
  --collation-server=utf8mb4_unicode_ci
```

通过 `docker-compose.yml` 编排，并自动初始化 `dc_monitor` 数据库 schema。

## 本地运行（前端）

```bash
npm install
npm run dev          # 开发 (http://localhost:5173, /#/)
npm run build        # 类型检查 + 生产构建
npm run test         # 单元测试
npm run coverage     # 覆盖率
npm run lint         # 代码质量检查
```

## 数据源切换（mock ↔ http）

修改 `.env` 中 `VITE_API_MODE`：
- `mock`：读取本地 JSON 并聚合（开发演示用）
- `http`：对接后端 REST API（生产环境）

```env
VITE_API_MODE=http
VITE_API_BASE=http://localhost:3000
```

业务层统一 `import { dataService } from '@/services'`，切换数据源无需改动调用方。

### 后端 API 端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/health` | GET | 健康检查 |
| `/hosts` | GET | 主机列表 |
| `/mods` | GET | 指标定义 |
| `/overview?range=today\|7d\|30d` | GET | 顶部 KPI 汇总 |
| `/cpu-trend?range=` | GET | CPU 趋势（user/sys/idle） |
| `/mem-trend?range=` | GET | 内存利用率趋势 |
| `/net-trend?range=` | GET | 网络流量趋势 |
| `/disk-trend?range=` | GET | 磁盘写入吞吐趋势 |
| `/host-status?range=` | GET | 主机状态分布（在线/告警/严重/离线） |
| `/region-metrics?range=` | GET | 机房区域多维负载 |
| `/top-hosts?metric=&limit=&range=` | GET | TOP 主机排行 |
| `/host-table?range=` | GET | 主机明细表 |
| `/alerts?range=` | GET | 告警明细列表 |

## 数据初始化

后端启动时自动检测 `host_detail` 表是否为空：
- 若为空：读取 `src/mock/` 下的 4 个 JSON 文件并批量导入 MySQL
- 若已有数据：跳过初始化，直接启动服务

### 手动导入（开发用）

```bash
npm run db:import
# 依赖环境变量：
# DB_HOST=127.0.0.1 DB_PORT=3307 DB_USER=root DB_PASSWORD=123456 DB_NAME=dc_monitor
```

## 提交信息规范

遵循 Conventional Commits（`feat:` / `fix:` / `docs:` / `chore:` …），由 commitlint 校验。
