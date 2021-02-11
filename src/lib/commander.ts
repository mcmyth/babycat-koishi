import { App } from 'koishi-core'
import { WikiPic } from './wikipic'
import { Authority } from './authority'
import { env } from '../config/env'

export class commander {
  static parser (text: string) {
    const regex: RegExp = /\\s*(".+?"|[^:\s])+((\s*:\s*(".+?"|[^\s])+)|)|("(\D|\d)+?^|"(\D|\d)+?"|"+|[^"\s])+/g
    return text.match(regex)
  }

  static index (app: App) {
    app.command('echo <message> [group]')
      .action(async (_, message, group) => {
        const _group: number = Number(group)
        if (typeof group !== 'undefined') {
          let _msg: string = ''
          await app.bots[env.app.selfId].sendGroupMsg(_group, message).catch(() => { _msg = '消息发送失败,该群可能不存在' })
          return _msg
        } else {
          return message
        }
      })

    app.command('now').action((_) => new Date().toLocaleString())

    app.command('wikipic [date]')
      .action(async (_, date) => new WikiPic().getText(date || new Date().toDateString()))

    app.command('auth <member> <level>', { authority: 4 })
      .action(async (_, member, level) => {
        const auth = new Authority(app)
        return await auth.setAuthority(auth.getUser(member), Number(level))
      })

    app.command('ignore <member>', { authority: 4 })
      .action(async (_, member) => {
        const auth = new Authority(app)
        return await auth.setIgnore(auth.getUser(member))
      })
  }
}
