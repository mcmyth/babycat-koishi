import ws from 'ws'
import { App } from 'koishi-core'
import { env } from '../config/env'

export class BolgTask {
  app: App
  sock: ws | undefined
  address: string = 'ws://localhost:3004/'
  constructor (app: App) {
    this.app = app
  }

  public async connect (): Promise<ws> {
    // const wss = (): ws | undefined => {
    //   // eslint-disable-next-line new-cap
    //   let _wss: ws | undefined
    //   try {
    //     // eslint-disable-next-line new-cap
    //     _wss = new ws(this.address)
    //   } catch (e) {}
    //   return _wss
    // }
    // function sleep (ms: number) {
    //   return new Promise(resolve => setTimeout(resolve, ms))
    // }
    // let sock: ws | undefined
    // while (typeof sock === 'undefined') {
    //   sock = wss()
    //   console.log('connect failed.reconnect...')
    //   await sleep(3000)
    // }
    // eslint-disable-next-line new-cap
    return new ws(this.address)
  }

  public async start () {
    if (this.sock === undefined) this.sock = await this.connect()
    this.sock.on('open', async () => {
      console.log('blog service open')
      if (this.sock === undefined) this.sock = await this.connect()
      this.sock.send(`${env.app.selfId} connected`)
    })
    this.sock.on('message', data => {
      console.log(data)
      const groupList = env.blogMessageList
      for (let i = 0; i < groupList.length; i++) {
        this.app.bots[env.app.selfId].sendGroupMsg(groupList[i], String(data))
      }
    })

    this.sock.on('close', () => {
      console.log('blog service close')
    })
  }
}
