const express = require("express")
const { postgresPerson, postgresBook } = require("books-db")
const asyncify = require('express-asyncify')
const route = asyncify(express.Router())
const joi = require("joi")
const fs = require("fs")
const multer = require("multer")
const path = require("path")
const csv = require("fast-csv")
const { parse } = require("path")
const { json } = require("body-parser")
const { string, boolean } = require("joi")
const PostgresPerson = require("books-db/lib/postgres_person")


const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, './filesCSV'),
    filename: (req, file, cb) => cb(null, path.extname(file.originalname))
})
const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        if (!file.originalname.match(/\.(csv)$/)) {
            return cb(new Error('Invalid Fiel Type'))
        }
        cb(null, true)
    }
})

/////////////////////      joi validations     //////////////////////////////////////////////////////////////////////////////////////////

const searchSchema = joi.object({
    name: joi.string(),
    curp: joi.string(),
    lastname: joi.string(),
    age: joi.number(),
    book_id: joi.string(),
    status: joi.boolean()
})
const createSchema = joi.object({
    name: joi.string().trim().min(1).max(25).regex(/^[a-zA-Z]+$/).required().strict(),
    curp: joi.string().length(18).alphanum().required().strict(),
    lastname: joi.string().trim().regex(/^[a-zA-Z]+$/).required().strict(),
    age: joi.number().integer().min(15).max(100)
})
const updateSchema = joi.object({
    curp: joi.string().min(18).max(18).alphanum().required().strict(),
    name: joi.string().regex(/^[a-zA-Z]+$/).message("name contain only letters").strict(),
    lastname: joi.string().regex(/^[a-zA-Z]+$/).message("lastname contain only letters"),
    age: joi.number().integer().min(15).max(100)
})
const rentSchema = joi.object({
    curp: joi.string().trim().min(18).max(18).alphanum().required().strict(),
    book_id: joi.string().trim().required().strict()
})
const returnBookSchema = joi.object({
    curp: joi.string().min(18).max(18).alphanum().required().strict(),
    book_id: joi.string().trim().required().strict()
})
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

route.post("/", async (req, res, next) => {
    try {
        const { body } = req
        const validate = searchSchema.validate(body)
        if (validate.error) return res.status(400).send({ message: validate.error.details[0].message })
        const search = await postgresPerson.searchPerson(body)
        if (search.length === 0) return res.status(404).json({ message: "person_not_found" })
        return res.status(200).json({ person: search, mesagge: "person_retrived" })
    } catch (error) {
        next(error)

    }
})

route.post("/upload-csv", upload.single("file"), async (req, res, next) => {
    try {
        let fileRows = []
        csv.parseFile(req.file.path, { headers: true })
            .on("data", (data) => {
                fileRows.push(data)
            })
            .on("end", async () => {
                let personsAcept = []
                let personsDenied = []
                for (let item of fileRows) {
                    let validate = await createSchema.validate(item)
                    if (validate.error) {
                        personsDenied.push(item)
                    } else {
                        const search = await postgresPerson.searchPerson({ curp: item.curp })
                        if (search.length === 0) {
                            personsAcept.push(item)
                            await postgresPerson.createPerson(item)
                            console.log("Processing...")
                            console.log("Created" + "\n")
                        } else {
                            personsDenied.push(item)
                        }
                    }
                }
                fs.unlinkSync(req.file.path)
                return res.status(200).json({ inserts: personsAcept.length, no_inserts: personsDenied.length })
            })
    } catch (error) {
        console.log(error)
        next(error)
    }
})
route.put("/", async (req, res, next) => {
    try {
        try {
            const { body } = req
            let validate = await updateSchema.validate(body)
            if (validate.error) return res.status(400).send({ message: validate.error.details[0].message })
            const search = await postgresPerson.searchPerson({ curp: body.curp })
            if (search.length === 0) return res.status(404).json({ mesagge: "Person not found" })
            await postgresPerson.updatePerson(body.curp, body)
            return res.status(200).json({ message: "successful_update" })
        } catch (error) {
            console.log(error)
            next(error)
        }
    } catch (error) {
        next(error)
    }
})
route.put("/rent", async (req, res, next) => {
    try {
        const { body } = req
        const validate = rentSchema.validate(body)
        if (validate.error) return res.status(400).send({ message: validate.error.details[0].message })
        const search = await postgresPerson.searchPerson({ curp: body.curp })
        if (search.length !== 1) return res.status(404).json({ mesagge: "person_not_found" })
        if (search[0].status === false ) return res.status(400).json({ message: "Can't_rent_more_books" })
        const book = await postgresBook.searchBooks({ book_id: body.book_id, needId: "true" })
        if (book.length !== 1) return res.status(404).json({ mesagge: "book_not_found" })
        if (book[0].avaible === 0)  return res.status(400).json({ message: "book_not_aviable " })
        const subAvaible = book[0].avaible - 1
        await postgresBook.updateBook(book[0].book_id, { avaible: subAvaible }) 
        await postgresPerson.updatePerson(body.curp, { status: false, book_id: book[0].id })
        return res.status(200).json({ message: "rented_successful" })
    } catch (error) {
        console.log(error)
        next(error)
    }
})

route.put("/return-book", async (req, res, next) => {
    try {
        const { body } = req
        const validate = returnBookSchema.validate(body)
        if (validate.error) return res.status(400).send({ message: validate.error.details[0].message })
        const search = await postgresPerson.searchPerson({ curp: body.curp })
        if (search.length !== 1) return res.status(404).json({ mesagge: "person_not_found" })
        //if (search[0].status === "true") return res.status(400).json({ message: "you cant return any more books" })
        if (!(search[0].book_id === body.book_id)) return res.status(400).json({ message: "return_failed" })
        const book = await postgresBook.searchBooks({ book_id: body.book_id })
        const addAvaible = book[0].avaible + 1
        await postgresBook.updateBook(book[0].book_id, { avaible: addAvaible })
        await postgresPerson.updatePerson(body.curp, { status: true, book_id: null })
        return res.status(200).json({ message: "book_returned" })
    } catch (error) {
        console.log(error)
        next(error)
    }
})

route.delete("/:curp", async (req, res, next) => {
    try {
        const { params } = req
        const search = await postgresPerson.searchPerson(params)
        if (search.length !== 1) return res.status(404).json({ mesagge: "person_not_found" })
        if(search[0].book_id !== null) return res.status(400).json({ mesagge: "you_need _return_the_book" })
        await postgresPerson.deletePerson(params.curp)
        return res.status(404).json({ mesagge: "person_deleted" })
    } catch (error) {
        console.log(error)
        next(error)
    }
})

module.exports = route