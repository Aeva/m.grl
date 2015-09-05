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
    
    var prog = please.glsl("deferred_rendering", "deferred.vert", "deferred.frag");
    this.camera = new please.CameraNode();
    this.camera.width = 1;
    this.camera.height = 1;
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

    this.depth_pass = new please.RenderNode("deferred_rendering", options);
    Object.defineProperty(this.depth_pass, "graph", {
        "configurable" : true,
        "get" : function () {
            return this.graph_root;
        },
    });
    this.depth_pass.shader.shader_pass = 1;
    this.depth_pass.shader.geometry_pass = true;
    this.depth_pass.render = function () {
        this.activate();
        this.graph_root.draw();
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
