// - m.graph.js ---------------------------------------------------------- //

/* [+]
 * 
 * This part of the module implements the scene graph functionality
 * for M.GRL.  This provides a simple means of instancing 2D and 3D
 * art assets, greatly simplifies rendering code, and prerforms
 * rendering optimizations to have better performance than would be
 * achieved with by rendering manually.
 * 
 * Additionally, a mechanism for data binding exists on most of the
 * properties of graph objects.  For example, you could set the
 * object's "location_x" coordinate to be a value like "10", or you
 * could set it to be a function that returns a numerical value like
 * "10".  This can be used to perform animation tasks.  When a
 * function is assigned to a property in such a fashion, it is called
 * a "driver function".
 *
 * Note that, being a scene graph, objects can be parented to other
 * objects.  When the parent moves, the child moves with it!  Empty
 * graph objects can be used to influence objects that draw.  Between
 * empties, inheritance, and driver functions, you are given the tools
 * to implement animations without requiring vertex deformation.
 *
 * Some properties on graph nodes can be accessed either as an array
 * or as individual channels.  Node.location = [x,y,z] can be used to
 * set a driver function for all three channels at once.  The
 * individual channels can be accessed, set, or assigned their own
 * driver methods via .location_x, .location_y, and .location_z.
 * Currently, .location, .rotation, and .scale work like this on all
 * graph nodes.  CameraNodes also have .look_at and .up_vector.  In
 * the future, all vec3 uniform variables will be accessible in this
 * way.  If a GraphNode-descended object is assigned to a "tripple"
 * handle, such as the example of look_at in the code above, then a
 * driver function will be automatically created to wrap the object's
 * "location" property.  Note, you should avoid setting individual
 * channels via the array handle - don **not** do ".location[0] = num"!
 *
 * Word of caution: driver functions are only called if the scene
 * graph thinks it needs them for rendering!  The way this is
 * determined, is that driver functions associated to glsl variables
 * are always evaluated.  If such a driver function attempts to read
 * from another driver function, then that driver is evaluated (and
 * cached, so the value doesn't change again this frame), and so on.
 */


