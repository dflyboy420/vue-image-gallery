const config = require("config");
const express = require("express");
const _ = require("lodash");
const mongoose = require("mongoose");
const cors = require('cors');
const Database = require('./database');
const {getInfo, convert} = require('./util');

var multer = require("multer");
var storage = multer.memoryStorage();
var upload = multer({
    storage: storage
});
// const { createNodeRedisClient } = require('handy-redis');

// const client = createNodeRedisClient(config.get('redis'));

const app = express();
app.use(cors({
    optionsSuccessStatus: 204
}));
app.set('trust proxy', 'loopback');

app.post('/upload', upload.array("img", 5), async (req, res) => {
    const props = _.map(req.files, async (f) => _.set(f, 'info', await getInfo(f.buffer)));
    let img = await Promise.all(props);
    img = _.map(img, i => {return {
        fileName: i.originalname,
        data: i.buffer,
        info: i.info,
    }});

    const docs = await Database.Pic.insertMany(img);
    console.debug(docs);

    for(let i of img) {
        let webp = i;
        webp.data = await convert(i.data, "webp");
        webp.info = await getInfo(webp.data);
        await Database.Pic.create(webp);
    }

    res.sendStatus(204);
});

app.get('/list', async (req, res) => {
    const docs = await Database.Pic.find({}, {data: 0}).exec();
    res.json(docs);
});

const HTTP_PORT = config.get('web.port');
Database.init().then(() => {
    app.listen(HTTP_PORT, () => {
        console.info('Listening', {
            port: HTTP_PORT,
        });
    });
});