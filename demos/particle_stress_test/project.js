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
    "loading" : {}, // used by loading screen
    "main" : {}, // used for main demo
};


addEventListener("load", function() {
    // Attach the opengl rendering context.  This must be done before
    // anything else.
    please.gl.set_context("gl_canvas", {
        antialias : false,
    });

    // Define where m.grl is to find various assets when using the
    // load methed.
    please.set_search_path("glsl", "glsl/");
    please.set_search_path("gani", "../lpc_assets/keyframes/");
    please.set_search_path("img", "../gl_assets/img/");
    please.set_search_path("jta", "../gl_assets/models/");
    
    // Queue up assets to be downloaded before the game starts.
    please.load("custom.frag");
    please.load("smoke_particle.png");
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
    setup_loading_screen();
});


var setup_loading_screen = function () {
    // This function sets up a loading screen.
    
    demo.loading.renderer = new please.LoadingScreen();
    demo.viewport = demo.loading.renderer;

    (function percent () {
        if (please.media.pending.length > 0) {
            var progress = please.media.get_progress();
            if (progress.all > -1) {
                var label = document.getElementById("loading_screen");
                label.innerHTML = "" + Math.round(progress.all) + "%";
            }
            setTimeout(percent, 100);
        }
    })();
};


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
    camera.look_at = [2, -2, 5];
    camera.location = [12, -12, 30];
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
    graph.add(fountain);
    demo.main.fountain = fountain;
    for (var i=0; i<800; i+=1) {
        fountain.rain();
    }
    
    // Add a renderer using the default shader.
    var renderer = demo.main.renderer = new please.RenderNode("default");
    renderer.clear_color = [.15, .15, .15, 1];
    renderer.graph = graph;
    
    // Add a timeout before the screen wipe to allow images etc to
    // upload to the gpu, otherwise the transition will be choppy.
    window.setTimeout(function () {
        // Hide the loading screen html overlay.
        document.getElementById("loading_screen").style.display = "none";

        // An effect node is used to blend between the two render
        // nodes.  In this case, we're using the disintigration
        // effect.
        var fade_out = new please.Disintegrate();
        fade_out.blend_between(
            demo.loading.renderer,
            demo.main.renderer,
            1500);
        fade_out.shader.px_size = 50;
        demo.viewport = fade_out;
    }, 2000);
}));


var ParticleFountain = function() {
    //var asset = please.access("coin.gani");
    var asset = please.access("smoke_particle.png");
    var span = Infinity;
    var limit = 1000;
    var ext = {
        "vector" : [0,0,0],
        "skitter" : 1,
        "alpha" : 1,
    };

    var area = 15;

    var setup = function (particle) {
        var coord = [
            (Math.random()*area)-(area*.5),
            (Math.random()*area)-(area*.5),
            Math.random()*.5+1];
        mat4.translate(
            particle.world_matrix, particle.world_matrix, coord);

        particle.vector = [
            (Math.random()*1)-.5,
            (Math.random()*1)-.5,
            0];

        particle.skitter = Math.random()+0.5;
        particle.alpha = Math.random()*.8;
    };
    var update = function (particle, dt) {
        var angle = please.degrees(dt/100000) * particle.skitter[0];
        mat4.rotateZ(particle.world_matrix, particle.world_matrix, angle);
        mat4.translate(
            particle.world_matrix, particle.world_matrix, particle.vector);
    };
    var emitter = new please.ParticleEmitter(asset, span, limit, setup, update, ext);
    emitter.shader.is_floor = false;
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
