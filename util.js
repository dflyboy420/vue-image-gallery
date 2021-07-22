"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertThumb = exports.convert = exports.getInfo = void 0;
const child_process_1 = require("child_process");
const stream_1 = require("stream");
const _ = __importStar(require("lodash"));
const config_1 = __importDefault(require("config"));
function getInfo(img) {
    return new Promise((resolve, reject) => {
        let res = '';
        const proc = child_process_1.spawn(`convert`, ['-', 'json:-']);
        stream_1.Readable.from(img).pipe(proc.stdin, { end: true });
        proc.stdout.on('data', (data) => {
            res += data.toString();
        });
        proc.on('error', reject);
        proc.on('close', (code) => {
            if (code !== 0) {
                return reject(`grep process exited with code ${code}`);
            }
            res = JSON.parse(res)[0].image;
            _.unset(res, 'properties');
            return resolve(res);
        });
    });
}
exports.getInfo = getInfo;
function convert(img, format) {
    return new Promise((resolve, reject) => {
        if (!config_1.default.has("image.conversion." + format))
            throw new Error("No conversion args");
        const args = config_1.default.get("image.conversion." + format);
        let bufs = [];
        const proc = child_process_1.spawn('convert', [
            '-',
            ...args.split(' '),
            format + ':-'
        ]);
        stream_1.Readable.from(img).pipe(proc.stdin, { end: true });
        proc.stdout.on('data', (data) => {
            bufs.push(data);
        });
        proc.on('error', reject);
        proc.on('close', (code) => {
            if (code !== 0) {
                return reject(`grep process exited with code ${code}`);
            }
            return resolve(Buffer.concat(bufs));
        });
    });
}
exports.convert = convert;
function convertThumb(img, format, size = '400x') {
    return new Promise((resolve, reject) => {
        if (!config_1.default.has("image.conversion.thumbs." + format))
            throw new Error("No conversion args");
        const args = config_1.default.get("image.conversion.thumbs." + format);
        let bufs = [];
        const proc = child_process_1.spawn('convert', [
            '-',
            ...args.split(' '),
            size,
            format + ':-'
        ]);
        stream_1.Readable.from(img).pipe(proc.stdin, { end: true });
        proc.stdout.on('data', (data) => {
            bufs.push(data);
        });
        proc.on('error', reject);
        proc.on('close', (code) => {
            if (code !== 0) {
                return reject(`grep process exited with code ${code}`);
            }
            return resolve(Buffer.concat(bufs));
        });
    });
}
exports.convertThumb = convertThumb;
