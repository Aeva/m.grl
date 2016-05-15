// - m.lights.js ------------------------------------------------------------ //

/* [+]
 *
 * M.GRL provides a (work-in-progress and very much unstable) system
 * for applying light and shadow to a scene, via the compositing
 * graph.  This system currently makes use of a deferred rendering
 * system, and requires several opengl extensions to be able to run
 * correctly.  Hopefully in the near future, there will also be a
 * fallback mode for when extensions are missing, but that is not the
 * case right now.  Use with caution.
 * 
 */


// [+] please.SpotLightNode(options)
//
// This constructor function creates a graph node which represents a
// spot light.  This object also creates a render node used for
// calculating shadows.  The buffer settings for this render node can
// be configured by passing them as an object in the "options"
// argument.  Most likely, this would be to change the size of the
// light texture.  The "options" argument may be omitted.
//
please.SpotLightNode = function (options) {
    please.GraphNode.call(this);
    this.__is_light = true;

    var prog = please.gl.get_program("mgrl_illumination");
    if (!prog) {
        prog = please.glsl(
            "mgrl_illumination",
            "deferred_renderer/main.vert",
            "deferred_renderer/main.frag");
    }

    this.camera = new please.CameraNode();
    this.camera.width = 1;
    this.camera.height = 1;
    this.cast_shadows = true;
    this.__last_camera = null;
    
    ANI("fov", 45);
    ANI("energy", 1);
    ANI("falloff", 25);
    please.make_animatable_tripple(this, "color", "rgb", [1, 1, 1]);
    please.make_animatable_tripple(this, "look_at", "xyz", [0, 0, 0]);
    please.make_animatable_tripple(this, "up_vector", "xyz", [0, 0, 1]);
    
    var light = this;
    this.camera.fov = function () { return light.fov; };
    this.camera.far = function () { return light.falloff * 2; };
    this.camera.look_at = function () { return light.look_at; };
    this.camera.up_vector = function () { return light.up_vector; };
    this.camera.location = this;

    if (!options) {
        options = {};
    }
    DEFAULT(options.buffers, ["color"])
    DEFAULT(options.type, gl.FLOAT)
    DEFAULT(options.mag_filter, gl.LINEAR)
    DEFAULT(options.min_filter, gl.LINEAR)

    this.depth_pass = new please.RenderNode(prog, options);
    Object.defineProperty(this.depth_pass, "graph", {
        "configurable" : true,
        "get" : function () {
            return this.graph_root;
        },
    });
    this.depth_pass.shader.cast_shadows = function () { return light.cast_shadows; };
    this.depth_pass.shader.shader_pass = 1;
    this.depth_pass.shader.geometry_pass = true;
    this.depth_pass.render = function () {
        this.activate();
        this.graph_root.draw(function (node) { return !node.cast_shadows; });
        this.deactivate();
    }.bind(this);
    this.depth_pass.clear_color = function () {
        var max_depth = this.camera.far;
        return [max_depth, max_depth, max_depth, max_depth];
    }.bind(this);
};
please.SpotLightNode.prototype = Object.create(please.GraphNode.prototype);
please.SpotLightNode.prototype.activate = function () {
    var graph = this.graph_root;
    if (graph !== null) {
        if (graph.camera && typeof(graph.camera.on_inactive) === "function") {
            this.__last_camera = graph.camera;
            graph.camera.on_inactive();
        }
        else {
            this.__last_camera = null;
        }
        graph.camera = this.camera;
    }
};
please.SpotLightNode.prototype.deactivate = function () {
    this.camera.on_inactive();
    this.graph_root.camera = this.__last_camera;
};


// [+] please.DeferredRenderer()
//
// Creates a RenderNode encapsulating the deferred rendering
// functionality.  This api is experimental, so expect it to change
// dramatically until it is stabilized.
//
please.DeferredRenderer = function () {
    var prog = please.gl.get_program("mgrl_illumination");
    if (!prog) {
        prog = please.glsl(
            "mgrl_illumination",
            "deferred_renderer/main.vert",
            "deferred_renderer/main.frag");
    }
    
    var assembly = new please.RenderNode(prog, {"buffers" : ["color"]});
    assembly.clear_color = [0.15, 0.15, 0.15, 1.0];
    assembly.shader.shader_pass = 3;
    assembly.shader.geometry_pass = false;
    assembly.render = function () {
        please.gl.splat();
    }
    assembly.graph = null;

    
    var gbuffer_options = {
        "buffers" : ["color", "spatial", "normal"],
        "type":gl.FLOAT,
    };
    var gbuffers = new please.RenderNode(prog, gbuffer_options);
    gbuffers.clear_color = [-1, -1, -1, -1];
    gbuffers.shader.shader_pass = 0;
    gbuffers.shader.geometry_pass = true;
    gbuffers.render = function () {
        if (assembly.graph !== null) {
            assembly.graph.draw();
        }
    }

    
    var apply_lighting = new please.RenderNode(prog, {"buffers" : ["color"]});
    apply_lighting.clear_color = [0.0, 0.0, 0.0, 1.0];
    apply_lighting.shader.shader_pass = 2;
    apply_lighting.shader.geometry_pass = false;
    apply_lighting.shader.spatial_texture = gbuffers.buffers.spatial;
    apply_lighting.shader.normal_texture = gbuffers.buffers.normal;
    apply_lighting.before_render = function () {
        if (assembly.graph !== null) {
            this.targets = [];
            for (var i=0; i<assembly.graph.__lights.length; i+=1) {
                if (assembly.graph.__lights[i].cast_shadows) {
                    var node = assembly.graph.__lights[i].depth_pass;
                    please.indirect_render(node)
                    this.targets.push(node.__cached);
                }
                else {
                    this.targets.push(null);
                }
            }
        }
    };
    apply_lighting.render = function () {
        if (assembly.graph !== null) {
            gl.disable(gl.DEPTH_TEST);
            gl.enable(gl.BLEND);
            gl.blendFunc(gl.ONE, gl.ONE);
            for (var i=0; i<assembly.graph.__lights.length; i+=1) {
                var light = assembly.graph.__lights[i];
                if (light.cast_shadows) {
                    this.__prog.samplers.light_texture = this.targets[i];
                }
                this.__prog.vars.cast_shadows = light.cast_shadows;
                this.__prog.vars.light_view_matrix = light.camera.view_matrix;
                this.__prog.vars.light_projection_matrix = light.camera.projection_matrix;
                this.__prog.vars.light_world_position = light.camera.__world_coordinate_driver();
                please.gl.splat();
            }
            gl.disable(gl.BLEND);
            gl.enable(gl.DEPTH_TEST);
        }
    };

    
    assembly.shader.diffuse_texture = gbuffers.buffers.color;
    assembly.shader.light_texture = apply_lighting;
    return assembly;
};