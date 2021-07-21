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
        // required: true,
    },
    fileType: {
        type: String,
        required: true,
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
        getters: true
    },
    toJSON: {
        virtuals: true
    },
});
pictureSchema.virtual('width').get(function () {
    return this.info.geometry.width + 'w';
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
