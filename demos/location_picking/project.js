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
    please.load("psycho.jta");
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
    camera.look_at = [2, -2, 2];
    camera.location = [5, -5, 6];
    
    // Add the camera to the graph and activate it.  Activation is
    // only needed when using more than one camera per scene, which we
    // aren't; the first camera added is activated by default, but it
    // is good to be explicit.
    graph.add(camera);
    camera.activate();

    // Objects to be drawn in this scene.
    var tile_model = please.access("flip_tile.jta");
    var char_model = please.access("psycho.jta");

    // The background tiles are going to be accumulated in a single
    // graph node, which is going to be passed into a StaticDrawNode,
    // so as to allow the data to be rendered much more efficiently.
    var tile_set = new please.GraphNode();
    for (var y=-5; y<=5; y+=1) {
        for (var x=-5; x<=5; x+=1) {
            var tile = tile_model.instance();
            tile.location = [x, y, 0];
            tile.scale = [.25, .25, .25];
            if (y%2) {
                tile.rotation_x = 180;
            }
            if (x%2) {
                tile.rotation_x += 180;
            }
            tile_set.add(tile);
            tile.use_manual_cache_invalidation();
        }
    }
    demo.tile_bake = new please.StaticDrawNode(tile_set);
    graph.add(demo.tile_bake);

    var player = demo.player = new please.GraphNode();
    var model = char_model.instance();
    model.rotation_z = please.repeating_driver(360, 0, 1000);
    model.location_z = please.oscillating_driver(0, .5, 800);
    model.scale = [.5, .5, .5];
    player.add(model);
    graph.add(player);

    // add a "gameplay" hint
    var label = demo.label = please.overlay.new_element("text_label");
    label.hide_when = function () { return demo.loading_screen.is_active; };
    label.innerHTML = "" +
        "Click somewhere in the tiled<br/>" +
        "area to move the character.";        
    label.style.backgroundColor = "rgba(255, 255, 255, 0.8)";
    label.style.fontSize = "24px";
    label.style.padding = "4px";
    label.style.borderRadius = "4px";
    label.style.right = "100px";
    label.style.bottom = "100px";
    
    // Activate picking passes for the scene graph:
    graph.picking.enabled = true;

    // For fun, let's also print out the world coordinate that was
    // clicked.  First we need to enable location picking:
    graph.picking.skip_location_info = false;

    // Next we add an event handler on the graph for the on_mouseup
    // event.  Other events also exist.
    graph.on_mouseup = function (event) {
        var coord = event.world_location;
        if (coord) {
            if (event.selected != player) {
                var x = coord[0];
                var y = coord[1];
                player.location = please.shift_driver(
                    player.location, [x, y, 0], 500);
                    
            }
        }
    };
    
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
