// registry/annotator.js

/*
 * Copyright (c) 2014
 *     Nexa Center for Internet & Society, Politecnico di Torino (DAUIN),
 *     Alessio Melandri <alessiom92@gmail.com> and
 *     Simone Basso <bassosimone@gmail.com>.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

//
// Proof of Concept annotator to provide better feedback
//

/*jslint node:true */
"use strict";

var backend = require("./backend");
var http = require("http");
var fs = require("fs");
var querystring = require("querystring");
var urllib = require("url");
var utils = require("./utils");

var ANNOTATIONS = {};
var ANNOTATIONS_DB = "annotations.json";
var DIGIT = /^[0-9]$/;

function servePost(request, response) {

    var composedPath, urlPath,
        params = request.url.split("/");

    if (params[0] !== "") {
        console.warn("annotator: invalid first param");
        utils.badRequest(response);
        return;
    }

    if (params[1] !== "read" && params[1] !== "annotate") {
        console.warn("annotator: invalid action");
        utils.badRequest(response);
        return;
    }

    if (!params[2].match(backend.MATRICOLA)) {
        console.warn("annotator: invalid matricola");
        utils.badRequest(response);
        return;
    }

    if (!params[3].match(DIGIT)) {
        console.warn("annotator: invalid post number");
        utils.badRequest(response);
        return;
    }

    if (params[1] === "read") {
        composedPath = "/../../rivoluz/Post" + params[3] + "/s"
            + params[2] + ".html";
        utils.servePath__(composedPath, response, "text/html");
        return;
    }

    fs.readFile("html/annotate.html", "utf8", function (error, data) {
        if (error) {
            utils.internalError(error, request, response);
            return;
        }
        urlPath = "/read/" + params[2] + "/" + params[3];
        data = data.replace(/@URL_PATH@/g, urlPath);
        utils.writeHeadVerbose(response, 200, {
            "Content-Type": "text/html"
        });
        response.end(data);
    });
}

var server = http.createServer(function (request, response) {
    utils.logRequest(request);

    if (request.url.indexOf("/read/", 0) === 0 ||
            request.url.indexOf("/annotate/", 0) === 0) {
        servePost(request, response);
        return;
    }

    if (request.url.indexOf("/annotator", 0) !== 0) {
        utils.notFound(response);
        return;
    }

    // Create - Update - Delete
    if (request.method === "POST" || request.method === "PUT" ||
            request.method === "DELETE") {

        utils.readBodyJSON(request, response, function (message) {
            var state, ranges, globalState;

            console.info("annotator: BEGIN INCOMING MESSAGE");
            console.info("%s", JSON.stringify(message, undefined, 4));
            console.info("annotator: END INCOMING MESSAGE");

            state = ANNOTATIONS[message.uri];
            if (state === undefined) {
                ANNOTATIONS[message.uri] = state = {};
            }

            ranges = JSON.stringify(message.ranges);
            if (request.method === "POST" || request.method === "PUT") {
                state[ranges] = message;
            } else if (request.method === "DELETE") {
                delete state[ranges];
                if (Object.keys(state).length <= 0) {
                    delete ANNOTATIONS[message.uri];
                }
            } else {
                console.error("annotator: internal error");
                process.exit(1);
            }

            globalState = JSON.stringify(ANNOTATIONS, undefined, 4);

            console.info("annotator: BEGIN STATE AFTER CHANGE");
            console.info("%s", globalState);
            console.info("annotator: END STATE AFTER CHANGE");

            utils.writeFileSync(ANNOTATIONS_DB, globalState,
                function (error) {
                    if (error) {
                        utils.internalError(error, request, response);
                        return;
                    }
                    utils.writeHeadVerbose(response, 200, {
                        "Content-Type": "application/json"
                    });
                    response.end("{}");
                });

        });
        return;
    }

    // Read
    if (request.method === "GET") {
        var body, parsed_url, parsed_query, state, serialized;

        utils.writeHeadVerbose(response, 200, {
            "Content-Type": "application/json"
        });
        body = {
            "rows": []
        };

        parsed_url = urllib.parse(request.url);
        parsed_query = querystring.parse(parsed_url.query);
        state = ANNOTATIONS[parsed_query.uri];

        if (state !== undefined) {
            Object.keys(state).forEach(function (key) {
                body.rows.push(state[key]);
            });
        }

        serialized = JSON.stringify(body, undefined, 4);

        console.info("annotator: BEGIN OUTPUT MESSAGE");
        console.info("%s", serialized);
        console.info("annotator: END OUTPUT MESSAGE");

        response.end(serialized);
        return;
    }

    badRequest(response);
});

utils.readFileSync(ANNOTATIONS_DB, "utf8", function (error, data) {
    console.info("annotator: read config...");
    if (error) {
        console.error("fatal: %s", error);
        process.exit(1);
    }
    ANNOTATIONS = utils.safelyParseJSON(data);
    if (!ANNOTATIONS) {
        console.error("fatal: invalid JSON");
        process.exit(1);
    }
    console.info("annotator: read config... ok");
    server.listen(8000);
});
