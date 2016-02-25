// - m.staticdraw.js ----------------------------------------------------- //

/* [+]
 * 
 * This part of M.GRL implements the StaticDrawNode functionality.
 * Static nodes are used to freeze instanced assets into a singular
 * object which can be drawn with only a few GL calls and no special
 * processing.
 *
 * Where GraphNodes are useful for applying dynamic behavior to a
 * small number of objects, StaticDrawNodes are intended to allow
 * large numbers of objects to be rendered as quickly as possible.
 * 
 */

/* [+] please.StaticDrawNode(graph_node)
 * 
 * Create a static draw node from a graph node and its children.
 * 
 */
please.StaticDrawNode = function (graph_node) {
    please.GraphNode.call(this);
    this.__is_static_draw_node = true;
    this.__drawable = true;

    // generate data like ranges and uniforms per object in the graph,
    // sort into texture groups
    var flattened = this.__flatten_graph(graph_node);
    flattened.cache_keys.sort();

    // uniform vars that remain constant accross the entire group are
    // set as the defaults for this resulting object's shader object
    ITER_PROPS(name, flattened.uniforms.universal) {
        this.shader[name] = flattened.uniforms.universal[name];
    }

    // reorganize the objects within texture groups to attempt to
    // minimize uniform state changes
    this.__uniform_sort(flattened);

    this.__setup_instancing(flattened);

    // generate the draw callback
    this.draw = this.__generate_draw_callback(flattened);
};
please.StaticDrawNode.prototype = Object.create(please.GraphNode.prototype);


//
// Generate a branchless draw function for the static draw set.
//
please.StaticDrawNode.prototype.__generate_draw_callback = function (flat) {
    var prog = please.gl.get_program();
    var calls = [
        "var prog = please.gl.__cache.current;",
        "prog.vars.instanced_drawing = false;",
    ];

    var last_buffer = null;
    var last_state = {};
    var UNASSIGNED = {};
    ITER(i, flat.uniforms.dynamic) {
        var name = flat.uniforms.dynamic[i];
        // can't just use null here because that is a valid value to upload
        last_state[name] = UNASSIGNED;
    }
    
    ITER(ki, flat.cache_keys) {
        var key = flat.cache_keys[ki];
        var buffer = flat.mesh_bindings[key];
        var add_draw_command;
        if (buffer !== last_buffer) {
            calls.push(buffer.vbo.static_bind);
            if (buffer.ibo) {
                calls.push(buffer.ibo.static_bind);
                add_draw_command = function (chunk) {
                    if (chunk.draw_params) {
                        ITER(p, chunk.draw_params) {
                            var param_set = chunk.draw_params[p];
                            calls.push(
                                buffer.ibo.static_draw.apply(null, param_set));
                        }
                    }
                    else {
                        calls.push(buffer.ibo.static_draw());
                    }
                };
            }
            else {
                add_draw_command = function () {
                    calls.push(buffer.vbo.static_draw);
                };
            }
            last_buffer = buffer;
        }
        
        var samplers = flat.sampler_bindings[key];
        ITER_PROPS(var_name, samplers) {
            var uri = samplers[var_name];
            if (uri) {
                calls.push("prog.samplers['"+var_name+"'] = '"+uri+"';");
            }
        }

        var add_state_change = function (name, value) {
            var out;
            var type = value.constructor.name;
            if (type === "Array") {
                out = "[" + value.toString() + "]";
            }
            else if (type.indexOf("Array") !== -1) {
                // object is a typed array
                var data = "[" + Array.apply(null, value).toString() + "]";
                out = "new "+type+"(" + data + ")";
            }
            else {
                // object probably doesn't need any fancy processing
                out = value;
            }
            calls.push("prog.vars['"+name+"'] = " + out + ";");
        };

        
        if (flat.instance_groups[key]) {
            calls.push(flat.instance_groups[key]);
        }
        else {
            var draw_set = flat.groups[key];
            ITER(d, draw_set) {
                var chunk = draw_set[d];

                var changed = [];
                ITER(i, flat.uniforms.dynamic) {
                    var name = flat.uniforms.dynamic[i];
                    var old_value = last_state[name];
                    var new_value = chunk.uniforms[name];
                    if (new_value !== old_value) {
                        changed.push(name);
                    }
                }
                ITER(i, changed) {
                    var name = changed[i];
                    var value = chunk.uniforms[name];
                    add_state_change(name, value);
                    last_state[name] = value;
                }
                add_draw_command(chunk);
            }
        }
    }

    var src = calls.join("\n");
    try {
        return new Function(src);
    }
    catch (error) {
        console.error("FAILED TO BUILD STATIC DRAW FUNCTION");
        throw error;
    }
};


