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
    "graph" : null,
    "models" : [],

    "last_build" : null,
    "last_index" : -1,
    
    "manifest" : [
        "ext.vert",
        "ext.frag",
        "base.frag",
        "suzanne.jta",
        "holodeck.jta",
    ],
};


// Note, "bindings.js" contains functions that are used to show, hide,
// or modify the overlay controls in this demo.


demo.reflow_shader = function (handle, new_src) {
    var shader = please.media.assets[handle];
    var src = new_src ? new_src : shader.src;
    var uri = shader.uri;
    please.media.assets[handle] = new please.gl.ShaderSource(src, uri);
};


demo.build_shader = function () {
    // hide the error message in the pannel, copy the contents of the
    // panel over the source of ext.frag, build a new shader from
    // base.frag, switch to that shader program.
    //
    // ideally this should also remove the old shader program >_>

    demo.hide_error();
    var handle = "build_" + (demo.last_index + 1);

    var old_enums = null;
    if (demo.last_build) {
        old_enums = demo.last_build.final_ast.frag.enums.diffuse_color;
    }

    // copy over source and reset base shader
    var src = document.getElementById("shader_source").value;
    demo.reflow_shader("ext.frag", src);
    
    try {
        // attempt to build and activate the new shader
        var prog = please.glsl(handle, "simple.vert", "ext.vert", "base.frag", "ext.frag");
        var new_enums = prog.final_ast.frag.enums.diffuse_color;
        prog.activate();
        demo.last_index += 1;
        demo.last_build = prog;
        demo.reset_model_effects(old_enums, new_enums);
        if (demo.renderer) {
            demo.renderer.retarget(prog);
        }
    }
    catch (error) {
        // build failed: show an error message
        demo.show_error(error.message);
    }
};


demo.initial_model_settings = function () {
    var enums = demo.last_build.final_ast.frag.enums.diffuse_color;
    
    demo.models.map(function (model, i) {
        var found = false;
        enums.map(function (name, i) {
            if (i>0 && model.node_name.indexOf(name) > -1) {
                model.shader.diffuse_color = i;
                found = true;
            }
        });
        if (!found) {
            model.shader.diffuse_color = (i%(enums.length-1))+1;
        }
    });    
};


demo.reset_model_effects = function (old_enums, new_enums) {
    if (old_enums && new_enums) {
        var mapping = {};
        old_enums.map(function(name, i) {
            var found = new_enums.indexOf(name);
            if (found > -1) {
                mapping[i] = found;
            }
        });

        var counter = 1;
        demo.models.map(function (model) {
            var old_value = model.shader.diffuse_color;
            var new_value = mapping[old_value];
            if (new_value) {
                model.shader.diffuse_color = new_value;
            }
            else {
                model.shader.diffuse_color = (counter%(new_enums.length-1))+1;
                counter += 1;
            }
        });
    }
};


demo.cycle_effect = function(model) {
    var enums = demo.last_build.final_ast.frag.enums.diffuse_color;
    var index = model.__ani_store.diffuse_color;
    var next = ((index+1)%(enums.length));
    if (next == 0) {
        next += 1;
    }
    model.__ani_store.diffuse_color = next;
    model.__uniform_update(model.shader, "diffuse_color", model);
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
    demo.init_controls();
    demo.build_shader();

    var graph = demo.graph = new please.SceneGraph();
    var asset = please.access("suzanne.jta");

    // enable object picking
    please.picking.graph = graph;

    // add some objects onscreen
    var names = ["vibrant", "weird_noise", "water"];
    [-3, 0, 3].map(function (x, i) {
        var monkey = asset.instance();
        monkey.node_name = names[i];
        monkey.location_x = x;
        graph.add(monkey);
        demo.models.push(monkey);
        monkey.rotation_z = please.repeating_driver(360, 0, 8000);
        monkey.shader.morph = 0;
    });

    var scene = please.access("holodeck.jta").instance();
    scene.node_lookup.water.destroy();
    scene.children.map(function (model) {
        demo.models.push(model);
        model.shader.morph = 0;
    });
    scene.propogate(function (node) {
        node.freeze();
    });
    graph.add(scene);
    
    var water = new WaterNode();
    water.shader.morph = "waves";
    water.shader.diffuse_color = 5;
    water.node_name = "water_grid";
    demo.models.push(water);
    graph.add(water);
    
    demo.initial_model_settings();

    graph.on_mousedown.connect(function (event) {
        if (event.picked) {
            demo.cycle_effect(event.picked);
        }
    });


    // add a camera object to the scene graph
    var camera = new please.CameraNode();
    camera.look_at = [-1.5, 0.0, 1.0];
    camera.location = [-3, -8, 2.5];
    graph.add(camera);

    // experimental aspec ration dependent fov
    camera.fov = function () {
        var rect = please.gl.canvas.getBoundingClientRect();
        return please.degrees(Math.atan2(rect.height, rect.width)) * 1.58;
    };

    // add a render pass
    demo.renderer = new please.RenderNode(demo.last_build);
    demo.renderer.graph = graph;
    please.set_viewport(demo.renderer);
    demo.renderer.clear_color = [0.5, 0.5, 0.5, 1.0];
}));


var WaterNode = function () {
    console.assert(this !== window);
    please.GraphNode.call(this);

    this.__vbo = please.gl.make_grid(.1, .1, 100, 100);
    this.__drawable = true;

    this.bind = function () {
        this.__vbo.bind();
    };
    this.draw = function () {
        this.__vbo.draw();
    };
};
WaterNode.prototype = please.GraphNode.prototype;
