import express from "express"
import chalk from "chalk"
import path from "path"
import dotenv from "dotenv"
import mongoose from "mongoose"
import _ from "lodash"

const __dirname = path.resolve()

dotenv.config()
const PORT = process.env.PORT
const DB_URL = process.env.MONGODB_ATLAS_URI
const DB_NAME = process.env.MONGODB_ATLAS_DB_NAME
const DB_USERNAME = process.env.MONGODB_ATLAS_USERNAME
const DB_PASSWORD = process.env.MONGODB_ATLAS_PASSWORD

const publicDirectoryPath = path.join(__dirname, '/public')

const app = express()

app.set("view engine", "ejs")

app.use(express.static("public"))
app.use(express.urlencoded({ extended: true }))
app.use(express.static(publicDirectoryPath))

const uri = `mongodb+srv://${DB_USERNAME}:${DB_PASSWORD}@${DB_URL}/${DB_NAME}?retryWrites=true&w=majority`
mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })


const itemSchema = new mongoose.Schema({
    name: String
})

const Item = mongoose.model("Item", itemSchema)

const item1 = new Item({
    name: "Welcome to your todo list!"
})

const item2 = new Item({
    name: "Hit the + button to add a new item"
})

const item3 = new Item({
    name: "Hit this to delete an item."
})

const defaultItems = [item1, item2, item3]

const listSchema = {
    name: String,
    items: [itemSchema]
}

const List = mongoose.model("List", listSchema)

app.get("/", (req, res) => {

    Item.find({}, (err, foundItems) => {

        if (foundItems.length === 0) {
            Item.insertMany(defaultItems, (err) => {
                if (err) {
                    console.log(err)
                } else {
                    console.log("Successfully saved default items to DB.")
                }
            })
            res.redirect("/")
        } else {
            res.render("list", { listTitle: "Today", itemsList: foundItems })
        }
    })
})

app.get("/:customListName", (req, res) => {
    const customListName = _.capitalize(req.params.customListName)

    List.findOne({ name: customListName }, (err, foundList) => {
        if (err) {
            console.log(err)
        } else {
            if (!foundList) {
                // Create a new list
                const list = new List({
                    name: customListName,
                    items: defaultItems
                })
                list.save( () => { 
                    res.redirect("/" + customListName)
                })                
            } else {
                // Show an existing list
                res.render("list", { listTitle: foundList.name, itemsList: foundList.items })                
            }
        }
    })
})

app.post("/", (req, res) => {

    const itemName = req.body.newItem
    const listName = req.body.list

    const item = new Item({
        name: itemName
    })

    if (listName === "Today") {
        item.save(() => {
            res.redirect("/")
        })

    } else {
        List.findOne({ name: listName }, (err, foundList) => {
            foundList.items.push(item)
            foundList.save(() => {
                res.redirect("/" + listName)
            })
        })
    }


})

app.post("/delete", (req, res) => {
    const checkedItemId = req.body.checkbox
    const listName = req.body.listName

    if (listName === "Today") {
        Item.findByIdAndRemove(checkedItemId, (err) => {
            if (err) {
                console.log(err)
            } else {
                console.log("Successfully removed the item.")
                res.redirect("/")
            }
        })
    } else {
        List.findOneAndUpdate({ name: listName }, { $pull: { items: { _id: checkedItemId } } }, (err, foundList) => {
            if (err) {
                console.log(err)
            } else {
                console.log("Successfully removed the item.")
                res.redirect("/" + listName)
            }
        })
    }
})

app.get("/about", (req, res) => {
    res.render("about")
})

app.listen(PORT, () => {
    console.log(chalk.blue(`Server is listening on port: ${PORT}`))
})