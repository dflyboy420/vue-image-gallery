import { spawn } from "child_process";
import { Readable } from "stream";
import * as _ from "lodash";

export function getInfo(img: Buffer): Promise<Object> {
    return new Promise((resolve, reject): void => {
        let res = '';
        const proc = spawn(
            `magick`,
            ['-', 'json:-']
        );
        Readable.from(img).pipe(proc.stdin, { end: true });
        proc.on('spawn', () => {
            // proc.stdin.end();
        })
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
