import { env } from '../config/env'
import { createConnection } from 'mysql'
const opencc = require('node-opencc')
const tencentcloud = require('tencentcloud-sdk-nodejs')
const connection = createConnection({
  host: env.db.mysql.host,
  user: env.db.mysql.username,
  password: env.db.mysql.password,
  database: env.db.mysql.database,
  charset: 'utf8mb4'
})

export default class EvilWord {
  // 检测敏感词
  static detectEvilWord (content: string) {
    return new Promise(resolve => {
      // 转换到简体中文
      const text = opencc.hongKongToSimplified(content)
      const sql = "select word from evil_word where ? like CONCAT('%',word,'%') UNION select word from evil_word where word like CONCAT('%',?,'%')"
      connection.query(sql, [text, text], (err, result) => {
        if (err) throw err
        if (result.length > 0) resolve(true); else resolve(false)
        if (result.length > 0) console.log(result)
      })
    })
  }

  // 删除敏感词
  static delEvilWord (content: string) {
    return new Promise(resolve => {
      const text = opencc.hongKongToSimplified(content)
      connection.query("DELETE FROM evil_word WHERE ? like CONCAT('%',word,'%')", text, (err, result) => {
        if (err) throw err
        resolve(result.affectedRows)
      })
    })
  }

  // 增加敏感词
  static addEvilWord (content: string) {
    return new Promise(resolve => {
      const text = opencc.hongKongToSimplified(content)
      connection.query('INSERT INTO `evil_word`(`word`) VALUES (?)', text, (err, result) => {
        if (err) throw err
        resolve((result.affectedRows > 0))
      })
    })
  }

  // 使用腾讯云检测敏感词
  static tencentCloudTextModeration (content: string) {
    return new Promise(resolve => {
      const TmsClient = tencentcloud.tms.v20201229.Client
      const clientConfig = {
        credential: env.tencentCloud,
        region: 'ap-guangzhou',
        profile: {
          httpProfile: {
            endpoint: 'tms.tencentcloudapi.com'
          }
        }
      }

      const client = new TmsClient(clientConfig)
      const params = {
        Content: Buffer.from(content).toString('base64')
      }
      const _resolve = resolve
      client.TextModeration(params).then(
        (data: string) => {
          _resolve(data)
        },
        (err: Error) => {
          console.error('error', err)
        }
      )
    })
  }
}
