const { config } = require("../config")
const uuid = require("uuid")
const client = config.client

class PostgresBook {
    constructor() {
    }
    async searchBooks(data) {
        let filter = []
        if (data.name !== undefined) filter.push(`name ILIKE '%${data.name}%'`)
        if (data.author !== undefined) filter.push(`author ILIKE '%${data.author}%'`)
        if (data.editorial !== undefined) filter.push(`editorial ILIKE '${data.editorial}'`)
        if (data.year !== undefined) filter.push(`year = '${data.year}'`)
        if (data.genre !== undefined) filter.push(`genre ILIKE '${data.genre}'`)
        if (data.book_id !== undefined) filter.push(`book_id = '${data.book_id}'`)
        if (data.stock !== undefined) filter.push(`stock = '${data.stock}'`)
        if (data.avaible !== undefined) filter.push(`avaible = '${data.avaible}'`)
        let cond = filter.join(' AND ')
        const query = `SELECT ${data.needId === "true" ? 'id,' : ''} name, author, editorial, year, genre, book_id, stock, avaible
                        FROM book ${cond !== "" ? `WHERE  ${cond}` : ""} 
                        ORDER BY name ASC`
        let search = await client.query(query)
        return search.rows
    }

    async createBook(data) {
        const book_id = uuid.v4().substr(20).replace(/-/g, '')
        const query = `INSERT INTO book (name, author, editorial, year, genre, book_id, stock, avaible) 
                        VALUES ($1, $2, $3, $4, $5,$6, $7, $8)`
        await client.query(query, [data.name, data.author, data.editorial, data.year, data.genre, book_id, 1, 1])
    }
    async updateBook(book_id, data) {
        let filter = []
        if (data.name) filter.push(`name ='${data.name}'`)
        if (data.author) filter.push(`author ='${data.author}'`)
        if (data.editorial) filter.push(`editorial ='${data.editorial}'`)
        if (data.year) filter.push(`year =${data.year}`)
        if (data.gender) filter.push(`gender ='${data.gender}'`)
        if (data.avaible !== undefined) data.avaible === 0 ? filter.push("avaible = 0") : filter.push(`avaible =${data.avaible}`)
        if (data.stock) filter.push(`stock =${data.stock}`)
        const cond = filter.join(', ')
        const query = `UPDATE book SET ${cond !== "" ? `${cond} 
                        WHERE book_id = '${book_id}'` : ""}`
        await client.query(query)
    }
    async deleteBook(data) {
        console.log(data)
        const query = `DELETE FROM book WHERE book_id = '${data}'`
        client.query(query)
    }
 
}
module.exports = PostgresBook