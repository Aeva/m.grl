"use strict";
/*

 Midnight Graphics & Recreation Library Demos:

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


// local namespace
var demo = {
    "viewport" : null, // the render pass that will be rendered
};


addEventListener("load", function() {
    // Attach the opengl rendering context.  This must be done before
    // anything else.
    please.gl.set_context("gl_canvas");
    
    // Define where m.grl is to find various assets when using the
    // load methed.
    please.set_search_path("glsl", "glsl/");
    please.set_search_path("img", "../gl_assets/img/");
    please.set_search_path("jta", "../gl_assets/models/");
    
    // load shader sources
    please.load("demo.vert");
    please.load("demo.frag");

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


addEventListener("mgrl_media_ready", please.once(function () {
    // Clear loading screen, show canvas
    document.getElementById("loading_screen").style.display = "none";
    document.getElementById("demo_area").style.display = "block";

    // Build the custom shader used by this demo
    var prog = please.glsl("demo", "demo.vert", "demo.frag");
    prog.activate();
    
    // access model data
    var lamp_model = please.access("floor_lamp.jta");
    var char_model = please.access("psycho.jta");
    var gavroche_model = please.access("gavroche.jta");

    
    // this variable we use to store what is currently selected
    var selected = null;

    
    // build the scene graph
    var graph = demo.graph = new please.SceneGraph();
    graph.add(new FloorNode());

    // Enable mouse events for the main graph.  In this case, we
    // define a mouseup event on the graph itself, and mousedown
    // events on the red gavroche objects.  A second graph with just
    // the floor in it is used to handle mouse move events.
    graph.picking.enabled = true;
    graph.on_mouseup = function (event) {
        selected = null;
    };

    // add a camera
    var camera = demo.camera = new please.CameraNode();
    camera.fov = please.path_driver(
        please.bezier_path([15, 40, 55, 59, 60]),
        5000, false, false);
    camera.look_at = vec3.fromValues(0, 0, 1);
    camera.location = [0, 15, 20];
    graph.add(camera);
    camera.activate();

    // add a second graph to be used for location picking only
    var picking_graph = new please.SceneGraph();
    picking_graph.add(new FloorNode());
    picking_graph.camera = camera;
    picking_graph.picking.skip_location_info = false;
    picking_graph.picking.skip_on_move_event = false;
    // picking for this graph will only be enabled when it is needed.
    picking_graph.picking.enabled = false;

    // add the mouse move event handler
    picking_graph.on_mousemove = function (event) {
        if (selected) {
            selected.location = event.world_location;
        }
        else {
            // disable the picking graph as nothing is selected
            picking_graph.picking.enabled = false;
        }
    };
    

    // add some control points for our bezier curve
    var controls = window.controls = [];
    var point;
    var low = -14;
    var high = 14;
    var count = 5;
    for (var i=0; i<count; i+=1) {
        point = gavroche_model.instance();
        point.selectable = true;
        point.shader.mode = 3;
        point.rotation_z = function () {
            return performance.now()/10;
        };
        point.location_x = please.mix(low, high, i/(count-1));
        point.selectable = true;
        graph.add(point);
        controls.push(point);

        point.selectable = true;
        point.on_mousedown = function (event) {
            selected = this;
            picking_graph.picking.enabled = true;
        };
    }

    // bezier curve formed by the control point positions
    var bezier_path = please.bezier_path(controls);


    // add a character to move along the path
    var avatar = please.access("psycho.jta").instance();
    var player = window.player = new please.GraphNode();
    graph.add(player);
    player.add(avatar);
    avatar.shader.mode = 2;
    avatar.location_z = function () { return Math.sin(performance.now()/200) + 3; };
    avatar.rotation_z = please.repeating_driver(0, 360, 1000);
    player.location = please.path_driver(bezier_path, 2000, true, true);


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
            var point = bezier_path(a);
            return point;
        }
        graph.add(blob);
        blobs.push(blob);
    }


    // set up a directional light
    var light_direction = vec3.fromValues(.25, -1.0, -.4);
    vec3.normalize(light_direction, light_direction);
    vec3.scale(light_direction, light_direction, -1);


    // add a RenderNode for displaying things
    demo.viewport = new please.RenderNode("demo");
    demo.viewport.graph = demo.graph;
    demo.viewport.shader.light_direction = light_direction;
    

    // register a render pass with the scheduler
    please.pipeline.add(10, "project/draw", function () {
        please.render(demo.viewport);
    }).skip_when(function () { return demo.viewport === null; });

    // start the drawing loop
    please.pipeline.start();
}));


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
