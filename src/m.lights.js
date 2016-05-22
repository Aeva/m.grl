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


// [+] please.SunLightNode(options)
//
// This constructor function creates a graph node which represents a
// sun light.
//
please.SunLightNode = function (options) {
    please.GraphNode.call(this);
    this.__is_light = true;
    this.__light_type = "sun";

    var prog = please.gl.get_program("mgrl_illumination");
    if (!prog) {
        prog = please.glsl(
            "mgrl_illumination",
            "deferred_renderer/main.vert",
            "deferred_renderer/main.frag");
    }

    this.cast_shadows = false;
    Object.freeze(this.cast_shadows);
    
    ANI("intensity", 1);
    please.make_animatable_tripple(this, "color", "rgb", [1, 1, 1]);
    please.make_animatable_tripple(this, "look_at", "xyz", [0, 0, 0]);
    please.make_animatable_tripple(this, "sun_vector", "xyz",
                                   this.__sun_vector_driver);
};
please.SunLightNode.prototype = Object.create(please.GraphNode.prototype);
please.SunLightNode.prototype.__sun_vector_driver = function () {
    var vector = vec3.subtract(vec3.create(), this.world_location, this.look_at);
    return vec3.normalize(vector, vector);
};

// [+] please.PointLightNode(options)
//
// This constructor function creates a graph node which represents a
// point light.
//
please.PointLightNode = function (options) {
    please.GraphNode.call(this);
    this.__is_light = true;
    this.__light_type = "point";

    var prog = please.gl.get_program("mgrl_illumination");
    if (!prog) {
        prog = please.glsl(
            "mgrl_illumination",
            "deferred_renderer/main.vert",
            "deferred_renderer/main.frag");
    }

    this.cast_shadows = false;
    Object.freeze(this.cast_shadows);
    
    ANI("intensity", 1);
    please.make_animatable_tripple(this, "color", "rgb", [1, 1, 1]);
};
please.PointLightNode.prototype = Object.create(please.GraphNode.prototype);


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
    this.__light_type = "spot";

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
    ANI("intensity", 1);
    please.make_animatable_tripple(this, "color", "rgb", [1, 1, 1]);
    please.make_animatable_tripple(this, "look_at", "xyz", [0, 0, 0]);
    please.make_animatable_tripple(this, "up_vector", "xyz", [0, 0, 1]);
    
    var light = this;
    this.camera.fov = function () { return light.fov; };
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
    this.depth_pass.shader.shadow_pass = true;
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
        "type" : gl.FLOAT,
    };
    var gbuffers = new please.RenderNode(prog, gbuffer_options);
    gbuffers.clear_color = [-1, -1, -1, -1];
    gbuffers.shader.shader_pass = 0;
    gbuffers.shader.geometry_pass = true;
    gbuffers.shader.shadow_pass = false;
    gbuffers.render = function () {
        if (assembly.graph !== null) {
            assembly.graph.draw();
        }
    }


    var light_options = {
        "buffers" : ["color"],
        "type" : gl.FLOAT,
    };
    var apply_lighting = new please.RenderNode(prog, light_options);
    apply_lighting.clear_color = [0.0, 0.0, 0.0, 1.0];
    apply_lighting.shader.shader_pass = 2;
    apply_lighting.shader.geometry_pass = false;
    apply_lighting.shader.diffuse_texture = gbuffers.buffers.color;
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
            this.__prog.vars.camera_position = assembly.graph.camera.world_location;
            for (var i=0; i<assembly.graph.__lights.length; i+=1) {
                var light = assembly.graph.__lights[i];
                if (light.__light_type == "spot") {
                    if (light.cast_shadows) {
                        this.__prog.samplers.light_texture = this.targets[i];
                    }
                    this.__prog.vars.light_type = 0;
                    this.__prog.vars.cast_shadows = light.cast_shadows;
                    this.__prog.vars.light_view_matrix = light.camera.view_matrix;
                    this.__prog.vars.light_projection_matrix = light.camera.projection_matrix;
                    this.__prog.vars.light_world_position = light.camera.__world_coordinate_driver();
                }
                else if (light.__light_type == "point") {
                    this.__prog.vars.light_type = 1;
                    this.__prog.vars.cast_shadows = light.cast_shadows;
                    this.__prog.vars.light_world_position = light.__world_coordinate_driver();
                }
                else if (light.__light_type == "sun") {
                    this.__prog.vars.light_type = 2;
                    this.__prog.vars.cast_shadows = light.cast_shadows;
                    // here we use the light_world_position as the
                    // sun light's vector instead of the sun's position
                    this.__prog.vars.light_world_position = light.sun_vector;
                }
                this.__prog.vars.light_intensity = light.intensity;
                this.__prog.vars.light_color = light.color;
                please.gl.splat();
            }
            gl.disable(gl.BLEND);
            gl.enable(gl.DEPTH_TEST);
        }
    };

    
    assembly.shader.diffuse_texture = gbuffers.buffers.color;
    assembly.shader.light_texture = apply_lighting;
    assembly.shader.exposure = 10;
    return assembly;
};