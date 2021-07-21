import { spawn } from "child_process";
import { Readable } from "stream";

export function getInfo(img: Buffer): Promise<Object[]> {
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
            return resolve(JSON.parse(res));
        });
    });
}
