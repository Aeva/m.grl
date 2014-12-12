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
 * object's "x" coordinate to be a value like "10", or you could set
 * it to be a function that returns a numerical value like "10".  This
 * can be used to perform animation tasks.  When a function is
 * assigned to a property in such a fashion, it is called a "driver
 * function".
 *
 * Note that, being a scene graph, objects can be parented to other
 * objects.  When the parent moves, the child moves with it!  Empty
 * graph objects can be used to influence objects that draw.  Between
 * empties, inheritance, and driver functions, you are given the tools
 * to implement animations without requiring vertex deformation.
 *
 * Camera objects have a mechanism similar to driver functions,
 * wherein they can either take a coordinate tripple [1,2,3], a
 * function that returns a coordinate tripple, or a graph object.
 *
 * ```
 * // A scene graph instance
 * var scene_graph = new please.SceneGraph();
 *
 * // A drawable graph node.  You can instance gani and image files, too!
 * var character_model = please.access("alice.jta").instance();
 * character_model.rotate_z = function () { return performance.now()/500; };
 * 
 * // The focal point of the camera
 * var camera_target = new please.GraphNode();
 * camera_target.z = 2;
 * 
 * // An empty that has the previous two graph nodes as its children
 * // The game logic would move this node.
 * var character_base = new please.GraphNode();
 *
 * // Populate the graph
 * scene_graph.add(character_base);
 * character_base.add(character_model);
 * character_base.add(camera_target);
 *
 * // Add a camera object that automatically points at particular
 * // graph node.
 * var camera = new please.PerspectiveCamera(canvas_element);
 * camera.look_at = camera_target;
 * camera.location = vec3.formValues(10, -10, 10);
 * scene_graph.camera = camera;
 *
 * // Register a render pass with the scheduler (see m.multipass.js)
 * please.pipeline.add(10, "graph_demo/draw", function () {
 *    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
 *
 *    // this line needs to be called once per frame, before drawing.
 *    scene_graph.tick();
 *
 *    // this line may be called repeatedly to draw the current
 *    // snapshot of the graph multiple times the same way.
 *    scene_graph.draw();
 *
 * });
 *
 * // Register a second render pass that will also draw the scene_graph
 * please.pipeline.add(20, "graph_demo/fancy", function () {
 *
 *    // .tick() will have been called by the previous pipeline stage,
 *    // so you shouldn't call it again.  You can, however, call
 *    // .draw() as many times as you like per frame.  Both of these
 *    // pipeline stages are in the same "frame".  You can take
 *    // advantage of this to do post processing effects with the
 *    // stencil buffer, shaders, and/or indirect rendering targets!
 *
 *    scene_graph.draw();
 *
 * });
 *
 * // Start the render loop
 * please.pipeline.start();
 * ```
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
// var empty.rotate_x = 10;
// var empty.rotate_x = fuction() { return performance.now()/500; };
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
//  - **x**, **y**, **z** Used to generate the node's local matrix.
//
//  - **rotate_x**, **rotate_y**, **rotate_z** Used to generate the
//    node's local matrix.
//  
//  - **scale_x**, **scale_y**, **scale_z** Used to generate the
//    node's local matrix.
//
//  - **alpha** A numerical value between 0.0 and 1.0.  Indicates
//    alpha belnding value to be used by the GLSL shader.  In the
//    future, setting this to 1.0 will put it in the state-sorting
//    draw path, and setting it less than 1.0 will put it in the
//    z-sorting draw path.  State sorting is more efficient, but
//    z-sorting is needed to do alpha blending effects.
//
//  - **visible** Defaults to true.  May be set to false to prevent
//    the node and its children from being drawn.
//
//  - **priority** Defaults to 100. Determine the order in which all
//    of the drivers are evaluated and cached.  Set it lower if you
//    want a node to be evaluated before other nodes.
//
//  - **sort_mode** Defaults to "solid", but may be set to "alpha" to
//    force the object to use the z-sorting path instead of state
//    sorting.  This is generally slower, but is needed if for partial
//    transparency from a texture to work correctly.
//
//  - **draw_type** defaults to "model", but may be set to "sprite".
//    At the time of writing this doc, I am unsure if it is actually
//    in use for anything.  Might be deprecated.
//
//  - **z_bias** defaults to 0, unused, so might be deprecated.
//
// Additionally, each GraphNode has several objects used to set GLSL
// variables:
//
//  - **vars** - The property names on the *vars* object correspond to
//    uniform variables on the shader program, and will be set
//    automatically.  The infrastructure that does this automatically
//    prevents redundant state change calls so do not worry about
//    that.  The properties on the vars object may have driver methods
//    assigned to them.
//
//  - **ext** - Works exactly like vars, except it doesn't do anything
//    to the GL state.  Useful for storing custom data that might be
//    referenced elsewhere.
//
//  - **samplers** - The property names of the *samplers* object
//    correspond to the sampler variables on the shader program, and
//    will be set automatically.  You simply assign them the uri of an
//    image asset that was loaded by m.media's machinery, and you are
//    good to go!  M.GRL will take care of texture uploading
//    automatically.  This object also accepts driver methods.
//
// If you want to create your own special GraphNodes, be sure to set
// the following variables in your constructor to ensure they are
// unique to each instance.
//
// ```
// var FancyNode = function () {
//     this.children = [];
//     this.ext = {};
//     this.vars = {};
//     this.samplers = {};
// };
// FancyNode.prototype = new please.GraphNode();
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
please.GraphNode = function () {
    if (this === please) {
        return new please.GraphNode();
    }
    this.children = [];
    this.visible = true;
    this.ext = {};
    this.vars = {};
    this.samplers = {};
    this.x = 0;
    this.y = 0;
    this.z = 0;
    this.rotate_x = 0;
    this.rotate_y = 0;
    this.rotate_z = 0;
    this.scale_x = 1;
    this.scale_y = 1;
    this.scale_z = 1;
    this.alpha = 1.0;
    this.__cache = null;
    this.__asset = null;
    this.__asset_hint = "";
    this.draw_type = "model"; // can be set to "sprite"
    this.sort_mode = "solid"; // can be set to "alpha"
    this.z_bias = 0; // used for the "alpha" sort pass as a tie breaker
    this.__drawable = false; // set to true to call .bind and .draw functions
    this.__unlink = false; // set to true to tell parents to remove this child
    this.priority = 100; // lower means the driver functions are called sooner
};
please.GraphNode.prototype = {
    "has_child" : function (entity) {
        // Return true or false whether or not this graph node claims
        // the given entity as a child.
        return this.children.indexOf[entity] !== -1;
    },
    "add" : function (entity) {
        // Add the given entity to this object's children.
        this.children.push(entity);
    },
    "remove" : function (entity) {
        //  Remove the given entity from this object's children.
        if (this.has_child(entity)) {
            this.children.splice(this.children.indexOf(entity),1);
        }
    },
    "__flatten" : function () {
        // return the list of all decendents to this object;
        var found = [];
        if (this.visible) {
            for (var i=0; i<this.children.length; i+=1) {
                var child = this.children[i];
                if (child.__unlink) {
                    this.remove(child);
                    continue;
                }
                var tmp = child.__flatten();
                found.push(child);
                found = found.concat(tmp);
            }
        }
        return found;
    },
    "__hoist" : function (parent_matrix, cache) {
        // This recalculates the world and normal matrices for each
        // element in the tree, and also copies other cache entries
        // for uniforms and samplers from parent to child if the child
        // does not define its own.

        if (cache) {
            // copy uniforms into child
            ITER_PROPS(uniform_name, cache.uniforms) {
                if (!this.__cache.uniforms.hasOwnProperty(uniform_name)) {
                    this.__cache.uniforms[uniform_name] = cache.uniforms[uniform_name];
                }
            }
            // copy samplers into child
            ITER_PROPS(sampler_name, cache.sampler) {
                if (!this.__cache.samplers.hasOwnProperty(sampler_name)) {
                    this.__cache.samplers[sampler_name] = cache.samplers[sampler_name];
                }
            }
        }

        // generate this entity's world matrix
        this.__cache.world_matrix = mat4.create();
        var local_matrix = mat4.create();
        mat4.translate(local_matrix, local_matrix, this.__cache.xyz);
        mat4.rotateX(local_matrix, local_matrix, this.__cache.rotate[0]);
        mat4.rotateY(local_matrix, local_matrix, this.__cache.rotate[1]);
        mat4.rotateZ(local_matrix, local_matrix, this.__cache.rotate[2]);
        mat4.scale(local_matrix, local_matrix, this.__cache.scale);
        mat4.multiply(
            this.__cache.world_matrix, parent_matrix, local_matrix);
        for (var i=0; i<this.children.length; i+=1) {
            this.children[i].__hoist(this.__cache.world_matrix, this.__cache);
        }

        // generate this entity's normal matrix
        if (this.__drawable) {
            var normal_matrix = mat3.create();
            mat3.fromMat4(normal_matrix, this.__cache.world_matrix);
            mat3.invert(normal_matrix, normal_matrix);
            mat3.transpose(normal_matrix, normal_matrix);
            this.__cache.normal_matrix = normal_matrix;
        }
    },
    "__z_sort_prep" : function (screen_matrix) {
        var matrix = mat4.multiply(
            mat4.create(), screen_matrix, this.__cache.world_matrix);
        var position = vec3.transformMat4(vec3.create(), this.__cache.xyz, matrix);
        // I guess we want the Y and not the Z value?
        this.__cache.final_depth = position[1];
        
    },
    "__rig" : function () {
        // cache the values of this object's driver functions.
        var self = this;
        this.__cache = {
            "uniforms" : {},
            "samplers" : {},
            "xyz" : null,
            "rotate" : null,
            "scale" : null,
            "world_matrix" : null,
            "normal_matrix" : null,
            "final_transform" : null,
            "final_depth" : 0,
        };

        this.__cache.xyz = vec3.fromValues(
            DRIVER(self, this.x),
            DRIVER(self, this.y),
            DRIVER(self, this.z)
        );
        this.__cache.rotate = vec3.fromValues(
            DRIVER(self, this.rotate_x),
            DRIVER(self, this.rotate_y),
            DRIVER(self, this.rotate_z)
        );
        this.__cache.scale = vec3.fromValues(
            DRIVER(self, this.scale_x),
            DRIVER(self, this.scale_y),
            DRIVER(self, this.scale_z)
        );
        
        please.prop_map(self.ext, function (name, value) {
            DRIVER(self, value);
        });
        please.prop_map(self.vars, function (name, value) {
            self.__cache["uniforms"][name] = DRIVER(self, value);
        });
        please.prop_map(self.samplers, function (name, value) {
            self.__cache["samplers"][name] = DRIVER(self, value);
        });
    },
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
        var self = this;
        if (this.visible && this.__drawable && typeof(this.draw) === "function") {
            ITER_PROPS(name, self.__cache.uniforms) {
                prog.vars[name] = self.__cache.uniforms[name];
            }
            ITER_PROPS(name, self.__cache.samplers) {
                prog.samplers[name] = self.__cache.samplers[name];
            }
            prog.vars["world_matrix"] = self.__cache.world_matrix;
            prog.vars["normal_matrix"] = self.__cache.normal_matrix;

            // FIXME: these should both be bools
            prog.vars["is_sprite"] = self.draw_type==="sprite";
            prog.vars["is_transparent"] = self.sort_mode==="alpha";

            if (self.sort_mode === "alpha") {
                prog.vars["alpha"] = self.alpha;
            }
            else {
                prog.vars["alpha"] = 1.0;
            }

            this.draw();
        }
    },
    // The bind function is called to set up the object's state.
    // Uniforms and textures are bound automatically.
    "bind" : null,
    // The draw function is called to draw the object.
    "draw" : null,
};


