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

window.test = {};
window._results = {};
window._hints = [];
window._lazy_cache = {};
window._manifest = ["test_shader.frag"];


var require_asset = function(uri) {
    if (window._manifest.indexOf(uri) === -1) {
        window._manifest.push(uri);
    }
}


var lazy_bind = function(name, setter) {
    window._lazy_cache[name] = null;
    Object.defineProperty(window, name, {
        get: function () {
            if (window._lazy_cache[name] == null) {
                window._lazy_cache[name] = setter();
            }
            return window._lazy_cache[name];
        }
    })
}

var assert = function (condition) {
    if (!condition) {
        var error = new Error("Assertion failed.");
        error.stack = error.stack.split("\n").slice(1).join("\n");
        throw(error);
    }
};

var hint = function (message, clear) {
    if (clear) {
        window._hints = [];
    }
    window._hints.push(message);
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

        out += "<div class='section'>error:</div>";
        out += "<div class='error'>" + (error.message || error) + "</div>";
        if (window._hints.length > 0) {
            out += "<div class='section'>output:</div>";
            window._hints.map(function (message) {
                out += "<div class='hint'>" + message + "</div>";
            });
        }
        out += "<div class='section'>traceback:</div>";


        if (error.constructor.name.indexOf("Error") !== -1) {
            var stack = error.stack.split("\n");
            for (var i=stack.length-1; i>=0; i-=1) {
                if (stack[i].startsWith("run_test@"+document.location)) {
                    stack = stack.slice(0, i);
                    break;
                }
            }
            var host = document.location.toString().slice(0, -1*(document.location.pathname.length-1));
            var revised = stack.map(function (line) {
                var parts = line.split("@");
                var method = parts[0];
                var file = parts.slice(1).join("@").slice(host.length);
                var file_parts = file.split(":");
                var position = file_parts.slice(-2);
                file = file_parts.slice(0, -2).join(":");

                out += "<div class='trace'>";
                out += "line <span class='line'>" + position[0] + "</span>";
                out += " in <span class='file'>" + file + "</span>";
                out += " method <span class='method'>" + method + "</span>";
                out += "</div>";
                return [method, file, position];
            });
        }
        else {
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
        window._hints = [];
        try {
            test();
        } catch(error) {
            _results.failed += 1;
            passed = false;
            verbose(error, name, test);
        }
        add_mark(passed);
    };

    var gl_setup = function () {
        try {
            please.gl.set_context("gl_canvas");
        } catch (error) {
            verbose(error, "test runner gl setup", null);
        }
        please.set_search_path("glsl", "assets/glsl/");
        please.set_search_path("gani", "assets/gani/");
        please.set_search_path("img", "assets/img/");
        please.set_search_path("jta", "assets/jta/");
    };

    var media_ready = function () {
        var prog = please.glsl("default", "simple.vert", "test_shader.frag");
        prog.activate();
        
        please.prop_map(window.test, run_test);
        if (_results.failed == 0) {
            change_status("Done.  All tests passed!");
        }
        else {
            change_status("Done.  Tests failed.");
        }
    };

    addEventListener("load", function() {
        _results.failed = 0;
        change_status("Running tests...");
        gl_setup();
        window._manifest.map(please.load);
        addEventListener("mgrl_media_ready", please.once(media_ready));
    });
})();