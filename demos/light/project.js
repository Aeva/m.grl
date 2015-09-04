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

    //
    graph.lights = [];

    // Add a fixture in the middle of the floor
    var level = demo.level = please.access("shadow_test.jta").instance();
    level.shader.is_floor = false;
    level.use_manual_cache_invalidation();
    graph.add(level);

    // spinner
    var spinner = new please.GraphNode();
    spinner.rotation_z = please.repeating_driver(-360, 0, 5000);
    var handle = new please.GraphNode();
    handle.location = [0, -15, 5];
    spinner.add(handle);

    // light test
    var light = new SpotLightNode();
    light.location = handle;
    light.look_at = [0, 0, 0];
    light.fov = 60;
    graph.add(light);
    graph.lights.push(light);

    var light = new SpotLightNode();
    light.location = [8, 0, 8];
    light.location_y = please.oscillating_driver(-4, 4, 2000);
    light.look_at = [5, 0, 0];
    light.look_at_x = please.oscillating_driver(4, 6, 2000);
    light.look_at_y = please.oscillating_driver(-5, 5, 2000);
    light.fov = 70;
    graph.add(light);
    graph.lights.push(light);
        
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

    var apply_lighting = demo.apply_lighting = new please.RenderNode(
        "deferred_rendering", {"buffers" : ["color"]});
    apply_lighting.clear_color = [0.0, 0.0, 0.0, 1.0];
    apply_lighting.shader.shader_pass = 2;
    apply_lighting.shader.geometry_pass = false;
    apply_lighting.shader.spatial_texture = gbuffers.buffers.spatial;
    apply_lighting.before_render = function () {
        this.targets = [];
        for (var i=0; i<graph.lights.length; i+=1) {
            var node = graph.lights[i].light_pass;
            please.indirect_render(node)
            this.targets.push(node.__cached);
        }
    };
    apply_lighting.render = function () {
        gl.disable(gl.DEPTH_TEST);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE);
        camera.activate();
        for (var i=0; i<graph.lights.length; i+=1) {
            var light = graph.lights[i];
            this.__prog.samplers.light_texture = this.targets[i];
            this.__prog.vars.light_view_matrix = light.view_matrix;
            this.__prog.vars.light_projection_matrix = light.projection_matrix;
            please.gl.splat();
        }
        gl.disable(gl.BLEND);
        gl.enable(gl.DEPTH_TEST);
    };

    var combine = demo.combine = new please.RenderNode(
        "deferred_rendering", {"buffers" : ["color"]});
    combine.clear_color = [0.15, 0.15, 0.15, 1.0];
    combine.shader.shader_pass = 3;
    combine.shader.geometry_pass = false;
    combine.shader.diffuse_texture = gbuffers.buffers.color;
    combine.shader.light_texture = apply_lighting;
    
    // var pip = new please.PictureInPicture();
    // pip.shader.main_texture = combine;
    // //pip.shader.pip_texture = gbuffers.buffers.spatial;
    // //pip.shader.pip_texture = light_pass;
    // //pip.shader.pip_texture = apply_lighting;
    // pip.shader.pip_texture = graph.lights[0].light_pass;

    //Transition from the loading screen prefab to our renderer
    //demo.viewport.raise_curtains(pip);
    //demo.viewport.raise_curtains(apply_lighting);
    demo.viewport.raise_curtains(combine);
}));


var SpotLightNode = function () {    
    please.CameraNode.call(this);
    this.width = 1;
    this.height = 1;

    var buffer_options = {
        "buffers" : ["color"],
        "type":gl.FLOAT,
        "mag_filter" : gl.LINEAR,
        "min_filter" : gl.LINEAR,
    };
    this.light_pass = new please.RenderNode(
        "deferred_rendering", buffer_options);
    Object.defineProperty(this.light_pass, "graph", {
        "configurable" : true,
        "get" : function () {
            return this.graph_root;
        },
    });
    this.light_pass.shader.shader_pass = 1;
    this.light_pass.shader.geometry_pass = true;
    this.light_pass.render = function () {
        this.activate();
        this.graph_root.draw();
    }.bind(this);
    this.light_pass.clear_color = function () {
        var max_depth = this.far;
        return [max_depth, max_depth, max_depth, max_depth];
    }.bind(this);
};
SpotLightNode.prototype = Object.create(please.CameraNode.prototype);
