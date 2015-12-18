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
    please.dom.set_context("game_canvas", {
        antialias : false,
    });

    // Set the clear color for the gl canvas.  Using this metho
    // instead of opengl's allows for the clear color to be accessible
    // in the shader, should it be defined as a uniform.  This also
    // allows for databinding the clear color.
    please.set_clear_color(0.0, 0.0, 0.0, 0.0);

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

    // start the rendering pipeline
    please.pipeline.start();
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
        
    var graph = demo.main.graph = new please.SceneGraph();
    var camera = demo.main.camera = new please.CameraNode();
    // camera.look_at = [0, 0, 0];
    // camera.location = [0, 0, 100];
    // camera.up_vector = [0, 1, 0];
    // camera.set_orthographic();
    camera.dpi = 32;
    graph.add(camera);

    // Ok next lets draw an image object somewhere.  For reference,
    // the image is 512 pixels by 256 pixels, so it would be 16 units
    // by 8 units.  Lets draw two of these such that they form a
    // square.  The location value of sprites created in this way is
    // the location of the bottom left corner of the sprite.  In the
    // future, this will be configurable.
    var flora = demo.main.flora = new please.GraphNode();
    graph.add(flora);
    
    var flowers_asset = please.access("flores.png");
    function add_flower (location_y) {
        var sprite = flowers_asset.instance();
        sprite.location = [-8, location_y, 0];
        flora.add(sprite);
    }
    add_flower(0);
    add_flower(-8);


    // // Lets add a GANI animation next.
    // var coin = demo.main.coin = please.access("coin.gani").instance();
    // graph.add(coin);

    // // Lets make that coin fly around too for good measure.
    // coin.location_x = please.oscillating_driver(-20, 20, 3000);
    // coin.location_y = please.oscillating_driver(-4, 0, 500);
    // coin.location_z = 0; // ensure the coin appears above the flowers


    // // We can mix 3D models in as well.  In this case, the model is
    // // oriented assuming a different up vector, so we'll put it in an
    // // empty to use as a handle for positioning it in game, and adjust
    // // the model's actual node to reflect correct coordinates.
    // var creature = demo.main.creature = new please.GraphNode();
    // var model = please.access("psycho.jta").instance();
    // creature.add(model);
    // graph.add(creature);

    // model.rotation_x = -90;
    // model.scale = [1.5, 1.5, 1.5];

    // creature.location_z = 1;
    // creature.rotation_y = please.repeating_driver(360, 0, 1000);
    // creature.location_y = please.oscillating_driver(-6, 4, 1000);
}));
