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

    // add a loading screen
    please.set_viewport(new please.LoadingScreen());
});


addEventListener("mgrl_fps", function (event) {
    document.getElementById("fps").innerHTML = event.detail;
});


addEventListener("mgrl_media_ready", please.once(function () {
    // Build the custom shader used by this demo
    var prog = please.glsl("custom", "demo.vert", "demo.frag");
    prog.activate();
    
    // access model data
    var lamp_model = please.access("floor_lamp.jta");
    var char_model = please.access("psycho.jta");
    var gavroche_model = please.access("gavroche.jta");
    
    // this variable we use to store what is currently selected
    var selected = null;
    
    // scene graph root
    var graph = demo.graph = new please.SceneGraph();

    // add a floor object, and bind some mouse events
    var floor = new FloorNode()
    graph.add(floor);

    // Enable mouse events for the main graph.  In this case, we
    // define a mouseup event on the graph itself, and mousedown
    // events on the red gavroche objects.  Mouse move events are
    // enabled only while dragging objects.
    please.picking.graph = graph;
    please.picking.enable_location_info = true;
    please.picking.enable_mouse_move_event = false;

    graph.on_mouseup.connect(function (event) {
        selected = null;
        please.picking.enable_mouse_move_event = false;
    });

    // add a camera
    var camera = demo.camera = new please.CameraNode();
    camera.fov = please.path_driver(
        please.bezier_path([15, 40, 55, 59, 60]),
        5000, false, false);
    camera.look_at = vec3.fromValues(0, 0, 1);
    camera.location = [0, 15, 20];
    graph.add(camera);
    camera.activate();

    // add the mouse move event handler
    graph.on_mousemove.connect(function (event) {
        if (selected) {
            selected.location = event.world_location;
        }
    });

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
        point.on_mousedown.connect(function (event) {
            selected = this;
            please.picking.enable_mouse_move_event = true;
        });
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
    var renderer = new please.RenderNode("custom");
    renderer.graph = demo.graph;
    renderer.shader.light_direction = light_direction;
    please.set_viewport(renderer);
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
