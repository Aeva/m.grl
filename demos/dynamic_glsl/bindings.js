"use strict";
/*

 Midnight Graphics & Recreation Library Project Template

 This javascript source file has been dedicated to the public domain
 by way of CC0.  More information about CC0 is available here:
 https://creativecommons.org/publicdomain/zero/1.0/ .

 Art assets used are under a Creative Commons Attribution - Share
 Alike license or similar (this is explained in detail elsewhere).

 M.GRL itself is made available to you under the LGPL.

 M.GRL makes use of the glMatrix library, which is some variety of BSD
 license.

 Have a nice day! ^_^

*/


demo.init_controls = function () {
    // populate default values, connect ui events, and fade in
    var editor = document.getElementById("shader_source");
    editor.value = please.access("ext.frag").src;

    // bind events to buttons
    editor.addEventListener("keypress", function (event) {
        if (event.ctrlKey && event.key === "Enter") {
            event.preventDefault();
            demo.build_shader();
        }
    });
    document.getElementById("compile_button").addEventListener("click", demo.build_shader);
    document.getElementById("hide_intro").addEventListener("click", demo.hide_intro);
    document.getElementById("show_intro").addEventListener("click", demo.show_intro);
    document.getElementById("hide_source").addEventListener("click", demo.hide_source);
    document.getElementById("show_source").addEventListener("click", demo.show_source);

    // delay a little before showing the controls
    setTimeout(function () {
        document.getElementById("controls").className = "reveal";
    }, 3000);
};


demo.hide_intro = function () {
    document.getElementById("intro").style.visibility = "hidden";
    document.getElementById("intro_minimized").style.display = "block";
};


demo.show_intro = function () {
    document.getElementById("intro_minimized").style.display = "none";
    document.getElementById("intro").style.visibility = "visible";
};


demo.hide_source = function () {
    document.getElementById("editor").style.visibility = "hidden";
    document.getElementById("editor_minimized").style.display = "block";
};


demo.show_source = function () {
    document.getElementById("editor_minimized").style.display = "none";
    document.getElementById("editor").style.visibility = "visible";
};


demo.show_error = function (error_msg) {
    var widget = document.getElementById("compiler_output");
    widget.style.display = "block";
    widget.innerHTML = error_msg;
};


demo.hide_error = function () {
    var widget = document.getElementById("compiler_output");
    widget.style.display = "none";
};