// [+] please.SceneGraph()
//
// Constructor function.
//
please.SceneGraph = function () {
    if (this === please) {
        return new please.SceneGraph();
    }
    please.GraphNode.call(this)

    this.__rig = null;
    this.__bind = null;
    this.__draw = null;
    this.__flat = [];
    this.__alpha = [];
    this.__states = {};
    this.camera = null;
    this.local_matrix = mat4.create();

    var tick_sort_function = function (lhs, rhs) {
        // sort object list by priority;
        return lhs.priority - rhs.priority;
    };

    var z_sort_function = function (lhs, rhs) {
        return rhs.__cache.final_depth - lhs.__cache.final_depth;
    };

    this.tick = function () {
        this.__flat = this.__flatten();
        this.__flat.sort(tick_sort_function);

        this.__alpha = [];
        this.__states = {};
        ITER(i, this.__flat) {
            var element = this.__flat[i];
            element.__rig();
            if (element.__drawable) {
                if (element.sort_mode === "alpha") {
                    this.__alpha.push(element);
                }
                else {
                    var hint = element.__asset_hint ? element.__asset_hint : "uknown_asset";
                    if (!this.__states[hint]) {
                        this.__states[hint] = [];
                    }
                    this.__states[hint].push(element);
                }
            }
        };

        // update the matricies of objects in the tree
        ITER(i, this.children) {
            var child = this.children[i];
            child.__hoist(this.local_matrix);
        }
    };

    this.draw = function () {
        var prog = please.gl.get_program();
        if (this.camera) {
            this.camera.update_camera();
            prog.vars.projection_matrix = this.camera.projection_matrix;
            prog.vars.view_matrix = this.camera.view_matrix;
        }
        if (this.__states) {
            ITER_PROPS(hint, this.__states) {
                var children = this.__states[hint];
                ITER(i, children) {
                    var child = children[i];
                    child.__bind(prog);
                    child.__draw(prog);
                }
            }
        }
        if (this.__alpha) {
            // sort the transparent items by z
            var screen_matrix = mat4.multiply(
                mat4.create(), 
                this.camera.projection_matrix,
                this.camera.view_matrix);
            ITER(i, this.__alpha) {
                var child = this.__alpha[i];
                child.__z_sort_prep(screen_matrix);
            };
            this.__alpha.sort(z_sort_function);

            // draw translucent elements
            ITER(i, this.__alpha) {
                var child = this.__alpha[i];
                child.__bind(prog);
                child.__draw(prog);
            }
        }
    };
};
please.SceneGraph.prototype = Object.create(please.GraphNode.prototype);


