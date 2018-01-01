#!/usr/bin/env node

'use strict';

const Decompress = require('decompress');
const DecompressBzip2 = require('decompress-bzip2');
const DecompressTar = require('decompress-tar');
const DecompressTarbz2 = require('decompress-tarbz2');
const DecompressTargz = require('decompress-targz');
const DecompressTarxz = require('decompress-tarxz');
const DecompressUnzip = require('decompress-unzip');
const Download = require('download');
const Fs = require('fs');
const GetHrefs = require('get-hrefs');
const Path = require('path');
const { URL } = require('url');

const start_url = 'https://nodejs.org/en/download/';

Download(start_url, 'work').then(html => {
	const urls = GetHrefs(html.toString('utf8'));
	let todo = [];
	for (const u_s of urls) {
		const u = new URL(u_s, start_url);
		if (u.hostname.match(/nodejs\.org$/i) && u.pathname.match(/^\/dist\//i) && !u.pathname.match(/[0-9]$/)) todo.push(u);
	}
	Promise.all(todo.map(u => {
		try {
			return Download(u.href, 'dist');
		} catch (e) {
			console.log('catch: Download:', { u, e });
			return undefined;
		}
	})).then(() => {
		console.log('Done, extracting binaries');
		const targ = Path.join('dist', 'binaries');
		//Fs.mkdirSync(targ);
		Promise.all(todo.map(u => {
			try {
				const p = Path.posix.parse(u.pathname);
				const dist = Path.join('dist', p.base);
				return Decompress(dist, targ, {
					filter: file => {
						try {
							const ret = Path.basename(file.path) == 'node.exe' || Path.basename(file.path) == 'node' && Path.basename(Path.dirname(file.path)) == 'bin';
							return ret;
						} catch (e) {
							console.log('catch: filter:', { file, e });
							return false;
						}
					},
					map: file => {
						try {
							let pieces = file.path.split(Path.sep);
							const fn = pieces.pop();
							file.path = Path.join(pieces[0], fn);
							return file;
						} catch (e) {
							console.log('catch: map:', { file, e });
							return file;
						}
					},
					plugins: [DecompressBzip2(), DecompressTar(), DecompressTarbz2(), DecompressTargz(), DecompressTarxz(), DecompressUnzip()]
				});
			} catch (e) {
				console.log('catch: Decompress:', { u, e });
				return undefined;
			}
		})).then(() => {
			console.log('Done.');
		});
	});
});

