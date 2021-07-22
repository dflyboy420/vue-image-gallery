const config = require("config");
const express = require("express");
const _ = require("lodash");
const async = require("async");
const cors = require("cors");
const Database = require("./database");
const { getInfo, convert, convertThumb } = require("./util");

var multer = require("multer");
var storage = multer.memoryStorage();
var upload = multer({
  storage: storage,
});
const { createNodeRedisClient } = require("handy-redis");

const client = createNodeRedisClient(config.get("redis"));

const app = express();
app.use(
  cors({
    optionsSuccessStatus: 204,
  })
);
app.set("trust proxy", "loopback");

app.post("/upload", upload.array("img", 5), async (req, res) => {
  const img = _.map(req.files, (i) => {
    return {
      fileName: i.originalname,
      data: i.buffer,
    };
  });

  const docs = Database.Pic.insertMany(img);

  // create a queue object with concurrency 2
  var q = async.queue(function (i, callback) {
    async.parallel(
      [
        async function () {
          let webp = i;
          webp.data = await convert(i.data, "webp");
          webp.info = await getInfo(webp.data);
          await Database.Pic.create(webp);
        },
        async function () {
          let webp = i;
          webp.data = await convertThumb(i.data, "webp");
          webp.info = await getInfo(webp.data);
          await Database.Pic.create(webp);
        },
        async function () {
          let jpg = i;
          jpg.data = await convert(i.data, "jpg");
          jpg.info = await getInfo(jpg.data);
          await Database.Pic.create(jpg);
        },
        async function () {
          let jpg = i;
          jpg.data = await convertThumb(i.data, "jpg");
          jpg.info = await getInfo(jpg.data);
          await Database.Pic.create(jpg);
        },
      ],
      // optional callback
      callback
    );
  }, 15);

  // or await the end
  const drain = q.drain();
  await q.push(img);

  await drain;
  res.sendStatus(204);
});

app.get("/list", async (req, res) => {
  const docs = await Database.Pic.find(
    {},
    {
      info: 1,
      fileName: 1,
    }
  ).exec();
  res.json(
    _.map(docs, (object) =>
      _.pick(object.toObject(), ["_id", "width", "fileType", "fileName"])
    )
  );
});

app.get("/list/:name", async (req, res) => {
  const docs = await Database.Pic.findVersions(req.params.name);
  res.json(docs[0]);
});

app.get("/img/:id", async (req, res) => {
  if ((await client.exists(req.params.id)) === 1) {
    const [type, data] = await client.hmget(req.params.id, ["type", "data"]);
    res.type(type);
    return res.send(data);
  } else {
    const doc = await Database.Pic.findById(req.params.id, {
      "info.mimeType": 1,
      data: 1,
    });
    client
      .hmset(req.params.id, [
        ["type", doc.fileType],
        ["data", doc.data],
      ])
      .then(() => client.expire(req.params.id, client.config.ttl));
    res.type(doc.fileType);
    res.end(doc.data);
  }
});

const HTTP_PORT = config.get("web.port");
Database.init().then(() => {
  app.listen(HTTP_PORT, () => {
    console.info("Listening", {
      port: HTTP_PORT,
    });
  });
});
