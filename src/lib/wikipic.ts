import { load } from 'cheerio'
import * as https from 'https'
import HttpsProxyAgent from 'https-proxy-agent'
import { CQCode } from 'koishi-utils'
import { env } from '../config/env'
import { tmpdir } from 'os'
import utils from './utils'
import { pathToFileURL } from 'url'
interface WikiPicObject {
  [index: number]: {
    date: string | undefined,
    description: string | undefined,
    small: string | undefined,
    large: string | undefined
  }
}

export class WikiPic {
  options = {
    rejectUnauthorized: false,
    hostname: 'zh.wikipedia.org',
    path: '',
    agent: HttpsProxyAgent(`http://${env.proxy.host}:${env.proxy.port}`),
    headers: {
      'Accept-Language': 'zh-CN,zh;q=0.9',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.169 Safari/537.36'
    }
  }

  public get (date: Date): Promise<string | Error> {
    this.options.path = '/wiki/Wikipedia:%E6%AF%8F%E6%97%A5%E5%9B%BE%E7%89%87/' +
      encodeURI(`${String(date.getFullYear())}年${String(date.getMonth() + 1)}月`)
    return new Promise((resolve, reject) => {
      https.get(this.options, (res) => {
        let html: string
        res.on('data', data => { html += data })
        res.on('end', () => { resolve(html) })
        res.on('error', err => { reject(err) })
      })
    })
  }

  public parse (day?: Date): Promise<WikiPicObject | undefined> {
    return new Promise(resolve => {
      day = day === undefined ? new Date() : day
      this.get(day).then(res => {
        const $ = load(res)
        // 找到图片和描述所在dom
        const dom = $('table .mw-gallery-packed-hover')
        // 找到描述文本
        const description = dom.find('.gallerytextwrapper')
        const obj: WikiPicObject = []
        description.each((index, element) => {
          // 根据描述文本找到父级td标签获取.mw-headline中的日期
          const date: string = $(element)
            .parents('td')
            .find('.mw-headline')
            .text()
            .replace('[编辑]', '')
          // 去除描述文本中的换行
          const description = $(element).text().replace(/\n+|\t+/g, '')
          // 根据描述文本找到父级中的图片链接
          const small: string = 'https:' + String($(element).parent().find('img').attr('src'))
          const large: string = small.substr(0, small.lastIndexOf('/')).replace('/thumb', '')
          // 判断day是否已赋值,已赋值则采用指定时间
          if (typeof day !== 'undefined') {
            const thatTime: string = new Date(date.replace(/年|月|日/g, '/')).toDateString()
            // 判断与指定时间相符则取出对象
            if (thatTime === day.toDateString()) {
              obj[0] = { date, description, small, large }
              resolve(obj)
            }
          } else {
            // 添加所有可用对象
            obj[index] = { date, description, small, large }
            resolve(obj)
          }
        })
        resolve(undefined)
      }).catch(() => { resolve([{ date: undefined, description: '获取失败', small: undefined, large: undefined }]) })
    })
  }

  public async getText (date: string) {
    if (isNaN(Date.parse(date))) return '[维基日图 Error] 日期格式不正确'
    const src = await this.parse(new Date(date))
    if (src === undefined) return '[维基日图 Error] 获取失败'
    let img: string
    const day = src[0].date
    const desc = src[0].description
    const small = src[0].small
    const large = src[0].large
    if (typeof small !== 'undefined') {
      const imagePath = `${tmpdir()}/babycat/wikipic_${day}.jpg`
      if (await utils.download(small, imagePath, true, false)) {
        img = CQCode.stringify('image', { file: String(pathToFileURL(imagePath)) })
        return `[${day}维基日图]\n${img}\n${desc}\n小:${small}\n大:${large}`
      } else {
        // 图片下载
        img = `[${day}维基日图]\n[缩略图获取失败]\n${desc}\n小:${small}\n大:${large}`
      }
    } else {
      // 所有数据获取失败
      img = '[维基日图 Error] 图片获取失败'
    }
    return `[${day}维基日图]\n${img}\n${desc}\n小:${small}\n大:${large}`
  }
}
