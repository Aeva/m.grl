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
    "main" : {}, // used for main demo
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

    // Define where m.grl is to find various assets when using the
    // load methed.
    please.set_search_path("glsl", "glsl/");
    please.set_search_path("gani", "../lpc_assets/keyframes/");
    please.set_search_path("img", "../gl_assets/img/");
    please.set_search_path("jta", "../gl_assets/models/");
    
    // Queue up assets to be downloaded before the game starts.
    please.load("custom.frag");
    please.load("snow_flakes.png");
    //please.load("coin.gani");
    please.load("lamp_post.jta");

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
    // Build the default shader
    var prog = please.glsl("default", "simple.vert", "custom.frag");
    prog.activate();
        
    // Scere Graph object
    var graph = demo.main.graph = new please.SceneGraph();

    // Add a camera
    var camera = demo.main.camera = new please.CameraNode();
    // camera.look_at = [5, 0, 8];
    // camera.location = [-13.47, -18.97, .9];
    camera.look_at = [5, 0, 7];
    camera.location = [-15, -20, 4.0];

    graph.add(camera);
    camera.activate();

    // Add a floor
    var floor = new FloorNode();
    floor.use_manual_cache_invalidation();
    graph.add(floor);

    // Add a fixture in the middle of the floor
    var lamp = please.access("lamp_post.jta").instance();
    graph.add(lamp);
    demo.main.lamp = lamp;
    lamp.shader.is_floor = false;
    lamp.use_manual_cache_invalidation();

    // Add some particle effect thing
    var fountain = new ParticleFountain();
    fountain.scale = [1.5, 1.5, 1.5];
    fountain.max_fps = 24.0;
    graph.add(fountain);
    demo.main.fountain = fountain;
    
    // Add a renderer using the default shader.
    var renderer = demo.main.renderer = new please.RenderNode("default");
    renderer.clear_color = [.15, .15, .15, 1];
    renderer.graph = graph;

    // Transition from the loading screen prefab to our renderer
    demo.viewport.raise_curtains(demo.main.renderer);
}));


var ParticleFountain = function() {
    var asset = please.access("snow_flakes.png");
    var span = function () { return 7000 + Math.random()*1000; };
    var limit = 300;
    var ext = {
        "pt_1" : [0, 0, 0],
        "pt_2" : [0, 0, 0],
        "pt_3" : [0, 0, 0],
    };

    var area = 30;
    var landing = 40;

    var setup = function (particle, accelerate) {
        if (accelerate) {
            var shift = (particle.expire[0] - particle.start[0]) * Math.random();
            particle.start[0] -= shift;
            particle.expire[0] -= shift;

        }
        vec3.copy(particle.pt_1, [
            (Math.random()*area)-(area*.5),
            (Math.random()*area)-(area*.5),
            15 + Math.random()*5]);

        vec3.copy(particle.pt_2, [
            (Math.random()*area)-(area*.5),
            (Math.random()*area)-(area*.5),
            Math.random()*25]);

        vec3.copy(particle.pt_3, [
            (Math.random()*landing)-(landing*.5),
            (Math.random()*landing)-(landing*.5),
                -5.0]);
        
        mat4.translate(
            particle.world_matrix, this.shader.world_matrix, particle.start);
    };
    var update = function (particle, dt, a) {
        mat4.translate(
            particle.world_matrix,
            this.shader.world_matrix,
            please.bezier([particle.pt_1, particle.pt_2, particle.pt_3], a));
    };
    var emitter = new please.ParticleEmitter(asset, span, limit, setup, update, ext);
    emitter.shader.is_floor = false;

    
    function shaker() {
        var space = limit - emitter.__tracker.live;
        if (space) {
            var count = space < 10 ? space : 10;
            for (var i=0; i<count; i+=1) {
                emitter.rain();
            }
        }
        setTimeout(shaker, 50);
    };
    shaker();


    function prepopulate() {
        if (!document.hidden) {
            var space = limit - emitter.__tracker.live;
            for (var i=0; i<space; i+=1) {
                emitter.rain(true);
            }
        }
    };
    prepopulate();

    
    document.addEventListener("visibilitychange", prepopulate, false);
    
    
    return emitter;
};


var FloorNode = function () {
    console.assert(this !== window);
    please.GraphNode.call(this);

    this.__vbo = please.gl.make_quad(500, 500);
    this.__drawable = true;
    this.shader.is_floor = true;

    this.bind = function () {
        this.__vbo.bind();
    };
    this.draw = function () {
        this.__vbo.draw();
    };
};
FloorNode.prototype = please.GraphNode.prototype;
