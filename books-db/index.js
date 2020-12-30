
const { config }  = require("./config")
const PostgresBook = require("./lib/postgres_book")
const PostgresPerson = require("./lib/postgres_person") 
const postgresPerson = new PostgresPerson
const postgresBook = new PostgresBook 

module.exports = { postgresBook, postgresPerson , config }