// [+] please.GraphNode()
//
// Constructor function that creates an Empty node.  The constructor
// accepts no arguments, but the created object may be configrued by
// adjusting its properties.  All properties that would have a
// numerical value normally set to them may also be set as a function
// (called a "driver") that returns a numerical value.  When the scene
// graph's ".tick" method is called, the driver functions are
// evaluated, and their results are cached for use by the scene
// graph's .draw() method.
//
// ```
// var empty = new please.GraphNode();
// var empty.rotation.x = 10;
// var empty.rotation.x = fuction() { return performance.now()/100; };
// ```
//
// Most of the time when you want to draw something with the scene
// graph, you create the GraphNodes indirectly from loaded game
// assets.
//
// ```
// var character = please.access("alice.jta").instance();
// var sprite_animation = please.access("particle.gani").instance();
// var just_a_quad = please.access("hello_world.png").instance();
// ```
//
// GraphNodes have some special properties:
//
//  - **location** Animatable tripple, used to generate the node's
//    local matrix.
//
//  - **rotation** Animatable tripple, define's the object's rotation
//    in euler notation.
//
//  - **world_location** Read only getter which provides a the
//    object's coordinates in world space.
//
//  - **quaternion** Animatable tripple, by default, it is a getter
//    that returns the quaternion for the rotation defined on the
//    'rotation' property.  If you set this, the 'rotation' property
//    will be overwritten with a getter, which currently returns an
//    error.  This is useful if you need to define something's
//    orientation without suffering from gimbal lock.  Behind the
//    scenes, m.grl reads from this property, not from rotation.
//  
//  - **scale** Animatable tripple, used to generate the node's local
//    matrix.
//
//  - **shader** An object, automatically contains bindings for most
//    GLSL shader variables.  Variables with non-zero defaults are be
//    listed below.
//
//  - **selectable** Defaults to false.  May be set to true to allow
//    the object to be considered for picking.
//
//  - **visible** Defaults to true.  May be set to false to prevent
//    the node and its children from being drawn.
//
//  - **sort_mode** Defaults to "solid", but may be set to "alpha" to
//    force the object to use the z-sorting path instead of state
//    sorting.  This is generally slower, but is needed if for partial
//    transparency from a texture to work correctly.
//
//  - **draw_type** .jta model instances and empty GraphNodes default
//    to "model", while .gani and image instances default to "sprite".
//    Determines the value of the glsl uniform variable
//    "is_transparent".
//
// Additionally, each GraphNode has a "shader" property, which is an
// object containing additional animatable properties for
// automatically setting GLSL shader variables when it is drawn.  The
// following variables have non-zero defaults.
//
//  - **shader.alpha** Animatable scalar - a numerical value between
//    0.0 and 1.0.  Defaults to 1.0.
//
//  - **shader.world_matrix** "Locked" animatable variable which by
//    default contains a driver method that calculate's the object's
//    world matrix for this frame by calculating it's world matrix
//    from the location, rotation, and scale properties, and then
//    multiplying it against either the parent's world matrix if
//    applicable (or the identity matrix if not) to produce the
//    object's own world matrix.
//
//  - **shader.normal_matrix** "Locked" animatable variable which
//    calculates the normal_matrix from shader.world_matrix.
//
//  - **is_sprite** "Locked" animatable scalar value.  Returns
//    true if this.draw_type is set to "sprite", otherwise returns
//    false.
//
//  - **is_transparent** "Locked" animatable scalar value.  Returns
//    true if this.sort_mode is set to "alpha", otherwise returns
//    false.
//
// Graph nodes have the following getters for accessing graph
// inhertiance.  You should avoid saving the vaules returned by these
// anywhere, as you can prevent objects from being garbage collected
// or accidentally create a reference cycle.
//
//  - **children** This is a list of all objects that are directly
//    parented to a given GraphNode instance.
//
//  - **parent** This returns either null or the object for which this
//    node is parented to.
//
//  - **graph_root** Returns the GraphNode that is the root of the
//    graph.  This should be either a SceneGraph instance or a
//    derivative thereof.
//
// GraphNodes also have the following methods for managing the scene
// graph:
//
//  - **has\_child(entity)** Returns true or false whether or not this
//    node claims argument 'entity' as child.
//
//  - **add(entity)** Adds the passed object as a child.
//
//  - **remove(entity)** Remove the given entity from this node's
//    children.
//
//  - **destroy()** Remove the object from it's parent, and then
//    removes the reference to it from the node index.
//
// If you want to create your own special GraphNodes, be sure to set
// the following variables in your constructor to ensure they are
// unique to each instance.
//
// ```
// var FancyNode = function () {
//     please.GraphNode.call(this);
// };
// FancyNode.prototype = Object.create(please.GraphNode.prototype);
// ```
//
// If you want to make an Empty or a derived constructor drawable, set
// the "__drawable" property to true, and set the "draw" property to a
// function that contains your custom drawing code.  Optionally, the
// "bind" property may also be set to a function.  Bind is called
// before Draw, and is used to set up GL state.  Bind is called
// regardless of if the node is visible, though both bind and draw
// requrie the node be drawable.  The bind method is essentially
// vestigial and should not be used.
//
please.graph_index = {};
please.graph_index.roots = [];
please.GraphNode = function () {
    console.assert(this !== window);

    // The node_id value is immutable once set, and is used for
    // tracking graph inheritance.
    Object.defineProperty(this, "__id", {
        enumerable : false,
        configurable: false,
        writable : false,
        value : please.uuid(),
    });

    // The graph_index is used to track inheritance in the graph
    // without creating extra object references.
    please.graph_index[this.__id] = {
        "root": null,
        "parent" : null,
        "children" : [],
        "ref": this,
    };

    // Pull the parent reference out of the symbol table.
    Object.defineProperty(this, "graph_root", {
        "configurable" : true,
        "get" : function () {
            var graph_id = please.graph_index[this.__id].root;
            if (graph_id) {
                return please.graph_index[graph_id].ref;
            }
            else {
                return null;
            }
        },
    });

    // Pull the parent reference out of the symbol table.
    Object.defineProperty(this, "parent", {
        "configurable" : true,
        "get" : function () {
            var parent_id = please.graph_index[this.__id].parent;
            if (parent_id) {
                return please.graph_index[parent_id].ref;
            }
            else {
                return null;
            }
        },
    });

    // Generate a list of child objects from the symbol table.
    Object.defineProperty(this, "children", {
        "get" : function () {
            var children_ids = please.graph_index[this.__id].children;
            var children = [];
            for (var i=0; i<children_ids.length; i+=1) {
                children.push(please.graph_index[children_ids[i]].ref);
            }
            return children;
        },
    });

    please.make_animatable_tripple(this, "location", "xyz", [0, 0, 0]);
    please.make_animatable_tripple(this, "scale", "xyz", [1, 1, 1]);

    please.make_animatable(
        this, "world_location", this.__world_coordinate_driver, null, true);
    
    // The rotation animatable property is represented in euler
    // rotation, whereas the quaternion animatable property is
    // represented in, well, quaternions.  Which one is used is
    // determined by which was set last.  When one is set, the other's
    // value is quietly overwritten with a driver that provides the
    // same information.
    var rotation_mode = null;
    
    // This method is used to clear the animation cache for both the
    // rotation and quaternion properties.
    var clear_caches = function () {
        var cache = this.__ani_cache;
        cache["rotation_focus"] = null;
        cache["rotation_x"] = null;
        cache["rotation_y"] = null;
        cache["rotation_z"] = null;
        cache["quaternion_focus"] = null;
        cache["quaternion_x"] = null;
        cache["quaternion_y"] = null;
        cache["quaternion_z"] = null;
        cache["quaternion_w"] = null;
    }.bind(this);

    // This method is used to set the value for a given animatable
    // property without triggering the write hook.
    var side_set = function (prop, value) {
        var store = this.__ani_store;
        store[prop + "_focus"] = value;
    }.bind(this);

    // This method is used to set the "focus" store of an animatable
    // tripple if it matches a particular value.
    var side_clear = function (prop, value) {
        var store = this.__ani_store;
        var ref = prop + "_focus";
        if (store[ref] === value) {
            store[ref] = null;
        }
    }.bind(this);

    // A getter that is set to the rotation property when the mode
    // changes to quaternion mode.
    var as_euler = function () {
        var p = vec3.fromValues(1, 0, 0);
        vec3.transformQuat(p, p, this.quaternion);
        var rotation_y = -Math.asin(p[2]);
        var rotation_z = Math.atan2(p[1], p[0]);
        p = vec3.fromValues(0, 1, 0);
        vec3.transformQuat(p, p, this.quaternion);
        vec3.rotateZ(p, p, vec3.create(), -rotation_z);
        vec3.rotateY(p, p, vec3.create(), -rotation_y);
        var rotation_x = Math.atan2(p[2], p[1]);
        return [please.degrees(rotation_x), please.degrees(rotation_y), please.degrees(rotation_z)];
    }.bind(this);

    // A getter that is set to the quaternion property wthen the mode
    // changes to euler mode.
    var as_quat = function () {
        var orientation = quat.create();
        quat.rotateZ(orientation, orientation, please.radians(this.rotation_z));
        quat.rotateY(orientation, orientation, please.radians(this.rotation_y));
        quat.rotateX(orientation, orientation, please.radians(this.rotation_x));
        return orientation;
    }.bind(this);

    // Called after the animatable property's setter to 
    var rotation_hook = function (target, prop, obj) {
        if (prop !== rotation_mode) {
            rotation_mode = prop;
            clear_caches();
            if (prop === "rotation") {
                side_clear("rotation", as_euler);
                side_set("quaternion", as_quat);
            }
            else if (prop === "quaternion") {
                side_clear("quaternion", as_quat);
                side_set("rotation", as_euler);
            }
        }
    };
    
    please.make_animatable_tripple(
        this, "rotation", "xyz", [0, 0, 0], null, rotation_hook);
    please.make_animatable_tripple(
        this, "quaternion", "xyzw", [0, 0, 0, 1], null, rotation_hook);

    // make degrees the default handle
    this.rotation = [0, 0, 0];

    // Automatically databind to the shader program's uniform and
    // sampler variables.
    var ignore = [
        "projection_matrix",
        "view_matrix",
    ];
    
#ifdef WEBGL
    var prog = please.gl.get_program();
    this.__local_matrix_cache = mat4.create();
    this.__world_matrix_cache = mat4.create();
    this.__uniform_update = new please.Signal();

    if (please.renderer.name === "gl") {
        // code specific to the webgl renderer
        var bind_driver = function (name, value) {
            please.make_animatable(
                this, name, value, this.shader, true, this.__uniform_update);
        }.bind(this);

        var bind_vec_driver = function (name, channels, value) {
            please.make_animatable_tripple(
                this, name, channels, value, this.shader, true, this.__uniform_update);
        }.bind(this);
       
        this.__regen_glsl_bindings = function (event) {
            // GLSL bindings with default driver methods:
            var prog = please.gl.__cache.current;
            var old = null;
            if (event) {
                old = event.old_prog;
            }
            // deep copy
            var old_data = this.__ani_store;
            this.__ani_store = {};
            this.shader = {};
            bind_driver("world_matrix", this.__world_matrix_driver);
            bind_driver("normal_matrix", this.__normal_matrix_driver);
            // GLSLS bindings with default behaviors
            please.make_animatable(
                this, "alpha", 1.0, this.shader, false, this.__uniform_update);
            bind_driver("is_sprite", this.__is_sprite_driver);
            bind_driver("is_transparent", this.__is_transparent_driver);
            bind_driver("billboard_mode", this.__billboard_driver);

            // prog.samplers is a subset of prog.vars
            for (var name, i=0; i<prog.uniform_list.length; i+=1) {
                name = prog.uniform_list[i];
                if (ignore.indexOf(name) === -1 && !this.shader.hasOwnProperty(name)) {
                    var initial_value = null;
                    if (prog.binding_ctx["GraphNode"].indexOf(name) > -1) {
                        initial_value = prog.__uniform_initial_value(name);
                    }
                    please.make_animatable(
                        this, name, initial_value, this.shader, false, this.__uniform_update);
                    //this.__uniform_update(this.shader, name, this);
                }
            }

            // restore old values that were wiped out
            ITER_PROPS(name, old_data) {
                var old_value = old_data[name];
                if (old_value !== undefined && old_value !== null) {
                    this.__ani_store[name] = old_value;
                }
            }
        }.bind(this);
        this.__regen_glsl_bindings();
        window.addEventListener("mgrl_changed_shader", this.__regen_glsl_bindings);
    }
#endif

#ifdef DOM
    if (please.renderer.name === "dom") {
        // code specific to the dom renderer
        this.shader = {};
        please.make_animatable(
            this, "world_matrix", this.__world_matrix_driver, this.shader, true);
    }
#endif
    
    this.is_bone = false;
    this.visible = true;
    this.draw_type = "model"; // can be set to "sprite"
    this.sort_mode = "solid"; // can be set to "alpha"
    this.billboard = false; // can be set to false, 'tree', or 'particle'
    this.__asset = null;
    this.__asset_hint = "";
    this.__is_camera = false; // set to true if the object is a camera
    this.__drawable = false; // set to true to call .bind and .draw functions
    this.__z_depth = null; // overwritten by z-sorting
    this.selectable = false; // object can be selected via picking
    this.__last_vbo = null; // stores the vbo that was bound last draw
    this.cast_shadows = true;

    // should either be null or an object with properties "ibo" and "vbo"
    this.__buffers = null;

    // some event handles
    this.on_mousemove = null;
    this.on_mousedown = null;
    this.on_mouseup = null;
    this.on_click = null;
    this.on_doubleclick = null;
    
    this.__on_graphroot_changed = new please.Signal();
};
please.GraphNode.prototype = {
    "has_child" : function (entity) {
        // Return true or false whether or not this graph node claims
        // the given entity as a child.
        var children = please.graph_index[this.__id].children;
        return children.indexOf(entity.__id) !== -1;
    },
    "add" : function (entity) {
        // Add the given entity to this object's children.
        var old_parent = entity.parent;
        if (old_parent) {
            if (old_parent === this) {
                return;
            }
            old_parent.remove(entity);
        }
        if (!this.has_child(entity)) {
            please.graph_index[this.__id].children.push(entity.__id);
            please.graph_index[entity.__id].parent = this.__id;
        }
        entity.__set_graph_root(this.graph_root);
    },
    "remove" : function (entity) {
        //  Remove the given entity from this object's children.
        if (this.has_child(entity)) {
            if (this.graph_root) {
                this.graph_root.__ignore(entity);
            }
            var children = please.graph_index[this.__id].children;
            children.splice(children.indexOf(entity.__id), 1);
        }
        entity.__set_graph_root(null);
    },
    "destroy" : function () {
        var parent = this.parent;
        if (parent) {
            parent.remove(this);
        }
        var children = this.children;
        for (var i=0; i<children.length; i+=1) {
            var child_id = children[i].__id;
            please.graph_index[child_id].parent = null;
            children[i].__set_graph_root(null);
        }
        window.removeEventListener(
            "mgrl_changed_shader", this.__regen_glsl_bindings);
        this.graph_root.__ignore(this);
        delete please.graph_index[this.__id];
    },
    "propogate" : function (method, skip_root) {
        // node.propogate allows you to apply a function to each child
        // in this graph, inclusive of the node it was called on.
        if (!skip_root) {
            method(this);
        }
        var children = this.children;
        for (var i=0; i<children.length; i+=1) {
            children[i].propogate(method);
        }
    },
    "dispatch" : function (event_name, event_info) {
        var method_name = "on_" + event_name;
        if (this.hasOwnProperty(method_name)) {
            var method = this[method_name];
            if (method) {
                if (typeof(method) === "function") {
                    method.call(this, event_info);
                }
                else if (typeof(method) === "object") {
                    ITER(i, method) {
                        method[i].call(this, event_info);
                    }
                }
            }
        }
    },
    "freeze" : function () {
        if (this.__ir) {
            this.__ir.freeze();
        }
        else {
            console.warn("Called 'freeze' method of unfreezable GraphNode.");
        }
    },
    "__set_graph_root" : function (root) {
        // Used to recursively set the "graph root" (scene graph
        // object) for all children of this object.
        please.graph_index[this.__id].root = root ? root.__id : null;
        var children = this.children;
        for (var i=0; i<children.length; i+=1) {
            children[i].__set_graph_root(root);
        }
        if (root) {
            root.__track(this);
        }
        this.__on_graphroot_changed();
    },
    "__world_matrix_driver" : function () {
        var parent = this.parent;
        var local_matrix = mat4.identity(this.__local_matrix_cache);
        mat4.fromRotationTranslation(
            local_matrix, this.quaternion, this.location);
        mat4.scale(local_matrix, local_matrix, this.scale);
        if (parent) {
            var world_matrix = mat4.identity(this.__world_matrix_cache);
            var parent_matrix = parent.shader.world_matrix;
            mat4.multiply(world_matrix, parent_matrix, local_matrix);
            world_matrix.dirty = true;
            return world_matrix;
        }
        else {
            local_matrix.dirty = true;
            return local_matrix;
        }
    },
    "__normal_matrix_driver" : function () {
        var normal_matrix = mat3.create();
        mat3.fromMat4(normal_matrix, this.shader.world_matrix);
        mat3.invert(normal_matrix, normal_matrix);
        mat3.transpose(normal_matrix, normal_matrix);
        normal_matrix.dirty = true;
        return normal_matrix;
    },
    "__world_coordinate_driver" : function () {
        return vec3.transformMat4(vec3.create(), vec3.create(), this.shader.world_matrix);
    },
    "__is_sprite_driver" : function () {
        return this.draw_type === "sprite";
    },
    "__is_transparent_driver" : function () {
        return this.sort_mode === "alpha";
    },
    "__billboard_driver" : function () {
        if (!this.billboard) {
            return 0;
        }
        else if (this.billboard === "tree") {
            return 1;
        }
        else if (this.billboard === "particle") {
            return 2;
        }
        else {
            throw new Error("Unknown billboard type: " + this.billboard);
        }
    },
    "__find_selection" : function () {
        if (this.selectable) {
            return this;
        }
        else {
            if (this.parent) {
                return this.parent.__find_selection();
            }
            else {
                return null;
            }
        }
    },
    "__z_sort_prep" : function (screen_matrix) {
        var matrix = mat4.multiply(
            mat4.create(), screen_matrix, this.shader.world_matrix);
        var position = vec3.transformMat4(vec3.create(), this.location, matrix);
        this.__z_depth = position[2];
    },
    "__z_sort_function" : function (lhs, rhs) {
        return rhs.__z_depth - lhs.__z_depth;
    },
#ifdef WEBGL
    "__bind" : function (prog) {
        // calls this.bind if applicable.
        if (this.__drawable && typeof(this.bind) === "function") {
            this.bind();
        }
    },
    "__draw" : function (prog) {
        // bind uniforms and textures, then call this.draw, if
        // applicable.  The binding code is set up to ignore redundant
        // binds, so as long as the calls are sorted, this extra
        // overhead should be insignificant.
        if (this.visible && this.__drawable && typeof(this.draw) === "function") {
            var prog = please.gl.get_program();

            // upload shader vars
            ITER_PROPS(name, prog.vars) {
                if (this.shader.hasOwnProperty(name)) {
                    var value = this.shader[name];
                    if (value !== null && value !== undefined) {
                        if (prog.samplers.hasOwnProperty(name)) {
                            prog.samplers[name] = value;
                        }
                        else {
                            prog.vars[name] = value;
                        }
                    }
                }
            }

            // draw this node
            this.draw();
            this.__last_vbo = please.gl.__last_vbo;
        }
    },
#endif
    // The bind function is called to set up the object's state.
    // Uniforms and textures are bound automatically.
    "bind" : null,
    // The draw function is called to draw the object.
    "draw" : null,
};


