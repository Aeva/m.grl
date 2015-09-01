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


// local namespace
var demo = {
    "viewport" : null, // the render pass that will be rendered
    "manifest" : [
        "deferred.vert",
        "deferred.frag",
        "shadow_test.jta",
        "shadow_test_bake.jta",
    ],
};


addEventListener("load", function() {
    // Attach the opengl rendering context.  This must be done before
    // anything else.
    please.gl.set_context("gl_canvas", {
        antialias : false,
    });

    // Set OpenGL rendering state defaults directly.  Some of this may
    // be abstracted by m.grl in the future.
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.CULL_FACE);

    // Turn off alpha blending.
    gl.disable(gl.BLEND);
    
    // Define where m.grl is to find various assets when using the
    // load methed.
    please.set_search_path("glsl", "glsl/");
    please.set_search_path("img", "../gl_assets/img/");
    please.set_search_path("jta", "../gl_assets/models/");
    
    // Queue up assets to be downloaded before the game starts.
    demo.manifest.map(please.load);

    // Register a render passes with the scheduler.  The autoscale
    // prefab is used to change the dimensions of the rendering canvas
    // when it has the 'fullscreen' css class, as well as constrain
    // the maximum height of said canvas element.  You are responsible
    // for providing the css needed to upsample the canvas, though
    // this project template accomplishes that for you.  See "ui.css".
    please.pipeline.add_autoscale();

    // register a render pass with the scheduler
    please.pipeline.add(10, "project/draw", function () {
        please.render(demo.viewport);
    }).skip_when(function () { return demo.viewport === null; });

    // start the rendering pipeline
    please.pipeline.start();

    // Show a loading screen
    demo.viewport = new please.LoadingScreen();
});


addEventListener("mgrl_fps", function (event) {
    // This handler is called every so often to report an estimation
    // of the current frame rate, so that it can be displayed to the
    // user.
    document.getElementById("fps").innerHTML = event.detail;
});


addEventListener("mgrl_media_ready", please.once(function () {
    // Build our custom shader program
    var prog = please.glsl("deferred_rendering", "deferred.vert", "deferred.frag");
    prog.activate();
    
    // Scere Graph object
    var graph = demo.graph = new please.SceneGraph();

    // Add a camera
    var camera = demo.camera = new please.CameraNode();
    camera.location = [0, -20, 15];
    camera.look_at = [0, -5, 3];
    camera.fov = 32;

    graph.add(camera);
    camera.activate();

    // Add a fixture in the middle of the floor
    var level = demo.level = please.access("shadow_test.jta").instance();
    level.shader.is_floor = false;
    level.use_manual_cache_invalidation();
    graph.add(level);

    // spinner
    var spinner = new please.GraphNode();
    spinner.rotation_z = please.repeating_driver(-360, 0, 5000);
    var handle = new please.GraphNode();
    handle.location = [0, -10, 5];
    spinner.add(handle);

    // light test
    var light = demo.light = new SpotLightNode();
    //light.location = [0, -15, 5];
    light.location = handle;
    light.look_at = [0, 0, 0];
    light.fov = 60;
    graph.add(light);
    //light.location_x = please.oscillating_driver(-15, 15, 3000);
        
    // Add a renderer using the default shader.
    var options = {
        "buffers" : ["color", "spatial"],
        "type":gl.FLOAT,
    };
    var gbuffers = demo.gbuffers = new please.RenderNode(
        "deferred_rendering", options);
    gbuffers.clear_color = [-1, -1, -1, -1];
    gbuffers.graph = graph;
    gbuffers.shader.shader_pass = 0;
    gbuffers.shader.geometry_pass = true;

    var light_pass = demo.lighting = new please.RenderNode(
        "deferred_rendering", {"buffers" : ["color"], "type":gl.FLOAT});
    light_pass.graph = graph;
    light_pass.shader.shader_pass = 1;
    light_pass.shader.geometry_pass = true;
    light_pass.render = function () {
        light.activate();
        this.graph.draw();
        camera.activate();
    };
    light_pass.clear_color = function () {
        var max_depth = light.far;
        return [max_depth, max_depth, max_depth, max_depth];
    };

    var apply_lighting = demo.apply_lighting = new please.RenderNode(
        "deferred_rendering", {"buffers" : ["color"]});
    apply_lighting.clear_color = [0.0, 0.0, 0.0, 0.0];
    apply_lighting.shader.shader_pass = 2;
    apply_lighting.shader.geometry_pass = false;

    apply_lighting.shader.diffuse_texture = gbuffers.buffers.color;
    apply_lighting.shader.spatial_texture = gbuffers.buffers.spatial;
    apply_lighting.shader.light_texture = light_pass;
    apply_lighting.shader.light_count = 1;
    apply_lighting.shader.light_index = 0;
    apply_lighting.shader.light_view_matrix = function () {
        return light.view_matrix;
    };
    apply_lighting.shader.light_projection_matrix = function () {
        return light.projection_matrix;
    };
    
    var pip = new please.PictureInPicture();
    pip.shader.main_texture = gbuffers.buffers.color;
    //pip.shader.pip_texture = gbuffers.buffers.spatial;
    //pip.shader.pip_texture = light_pass;
    pip.shader.pip_texture = apply_lighting;

    // Transition from the loading screen prefab to our renderer
    demo.viewport.raise_curtains(/*demo.renderer*/pip);
}));


var SpotLightNode = function () {    
    please.CameraNode.call(this);
    this.width = 1;
    this.height = 1;
};
SpotLightNode.prototype = Object.create(please.CameraNode.prototype);
