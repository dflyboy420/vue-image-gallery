const config = require("config");
const express = require("express");
const _ = require("lodash");
const async = require("async");
const cors = require("cors");
const Database = require("./database");
const { getInfo, convert, convertThumb } = require("./util");
const { performance, PerformanceObserver } = require("perf_hooks");

const obs = new PerformanceObserver((list, observer) => {
  console.log(list.getEntries()[0]);
  performance.clearMarks();
  // observer.disconnect();
});
obs.observe({ entryTypes: ["measure"], buffered: true });

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

  // performance.mark('startConvert');
  // create a queue object with concurrency 2
  var q = async.queue(function (i, callback) {
    async.parallel(
      [
        async function () {
          let webp = _.clone(i);
          webp.data = await convert(i.data, "webp");
          webp.info = await getInfo(webp.data);
          await Database.Pic.create(webp);
        },
        async function () {
          let webp = _.clone(i);
          webp.data = await convertThumb(i.data, "webp");
          webp.info = await getInfo(webp.data);
          await Database.Pic.create(webp);
        },
        async function () {
          let jpg = _.clone(i);
          jpg.data = await convert(i.data, "jpg");
          jpg.info = await getInfo(jpg.data);
          await Database.Pic.create(jpg);
        },
        async function () {
          let jpg = _.clone(i);
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
  // performance.mark('stopConvert');
  // performance.measure('convert', 'startConvert', 'stopConvert')
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

app.get("/list/ids", async (req, res) => {
  const cursor = Database.Pic.aggregate([
    {
      $sample: { size: Number(req.query.num) || 1024},
    },
    {
      $project: {
        _id: 1,
      },
    },
  ]).cursor();
  for await (const d of cursor) {
    res.write(d._id + "\n");
  }
  // res.chunkedEncoding = true;
  res.end();
});

app.get("/list/:name", async (req, res) => {
  const docs = await Database.Pic.findVersions(req.params.name);
  res.json(docs);
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
      // .then(() => client.expire(req.params.id, config.get('redis.ttl')));
    res.type(doc.fileType);
    res.end(doc.data);
  }
});

app.get("/img/size/:id", async (req, res) => {
  if ((await client.exists(req.params.id)) === 1) {
    const data = await client.hget(req.params.id, "data");
    return res.status(200).send(String(data.length));
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
    res.status(200).send(String(doc.data.length));
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
