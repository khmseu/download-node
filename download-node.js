#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const console_1 = require("console");
const decompress_1 = __importDefault(require("decompress"));
const decompress_bzip2_1 = __importDefault(require("decompress-bzip2"));
const decompress_tar_1 = __importDefault(require("decompress-tar"));
const decompress_tarbz2_1 = __importDefault(require("decompress-tarbz2"));
const decompress_targz_1 = __importDefault(require("decompress-targz"));
const decompress_tarxz_1 = __importDefault(require("decompress-tarxz"));
const decompress_unzip_1 = __importDefault(require("decompress-unzip"));
const download_1 = __importDefault(require("download"));
const promises_1 = require("fs/promises");
const get_hrefs_1 = __importDefault(require("get-hrefs"));
const path_1 = require("path");
const url_1 = require("url");
const start_url = "https://nodejs.org/en/download/";
(async () => {
    try {
        let html;
        try {
            html = await download_1.default(start_url, "work");
        }
        catch (e) {
            console_1.error("catch: Download:", { start_url, e });
        }
        const urls = get_hrefs_1.default(html?.toString("utf8"));
        let todo = [];
        for (const u_s of urls) {
            const u = new url_1.URL(u_s, start_url);
            if (u.hostname.match(/nodejs\.org$/i) &&
                u.pathname.match(/^\/dist\//i) &&
                !u.pathname.match(/[0-9]$/))
                todo.push(u);
        }
        // log(todo);
        try {
            await Promise.all(todo.map((u) => download_1.default(u.href, "dist")
                .catch((e) => {
                console_1.error("catch: Download:", { u, e });
                return e;
            })
                .then((v) => {
                console_1.log(`Got ${u.href}`);
                return v;
            })));
        }
        catch (e) {
            console_1.error("catch: Download.all:", { e });
        }
        console_1.log("\nDone, extracting binaries");
        const targ = path_1.join("dist", "binaries");
        await promises_1.mkdir(targ, { recursive: true });
        Promise.all(todo.map((u) => {
            try {
                const p = path_1.posix.parse(u.pathname);
                const dist = path_1.join("dist", p.base);
                return decompress_1.default(dist, targ, {
                    filter: (file) => {
                        try {
                            const ret = path_1.basename(file.path) == "node.exe" ||
                                (path_1.basename(file.path) == "node" &&
                                    path_1.basename(path_1.dirname(file.path)) == "bin");
                            return ret;
                        }
                        catch (e) {
                            console_1.error("catch: filter:", { file, e });
                            return false;
                        }
                    },
                    map: (file) => {
                        try {
                            let pieces = file.path.split(path_1.sep);
                            const fn = pieces.pop();
                            file.path = path_1.join(pieces[0], fn);
                            return file;
                        }
                        catch (e) {
                            console_1.error("catch: map:", { file, e });
                            return file;
                        }
                    },
                    plugins: [
                        decompress_bzip2_1.default(),
                        decompress_tar_1.default(),
                        decompress_tarbz2_1.default(),
                        decompress_targz_1.default(),
                        decompress_tarxz_1.default(),
                        decompress_unzip_1.default(),
                    ],
                })
                    .catch((e) => {
                    console_1.error("catch: Decompress:", { u, e });
                    return e;
                })
                    .then((v) => {
                    console_1.log(`Unpacked ${dist}`);
                    return v;
                });
            }
            catch (e) {
                console_1.error("catch: Decompress:", { u, e });
                return undefined;
            }
        }));
        console_1.log("\nDone.");
    }
    catch (e) {
        console_1.error("catch: global:", { e });
    }
})();
