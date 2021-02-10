import { App } from 'koishi-core'
import { WikiPic } from './wikipic'
import { Authority } from './authority'

export class commander {
  static parser (text: string) {
    const regex: RegExp = /\\s*(".+?"|[^:\s])+((\s*:\s*(".+?"|[^\s])+)|)|("(\D|\d)+?^|"(\D|\d)+?"|"+|[^"\s])+/g
    return text.match(regex)
  }

  static index (app: App) {
    app.command('echo <message>')
      .action((_, message) => {
        return message
      })
    app.command('wikipic [date]')
      .action(async (_) => {
        let date: string = new Date().toDateString()
        // 判断[date]参数是否存在,存在则使用指定的日期
        if (typeof _.args !== 'undefined' && _.args.length > 0) date = _.args[0]
        return new WikiPic().getText(date)
      })
    app.command('auth <member> <level>', { authority: 4 })
      .action(async (_, member, level) => {
        const auth = new Authority(app)
        return await auth.setAuthority(auth.getUser(member), Number(level))
      })
    app.command('ignore <member>', { authority: 4 })
      .action(async (_, member, level) => {
        const auth = new Authority(app)
        return await auth.setIgnore(auth.getUser(member))
      })
  }
}
