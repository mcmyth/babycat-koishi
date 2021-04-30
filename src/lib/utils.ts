import { existsSync, mkdirSync, createWriteStream } from 'fs'
import { get as http, RequestOptions } from 'http'
import { get as https } from 'https'
import HttpProxyAgent from 'http-proxy-agent'
import HttpsProxyAgent from 'https-proxy-agent'
import { parse } from 'path'
import { env } from '../config/env'

export default class {
  // 下载文件
  static download (url: string, localPath: string, useProxy: boolean = false, cache?: boolean): Promise<boolean> {
    // 检测目录不存在则创建
    const dir = parse(localPath).dir
    if (!existsSync(dir)) mkdirSync(dir)
    return new Promise(resolve => {
      if (cache && existsSync(localPath)) {
        resolve(true)
        return
      }
      const _url: URL = new URL(url)
      const options: RequestOptions = {}

      // 创建文件流并开始下载
      const file = createWriteStream(localPath)
      file.on('finish', () => { resolve(true) })
        .on('close', () => { file.close(); resolve(false) })
        .on('error', (err) => { console.log('!!! Error: ' + err); resolve(false) })
      if (typeof _url !== 'undefined' && _url.protocol === 'http:') {
        if (useProxy) options.agent = HttpProxyAgent(`http://${env.proxy.host}:${env.proxy.port}`)
        http(url, options, response => { response.pipe(file) }).end()
      }
      if (typeof _url !== 'undefined' && _url.protocol === 'https:') {
        if (useProxy) options.agent = HttpsProxyAgent(`http://${env.proxy.host}:${env.proxy.port}`)
        https(url, options, response => { response.pipe(file) }).end()
      }
    })
  }

  // 发送get请求
  static get (url: string, useProxy: boolean = false): Promise<string> {
    return new Promise(resolve => {
      const _url: URL = new URL(url)
      const options: RequestOptions = {}
      let request
      if (typeof _url !== 'undefined' && _url.protocol === 'http:') {
        if (useProxy) options.agent = HttpProxyAgent(`http://${env.proxy.host}:${env.proxy.port}`)
        request = http
      }

      if (typeof _url !== 'undefined' && _url.protocol === 'https:') {
        if (useProxy) options.agent = HttpsProxyAgent(`http://${env.proxy.host}:${env.proxy.port}`)
        request = https
      }

      // 下载数据
      if (typeof request !== 'undefined') {
        let source: string = ''
        request(url, options, function (res) {
          res.on('data', function (data) { source += data })
          res.on('end', function () { resolve(source) })
        }).on('error', function () { console.log('获取数据错误:' + url) })
      } else {
        // URL协议类型不为http或https则不响应
        resolve('')
      }
    })
  }
}
