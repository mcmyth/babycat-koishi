import { scheduleJob } from 'node-schedule'
import { App } from 'koishi-core'
import { env } from '../config/env'
import { WikiPic } from '../lib/wikipic'

export class BotSchedule {
  app: App

  constructor (app: App) {
    this.app = app
  }

  private async sendGroupMessage (group: number, message: string) {
    return await this.app.bots[env.app.selfId].sendGroupMsg(group, message)
  }

  public start () {
    scheduleJob('0 0 0 * * ?', async () => {
      // 推送当前日期的维基日图
      await this.sendGroupMessage(570727901, await new WikiPic().getText(new Date().toDateString()))
    })
  }
}
