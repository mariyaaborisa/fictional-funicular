#!/usr/bin/env node
/*
 * Regenerates index.offline.html from index.html by inlining the two
 * pinned libraries (PapaParse, Chart.js) so the offline build makes
 * zero external network requests.
 *
 * Usage:  node scripts/build-offline.js
 * Requires: npm and tar on PATH, and network access to the npm registry
 *           (only at build time -- the generated file itself is offline).
 */
"use strict";
var fs = require("fs");
var path = require("path");
var os = require("os");
var cp = require("child_process");

var ROOT = path.join(__dirname, "..");
var PAPAPARSE_VERSION = "5.4.1";
var CHARTJS_VERSION = "4.4.4";

function run(cmd, args, cwd) {
  var res = cp.spawnSync(cmd, args, { cwd: cwd, stdio: "inherit" });
  if (res.status !== 0) throw new Error(cmd + " " + args.join(" ") + " failed");
}

function main() {
  var tmp = fs.mkdtempSync(path.join(os.tmpdir(), "cdls-offline-"));

  run("npm", ["pack", "papaparse@" + PAPAPARSE_VERSION, "chart.js@" + CHARTJS_VERSION], tmp);

  var papaDir = path.join(tmp, "papaparse-pkg");
  var chartDir = path.join(tmp, "chartjs-pkg");
  fs.mkdirSync(papaDir);
  fs.mkdirSync(chartDir);
  run("tar", ["xzf", path.join(tmp, "papaparse-" + PAPAPARSE_VERSION + ".tgz"), "-C", papaDir, "--strip-components=1"]);
  run("tar", ["xzf", path.join(tmp, "chart.js-" + CHARTJS_VERSION + ".tgz"), "-C", chartDir, "--strip-components=1"]);

  var papaparseSrc = fs.readFileSync(path.join(papaDir, "papaparse.min.js"), "utf8");
  var chartjsSrc = fs.readFileSync(path.join(chartDir, "dist", "chart.umd.js"), "utf8");

  var html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  var startMarker = "<!-- CDLS-BUILD:LIBS-START -->";
  var endMarker = "<!-- CDLS-BUILD:LIBS-END -->";
  var startIdx = html.indexOf(startMarker);
  var endIdx = html.indexOf(endMarker);
  if (startIdx === -1 || endIdx === -1) throw new Error("Library markers not found in index.html");

  var inlined =
    startMarker + "\n" +
    "<script>\n/* PapaParse " + PAPAPARSE_VERSION + " (MIT) - inlined for offline use */\n" + papaparseSrc + "\n</script>\n" +
    "<script>\n/* Chart.js " + CHARTJS_VERSION + " (MIT) - inlined for offline use */\n" + chartjsSrc + "\n</script>\n";

  var out = html.slice(0, startIdx) + inlined + html.slice(endIdx + endMarker.length);
  fs.writeFileSync(path.join(ROOT, "index.offline.html"), out);
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log("Wrote index.offline.html (" + (out.length / 1024).toFixed(0) + " KB)");
}

main();
