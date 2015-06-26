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
    please.load("psycho.jta");
    please.load("coin.gani");
    please.load("walk.gani");
    please.load("idle.gani");
    please.load("flores.png");

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
    // In this function, we construct a simple scene which creates a
    // loading screen.  This functionality will later be available as
    // a drop-in component which you may use in your own projects, at
    // which point this method will be omitted from the demo.
    //
    // Functionality pertaining to 2D rendering will be explained in
    // the media ready handler defined below this method.
    //
    // This section also makes use of "default assets", which are
    // bundled with m.grl for you to use.  These assets do not need to
    // be pre-loaded and are available right away.  This is mostly
    // limited to providing a collection of small shaders to enable
    // you to build nice visual effects without knowing GLSL.

    var graph = demo.loading.graph = new please.SceneGraph();
    var camera = demo.loading.camera = new please.CameraNode();
    camera.look_at = function () { return [0.0, 0.0, 0.0]};
    camera.location = [0.0, 0.0, 100];
    camera.up_vector = [0, 1, 0];
    camera.set_orthographic();

    var container = new please.GraphNode();

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

    demo.loading.renderer = new please.RenderNode("default");
    demo.loading.renderer.graph = graph;

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

    // First, lets define a camera.  In this demo, the camera is going
    // to use orthographic projection, which is useful for creating 2D
    // games.  Because everything uses a common rendering system, you
    // can mix 2D and 3D assets.
    var camera = demo.main.camera = new please.CameraNode();
    camera.look_at = [0, 0, 0];
    camera.location = [0, 0, 100];
    camera.up_vector = [0, 1, 0];
    camera.set_orthographic();
    // In the above lines, we set the camera's up_vector to [0, 1, 0].
    // What this does is makes it so that your screen's width
    // represents the X axis, the screens height represents the Y
    // axis, and then the Z axis is used to determine which sprites
    // overlap which other sprites.  The camera's location is set to
    // [0, 0, 100] and the look_at is set to [0, 0, 0] so that sprites
    // with a Z less than 100 appear infront of the camera.  If you
    // wanted to have the rendering be centered on say (5, -10)
    // instead of (0, 0), then the look_at value would be set to
    // [5, -10, 0] and the location would be set to [5, -10, 100].
    //
    // Note that the above coordinates are not in pixel units, and do
    // not need to be whole numbers.  One unit is equal to 32 pixels.
    // The camera's dpi property controls the grid size, however
    // changing the grid size may be broken at the time of writing
    // this demo.
    //
    // The set_orthographic method is called so as to not render
    // things with perspective, so that objects will be the same size
    // no matter where they are drawn on screen.

    
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
    // the location of the bottom left corner of the sprite.  In the
    // future, this will be configurable.
    var flora = demo.main.flora = new please.GraphNode();
    graph.add(flora);
    
    var flowers_asset = please.access("flores.png");
    function add_flower (location_y) {
        var sprite = flowers_asset.instance();
        sprite.location = [-4, location_y, 0];
        flora.add(sprite);
    }
    add_flower(0);
    add_flower(-4);


    // Lets add a GANI animation next.
    var coin = demo.main.coin = please.access("coin.gani").instance();
    graph.add(coin);

    // Lets make that coin fly around too for good measure.
    coin.location_x = please.oscillating_driver(-10, 10, 3000);
    coin.location_y = please.oscillating_driver(-2, 0, 500);
    coin.location_z = 0; // ensure the coin appears above the flowers


    // We can mix 3D models in as well.  In this case, the model is
    // oriented assuming a different up vector, so we'll put it in an
    // empty to use as a handle for positioning it in game, and adjust
    // the model's actual node to reflect correct coordinates.
    var creature = demo.main.creature = new please.GraphNode();
    var model = please.access("psycho.jta").instance();
    creature.add(model);
    graph.add(creature);

    model.rotation_x = -90;

    creature.location_z = 1;
    creature.rotation_y = please.repeating_driver(360, 0, 1000);
    creature.location_y = please.oscillating_driver(-6, 4, 1000);

    

    // Now that we have defined our scene, lets create a render node
    // for it all, and set up a nice transition effect from the
    // loading screen to it

    // Add a renderer using the default shader.
    var renderer = demo.main.renderer = new please.RenderNode("default");
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
