"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from) {
    for (var i = 0, il = from.length, j = to.length; i < il; i++, j++)
        to[j] = from[i];
    return to;
};
exports.__esModule = true;
exports.convert = exports.getInfo = void 0;
var child_process_1 = require("child_process");
var stream_1 = require("stream");
var _ = require("lodash");
var config = require("config");
function getInfo(img) {
    return new Promise(function (resolve, reject) {
        var res = '';
        var proc = child_process_1.spawn("magick", ['-', 'json:-']);
        stream_1.Readable.from(img).pipe(proc.stdin, { end: true });
        proc.stdout.on('data', function (data) {
            res += data.toString();
        });
        proc.on('error', reject);
        proc.on('close', function (code) {
            if (code !== 0) {
                return reject("grep process exited with code " + code);
            }
            res = JSON.parse(res)[0].image;
            _.unset(res, 'properties');
            return resolve(res);
        });
    });
}
exports.getInfo = getInfo;
function convert(img, format) {
    return new Promise(function (resolve, reject) {
        if (!config.has("image.conversion." + format))
            throw new Error("No conversion args");
        var args = config.get("image.conversion." + format);
        var bufs = [];
        var proc = child_process_1.spawn("magick", __spreadArray(__spreadArray([
            'convert',
            '-'
        ], args.split(' ')), [
            format + ':-'
        ]));
        stream_1.Readable.from(img).pipe(proc.stdin, { end: true });
        proc.stdout.on('data', function (data) {
            bufs.push(data);
        });
        proc.on('error', reject);
        proc.on('close', function (code) {
            if (code !== 0) {
                return reject("grep process exited with code " + code);
            }
            return resolve(Buffer.concat(bufs));
        });
    });
}
exports.convert = convert;
