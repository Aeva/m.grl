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
    "viewport" : null, // the render pass that will be rendered
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
    please.pipeline.add_autoscale();

    // register a render pass with the scheduler
    please.pipeline.add(10, "project/draw", function () {
        please.render(demo.viewport);
    }).skip_when(function () { return demo.viewport === null; });

    // start the rendering pipeline
    please.pipeline.start();

    // Show a loading screen
    demo.viewport = demo.loading_screen = new please.LoadingScreen();
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

        critter.on_click = function (event) {
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
            critter.on_click({});
        }

        slot.add(critter);
    }


    // Add a "gameplay" hint
    var label = demo.main.label = please.overlay.new_element("text_label");
    label.hide_when = function () { return demo.loading_screen.is_active; };
    label.innerHTML = "" +
        "click these<br/>" +
        "critters";
    //label.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
    label.style.backgroundColor = "#000"
    label.style.textAlign = "center";
    label.style.color = "#fff";
    label.style.fontSize = "24px";
    label.style.padding = "8px";
    label.style.paddingBottom = "4px";
    label.style.borderRadius = "4px";

    // Bind the hint to a graph node that will hover over the
    // right-most critter
    var handle = new please.GraphNode();
    slot.children.slice(-1)[0].add(handle);
    label.bind_to_node(handle);
    handle.location_z = 3;


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
    var renderer = demo.main.renderer = new please.RenderNode("default");
    renderer.graph = graph;
    
    // Transition from the loading screen prefab to our renderer
    demo.viewport.raise_curtains(demo.main.renderer);
}));