//
//  
//
please.StaticDrawNode.prototype.__setup_instancing = function (flat) {
    var prog = please.gl.get_program();
    flat.instance_groups = {};
    ITER(ki, flat.cache_keys) {
        var key = flat.cache_keys[ki];
        var draw_set = flat.groups[key];
        var geometry = flat.mesh_bindings[key];

        var attr_names = [
            "world_matrix_a",
            "world_matrix_b",
            "world_matrix_c",
            "world_matrix_d"
        ];
            
        var attrs = {};
        ITER(a, attr_names) {
            attrs[attr_names[a]] = new Float32Array(draw_set.length * 4);
        }

        var offset = 0;
        var populate = function (matrix) {
            var parts = [
                matrix.slice(0,4),
                matrix.slice(4,8),
                matrix.slice(8,12),
                matrix.slice(12,16)];
            for (var i=0; i<4; i+=1) {
                var view = attrs[attr_names[i]].subarray(offset*4);
                for (var m=0; m<4; m+=1) {
                    view[m] = parts[i][m];
                }
            }
            offset += 1;
        };
        
        ITER(d, draw_set) {
            var chunk = draw_set[d];
            populate(chunk.world_matrix);
        }

        // buffer object for our instancing attributes
        var buffer = please.gl.vbo(draw_set.length, attrs);
        buffer.generate_static_bindings(prog);

        // generate calls needed to draw the instanced objects
        var calls = [];
        calls.push("prog.vars.instanced_drawing = true;");
        var draw_params = draw_set[0].draw_params;

        // bind call
        calls.push(buffer.static_instance_bind);

        // draw calls
        ITER(p, draw_params) {
            var params = draw_params[p];
            params.push(draw_set.length); // add 'instances' arg
            calls.push(geometry.ibo.static_draw.apply(null, params));
        }
        calls.push("prog.vars.instanced_drawing = false;");
        var draw_command = calls.join("\n");
        flat.instance_groups[key] = draw_command;
    }
};


//
//  Sort the objects within the flattened graph's texture groups to
//  attempt to minimize uniform state changes.
//
please.StaticDrawNode.prototype.__uniform_sort = function (flat) {
    var UNASSIGNED = new (function UNASSIGNED () {});
    ITER(ki, flat.cache_keys) {
        var key = flat.cache_keys[ki];
        var draw_set = flat.groups[key];

        // a simple comparison function to be used by the larger
        // comparison function below
        var simple_cmp = function (lhs, rhs) {
            if (lhs < rhs) {
                return -1;
            }
            else if (lhs > rhs) {
                return 1;
            }
            else {
                return 0;
            }
        };

        // attempt to lower the number of state changes by sorting the
        // objects in the texture group by their uniform values
        draw_set.sort(function (lhs, rhs) {
            ITER(i, flat.uniforms.dynamic) {
                var name = flat.uniforms.dynamic[i];
                var a = lhs.uniforms[name];
                var b = rhs.uniforms[name];
                DEFAULT(a, UNASSIGNED);
                DEFAULT(b, UNASSIGNED);
                var type = a.constructor;
                var ret = 0;
                
                if (a.constructor !== b.constructor) {
                    // lexical sort on constructor name when the two
                    // objects aren't the same type
                    ret = simple_cmp(a.constructor.name, a.constructor.name);
                }
                else if (type.name == "Array") {
                    // lexical sort of coerced string values for arrays
                    ret = simple_cmp(a.toSource(), b.toSource());
                }
                else if (type.name.indexOf("Array") !== -1) {
                    // lexical sort of coerced string values for typed arrays
                    ret = simple_cmp(
                        please.array_hash(a),
                        please.array_hash(b));
                }
                else {
                    // value sort for numbers, lexical for strings
                    ret = simple_cmp(a, b);
                }
                
                if (ret == 0) {
                    // if the two values come up equal, compaire the
                    // next uniform
                    continue;
                }
                else {
                    return ret;
                }
            }
        });
    }
};


