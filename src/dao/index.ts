import { createConnection } from 'typeorm'

interface databaseConfig {
  host:string
  port: number
  username: string,
  password: string,
  database: string
}

export const databaseAdapter = async (config: databaseConfig) => {
  return await createConnection({
    host: config.host,
    port: config.port,
    username: config.username,
    password: config.password,
    database: config.database,
    type: 'mysql',
    charset: 'utf8mb4',
    synchronize: true,
    logging: false,
    entities: [
      'src/entity/**/*.ts'
    ],
    migrations: [
      'src/migration/**/*.ts'
    ],
    subscribers: [
      'src/subscriber/**/*.ts'
    ],
    cli: {
      entitiesDir: 'src/entity',
      migrationsDir: 'src/migration',
      subscribersDir: 'src/subscriber'
    }
  }
  )
}
