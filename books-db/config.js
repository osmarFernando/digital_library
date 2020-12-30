require("dotenv").config()
const { Client } = require('pg')
const config = { 
    port: process.env.PORT,
    enviroment: process.env.NODE_ENV || "development",
   
    client: new Client ({
        host: process.env.HOST,
        database: process.env.DATABASE,
        port: process.env.PORT_DB || 5432,
        user: process.env.USER_DB,
        password: process.env.PASSWORD
    })
}

console.log(process.env.USER_DB)
config.client.connect().then(() => console.log("connect to postgres"))
.catch(error => console.log(error))

module.exports = { config } 