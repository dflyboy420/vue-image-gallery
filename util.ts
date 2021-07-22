import { spawn } from "child_process";
import { Readable, Writable } from "stream";
import * as _ from "lodash";
import config from "config";

export function getInfo(img: Buffer): Promise<Object> {
    return new Promise((resolve, reject): void => {
        let res = '';
        const proc = spawn(
            `convert`,
            ['-', 'json:-']
        );
        Readable.from(img).pipe(proc.stdin, { end: true });
        proc.stdout.on('data', (data) => {
            res += data.toString();
        });
        proc.on('error', reject);

        proc.on('close', (code) => {
            if (code !== 0) {
                return reject(`grep process exited with code ${code}`)
            }
            res = JSON.parse(res)[0].image;
            _.unset(res, 'properties');
            return resolve(res);
        });
    });
}

export function convert(img: Buffer, format: string): Promise<Object> {
    return new Promise((resolve, reject): void => {
        if (!config.has("image.conversion." + format)) throw new Error("No conversion args");
        const args: string = config.get("image.conversion." + format);

        let bufs: Buffer[] = [];
        const proc = spawn(
            'convert',
            [
                '-',
                ...args.split(' '),
                format+':-'
            ]
        );
        Readable.from(img).pipe(proc.stdin, { end: true });
        proc.stdout.on('data', (data) => {
            bufs.push(data);
        });
        proc.on('error', reject);

        proc.on('close', (code) => {
            if (code !== 0) {
                return reject(`grep process exited with code ${code}`)
            }
            return resolve(Buffer.concat(bufs));
        });
    });
}

export function convertThumb(img: Buffer, format: string, size = '400x'): Promise<Object> {
    return new Promise((resolve, reject): void => {
        if (!config.has("image.conversion.thumbs." + format)) throw new Error("No conversion args");
        const args: string = config.get("image.conversion.thumbs." + format);

        let bufs: Buffer[] = [];
        const proc = spawn(
            'convert',
            [
                '-',
                ...args.split(' '),
                size,
                format+':-'
            ]
        );
        Readable.from(img).pipe(proc.stdin, { end: true });
        proc.stdout.on('data', (data) => {
            bufs.push(data);
        });
        proc.on('error', reject);

        proc.on('close', (code) => {
            if (code !== 0) {
                return reject(`grep process exited with code ${code}`)
            }
            return resolve(Buffer.concat(bufs));
        });
    });
}
