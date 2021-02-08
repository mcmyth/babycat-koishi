import Main from './main'
// import { databaseAdapter } from './dao'
// import { env } from './config/env'
/* connect database */
// databaseAdapter(env.database).then(async connection => {
//   // await new Main().run()
//   console.log('server is running...')
// })

new Main().run().then(() => {
  console.log('server is running....')
})
