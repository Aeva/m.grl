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
    // Attach the dom rendering context.  This must be done before
    // anything else.  32 is the tile size.
    please.dom.set_context("gl_canvas", 16);

    // Define where m.grl is to find various assets when using the
    // load methed.
    please.set_search_path("glsl", "glsl/");
    please.set_search_path("img", "images/");
    please.set_search_path("jta", "models/");
    please.set_search_path("gani", "ganis/");
    please.set_search_path("audio", "sounds/");
    
    // Queue up assets to be downloaded before the game starts.
    please.load("coin.gani");
    please.load("walk.gani");
    please.load("idle.gani");
    please.load("flores.png");
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

    var graph = new please.SceneGraph();

    // First, lets define a camera.  In this demo, the camera is going
    // to use orthographic projection, which is useful for creating 2D
    // games.  Because everything uses a common rendering system, you
    // can mix 2D and 3D assets.
    var camera = demo.main.camera = new please.CameraNode();

    
    // Last thing needed for the camera is to add it to the graph and
    // activate it.  Activation is only needed when using more than
    // one camera per scene, which we aren't; the first camera added
    // is activated by default, but it is good to be explicit.
    graph.add(camera);
    camera.activate();
    

    // Ok next lets draw an image object somewhere.  For reference,
    // the image is 512 pixels by 256 pixels, so it would be 16 units
    // by 8 units.  Lets draw two of these such that they form a
    // square.  The location value of sprites created in this way is
    // the location of the center of the sprite.  In the
    // future, this will be configurable.
    var flora = demo.main.flora = new please.GraphNode();
    graph.add(flora);
    
    var flowers_asset = please.access("flores.png");
    function add_flower (location_y) {
        var node = flowers_asset.instance();
        node.location = [0, location_y, 0];
        flora.add(node);
    }
    add_flower(4);
    add_flower(-4);


    // Lets add a GANI animation next.
    var coin = demo.main.coin = please.access("coin.gani").instance();
    graph.add(coin);

    // Lets make that coin fly around too for good measure.
    coin.location_x = please.oscillating_driver(-10, 10, 3000);
    coin.location_y = please.oscillating_driver(-4, 4, 700);
    coin.location_z = 0; // ensure the coin appears above the flowers

    // add some characters standing about
    var char_asset = please.access("walk.gani");
    function add_char (x, y) {
        var node = char_asset.instance();
        node.location = [x, y, 0];
        node.dir = 2;
        graph.add(node);
    };
    add_char(0,0);
    add_char(1,1);
    


    // Transition from the loading screen prefab to our renderer
    //demo.viewport.raise_curtains(demo.main.renderer);
    please.pipeline.add(10, "project/draw", function () {
        graph.draw();
    })

    // start the rendering pipeline
    please.pipeline.start();
}));
