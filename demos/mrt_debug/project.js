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
    "manifest" : [
        "mrt_test.frag",
    ],
};


addEventListener("load", function() {
    // Attach the opengl rendering context.  This must be done before
    // anything else.
    please.gl.set_context("gl_canvas", {
        antialias : false,
    });

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
    please.add_autoscale();

    // Show a loading screen
    please.set_viewport(new please.LoadingScreen());
});


addEventListener("mgrl_fps", function (event) {
    // This handler is called every so often to report an estimation
    // of the current frame rate, so that it can be displayed to the
    // user.
    document.getElementById("fps").innerHTML = event.detail;
});


addEventListener("mgrl_media_ready", please.once(function () {
    // Manually compile the deferred rendering shader.  You normally
    // don't need to do this, but doing so will allow you to add
    // additional sources, which allows you to define your own custom
    // procedural textures and the likes.
    var shader = please.glsl(
        "mrt_test",
        "splat.vert",
        "mrt_test.frag"
    );
    
    // Define our renderer
    demo.renderer = new please.RenderNode(shader, {
        "buffers" : ["one", "two"],
        "type" : gl.FLOAT,
    });
    demo.mixer = new please.DiagonalWipe();
    demo.mixer.shader.texture_a = demo.renderer.buffers.one;
    demo.mixer.shader.texture_b = demo.renderer.buffers.two;
    demo.mixer.shader.progress = 0.5;
    demo.mixer.shader.blur_radius = 200;
        
    please.set_viewport(demo.mixer);
}));
