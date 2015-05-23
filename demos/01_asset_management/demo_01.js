"use strict";
/*

 Midnight Graphics & Recreation Library Demos:

 This file demonstrates M.GRL's asset management features.
.

 The javascript source code demos provided with M.GRL have been
 dedicated to the by way of CC0.  More information about CC0 is
 available here: https://creativecommons.org/publicdomain/zero/1.0/
.

 Art assets used are under a Creative Commons Attribution - Share
 Alike license or similar (this is explained in detail elsewhere).
 M.GRL itself is made available to you under the LGPL.  M.GRL makes
 use of the glMatrix library, which is some variety of BSD license.
.

 Have a nice day! ^_^

 */


var write = function (msg) {
    document.getElementById("page").innerHTML += msg + "<br/>";
};


addEventListener("load", function () {
    please.set_search_path("img", "img/");
    var handler = function (state, resource) {
        var notice = state==="pass" ? "downloaded" : "failed to load";
        write("--> " + notice + ": " + resource);
    };

    var xhr_handler = function (state, resource) {
        var notice = state==="pass" ? "downloaded" : "failed to load";
        write("--> " + notice + ": " + resource + " (via xhr)");
    };

    var thumbnail = function (url, caption) {
        var scale = "150px";
        var div = document.createElement("div");
        div.setAttribute("id", caption);
        div.style.display = "inline-block";
        div.style.position = "relative"
        div.style.width = scale;
        div.style.height = scale;
        div.style.backgroundSize = scale + " " + scale;
        div.style.marginLeft = "1em";
        div.style.marginBottom = "2em";
        document.getElementById("page").appendChild(div);
        var cap = document.createElement("div");
        cap.style.position = "absolute";
        cap.style.top = scale;
        cap.style.left = "0px";
        cap.style.width = scale;
        cap.style.textAlign = "center";
        cap.style.backgroundColor = "#333";
        cap.style.color = "white";
        cap.innerHTML = caption;
        div.appendChild(cap);
        
        var update_img = function () {
            var img = please.access(url), el = document.getElementById(caption);
            el.style.backgroundImage = "url('"+img.src+"')";
        };

        update_img();
        please.load(url, function(state, resource) {
            update_img();
            handler(state, resource);
        });
    };

    write("Hi there!");
    write("Be sure to take a look at the javascript debugger.");
    write("Starting downloads...<br/>");

    thumbnail("baul.jpg", "large image");
    thumbnail("house_map.jpg", "some map thing");
    thumbnail("girl_with_headphones.png", "bundled graphic");
    thumbnail("bat.png", "hedgehog");
    thumbnail("bogus_file.png", "bad path");
    write("")
});


addEventListener("mgrl_media_ready", function () {
    write("All active resource downloads have completed.");
});