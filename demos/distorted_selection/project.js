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

    // Set the clear color for the gl canvas.  Using this metho
    // instead of opengl's allows for the clear color to be accessible
    // in the shader, should it be defined as a uniform.  This also
    // allows for databinding the clear color.
    please.set_clear_color(1.0, 1.0, 1.0, 1.0);

    // Set OpenGL rendering state defaults directly.  Some of this may
    // be abstracted by m.grl in the future.
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.CULL_FACE);

    // Define where m.grl is to find various assets when using the
    // load methed.
    please.set_search_path("glsl", "glsl/");
    please.set_search_path("img", "../gl_assets/img/");
    please.set_search_path("jta", "../gl_assets/models/");
    
    // Queue up assets to be downloaded before the game starts.
    please.load("psycho.jta");
    please.load("flip_tile.jta");
    please.load("warp_effect.frag");

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
    var graph = demo.main.graph = new please.SceneGraph();

    // Lets define a camera.  In this demo, the camera is going to use
    // orthographic projection, which is useful for creating 2D games.
    // Because everything uses a common rendering system, you can mix
    // 2D and 3D assets.
    var camera = demo.main.camera = new please.CameraNode();
    camera.look_at = [0, 0, 2];
    camera.location = [0, -8, 2];
    
    // Add the camera to the graph and activate it.  Activation is
    // only needed when using more than one camera per scene, which we
    // aren't; the first camera added is activated by default, but it
    // is good to be explicit.
    graph.add(camera);
    camera.activate();

    // Draw the objects in our scene:
    var tile_model = please.access("flip_tile.jta");
    var char_model = please.access("psycho.jta");
    var selected = null;

    for (var i=-2; i<=2; i+=1) {
        var slot = new please.GraphNode();
        slot.location_x = i*2.0;
        slot.scale = [0.5, 0.5, 0.5];
        graph.add(slot);

        var tile = tile_model.instance();
        if (i % 2) {
            tile.rotation_x = 180;
        }
        slot.add(tile);

        var critter = char_model.instance();
        critter.selectable = true;

        critter.on_mouseup = function (event) {
            if (selected !== this) {
                if (selected) {
                    // if there was something selected, freeze it's animation
                    selected.rotation_z = 0.0;
                    selected.location_z = 0.0;
                }
                selected = this;
                this.rotation_z = please.repeating_driver(360, 0, 900);
                this.location_z = please.oscillating_driver(0, 1, 1000);
            }
        };

        if (i === 0) {
            // fake a click event to select the middle one
            critter.on_mouseup({});
        }

        slot.add(critter);
    }

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
            console.info("Click coordinate: (" + coord.join(", ") + ")");
        }
    };
    
    // Now that we have defined our scene, lets create a render node
    // for it all, and set up a nice transition effect from the
    // loading screen to it

    // Add a renderer using the default shader.
    var renderer = new please.RenderNode("default");
    renderer.graph = graph;

    // Add a distortion effect
    please.glsl("warp_effect", "splat.vert", "warp_effect.frag");
    var screen_warp = new please.RenderNode("warp_effect");
    screen_warp.shader.splat_texture = renderer;

    // Add another for the picking pass to use
    var pick_warp = new please.RenderNode("warp_effect");
    pick_warp.shader.splat_texture = graph.picking.compositing_root;

    // Set the render pass to be our main renderer
    demo.main.renderer = screen_warp;
    graph.picking.compositing_root = pick_warp;
    
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