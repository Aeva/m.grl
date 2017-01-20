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
    "loading_screen" : null, // loading screen compositing node
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
    please.set_search_path("img", "../gl_assets/img/");
    please.set_search_path("jta", "../gl_assets/models/");
    
    // Queue up assets to be downloaded before the game starts.
    please.load("flip_tile.jta");

    // Register a render passes with the scheduler.  The autoscale
    // prefab is used to change the dimensions of the rendering canvas
    // when it has the 'fullscreen' css class, as well as constrain
    // the maximum height of said canvas element.  You are responsible
    // for providing the css needed to upsample the canvas, though
    // this project template accomplishes that for you.  See "ui.css".
    please.add_autoscale();

    // Show a loading screen
    demo.loading_screen = new please.LoadingScreen();
    please.set_viewport(demo.loading_screen);
});


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
    
    // Create GL context, build shader pair.  Note, in this case we
    // don't call please.load on simple.vert or diffuse.frag because
    // they are hardcoded into m.grl by default.
    var prog = please.glsl("default", "simple.vert", "diffuse.frag");
    prog.activate();
        
    // Initialize a scene graph object, which serves as the container
    // for everything that we want to render in a particular scene.
    var graph = demo.graph = new please.SceneGraph();

    // Lets define a camera.  In this demo, the camera is going to use
    // orthographic projection, which is useful for creating 2D games.
    // Because everything uses a common rendering system, you can mix
    // 2D and 3D assets.
    var camera = demo.camera = new please.CameraNode();
    camera.look_at = [0, 0, -10];
    camera.location = please.shift_driver([0, 5, 5], [0, -70, 50], 10000);
    camera.far = 1000;
    
    // Add the camera to the graph and activate it.  Activation is
    // only needed when using more than one camera per scene, which we
    // aren't; the first camera added is activated by default, but it
    // is good to be explicit.
    graph.add(camera);
    camera.activate();

    // Drawing cursor.  We won't be adding this to the scene graph,
    // but rather we'll be passing it as an argument to graph.stamp().
    var cursor = please.access("flip_tile.jta").instance();

    // Background tiles.
    var area = 30;
    demo.tile_count = 0;
    for (var y=-area; y<=area; y+=1) {
        for (var x=-area; x<=area; x+=1) {
            var z = Math.random() * 5;
            cursor.location = [x, y, z];
            cursor.scale = [.25, .25, .25];
            var rotation = 0;
            if (y%2) {
                rotation += 180;
            }
            if (x%2) {
                rotation += 180;
            }
            cursor.rotation_x = rotation % 360;
            graph.stamp(cursor);
            demo.tile_count += 1;
        }
    }

    // Now that we have defined our scene, lets create a render node
    // for it all, and set up a nice transition effect from the
    // loading screen to it

    // Add a renderer using the default shader.
    var renderer = demo.renderer = new please.RenderNode("default");
    renderer.clear_color = [.15, .15, .15, 1];
    renderer.graph = graph;

    // Transition from the loading screen prefab to our renderer
    please.set_viewport(demo.renderer);
}));