// [+] please.SceneGraph()
//
// Constructor function that creates an instance of the scene graph.
// The constructor accepts no arguments.  The graph must contain at
// least one camera to be renderable.  See CameraNode docstring for
// more details.
//
// The **.tick()** method on SceneGraph instances is called once per
// frame (multiple render passes may occur per frame), and is
// responsible for determining the world matricies for each object in
// the graph, caching the newest values of driver functions, and
// performs state sorting.  **While .tick() may be called manually, it
// is nolonger required as the draw call will do it automatically**.
//
// The **.draw()** method is responsible for invoking the .draw()
// methods of all of the nodes in the graph.  State sorted nodes will
// be invoked in the order determined by .tick, though the z-sorted
// nodes will need to be sorted on every draw call.  This method may
// called as many times as you like per frame.  Normally the usage of
// this will look something like the following example:
//
please.SceneGraph = function () {
    please.GraphNode.call(this);
    please.graph_index.roots.push(this);

    this.__bind = null;
    this.__draw = null;
    this.camera = null;
    this.__last_framestart = null;

    // Alpha blending and state sorted draw passes.
    this.__alpha = [];
    this.__states = {};

    // Rather than flattening the graph every frame, we keep a cache
    // of what the graph looks like and only update it when the graph
    // changes.
    this.__flat = [];
    this.__lights = [];
    this.__statics = [];
    var find_draw_group = function (node) {
        if (node.__is_light) {
            return this.__lights;
        }
        else if (node.__ir) {
            return this.__statics;
        }
        else {
            return this.__flat;
        }
    }.bind(this);
    this.__track = function (node) {
        var group = find_draw_group(node);
        if (group.indexOf(node) === -1) {
            group.push(node);
            if (group === this.__statics) {
                node.graph_root.__regen_static_draw();
            }
        }
    };
    this.__ignore = function (node) {
        var group = find_draw_group(node);
        var index = group.indexOf(node);
        if (index !== -1) {
            group.splice(index, 1);
            ITER(i, node.children) {
                this.__ignore(node.children[i]);
            }
            if (group === this.__statics) {
                node.graph_root.__regen_static_draw();
            }
        }
    };

    Object.defineProperty(this, "graph_root", {
        "configurable" : false,
        "writable" : false,
        "value" : this,
    });
    Object.defineProperty(this, "parent", {
        "configurable" : false,
        "writable" : false,
        "value" : null,
    });
    
#ifdef WEBGL
    this.__regen_static_draw = new please.Signal(this);
    
    var gl_tick = function () {
        this.__last_framestart = please.time.__framestart;

        // nodes in the z-sorting path
        this.__alpha = [];

        // nodes in the state-sorting path
        this.__states = {};

        // loop through the flat cache of the graph, assign object IDs
        // and sort nodes into their correct render pathways
        ITER(i, this.__flat) {
            var element = this.__flat[i];
            if (element.__drawable) {
                if (element.sort_mode === "alpha") {
                    this.__alpha.push(element);
                }
                else {
                    var hint = element.__asset_hint || "uknown_asset";
                    if (!this.__states[hint]) {
                        this.__states[hint] = [];
                    }
                    this.__states[hint].push(element);
                }
            }
            if (this.camera === null && element.__is_camera) {
                // if there is still no camera, just pick the first
                // thing found :P
                element.activate();
            }
        };
    };

    var gl_draw = function (exclude_test) {
        throw new Error("Use a RenderNode to draw the scene graph!");
    };
#endif
    
#ifdef DOM
    var dom_draw = function () {
        if (this.__last_framestart < please.time.__framestart) {
            // note, this.__last_framestart can be null, but
            // null<positive_number will evaluate to true anyway.
            this.__last_framestart = please.time.__framestart;
        }
        if (this.camera) {
            this.camera.update_camera();
        }
    };
#endif

    if (please.renderer.name == "gl") {
        this.tick = gl_tick;
        this.draw = gl_draw;
    }
    else if (please.renderer.name == "dom") {
        this.draw = dom_draw;
    }
};
please.SceneGraph.prototype = Object.create(please.GraphNode.prototype);


// Special event dispatcher for SceneGraphs
please.SceneGraph.prototype.dispatch = function (event_name, event_info) {
    // call the dispatcher logic inherited from GraphNode first
    var inherited_dispatch = please.GraphNode.prototype.dispatch;
    inherited_dispatch.call(this, event_name, event_info);

    // determine if a click or double click event has happened
    if (event_info.selected) {
        var picking = please.picking.__etc;
        var event_type = event_info.trigger.event.type;
        if (event_type === "mousedown") {
            // set the click counter
            picking.click_test = event_info.selected;
        }
        else if (event_type === "mouseup") {
            if (picking.click_test === event_info.selected) {
                // single click
                event_info.selected.dispatch("click", event_info);
                inherited_dispatch.call(this, "click", event_info);
                
                if (picking.last_click === event_info.selected) {
                    // double click
                    picking.set_click_counter(null);
                    event_info.selected.dispatch("doubleclick", event_info);
                    inherited_dispatch.call(this, "doubleclick", event_info);
                }
                else {
                    // double click pending
                    picking.set_click_counter(event_info.selected);
                }
            }
            else {
                // clear double click counter
                picking.set_click_counter(null);
            }
            // clear the click test counter
            picking.click_test = null;
        }
    }
};