// [+] please.PerspectiveCamera(canvas, fov, near, far)
//
// Constructor function.  Camera object for perspective projection.
//
please.PerspectiveCamera = function (canvas, fov, near, far) {
    this.__canvas = canvas;
    this.__width = null;
    this.__height = null;
    this.use_canvas_dimensions = true;
    this.__fov = please.is_number(fov)?fov:45;
    this.__near = please.is_number(near)?near:0.1;
    this.__far = please.is_number(far)?far:100.0;
    this.look_at = vec3.fromValues(0, 0, 0);
    this.location = vec3.fromValues(0, -10, 10);
    this.up_vector = vec3.fromValues(0, 0, 1);
    this.projection_matrix = mat4.create();
    this.view_matrix = mat4.create();

    var self = this;
    var update_perspective = function () {
        mat4.perspective(
            self.projection_matrix, self.__fov, 
            self.__width / self.__height, self.__near, self.__far);
    };

    Object.defineProperty(this, "width", {
        get : function () {
            return this.__width;
        },
        set : function (val) {
            if (!this.use_canvas_dimensions) {
                this.__width = val;
                update_perspective();
            }
            return this.__width;
        },
    });

    Object.defineProperty(this, "height", {
        get : function () {
            return this.__height;
        },
        set : function (val) {
            if (!this.use_canvas_dimensions) {
                this.__height = val;
                update_perspective();
            }
            return this.__height;
        },
    });

    this.update_camera = function () {
        // Recalculate the projection matrix, if necessary
        if (this.use_canvas_dimensions && this.__width !== this.__canvas.width && this.__height !== this.__canvas.height) {
            this.__width = this.__canvas.width;
            this.__height = this.__canvas.height;
            update_perspective();
        }

        // Calculate the look_at vector, if necessary
        var look_at = DRIVER(this, this.look_at);
        if (look_at.__cache && look_at.__cache.xyz) {    
            look_at = look_at.__cache.xyz;
        }
        if (look_at.length !== 3) {
            look_at = null;
        }

        // Calculate the location vector, if necessary
        var location = DRIVER(this, this.location);
        if (location.__cache && location.__cache.xyz) {    
            location = location.__cache.xyz;
        }
        if (location.length !== 3) {
            location = null;
        }

        // Calculate the location vector, if necessary
        var up_vector = DRIVER(this, this.up_vector);
        if (up_vector.__cache && up_vector.__cache.xyz) {    
            up_vector = up_vector.__cache.xyz;
        }
        if (up_vector.length !== 3) {
            up_vector = null;
        }

        mat4.lookAt(
            this.view_matrix,
            location,
            look_at,
            up_vector);

        // Mark both matricies as dirty updates
        this.projection_matrix.dirty = true;
        this.view_matrix.dirty = true;
    };
};
