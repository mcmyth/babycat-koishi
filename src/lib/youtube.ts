import { RawSession } from 'koishi-core/dist/context'
import { CQCode } from 'koishi-utils'
import EvilWord from './EvilWord'
import utils from './utils'
import { pathToFileURL } from 'url'
import { tmpdir } from 'os'
import { writeFile, existsSync, readFile, readFileSync, unlink } from 'fs'

const opencc = require('node-opencc')

interface YouTubeInfo {
  id: string,
  title: string,
  url: string,
  thumbnail: string,
  description: string,
  uploader: string
}

export default class {
  session?: RawSession<'message'>
  apikey: string
  useProxy: boolean
  constructor (session: RawSession<'message'> | undefined, useProxy: boolean = false, apikey: string) {
    this.session = session
    this.apikey = apikey
    this.useProxy = useProxy
  }

  // 返回一个YouTubeID的数组
  public getId (url: string): Array<string> | undefined {
    // 获取文本中的YouTube链接
    const urlList = url.match(/youtu(be\.com|\.be)\/([a-z\d?&%=_-]+)/gi)
    if (urlList === null) return undefined
    // 提取视频id
    const idList: Array<string> = []
    for (let i = 0; i < urlList.length; i++) {
      const _url = new URL('http://' + urlList[i])
      const id: string | null = _url.hostname === 'youtu.be' ? _url.pathname.substring(1) : _url.searchParams.get('v')
      if (id !== null && id !== '') idList.push(id)
    }
    if (idList.length === 0) return undefined; else return idList
  }

  // 获取YouTube视频信息,无apiKey则通过YouTubeDL获取
  public async getInfo (url: string, cache?: boolean): Promise<YouTubeInfo | undefined> {
    // 获得视频ID
    const idList = this.getId(url)
    if (typeof idList === 'undefined') return
    // 读取缓存
    const configPath = `${tmpdir()}/babycat/yt_${idList[0]}.json`
    if (cache && existsSync(configPath)) {
      return new Promise(resolve => {
        readFile(configPath, (error, data) => {
          if (error) console.log(error)
          resolve(JSON.parse(data.toString()))
        })
      })
    }

    // 通过apiKey获取视频信息
    const apiURL = `https://www.googleapis.com/youtube/v3/videos?part=snippet&hl=zh-CN&id=${idList[0]}&key=${this.apikey}`
    const filePath = `${tmpdir()}/babycat/fullyt_${idList[0]}.json`
    await utils.download(apiURL, filePath, this.useProxy, false)
    const response = JSON.parse(await readFileSync(filePath, 'utf-8'))
    unlink(filePath, () => {})
    if (typeof this.session !== 'undefined' && response.items.length === 0) { await this.session.$send(`${CQCode.stringify('reply', { id: Number(this.session.messageId) })}该视频不存在`); return }
    const obj = response.items[0].snippet
    return {
      id: response.items[0].id,
      title: obj.title,
      url: `https://youtu.be/${response.items[0].id}`,
      thumbnail: obj.thumbnails.maxres?.url || obj.thumbnails.medium.url,
      description: obj.description,
      uploader: obj.channelTitle
    }
  }

  public async sendInfo (url: string) {
    if (typeof this.session === 'undefined') {
      console.log('session is undefined')
      return
    }
    // 星号开头不采用缓存
    let useCache: boolean = true
    if (url[0] === '*') useCache = false
    // 感叹号开头的消息不处理
    if (url[0] === '!' || url[0] === '！') return
    // 获得视频信息
    const info = await this.getInfo(CQCode.unescape(url), useCache)
    if (typeof info === 'undefined') return
    // 检测敏感词
    const messageId = Number(this.session.messageId)
    if (await EvilWord.detectEvilWord(info.uploader + info.title) !== false) {
      await this.session.$send(`${CQCode.stringify('reply', { id: messageId })}检测到该视频可能存在非法内容,已阻止解析。\n如果您认为有误,请发送以下指令来提交到人工审核:\n/cat review "${messageId}"`)
      return
    }
    // 写入缓存
    if (useCache) {
      const configPath = `${tmpdir()}/babycat/yt_${info.id}.json`
      writeFile(configPath, JSON.stringify(info), (error) => { if (error) console.log(error) })
    }
    // 下载图片后推送消息
    const imagePath = `${tmpdir()}/babycat/yt_${info.id}.jpg`
    if (await utils.download(info.thumbnail, imagePath, this.useProxy, useCache)) {
      if (!this.session.messageId) return
      const text = `${CQCode.stringify('reply', { id: messageId })}[${info.uploader}] ${info.title}\n${CQCode.stringify('image', { file: String(pathToFileURL(imagePath)) })}`
      await this.session.$send(opencc.hongKongToSimplified(text))
    } else {
      // 图片下载失败则只推送标题
      await this.session.$send(`${CQCode.stringify('reply', { id: messageId })}${opencc.hongKongToSimplified(info.title)}`)
    }
  }

  public async checkVideo (message: string) {
    const info = await this.getInfo(message, true)
    if (typeof info !== 'undefined') {
      return await EvilWord.detectEvilWord(info.uploader + info.title)
    }
  }
}
