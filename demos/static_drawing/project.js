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
    "heightmap" : null,
    "manifest" : [
        "demo.vert",
        "demo.frag",
        "hex_tile.jta",
        "heightmap_128x128.png",
    ],

    "height_range" : 40,
};


var get_height = function(x, y) {
    if (x<0 || x>1 || y<0 || y>1) {
        throw new Error("Invalid range.  Expected 0 <= N <= 1 for both args.");
    }

    y = 1.0-y;
    
    if (!demo.heightmap) {
        var img = please.access("heightmap_128x128.png");        
        var canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        demo.heightmap = {
            "ctx" : ctx,
            "width" : img.width,
            "height" : img.height,
        };
    }
    var map = demo.heightmap;
    var sx = (map.width-1) * x;
    var sy = (map.height-1) * y;
    var sample = map.ctx.getImageData(sx, sy, sx+1, sy+1).data[0]/255;
    
    return sample * demo.height_range;
};


var create_terrain = function(graph, x_count, y_count, scale) {
    // Drawing cursor.  We won't be adding this to the scene graph,
    // but rather we'll be passing it as an argument to graph.stamp().
    var cursor = please.access("hex_tile.jta").instance();

    scale = scale || 1.0;
    var radius_x = scale / Math.cos(please.radians(30));
    var radius_y = scale;
    
    var tile_width = (radius_x * 1.5);
    var tile_height = (radius_y * 2.0);
    
    var total_width = (tile_width * x_count) + (radius_x * 0.5);
    var total_height = (tile_height * y_count) + (radius_y * 0.5);
    
    var half_w = total_width/2;
    var half_h = total_height/2;

    for (var x=0; x<x_count; x+=1) {
        var x_offset = (tile_width * x) - half_w + radius_x;
        var y_jitter = radius_y / (x % 2 == 0 ? 2 : -2);
        for (var y=0; y<y_count; y+=1) {
            var y_offset = (tile_height * y) - half_h + radius_y + y_jitter;

            var sample_x = (x_offset + half_w) / total_width;
            var sample_y = (y_offset + half_h) / total_height;
            var z_offset = get_height(sample_x, sample_y);

            cursor.scale = [scale, scale, 1.0];
            cursor.location = [x_offset, y_offset, z_offset];
            graph.stamp(cursor);
        }
    }
};


addEventListener("load", function() {
    // Attach the opengl rendering context.  This must be done before
    // anything else.
    please.gl.set_context("gl_canvas");
    
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
    // The "mgrl_media_ready" event is called when pending downloads
    // have finished.  As we are using this to initialize and start
    // the game, the callback is wrapped in the "please.once"
    // function, to ensure that it is only called once.
    
    // Create GL context, build shader pair.  Note, in this case we
    // don't call please.load on simple.vert or diffuse.frag because
    // they are hardcoded into m.grl by default.
    var prog = please.glsl("demo_shader", "demo.vert", "demo.frag");
    prog.activate();
        
    // Initialize a scene graph object, which serves as the container
    // for everything that we want to render in a particular scene.
    var graph = demo.graph = new please.SceneGraph();

    // Lets define a camera.  In this demo, the camera is going to use
    // orthographic projection, which is useful for creating 2D games.
    // Because everything uses a common rendering system, you can mix
    // 2D and 3D assets.
    var camera = demo.camera = new please.CameraNode();
    camera.look_at = [0, -2, 0];
    camera.far = 1000;

    var camera_pivot = demo.pivot = new please.GraphNode();
    var camera_proxy = new please.GraphNode();
    camera_pivot.add(camera_proxy);
    camera.location = camera_proxy;
    camera_proxy.location = [0, -50, 80];
    camera_pivot.rotation_z = please.repeating_driver(0, 360, 100000);
    
    // Add the camera to the graph and activate it.  Activation is
    // only needed when using more than one camera per scene, which we
    // aren't; the first camera added is activated by default, but it
    // is good to be explicit.
    graph.add(camera);
    camera.activate();

    // make it terrain
    create_terrain(graph, 100, 100, 1.0);

    // Now that we have defined our scene, lets create a render node
    // for it all, and set up a nice transition effect from the
    // loading screen to it

    // Add a renderer using the default shader.
    var renderer = demo.renderer = new please.RenderNode("demo_shader");
    renderer.clear_color = [.15, .15, .15, 1];
    renderer.graph = graph;

    // set up a directional light
    var light_direction = vec3.fromValues(-0.4, -.4, .7);
    renderer.shader.light_direction = light_direction;

    // Transition from the loading screen prefab to our renderer
    please.set_viewport(demo.renderer);
}));
