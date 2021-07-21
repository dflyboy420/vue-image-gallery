"use strict";
exports.__esModule = true;
exports.getInfo = void 0;
var child_process_1 = require("child_process");
var stream_1 = require("stream");
function getInfo(img) {
    return new Promise(function (resolve, reject) {
        var res = '';
        var proc = child_process_1.spawn("magick", ['-', 'json:-']);
        stream_1.Readable.from(img).pipe(proc.stdin, { end: true });
        proc.on('spawn', function () {
            // proc.stdin.end();
        });
        proc.stdout.on('data', function (data) {
            res += data.toString();
        });
        proc.on('error', reject);
        proc.on('close', function (code) {
            if (code !== 0) {
                return reject("grep process exited with code " + code);
            }
            return resolve(JSON.parse(res));
        });
    });
}
exports.getInfo = getInfo;
