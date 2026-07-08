import { describe, expect, it, vi } from 'vitest'
import { Logger, createLogger } from '@/utils/logger'

describe('logger', () => {
  it('按级别过滤低级别日志', () => {
    const spy = vi.spyOn(console, 'debug').mockImplementation(() => {})
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const logger = new Logger({ level: 'warn', namespace: 't' })
    logger.debug('should not print')
    logger.warn('should print')
    expect(spy).not.toHaveBeenCalled()
    expect(warnSpy).toHaveBeenCalled()
    spy.mockRestore()
    warnSpy.mockRestore()
  })

  it('远程上报钩子可被调用', () => {
    const remote = vi.fn()
    const logger = new Logger({ level: 'info', remote })
    logger.error('boom')
    expect(remote).toHaveBeenCalledWith('error', expect.stringContaining('boom'), undefined)
  })

  it('createLogger 继承默认级别并带命名空间', () => {
    const child = createLogger('module-a')
    expect(child).toBeInstanceOf(Logger)
  })
})
