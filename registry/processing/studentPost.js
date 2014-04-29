// registry/processing/studentPost.js

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
// List student post and create html page for each one
//

var fs = require("fs");
var http = require("http");
var path = require("path");
var utils = require("./utils");

var post = process.argv[2];

if (process.argv[2] !== "Post1" && process.argv[2] !== "Post2" &&
    process.argv[2] !== "Post3") {
    console.log(process.argv[2] + " is a wrong parameter.");
    console.log("Try one between: Post1, Post2, Post3.");
    process.exit(1);
}

var SIMONE = "s178682.json";
var ALESSIO = "s180975.json";

var PATH_R = "/var/lib/rivoluz";
var PATH_W = "/var/lib/rivoluz/" + post + "/";

var dati = "Matricola," + post + "\n";

fs.readdir(PATH_R, function (error, files) {
    if (error) return done(error);
    for (var i in files) {

        if (path.extname(files[i]) === ".json" && files[i] !==
            SIMONE && files[i] !== ALESSIO) {

            var data = fs.readFileSync(path.join(PATH_R, files[i]));
            console.info("studentPost: reading %s", path.join(PATH_R, files[
                i]));

            obj = utils.safelyParseJSON(data);
            
            if (obj[post] != undefined && obj[post] !== "") {
                dati += obj.Matricola + "," + obj[post] + "\n";

                parsePost(obj, function (content, obj) {
                    writeStudentHtml(content, obj);
                });
            }
        }
    }

    fs.writeFile(PATH_W + "_" + post + ".csv", dati, function (error) {
        if (error) {
            utils.internalError(error, request, response);
            return;
        } else {
            console.info("studentPost: writing summuary file");
        }
    });
});

var parsePost = function (obj, callback) {
    var request = http.request(obj[post], function (response) {
        console.info("studentPost: GET " + obj[post]);
        var content = "";

        response.setEncoding("utf8");

        response.on("data", function (chunk) {
            content += chunk;
        });

        response.on("end", function () {
            callback(content, obj);
        });

        request.on("error", function (err) {
            console.log(err);
        });

    });
    request.end();
};

var writeStudentHtml = function (content, obj) {
    fs.writeFile(PATH_W + "s" + obj.Matricola + ".html", content,
        function (error) {
            if (error) {
                utils.internalError(error, request, response);
                return;
            }
            console.info("studentPost: writing s" + obj.Matricola + ".html");
        });
};
