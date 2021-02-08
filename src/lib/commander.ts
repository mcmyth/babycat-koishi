import { App } from 'koishi-core'
import { WikiPic } from './wikipic'
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
        if (typeof _.args !== 'undefined' && _.args.length > 0) date = _.args[0]
        return new WikiPic().getText(date)
      })
  }
}
