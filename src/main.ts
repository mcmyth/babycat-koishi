import { commander } from './lib/commander'
import { App } from 'koishi-core'
import 'koishi-adapter-cqhttp'
import { env } from './config/env'
import YouTube from './lib/youtube'
// import EvilWord from './lib/EvilWord'
// import { BotSchedule } from './plugin/schedule'
import { BolgTask } from './plugin/blog'
// import { Messenger } from './plugin/messenger'
export default class {
  app: App
  constructor () {
    this.app = new App(env.app)
    this.app.plugin(require('koishi-plugin-mysql'), env.db.mysql)
  }

  public async run () {
    await this.app.start()
    // 定时任务
    // new BotSchedule(this.app).start()
    // 处理命令
    commander.index(this.app)
    // 消息转发
    // await Messenger(this.app)
    this.messageListener()
    await new BolgTask(this.app).start()
  }

  public messageListener () {
    this.app.on('message', session => {
      if (session.messageType === 'group' && session.message !== undefined) {
        console.log(`[Group ${session.groupId}] ${session.message}`)
        const yt = new YouTube(session, true, env.googleKey)
        yt.sendInfo(session.message)
      }
      if (session.messageType === 'private' && session.message !== undefined) {
        console.log(`[Group ${session.userId}] ${session.message}`)
      }
    })
  }
}
