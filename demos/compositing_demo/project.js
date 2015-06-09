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
    "viewport" : null,
};


addEventListener("load", function setup () {    
    // Attach the opengl rendering context.  This must be done before
    // anything else.
    please.gl.set_context("gl_canvas", {
        antialias : false,
    });

    // Set the clear color for the gl canvas.  Using this metho
    // instead of opengl's allows for the clear color to be accessible
    // in the shader, should it be defined as a uniform.  This also
    // allows for databinding the clear color.
    please.set_clear_color(0.0, 0.0, 0.0, 0.0);

    // Set OpenGL rendering state defaults directly.  Some of this may
    // be abstracted by m.grl in the future.
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.CULL_FACE);

    // Define where m.grl is to find various assets when using the
    // load methed.
    please.set_search_path("glsl", "glsl/");
    please.set_search_path("img", "images/");
    please.set_search_path("jta", "models/");
    please.set_search_path("gani", "ganis/");
    please.set_search_path("audio", "sounds/");
    
    // Queue up assets to be downloaded before the game starts.
    please.load("gavroche_hall.jta");
    please.load("psycho.jta");
    please.load("warp_effect.frag");
    please.load("test.frag");

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

    // Custom loading screen handler
    show_progress();
});


function show_progress() {
    var graph = new please.SceneGraph();
    var camera = new please.CameraNode();
    camera.look_at = [0.0, 0.0, 0.0];
    camera.location = [0.0, 0.0, 100];
    camera.up_vector = [0, 1, 0];
    camera.set_orthographic();

    var container = new please.CameraNode();

    var girl = please.access("girl_with_headphones.png").instance();
    girl.location = [-10, -1, 0];
    girl.rotation_x = 0;
    
    var label = please.access("loading.png").instance();
    label.location = [-6, -1, 1];
    label.rotation_x = 0;
    label.scale = [16, 16, 16];

    container.add(girl);
    container.add(label);
    graph.add(container);
    graph.add(camera);
    camera.activate();

    var loading_screen = new please.RenderNode("default");
    loading_screen.render = function () {
        graph.draw();
    };

    demo.viewport = loading_screen;

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
    // The "mgrl_media_ready" event is called when pending downloads
    // have finished.  As we are using this to initialize and start
    // the game, the callback is wrapped in the "please.once"
    // function, to ensure that it is only called once.
    
    // initialize a scene graph object
    var graph = new please.SceneGraph();

    // add our model to the scene graph
    var model = please.access("gavroche_hall.jta").instance();
    graph.add(model);

    // add a character or three to the scene graph
    for (var i=-1; i<=1; i+=1) {
        var character = please.access("psycho.jta").instance();
        character.location_x = 5 * i;
        character.location_z = please.oscillating_driver(1, 3, 1000+500*Math.random());
        character.rotation_z = please.repeating_driver(360, 0, 500+500*Math.random());
        graph.add(character);
    }
    
    // add a camera object to the scene graph
    var camera = new please.CameraNode();
    camera.look_at = [0.0, 0.0, 5.0];
    camera.location = [0.0, -14.0, 8.0];
    graph.add(camera);

    // If the camera is not explicitely activated, then the scene
    // graph will attempt to pick one to use.  In this case we have
    // only one so it doesn't matter, BUT it is generally good
    // practice to explicitly activate the camera you want to use:
    camera.activate();


    // Add a renderer using the default shader.
    var renderer = new please.RenderNode("default");
    renderer.graph = graph;

    // Add a renderer using a custom shader.
    please.glsl("fancy_pass", "splat.vert", "warp_effect.frag");
    var fancypass = new please.RenderNode("fancy_pass");
    fancypass.shader.splat_texture = renderer;
    fancypass.shader.blur_factor = 200;

    // Add something we'll picture-in-picture later.
    please.glsl("coordinate_pass", "simple.vert", "test.frag");
    var coord_pass = new please.RenderNode("coordinate_pass");
    coord_pass.graph = graph;

    // Add a renderer using a custom shader.
    please.glsl("splice_pass", "splat.vert", "diagonal_wipe.frag");
    var splice_pass = new please.RenderNode("splice_pass");
    splice_pass.shader.texture_a = fancypass;
    splice_pass.shader.texture_b = renderer;
    splice_pass.shader.progress = please.oscillating_driver(0.0, 1.0, 2500);
    splice_pass.shader.blur_radius = 200;

    // Add a picture-in-picture effect.
    var pip_pass = new please.PictureInPicture();
    pip_pass.shader.main_texture = splice_pass;
    pip_pass.shader.pip_texture = coord_pass;
    pip_pass.shader.pip_alpha = 0.75;

    // The loading screen renderer was defined elsewhere in this file
    var loading_screen = demo.viewport;

    // Add a timeout before the screen wipe to allow images etc to
    // upload to the gpu, otherwise the transition will be choppy.
    window.setTimeout(function () {
        // hide the loading screen
        document.getElementById("loading_screen").style.display = "none";

        // Make splice_pass the renderer.
        //var fade_out = new please.DiagonalWipe();
        var fade_out = new please.Disintegrate();
        fade_out.blend_between(loading_screen, pip_pass, 1500);
        fade_out.shader.px_size = 50;
        demo.viewport = fade_out;
    }, 2000);
}));
