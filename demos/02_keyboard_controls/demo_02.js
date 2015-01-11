"use strict";
/*

 Midnight Graphics & Recreation Library Demos:

 This file demonstrates how to use M.GRL's keyboard handler.
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


window.addEventListener("load", function() {
    // onload
    please.keys.enable();
    please.keys.connect("w", demo_handler);
    please.keys.connect("a", demo_handler);
    please.keys.connect("s", demo_handler);
    please.keys.connect("d", demo_handler);
    please.keys.connect(" ", demo_handler, 1000);
});




var action_state = "idle";


function demo_handler (state, key) {
    var id = {"w" : "up",
              "a" : "left",
              "s" : "down",
              "d" : "right",
              " " : "action",}[key];
    var element = document.getElementById(id);


    var class_name = "indicator";
    if (state === "press") {
        class_name += " press";
        if (key === " ") {
            action_state = "press";
        }
    }
    else if (state === "long") {
        class_name += " long";
        if (key === " ") {
            action_state = "long";
        }
    }
    else {
        class_name += " idle";
        if (key === " " && action_state !== "idle") {
            fire(action_state);
            action_state = "idle";
        }
    }
    element.className = class_name;
};


function fire (state) {
    var element = document.getElementById("page");
    // use requestAnimationFrame so that the browser doesn't
    // "optimize" out our attempt to clear any existing animations. :P

    requestAnimationFrame(function () {
        element.className = "";

        requestAnimationFrame(function () {
            if (state === "long") {
                element.className = "fire";
            } else {
                element.className = "tiny_fire";
            }
        });
    });
};

