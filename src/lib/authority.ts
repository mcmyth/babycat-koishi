import { App, User } from 'koishi-core'
import { CQCode } from 'koishi-utils'
export class Authority {
  app: App
  constructor (app: App) {
    this.app = app
  }

  public getUser (member: number | string): number {
    const cqCode = CQCode.parse(String(member))
    return cqCode === null ? Number(member) : Number(cqCode.data.qq)
  }

  public async setAuthority (member: number, level: number): Promise<string> {
    if (isNaN(member) || isNaN(Number(level))) return '参数不正确,所指定用户应为数字或At,指定等级应为数字'
    await this.app.database.setUser(member, { authority: Number(level) })
    return `已将${member}的权限等级设置为${level}`
  }

  public async setIgnore (member: number): Promise<string> {
    if (isNaN(member)) return '参数不正确,所指定用户应为数字或At'
    const obj = await this.app.database.getUser(member, 1)
    if (obj.flag === 1) {
      await this.app.database.setUser(member, { flag: 0 })
      return `已取消忽略${member}`
    } else {
      await this.app.database.setUser(member, { flag: User.Flag.ignore })
      return `已忽略${member}`
    }
  }
}
