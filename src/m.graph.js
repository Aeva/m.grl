// - m.graph.js ---------------------------------------------------------- //


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
    this.__cache = null;
    this.__asset = null;
    this.__asset_hint = "";
    this.sort_mode = "solid"; // can be set to "alpha"
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
        if (this.visible) {
            if (this.__drawable && typeof(this.draw) === "function") {
                ITER_PROPS(name, self.__cache.uniforms) {
                    prog.vars[name] = self.__cache.uniforms[name];
                }
                ITER_PROPS(name, self.__cache.samplers) {
                    prog.samplers[name] = self.__cache.samplers[name];
                }
                prog.vars["world_matrix"] = self.__cache.world_matrix;
                prog.vars["normal_matrix"] = self.__cache.normal_matrix;
                this.draw();
            }
        }
    },
    // The bind function is called to set up the object's state.
    // Uniforms and textures are bound automatically.
    "bind" : null,
    // The draw function is called to draw the object.
    "draw" : null,
};


// Namespace for scene graph guts
please.SceneGraph = function () {
    if (this === please) {
        return new please.SceneGraph();
    }
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
please.SceneGraph.prototype = new please.GraphNode();


// Camera object for perspective projection
please.PerspectiveCamera = function (canvas, fov, near, far) {
    this.__canvas = canvas;
    this.__width = null;
    this.__height = null;
    this.__fov = please.is_number(fov)?fov:45;
    this.__near = please.is_number(near)?near:0.1;
    this.__far = please.is_number(far)?far:100.0;
    this.look_at = vec3.fromValues(0, 0, 0);
    this.location = vec3.fromValues(0, -10, 10);
    this.up_vector = vec3.fromValues(0, 0, 1);
    this.projection_matrix = mat4.create();
    this.view_matrix = mat4.create();

    this.update_camera = function () {
        // Recalculate the projection matrix, if necessary
        if (this.__width !== this.__canvas.width && this.__height !== this.__canvas.height) {
            this.__width = this.__canvas.width;
            this.__height = this.__canvas.height;
            mat4.perspective(
                this.projection_matrix, this.__fov, 
                this.__width / this.__height, this.__near, this.__far);
        }

        // Calculate the look_at vector, if necessary
        var look_at = null;
        if (this.look_at.length === 3) {
            look_at = this.look_at;
        }
        else if (this.look_at.__cache && this.look_at.__cache.xyz) {    
            look_at = this.look_at.__cache.xyz;
        }

        // Calculate the location vector, if necessary
        var location = null;
        if (this.location.length === 3) {
            location = this.location;
        }
        if (typeof(this.location) === "function") {
            location = this.location();
        }

        // Calculate the up vector, if necessary
        var up_vector = null;
        if (this.up_vector.length === 3) {
            up_vector = this.up_vector;
        }
        if (typeof(this.up_vector) === "function") {
            up_vector = this.up_vector();
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
