import { env } from '../config/env'
import { App } from 'koishi-core'
const groupList: Array<number> = env.messenger
export const Messenger = async (app: App): Promise<void> => {
  app.on('message', session => {
    // 如果不是群消息或消息为空则不处理
    if (session.messageType !== 'group' || session.message == null) return
    // 遍历数组所有群号,转发到除自身外的所有群
    for (let i = 0; i < groupList.length; i++) {
      if (groupList[i] !== session.groupId && groupList.indexOf(Number(session.groupId)) !== -1) {
        // 显示群名
        // app.bots[env.app.selfId].getGroupInfo(Number(session.groupId)).then(groupInfo => {
        //   const msg = `[${groupInfo.groupName}]\n[${session.$username}] ${session.message}`
        //   app.bots[env.app.selfId].sendGroupMsg(groupList[i], msg)
        // })
        const msg = `[${session.$username}] ${session.message}`
        app.bots[env.app.selfId].sendGroupMsg(groupList[i], msg)
      }
    }
  })
}
