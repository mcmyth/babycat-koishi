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
      .action(async (_, date) => new WikiPic().getText(date || new Date().toDateString()))

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
