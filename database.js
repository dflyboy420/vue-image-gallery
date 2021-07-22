const mongoose = require("mongoose");
const config = require("config");

const {
    Schema
} = mongoose;

mongoose.connect(config.get("mongodb.url"), {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

class Database {
    static init() {
        return new Promise((resolve, reject) => {
            const db = mongoose.connection;
            db.on("error", (err) => reject(err));
            db.once("open", async () => {
                Database.connection = mongoose.connection;
                Database.connected = true;
                // setUpSchemas();
                return resolve();
            });
        });
    }

    static close() {
        return Database.connection.close();
    }
}

Database.connection = mongoose.connection;

const pictureSchema = new Schema({
    fileName: {
        type: String,
        index: true,
        // required: true,
    },
    data: {
        type: Schema.Types.Buffer,
        required: true,
    },
    info: Schema.Types.Mixed
}, {
    timestamps: {
        createdAt: 'uploadTime',
    },
    toObject: {
        virtuals: true
    },
    toJSON: {
        virtuals: true
    },
});
pictureSchema.virtual('width').get(function () {
    return this.info.geometry.width + 'w';
});
pictureSchema.virtual('fileType').get(function () {
    return this.info.mimeType;
});
pictureSchema.methods.getVersions = function (cb) {
    return mongoose.model('pic').aggregate([{
        '$match': {
            'fileName': this.fileName
        }
    }, {
        '$project': {
            'fileName': 1,
            'info.mimeType': 1,
            'info.geometry.width': 1
        }
    }, {
        '$group': {
            '_id': '$info.mimeType',
            'sizes': {
                '$push': {
                    'size': '$info.geometry.width',
                    'id': '$_id'
                }
            }
        }
    }], cb);
}

pictureSchema.statics.findVersions = function (name) {
    return this.aggregate([{
        '$match': {
            'fileName': name
        }
    }, {
        '$project': {
            'fileName': 1,
            'info.mimeType': 1,
            'info.geometry.width': 1
        }
    }, {
        '$group': {
            '_id': '$info.mimeType',
            'sizes': {
                '$push': {
                    'size': '$info.geometry.width',
                    'id': '$_id'
                }
            }
        }
    }, {
        '$project': {
            'type': '$_id',
            'sizes': 1,
            '_id': 0
        }
    }]).limit(1).exec();
}

pictureSchema.statics.getPics = function () {
    return this.aggragate([{
        '$project': {
            'fileName': 1,
            'info.mimeType': 1,
            'info.geometry.width': 1
        }
    }, {
        '$group': {
            '_id': '$fileName',
            'formats': {
                '$push': {
                    'size': '$info.geometry.width',
                    'type': '$info.mimeType',
                    'id': '$_id'
                }
            }
        }
    }, {
        '$project': {
            'name': '$_id',
            'formats': 1,
            '_id': 0
        }
    }]).exec();
}

pictureSchema.index({
    fileName: 1,
    'this.info.mimeType': 1
});
pictureSchema.index({
    fileName: 1,
    'this.info.mimeType': 1,
    'this.info.geometry.width': -1
});

const Pic = mongoose.model("pic", pictureSchema);
Database.Pic = Pic;

const userSchema = new Schema({
    pictures: {
        type: [
            [pictureSchema]
        ]
    },
    ip: String
});
const User = mongoose.model("user", userSchema);
Database.User = User;

module.exports = Database;