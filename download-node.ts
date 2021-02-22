#!/usr/bin/env node

import { error, log } from "console";
import Decompress from "decompress";
import DecompressBzip2 from "decompress-bzip2";
import DecompressTar from "decompress-tar";
import DecompressTarbz2 from "decompress-tarbz2";
import DecompressTargz from "decompress-targz";
import DecompressTarxz from "decompress-tarxz";
import DecompressUnzip from "decompress-unzip";
import Download from "download";
import { mkdir } from "fs/promises";
import GetHrefs from "get-hrefs";
import { basename, dirname, join, posix, sep } from "path";
import { URL } from "url";

const start_url = "https://nodejs.org/en/download/";

(async () => {
  try {
    let html;
    try {
      html = await Download(start_url, "work");
    } catch (e) {
      error("catch: Download:", { start_url, e });
    }
    const urls = GetHrefs(html?.toString("utf8"));
    let todo: URL[] = [];
    for (const u_s of urls) {
      const u = new URL(u_s, start_url);
      if (
        u.hostname.match(/nodejs\.org$/i) &&
        u.pathname.match(/^\/dist\//i) &&
        !u.pathname.match(/[0-9]$/)
      )
        todo.push(u);
    }
    // log(todo);
    try {
      await Promise.all(
        todo.map((u: { href: string }) =>
          Download(u.href, "dist")
            .catch((e) => {
              error("catch: Download:", { u, e });
              return e;
            })
            .then((v) => {
              log(`Got ${u.href}`);
              return v;
            })
        )
      );
    } catch (e) {
      error("catch: Download.all:", { e });
    }
    log("\nDone, extracting binaries");
    const targ = join("dist", "binaries");
    await mkdir(targ, { recursive: true });
    Promise.all(
      todo.map((u) => {
        try {
          const p = posix.parse(u.pathname);
          const dist = join("dist", p.base);
          return Decompress(dist, targ, {
            filter: (file) => {
              try {
                const ret =
                  basename(file.path) == "node.exe" ||
                  (basename(file.path) == "node" &&
                    basename(dirname(file.path)) == "bin");
                return ret;
              } catch (e) {
                error("catch: filter:", { file, e });
                return false;
              }
            },
            map: (file) => {
              try {
                let pieces = file.path.split(sep);
                const fn = pieces.pop();
                file.path = join(pieces[0]!, fn!);
                return file;
              } catch (e) {
                error("catch: map:", { file, e });
                return file;
              }
            },
            plugins: [
              DecompressBzip2(),
              DecompressTar(),
              DecompressTarbz2(),
              DecompressTargz(),
              DecompressTarxz(),
              DecompressUnzip(),
            ],
          })
            .catch((e) => {
              error("catch: Decompress:", { u, e });
              return e;
            })
            .then((v) => {
              log(`Unpacked ${dist}`);
              return v;
            });
        } catch (e) {
          error("catch: Decompress:", { u, e });
          return undefined;
        }
      })
    );
    log("\nDone.");
  } catch (e) {
    error("catch: global:", { e });
  }
})();
