import { RawSession } from 'koishi-core/dist/context'
import { CQCode } from 'koishi-utils'
import EvilWord from './EvilWord'
import utils from './utils'
import { pathToFileURL } from 'url'
import { tmpdir } from 'os'
import { writeFile, existsSync, readFile } from 'fs'

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
  session: RawSession<'message'>
  apikey: string
  useProxy: boolean
  constructor (session: RawSession<'message'>, useProxy: boolean = false, apikey: string) {
    this.session = session
    this.apikey = apikey
    this.useProxy = useProxy
  }

  // 返回一个YouTubeID的数组
  private getId (url: string): Array<string> | undefined {
    const domain = ['www.youtube.com', 'm.youtube.com', 'youtube.com', 'youtu.be']
    // 获取文本中的所有链接
    const urlList = url.match(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/g)
    const idList: Array<string> = []
    if (urlList === null) return undefined
    // 从所有链接中找到符合要求的URL并找到视频ID
    for (let i = 0; i < urlList.length; i++) {
      const _url = new URL(urlList[i])
      if (domain.indexOf(_url.hostname) !== -1) {
        if (_url.hostname === 'youtu.be') {
          idList.push(encodeURI(_url.pathname.replace('/', '')))
        } else {
          const v = _url.searchParams.get('v')
          if (v !== null) idList.push(encodeURI(v))
        }
      }
    }
    if (idList.length === 0) return undefined; else return idList
  }

  // 获取YouTube视频信息,无apiKey则通过YouTubeDL获取
  private async getInfo (url: string, cache?: boolean): Promise<YouTubeInfo | undefined> {
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
    const response = JSON.parse(await utils.get(`https://www.googleapis.com/youtube/v3/videos?part=snippet&hl=zh-CN&id=${idList[0]}&key=${this.apikey}`, this.useProxy))
    if (response.items.length === 0) { await this.session.$send('该视频不存在'); return }
    // 判断没有max版本则用medium版本封面图
    const obj = response.items[0].snippet
    let thumbnail: string
    if (('maxres' in obj.thumbnails)) {
      thumbnail = obj.thumbnails.maxres.url
    } else {
      thumbnail = obj.thumbnails.medium.url
    }
    return {
      id: response.items[0].id,
      title: obj.title,
      url: `https://youtu.be/${response.items[0].id}`,
      thumbnail,
      description: obj.description,
      uploader: obj.channelTitle
    }
  }

  public async sendInfo (url: string) {
    // 星号开头不采用缓存
    let useCache: boolean = true
    if (url[0] === '*') useCache = false
    // 感叹号开头的消息不处理
    if (url[0] === '!' || url[0] === '！') return
    // 获得视频信息
    const info = await this.getInfo(url, useCache)
    if (typeof info === 'undefined') return
    // 检测敏感词
    if (await EvilWord.detectEvilWord(info.title)) return
    // 写入缓存
    if (useCache) {
      const configPath = `${tmpdir()}/babycat/yt_${info.id}.json`
      writeFile(configPath, JSON.stringify(info), (error) => { if (error) console.log(error) })
    }
    // 下载图片后推送消息
    const imagePath = `${tmpdir()}/babycat/yt_${info.id}.jpg`
    if (await utils.download(info.thumbnail, imagePath, this.useProxy, useCache)) {
      const text = `[${info.uploader}] ${info.title}\n${CQCode.stringify('image', { file: String(pathToFileURL(imagePath)) })}`
      await this.session.$send(opencc.hongKongToSimplified(text))
    } else {
      // 图片下载失败则只推送标题
      await this.session.$send(opencc.hongKongToSimplified(info.title))
    }
  }
}
