const express = require("express")
const { postgresBook } = require("books-db")
const asyncify = require('express-asyncify')
const route = asyncify(express.Router())
const joi = require("joi")
const fs = require("fs")
const multer = require("multer")
const path = require("path")
const csv = require("fast-csv")


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

////////////////////////////////////     joi validations     //////////////////////////////////////////////////////////////////////
const searchSchema = joi.object({
    name: joi.string(),
    author: joi.string(),
    editorial: joi.string(),
    year: joi.number(),
    genre: joi.string(),
    avaible: joi.string(),
    totalStock: joi.string(),
    book_id: joi.string()
})
const createSchema = joi.object({
    name: joi.string().trim().min(1).max(100).required().strict(),
    author: joi.string().min(1).trim().max(100).required().strict(),
    editorial: joi.string().min(1).max(50).strict(),
    year: joi.number().integer().min(1950).max(2021),
    genre: joi.string().min(2).max(50).regex(/^[a-zA-Z]+$/).strict()
})
const updateSchema = joi.object({
    name: joi.string().min(1).max(100).strict(),
    author: joi.string().min(1).max(100).strict(),
    editorial: joi.string().min(1).max(50).strict(),
    year: joi.number().integer().min(1950).max(2021).strict(),
    genre: joi.string().min(2).max(50),
    book_id: joi.string()
})
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
route.post("/", async (req, res, next) => {
    try {
        const { body } = req
        const validate = searchSchema.validate(body)
        if (validate.error) return res.status(400).send({ message: validate.error.details[0].message })

        const search = await postgresBook.searchBooks(body)
        return res.status(200).json(search)
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
                let created = []
                let invalid = []
                let existing = []
                for (let item of fileRows) {
                    let validate = await createSchema.validate(item)
                    if (validate.error) {
                        invalid.push(item)
                    }
                    else {
                        const search = await postgresBook.searchBooks({ name: item.name, author: item.author })
                        if (search.length === 0) {
                            created.push(item)
                            await postgresBook.createBook(item)
                            console.log("Processing...")
                            console.log("Created" + "\n")
                        } else {
                            existing.push(item)
                            const addAvaible = search[0].avaible + 1
                            const addStock = search[0].stock + 1
                            await postgresBook.updateBook(search[0].book_id, { avaible: addAvaible, stock: addStock })
                        }
                    }
                }
                fs.unlinkSync(req.file.path)
                return res.status(200).json({ created_books: created.length, invalid_books: invalid.length, add_stock: existing.length })
            })
    } catch (error) {
        console.log(error)
        next(error)
    }
})

route.post("/rented-books", async(req, res, next)=>{
    const { params } = req
    const search = await postgresBook.searchBooks({ book_id: params })
    if (search.length === 0) return res.status(404).json({ mesagge: "Book not found" })


})

route.put("/", async (req, res, next) => {
    try {
        const { body } = req
        const search = await postgresBook.searchBooks({ book_id: body.book_id })
        if (search.length === 0) return res.status(404).json({ mesagge: "Book not found" })
        let validate = await updateSchema.validate(body)
        if (validate.error) return res.status(400).send({ message: validate.error.details[0].message })
        await postgresBook.updateBook(body.book_id, body)
        return res.status(200).json({ mesagge: "Book updated" })
    } catch (error) {
        next(error)
    }
})

route.delete("/:bookId", async (req, res, next) => {
    try {
        const { params } = req
        const search = await postgresBook.searchBooks({ book_id: params.bookId, needId: "true"})
        if (search.length !== 1) return res.status(400).json({ mesagge: "book not found" })
        return res.status(200).json({ mesagge: "book deleted" })
    } catch (error) {
        next(error)
    }
})

module.exports = route