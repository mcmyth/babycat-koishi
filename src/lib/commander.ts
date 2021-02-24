import { App } from 'koishi-core'
import { WikiPic } from './wikipic'
import { Authority } from './authority'
import { Ocr } from './ocr'
import { env } from '../config/env'
import EvilWord from './EvilWord'

export class commander {
  static parser (text: string) {
    const regex: RegExp = /\\s*(".+?"|[^:\s])+((\s*:\s*(".+?"|[^\s])+)|)|("(\D|\d)+?^|"(\D|\d)+?"|"+|[^"\s])+/g
    return text.match(regex)
  }

  static index (app: App) {
    app.on('message', async session => {
      if (typeof session.message !== 'undefined' && env.app.prefix.indexOf(session.message) !== -1) {
        await session.$send(`[${new Date().toLocaleString()}]\n啪!`)
      }
    })

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

    app.command('ocr <img>')
      .action(async (_, img) => {
        return await Ocr.tencent(img)
      })

    app.command('evil <mode> <message>', { authority: 4 })
      .action(async (_, mode, message) => {
        if (mode === 'del') {
          const count = await EvilWord.delEvilWord(message)
          return `共删除了${count}个关键字`
        }
        if (mode === 'add') {
          const result = await EvilWord.addEvilWord(message)
          return result ? '添加成功' : '添加失败'
        }
        return '命令语法不正确'
      })
  }
}
