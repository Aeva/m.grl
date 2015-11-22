/*

 M.GRL Test Runner

.

 Copyright (c) 2015, Aeva M. Palecek

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.

 You should have received a copy of the GNU General Public License
 along with this program.  If not, see <http://www.gnu.org/licenses/>.

 Have a nice day!

*/

"use strict";

window.tests = {};
window._results = {};

var assert = function (condition) {
    if (!condition) {
        var error = new Error("Assertion failed.");
        error.stack = error.stack.split("\n").slice(1).join("\n");
        throw(error);
    }
};

console.assert = assert;

(function () {
    var change_status = function (status) {
        document.getElementById("status").innerHTML = status;
    };


    var add_mark = function (passed) {
        var results = document.getElementById("test_results");
        var mark = passed ? "." : "F";
        var style = passed ? "pass" : "fail";
        results.innerHTML += "<span class='"+style+"'>"+mark+"</span>";
    };


    var format_error = function (error, name, test) {
        var out = "";
        if (error.constructor == Error) {
            var stack = error.stack.split("\n");
            for (var i=stack.length-1; i>=0; i-=1) {
                if (stack[i].startsWith("run_test@"+document.location)) {
                    stack = stack.slice(0, i);
                    break;
                }
            }

            out += "<div>error:</div>";
            out += "<div class='error'>" + error.message + "</div>";
            out += "<div>traceback:</div>";
            var revised = stack.map(function (line) {
                var parts = line.split("@");
                var method = parts[0];
                var file = parts.slice(1).join("@").slice(document.location.toString().length);
                var file_parts = file.split(":");
                var position = file_parts.slice(-2);
                file = file_parts.slice(0, -2).join(":");
                console.info(method);
                console.info(file);
                console.info(position);

                out += "<div class='trace'>";
                out += "line <span class='line'>" + position[0] + "</span>";
                out += " in <span class='file'>" + file + "</span>";
                out += " method <span class='method'>" + method + "</span>";
                out += "</div>";
                return [method, file, position];
            });
        }
        else {
            out += "<div>error:</div>";
            out += "<div class='error'>" + error + "</div>";
            out += "<div>traceback:</div>";
            out += "<div class='trace'>";
            out += "line <span class='line'>???</span>";
            out += " in <span class='file'>???</span>";
            out += " method <span class='method'>test." + name + "</span>";
            out += "</div>";
            out += "<div class='trace'>(Unable to produce full traceback.  ";
            out += "Throw 'new Error' instead of a string.)</div>";
        }
        return out;
    };


    var verbose = function (error, name, test) {
        document.getElementById("verbose").style.display = "block";
        var out = document.getElementById("output")
        var block = "<div class='entry'>";
        block += format_error(error, name, test);
        block += "</div>\n";
        out.innerHTML += block;
    };


    var run_test = function (name, test) {
        var passed = true;
        try {
            test();
        } catch(error) {
            _results.failed += 1;
            passed = false;
            verbose(error, name, test);
        }
        add_mark(passed);
    };

    addEventListener("load", function() {
        _results.failed = 0;
        change_status("Running tests...");
        please.prop_map(window.tests, run_test);
        if (_results.failed == 0) {
            change_status("Done.  All tests passed!");
        }
        else {
            change_status("Done.  Tests failed.");
        }
    });
})();