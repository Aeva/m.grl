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
        "custom.frag",
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
    please.glsl(
        "mgrl_illumination",
        "deferred_renderer/main.vert",
        "deferred_renderer/main.frag");
    
    // Scere Graph object
    var graph = demo.graph = new please.SceneGraph();

    // Define our renderer
    demo.renderer = new please.DeferredRenderer();
    demo.renderer.graph = graph;

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
    spinner.rotation_z = please.repeating_driver(-360, 0, 10000);
    var handle = new please.GraphNode();
    handle.location = [0, -15, 5];
    spinner.add(handle);

    // light test
    var light = new please.SpotLightNode();
    light.location = handle;
    light.look_at = [0, 0, 0];
    light.fov = 60;
    graph.add(light);

    var light = new please.SpotLightNode();
    light.location = [8, 0, 8];
    var speed = 3000;
    light.location_y = please.oscillating_driver(-4, 4, speed);
    light.look_at = [5, 0, 0];
    light.look_at_x = please.oscillating_driver(4, 6, speed);
    light.look_at_y = please.oscillating_driver(-5, 5, speed);
    light.fov = 80;
    graph.add(light);

    // light.light_pass.stream_callback = function (array, info) {
    //     var accumulate = 0;
    //     var data, i=0;
    //     for (var y=0; y<info.height; i+=1) {
    //         for (var x=0; x<info.width; x+=1) {
    //             //var data = array.slice(i, i+info.period);
    //             var data = array[i];
    //             accumulate += data;
    //             i+=info.period;
    //         }
    //     }
    //     console.info(accumulate / info.width*info.height);
    // }
        
    please.set_viewport(demo.renderer);
}));
