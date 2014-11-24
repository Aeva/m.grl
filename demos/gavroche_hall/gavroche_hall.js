"use strict";
/*

 Mondaux Graphics & Recreation Library Demos:

 This file - at the time of writing - is being used to test and debug
 the new JTA model loader and the scene graph.
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


function show_progress() {
    if (please.media.pending.length > 0) {
        var progress = please.media.get_progress();
        if (progress.all > -1) {
            var bar = document.getElementById("progress_bar");
            var label = document.getElementById("percent");
            bar.style.width = "" + progress.all + "%";
            label.innerHTML = "" + Math.round(progress.all) + "%";
            var files = please.get_properties(progress.files);
            var info = document.getElementById("progress_info");
            info.innerHTML = "" + files.length + " file(s)";
        }
        setTimeout(show_progress, 100);
    }
};


// keyboard control stuff
var key_timers = {
    "left" : null,
    "right" : null,
};
function key_handler(state, key) {
    // arrow key handler
    if (state === "cancel") {
        window.clearInterval(key_timers[key]);
        key_timers[key] = null;
    }
    else if (state === "press" && key_timers[key] === null) {
        var amount = .15;
        if (key == "left") {
            amount *= -1;
        }
        key_timers[key] = window.setInterval(function () {
            if (window.player) {
                window.player.x += amount;
                if (window.player.x < -15) {
                    window.player.x = -15;
                }
                if (window.player.x > 15) {
                    window.player.x = 15;
                }                
            }
        }, 1);
    }
};


addEventListener("load", function() {
    please.gl.set_context("gl_canvas");
    please.set_search_path("glsl", "glsl/");
    please.set_search_path("img", "../gl_assets/img/");
    please.set_search_path("jta", "../gl_assets/models/");
    please.set_search_path("gani", "./");

    // files that load files will use relative file paths
    please.gl.relative_lookup = true;

    // load shader sources
    please.load("simple.vert");
    please.load("simple.frag");

    // load our model files
    please.load("gavroche_hall.jta");
    please.load("psycho.jta");
    please.load("coin.gani");
    please.load("walk.gani");
    show_progress();
});


addEventListener("mgrl_fps", function (event) {
    document.getElementById("fps").innerHTML = event.detail;
});


addEventListener("mgrl_media_ready", please.once(function () {
    // Clear loading screen, show canvas
    document.getElementById("loading_screen").style.display = "none";
    document.getElementById("demo_area").style.display = "block";

    // Create GL context, build shader pair
    var canvas = document.getElementById("gl_canvas");
    var vert = please.access("simple.vert");
    var frag = please.access("simple.frag");
    var prog = please.glsl("default", vert, frag);
    prog.activate();

    // setup default state stuff    
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.CULL_FACE);
    gl.clearColor(0.0, 0.0, 0.0, 0.0);

    // blending stuff
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // store our scene & build the graph:
    var level_data = window.scene = please.access("gavroche_hall.jta");
    var char_data = please.access("psycho.jta");

    // display licensing meta_data info, where applicable
    [level_data, char_data].map(function (scene) {
        var target = document.getElementById("attribution_area");
        target.style.display = "block";
        var div = scene.get_license_html();
        if (div) {
            target.appendChild(div);
        }
    });

    var graph = new please.SceneGraph();
    var level_node = level_data.instance();
    var char_avatar = char_data.instance();
    char_avatar.aplha = .75;
    char_avatar.sort_mode = "alpha";
    char_avatar.y = -2.5;
    var char_node = window.player = new please.GraphNode();
    char_node.x = -1.8;
    char_node.z = 6;

    // add some driver methods to animate things
    char_avatar.rotate_z = function () {
        return char_node.x;
    };
    char_avatar.z = function () {
        var progress = performance.now()/500;
        return Math.sin(progress)/2.0;
    };

    // gani debug
    var stagger = -0.5;
    for (var y=-4; y<3; y+=2) {
        stagger *= -1;
        for (var x=-12+stagger; x<=12; x+=2) {
            //for (var x=0; x==0; x+=2) {
            var pick = Math.floor(Math.random()*3);
            var ani = pick===0? "coin.gani" : "walk.gani";
            var entity = please.access(ani).instance(false);
            entity.rotate_x = please.radians(90);
            entity.x = x;
            entity.y = y;
            entity.z = 0;
            entity.gani.dir = Math.floor(Math.random()*4);
            entity.gani.play();
            graph.add(entity);
            if (pick === 0) {
                var coin_n = Math.floor(Math.random()*5);
                var coin = ["gold", "silver", "copper", "emerald", "ruby"][coin_n];
                entity.gani.attrs.coin = "misc/"+coin+"_coin.png";
                entity.sort_mode = "alpha";
            }
            else {
                var hair_n = Math.floor(Math.random()*3);
                var hair = ["messy", "mohawk", "princess"][hair_n];
                var dress_n = Math.floor(Math.random()*3);
                var dress = ["green", "princess", "red"][dress_n];
                entity.gani.attrs.hair = "hair/"+hair+".png";
                entity.gani.attrs.body = "outfits/"+dress+"_dress.png";
            }
        }
    }

    // add our models to the graph
    graph.add(level_node);
    graph.add(char_node);
    char_node.add(char_avatar);

    // add a camera object
    var camera = new please.PerspectiveCamera(canvas);
    //camera.look_at = vec3.fromValues(0, 10, 2.5);
    camera.look_at = char_node;
    camera.location = function () {
        var x = char_node.x/-2.0;
        var y = char_node.y - 14;
        var z = char_node.z + 6;
        return vec3.fromValues(x,y,z);
    };
    
    // add the camera to the graph
    graph.camera = camera;

    // connect keyboard handlers
    please.keys.enable();
    please.keys.connect("left", key_handler);
    please.keys.connect("right", key_handler);
    
    // register a render pass with the scheduler
    please.pipeline.add(1, "gavroche_hall/draw", function () {
        // -- clear the screen
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // -- draw the scene graph
        graph.tick();
        graph.draw();
    });
    please.pipeline.start();
}));
