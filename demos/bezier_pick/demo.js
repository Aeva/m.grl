"use strict";
/*

 Mondaux Graphics & Recreation Library Demos:

 This file is the old model loader demo, and will soon be superseeded.
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


addEventListener("load", function() {
    please.gl.set_context("gl_canvas");
    please.set_search_path("glsl", "glsl/");
    please.set_search_path("img", "../gl_assets/img/");
    please.set_search_path("jta", "../gl_assets/models/");
    
    // load shader sources
    please.load("simple.vert");
    please.load("simple.frag");

    // load our model files
    please.load("psycho.jta");
    please.load("gavroche.jta");
    please.load("floor_lamp.jta");

    show_progress();
});


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


addEventListener("mgrl_fps", function (event) {
    document.getElementById("fps").innerHTML = event.detail;
});


addEventListener("mgrl_media_ready", function () {
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

    // enable alpha blending
    gl.enable(gl.BLEND);
    //gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    
    // access model data
    var lamp_model = please.access("floor_lamp.jta");
    var char_model = please.access("psycho.jta");
    var gavroche_model = please.access("gavroche.jta");

    // build the scene graph
    var graph = window.graph = new please.SceneGraph();
    graph.add(new FloorNode());

    // add a camera
    var camera = window.camera = new please.CameraNode();
    camera.fov = please.path_driver(
        please.bezier_path([15, 40, 55, 59, 60]),
        5000, false, false);
    camera.look_at = vec3.fromValues(0, 0, 1);
    camera.location = [0, 15, 20];
    graph.add(camera);
    camera.activate();

    
    // add some control points
    var controls = window.controls = [];
    var lamp;
    var low = -14;
    var high = 14;
    var count = 5;
    for (var i=0; i<count; i+=1) {
        lamp = gavroche_model.instance();
        lamp.selectable = true;
        lamp.shader.mode = 3;
        //lamp.scale_x = 0.5;
        //lamp.scale_y = 0.5;
        lamp.rotation_z = function () {
            return performance.now()/10;
        };
        lamp.location_x = please.mix(low, high, i/(count-1));
        //lamp.location_y = Math.random()*30 - 10;
        lamp.selectable = true;
        graph.add(lamp);
        controls.push(lamp);
    }

    // bezier curve formed by the lamp positions
    var lamp_path = please.bezier_path(controls);

    
    // until I add picking, here's a fun effect:
    //controls[0].location_y = 5;
    //controls[4].location_y = -5;
    // controls[2].location_y = function () {
    //     return Math.sin(performance.now()/100)*10;
    // };


    // add a character to move along the path
    var avatar = please.access("psycho.jta").instance();
    var player = window.player = new please.GraphNode();
    graph.add(player);
    player.add(avatar);
    avatar.shader.mode = 2;
    avatar.location_z = function () { return Math.sin(performance.now()/200) + 3; };
    avatar.rotation_z = please.path_driver(
        please.linear_path(0, 360), 1000, true, false);
    player.location = please.path_driver(lamp_path, 2000, true, true);


    // add some other things to mark the path
    var blob, blobs = window.blobs = [];
    var count = 30;
    for (var i=0; i<count; i+=1) {
        blob = lamp_model.instance();
        blob.index = i;
        blob.shader.mode = 2;
        blob.scale_x = 0.4;
        blob.scale_y = 0.5;
        blob.scale_z = 0.4;
        blob.location = function () {
            var a = this.index/(count-1)
            var point = lamp_path(a);
            return point;
        }
        graph.add(blob);
        blobs.push(blob);
    }


    // set up a directional light
    var light_direction = vec3.fromValues(.25, -1.0, -.4);
    vec3.normalize(light_direction, light_direction);
    vec3.scale(light_direction, light_direction, -1);


    // attach mouse events for picking
    add_picking_hook(canvas);


    // setup common render state
    please.pipeline.add(1, "beziers/setup", function () {
        // -- update uniforms
        prog.vars.light_direction = light_direction;
        prog.vars.move_pick = false;
    });


    // experimental picking pass
    please.pipeline.add(10, "beziers/pick", function () {
        if (window.do_click_pick) {
            // -- clear the screen
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

            // -- reset picking trigger
            window.do_click_pick = false;
            
            // -- draw geometry
            graph.picking_draw();

            // x, y, width, height, format, datatype, datasource
            var px = new Uint8Array(4);
            gl.readPixels(pick_x, pick_y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
            console.info(px);
            var found = graph.picked_node(px);
            if (found) {
                window.selected = found;
            }
        }
        else if (window.do_move_pick && selected) {
            // -- clear the screen
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

            // -- reset picking trigger
            window.do_move_pick = false;
            
            // -- draw geometry
            prog.vars.move_pick = true;
            graph.draw(function(node) { return node.shader.mode !== 1.0; });
            prog.vars.move_pick = false;

            // -- use the resulting data for something
            var px = new Uint8Array(4);
            gl.readPixels(pick_x, pick_y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);

            // -- adjust selected object position
            selected.location_x = ((px[0]/255)-0.5)*100.0;
            selected.location_y = ((px[1]/255)-0.5)*100.0 + 1.0;
        }
    });


    // register a render pass with the scheduler
    please.pipeline.add(20, "beziers/draw", function () {
        // -- clear the screen
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        
        // -- draw geometry
        graph.draw();
    });


    // start the drawing loop
    please.pipeline.start();
});


var selected = null;
var do_click_pick = false;
var do_move_pick = false;
var pick_x = 0;
var pick_y = 0;

function add_picking_hook (canvas) {
    canvas.addEventListener("mousedown", function (event) {
        window.do_click_pick = true;
        var rect = canvas.getBoundingClientRect();
        pick_x = event.pageX - rect.left - window.pageXOffset;
        pick_y = canvas.height - (event.pageY - rect.top - window.pageYOffset);
    });

    window.addEventListener("mouseup", function (event) {
        if (selected) {
            selected = null;
        }
    });

    canvas.addEventListener("mousemove", function (event) {
        if (selected) {
            do_move_pick = true;
            var rect = canvas.getBoundingClientRect();
            pick_x = event.pageX - rect.left - window.pageXOffset;
            pick_y = canvas.height - (event.pageY - rect.top - window.pageYOffset);
        }
    });
};


var FloorNode = function () {
    console.assert(this !== window);
    please.GraphNode.call(this);

    this.__vbo = please.gl.make_quad(100, 100);
    this.__drawable = true;
    this.shader.mode = 1; // "floor mode"

    this.bind = function () {
        this.__vbo.bind();
    };
    this.draw = function () {
        this.__vbo.draw();
    };
};
FloorNode.prototype = please.GraphNode.prototype;