//
//  Take a graph node and it's children, freeze the values for shader
//  variables, generate mesh data with world matrix applied, and sort
//  into texture groups.
//
please.StaticDrawNode.prototype.__flatten_graph = function (graph_node) {
    var prog = please.gl.get_program();
    var samplers = prog.sampler_list;
    var uniforms = [];

    var ignore = [
        "projection_matrix",
        "normal_matrix",
        "world_matrix",
        "view_matrix",
        "instanced_drawing",
    ];
    
    ITER(i, prog.uniform_list) {
        var test = prog.uniform_list[i];
        if (samplers.indexOf(test) == -1 && ignore.indexOf(test) == -1 && !test.startsWith("mgrl_")) {
            uniforms.push(test);
        }
    }

    // Uniform delta tracks how often a uniform is changed for each
    // draw.  Uniform states tracks how many unique states the uniform
    // has.
    var uniform_delta = {};
    var uniform_states = {};
    ITER(i, uniforms) {
        var name = uniforms[i];
        uniform_delta[name] = 0;
        uniform_states[name] = [];
    }

    var groups = {}; // texture/buffer groups -> list of drawables
    var buffers = {}; // buffer key -> vbo/ibo geometry buffer
    var cache_keys = []; // list of texture/buffer cache keys
    var mesh_bindings = {}; // texture/buffer -> vbo/ibo geometry buffer
    var sampler_bindings = {}; // texture/buffer -> sampler name -> uri
    var array_store = {}; // used to coerce identical arrays to same object

    var is_array = function (obj) {
        try {
            return obj.constructor.name.indexOf("Array") !== -1;
        } catch (err) {
            return false;
        }
    };
    
    graph_node.propogate(function (inspect) {
        if (inspect.__is_static_draw_node) {
            throw new Error(
                "Static Draw Nodes cannot be made from other Static Draw Nodes");
        }
        if (inspect.__drawable && inspect.visible) {
            var chunk = {
                "uniforms" : {},
                "world_matrix" : inspect.shader.world_matrix,
                "draw_params" : null, // this should be stored elsewhere
            };
            if (inspect.__draw_params) {
                var params = inspect.__draw_params();
                if (params.length > 0) {
                    chunk.draw_params = params;
                }
            }

            // generate the code needed to bind the arrays for this object
            inspect.__buffers.vbo.generate_static_bindings(prog);

            // uniform stats / uniform delta stuff
            ITER(i, uniforms) {
                var name = uniforms[i];
                var value = inspect.shader[name];

                // This will coerce all identical arrays to be the
                // same object, so that anything based on indexOf or
                // tests for equality should work correctly.
                if (is_array(value)) {
                    var hash = please.array_hash(value, 4);
                    if (!array_store[hash]) {
                        array_store[hash] = value;
                    }
                    else {
                        value = array_store[hash];
                    }
                }
                
                chunk.uniforms[name] = value;

                if (uniform_states[name].indexOf(value) == -1) {
                    uniform_states[name].push(value);
                    uniform_delta[name] += 1;
                }
            }

            // create a cache key for the corresponding buffer object
            var buffer_key = "vbo" + inspect.__buffers.vbo.buffer_index;
            if (!buffers[buffer_key]) {
                buffers[buffer_key] = inspect.__buffers;
            }

            // create a cache key from sampler settings to determine
            // which texture group this object belongs in
            var cache_key = [buffer_key + "::"];
            ITER(i, samplers) {
                var name = samplers[i];
                var uri = inspect.shader[name];
                if (uri) {
                    cache_key.push(uri);
                }
            }
            var delim = String.fromCharCode(29);
            cache_key = cache_key.join(delim);

            // create a new cache group if necessary and populate the
            // sampler settings for that group
            if (!groups[cache_key]) {
                groups[cache_key] = [];
                mesh_bindings[cache_key] = buffers[buffer_key];
                sampler_bindings[cache_key] = {};
                cache_keys.push(cache_key);
                ITER(i, samplers) {
                    var name = samplers[i];
                    var uri = inspect.shader[name];
                    sampler_bindings[cache_key][name] = uri;
                }
            }

            // add the object to a texture group
            groups[cache_key].push(chunk);
        }
    }.bind(this));

    // these variables keep track of which uniform variables change
    // many times when the graph is drawn vs which only are set once
    var dynamic_uniforms = [];
    var universal_uniforms = {};
    ITER(i, uniforms) {
        var name = uniforms[i];
        var delta = uniform_delta[name];
        if (delta > 1) {
            dynamic_uniforms.push(name);
        }
        else if (delta == 1) {
            universal_uniforms[name] = uniform_states[name][0];
        }
    }

    return {
        "groups" : groups,
        "cache_keys" : cache_keys,
        "mesh_bindings" : mesh_bindings,
        "sampler_bindings" : sampler_bindings,
        "uniforms" : {
            "delta" : uniform_delta,
            "dynamic" : dynamic_uniforms,
            "universal" : universal_uniforms,
        },
    };
};


//
//  Apply a world matrix to an array of vertex positions.
//
please.StaticDrawNode.prototype.__apply_matrix = function (mesh_data, matrix) {
    var old_coords = mesh_data.position;
    var new_coords = new Float32Array(old_coords.length);
  
    RANGE(i, mesh_data.__vertex_count) {
        var seek = i*3;
        var view = new_coords.subarray(seek, seek+3);
        var coord = old_coords.subarray(seek, seek+3);
        vec3.transformMat4(view, coord, matrix);
    };
    
    mesh_data.position = new_coords;
    return mesh_data;
};