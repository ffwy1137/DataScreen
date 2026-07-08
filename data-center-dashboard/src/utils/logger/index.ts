export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LoggerOptions {
  level?: LogLevel
  namespace?: string
  /** 远程上报钩子（如对接 Sentry / 日志服务） */
  remote?: (level: LogLevel, message: string, meta?: unknown) => void
}

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
}

/**
 * 统一日志模块：分级输出 + 可插拔远程上报。
 * 业务代码通过 createLogger(namespace) 获取带命名空间的实例，禁止直接使用裸 console。
 */
export class Logger {
  private readonly level: LogLevel
  private readonly namespace: string
  private readonly remote?: LoggerOptions['remote']

  constructor(options: LoggerOptions = {}) {
    const isDev = Boolean((import.meta as { env?: { DEV?: boolean } }).env?.DEV)
    this.level = options.level ?? (isDev ? 'debug' : 'info')
    this.namespace = options.namespace ?? 'app'
    this.remote = options.remote
  }

  private write(level: LogLevel, message: string, meta?: unknown): void {
    if (LEVEL_ORDER[level] < LEVEL_ORDER[this.level]) return
    const ts = new Date().toISOString()
    const prefix = `[${ts}] [${level.toUpperCase()}] [${this.namespace}]`
    const sink =
      level === 'error'
        ? console.error
        : level === 'warn'
          ? console.warn
          : level === 'debug'
            ? console.debug
            : console.log
    sink(prefix, message, meta ?? '')
    if (this.remote) {
      try {
        this.remote(level, `${prefix} ${message}`, meta)
      } catch {
        /* 远程上报失败不影响主流程 */
      }
    }
  }

  debug(message: string, meta?: unknown): void {
    this.write('debug', message, meta)
  }

  info(message: string, meta?: unknown): void {
    this.write('info', message, meta)
  }

  warn(message: string, meta?: unknown): void {
    this.write('warn', message, meta)
  }

  error(message: string, meta?: unknown): void {
    this.write('error', message, meta)
  }
}

/** 全局默认 logger 实例 */
export const logger = new Logger({ namespace: 'app' })

/** 获取带命名空间的子 logger */
export function createLogger(namespace: string): Logger {
  return new Logger({ namespace })
}
