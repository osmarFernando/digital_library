const { config } = require("../config")
const client = config.client

class PostgresPerson {
    constructor() {
    }
    async searchPerson(data) {
        let filter = []
        if (data.name !== undefined) filter.push(`name ILIKE '%${data.name}%'`)
        if (data.lastname !== undefined) filter.push(`lastname ILIKE '%${data.lastname}%'`)
        if (data.curp !== undefined) filter.push(`curp ILIKE '${data.curp}'`)
        if (data.age !== undefined) filter.push(`age = ${data.age}`)
        if (data.status !== undefined) data.status === false ? "status=false" : filter.push(`status ILIKE '${data.status}'`)
        if (data.book_id !== undefined) filter.push(`book_id = '${data.book_id}'`)
        let cond = filter.join(' AND ')
        const query = `SELECT p.name, p.lastname, p.curp, p.age, p.status, b.book_id
                        FROM person p 
                        LEFT JOIN  book b 
                        ON p.book_id = b.id
                        ${cond !== "" ? `WHERE  ${cond}` : ""} 
                        ORDER BY p.name ASC`
        console.log(query)
        let search = await client.query(query)
        return search.rows
    }

    async createPerson(data) {
        const status = true
        const query = `INSERT INTO person (name, lastname, curp, age, status)
                        VALUES ($1, $2, $3, $4, $5)`
        await client.query(query, [data.name, data.lastname, data.curp, data.age, status])
    }
    async updatePerson(curp, data) {
        let filter = []
        if (data.name !== undefined) filter.push(`name = '${data.name}'`)
        if (data.lastname !== undefined) filter.push(`lastname = '${data.lastname}'`)
        if (data.curp !== undefined) filter.push(`curp = '${data.curp}'`)
        if (data.age !== undefined) filter.push(`age = ${data.age}`)
        if (data.status !== undefined) filter.push(`status = '${data.status}'`)
        if (data.book_id !== undefined) filter.push(`book_id = ${data.book_id}`)
        const cond = filter.join(', ')
        const query = `UPDATE person 
                        SET ${cond !== "" ? `${cond}
                        WHERE curp = '${curp}'` : ""}`
        await client.query(query)

    }
    async deletePerson(data) {
        const query = `DELETE FROM person WHERE curp = '${data}'`
        client.query(query)
    }
}
module.exports = PostgresPerson