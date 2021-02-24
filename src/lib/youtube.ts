import { getInfo, Info } from 'youtube-dl'
import { RawSession } from 'koishi-core/dist/context'
import { CQCode } from 'koishi-utils'
import EvilWord from './EvilWord'
import { env } from '../config/env'
import utils from './utils'
import { pathToFileURL } from 'url'
import { tmpdir } from 'os'
import { writeFile, existsSync, readFile } from 'fs'

const opencc = require('node-opencc')

declare module 'youtube-dl' {
  // eslint-disable-next-line no-unused-vars
  interface Info {
    id: string,
    title: string,
    url: string,
    thumbnail: string,
    description: string
  }
}

interface YouTubeInfo {
  id: string,
  title: string,
  url: string,
  thumbnail: string,
  description: string
}

export default class {
  session: RawSession<'message'>
  apikey?: string

  constructor (session: RawSession<'message'>, apikey?: string) {
    this.session = session
    this.apikey = apikey
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
          idList.push(_url.pathname.replace('/', ''))
        } else {
          const v = _url.searchParams.get('v')
          if (v !== null) idList.push(v)
        }
      }
    }
    if (idList.length === 0) return undefined; else return idList
  }

  // 获取YouTube视频信息,无apiKey则通过YouTubeDL获取
  private async getInfo (url: string, cache?: boolean): Promise<Info | YouTubeInfo | undefined> {
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

    if (typeof this.apikey !== 'undefined') {
      // 通过apiKey获取视频信息
      const response = JSON.parse(await utils.get(`https://www.googleapis.com/youtube/v3/videos?part=snippet&hl=zh-CN&id=${idList[0]}&key=${this.apikey}`, true))
      if (response.items.length === 0) { await this.session.$send('该视频不存在'); return }
      return {
        id: response.items[0].id,
        title: response.items[0].snippet.title,
        url: `https://youtu.be/${response.items[0].id}`,
        thumbnail: `https://img.youtube.com/vi/${response.items[0].id}/maxresdefault.jpg`,
        description: response.items[0].snippet.description
      }
    } else {
      // 通过YouTubeDL获取视频信息
      return new Promise(resolve => {
        const options = [`--proxy=http://${env.proxy.host}:${env.proxy.port}`]
        getInfo(`https://youtu.be/${idList[0]}`, options, async (err, info) => {
          if (err) throw err
          resolve(info)
        })
      })
    }
  }

  public async sendInfo (url: string) {
    // 感叹号开头的消息不处理
    if (url[0] === '!' || url[0] === '！') return
    // 获得视频信息
    const info = await this.getInfo(url, true)
    if (typeof info === 'undefined') return
    // 检测敏感词
    if (await EvilWord.detectEvilWord(info.title)) return
    // 写入缓存
    const imagePath = `${tmpdir()}/babycat/yt_${info.id}.jpg`
    const configPath = `${tmpdir()}/babycat/yt_${info.id}.json`
    writeFile(configPath, JSON.stringify(info), (error) => { if (error) console.log(error) })
    // 下载图片后推送消息
    const imagePath = `${tmpdir()}/babycat/yt_${info.id}.jpg`
    if (await utils.download(`https://img.youtube.com/vi/${info.id}/maxresdefault.jpg`, imagePath, this.useProxy, useCache)) {
      const text = `${info.title}\n${CQCode.stringify('image', { file: String(pathToFileURL(imagePath)) })}`
      await this.session.$send(opencc.hongKongToSimplified(text))
    } else {
      // 图片下载失败则只推送标题
      await this.session.$send(opencc.hongKongToSimplified(info.title))
    }
  }
}