"use strict";
/*

 Mondaux Graphics & Recreation Library : DEMO 01
.

 Licensed under the Apache License, Version 2.0 (the "License"); you
 may not use this file except in compliance with the License.  You may
 obtain a copy of the License at

 --> http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
 implied.  See the License for the specific language governing
 permissions and limitations under the License.
.

 Have a nice day! ^_^

 */


var write = function (msg) {
    document.getElementById("page").innerHTML += msg + "<br/>";
};


addEventListener("load", function () {
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
        please.load("img", url, function(s,r){update_img();handler(s,r);});
    };

    var resources_loaded = function () {
        write("All active resource downloads have completed.");
    };

    write("Hi there!");
    write("Be sure to take a look at the javascript debugger.");
    write("Starting downloads...<br/>");

    thumbnail("../img/baul.jpg", "large image");
    thumbnail("../img/house_map.jpg", "some map thing");
    thumbnail("../img/mondaux_imports.png", "fancy graphic");
    thumbnail("../img/bat.png", "hedgehog");
    thumbnail("bogus_file.png", "bad path");
    write("")

    please.media.connect_onload(resources_loaded);
});
