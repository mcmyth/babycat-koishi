import { commander } from './lib/commander'
import { App } from 'koishi-core'
import 'koishi-adapter-cqhttp'
import { env } from './config/env'
import { BotSchedule } from './plugin/schedule'

export default class {
  app: App
  constructor () {
    this.app = new App(env.app)
  }

  public async run () {
    await this.app.start()
    new BotSchedule(this.app).start()
    commander.index(this.app)
    this.messageListener()
  }

  public messageListener () {
    this.app.on('message', session => {
      if (session.messageType === 'group') {
        console.log(`[Group ${session.groupId}] ${session.message}`)
      }
      if (session.messageType === 'private') {
        console.log(`[Group ${session.userId}] ${session.message}`)
      }
    })
  }
}
