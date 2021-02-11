import * as https from 'https'
import { CQCode } from 'koishi-utils'

export class Ocr {
  static tencent (url: string | URL): Promise<string> {
    return new Promise((resolve, reject) => {
      if (url === undefined) resolve('URL为空')
      const _cqCode = CQCode.parse(String(url))
      // 尝试从CQ码中取出URL,失败则返回源文本
      let _url: string | URL = _cqCode !== null && _cqCode.type === 'image' ? _cqCode.data.url : url
      // 检查URL有效性
      try { _url = new URL(String(_url)) } catch (err) { resolve('URL无效') }
      https.get('https://ai.qq.com/cgi-bin/appdemo_imagetranslate?image_url=' + String(_url), (res) => {
        let source: string = ''
        res.on('data', (data: string) => { source += data })
        res.on('end', function () {
          const json = JSON.parse(source)
          if (json.msg === 'ok') {
            // 取出json中的数组
            const data = json.data.image_records
            if (data.length === 0) resolve('无法从图中找到文本')
            let sourceText: string = ''
            // 从json数组中遍历出文本
            for (let i = 0; i < data.length; i++) { sourceText += data[i].source_text + '\n' }
            resolve(sourceText.substr(0, sourceText.length - 1))
          } else {
            resolve(json.msg)
          }
        })
        res.on('error', function (err) { reject(err.message) })
      })
    })
  }
}
