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
    this.__drawable = true;

    var flattened = this.__flatten_graph(graph_node);
    flattened.cache_keys.sort();

    // generate the static vbo
    var vbo = this.__combine_vbos(flattened);
    this.__static_vbo = vbo;

    // generate the draw callback
    this.draw = this.__generate_draw_callback(flattened);
};
please.StaticDrawNode.prototype = Object.create(please.GraphNode.prototype);


//
// Generate a branchless draw function for the static draw set.
//
please.StaticDrawNode.prototype.__generate_draw_callback = function (flat) {
    //flat.sampler_bindings[flat.cache_keys[0]
    var calls = [
        "if (!this.visible) { return; }",
        "var prog = please.gl.get_program();",
//        "prog.vars.world_matrix = this.shader.world_matrix",
        "this.__static_vbo.bind();",
    ];
    
    ITER(ki, flat.cache_keys) {
        var key = flat.cache_keys[ki];
        var samplers = flat.sampler_bindings[key];
        ITER_PROPS(var_name, samplers) {
            calls.push("prog.samplers['"+var_name+"'] = '"+samplers[var_name]+"';");
            // TODO: also upload uniform values
            // TODO: draw the range for this texture group
        }
    }

    // wrong
    calls.push("gl.drawArrays(gl.TRIANGLES, 0, " + this.__static_vbo.reference.size +")");

    var src = calls.join("\n");
    return new Function(src);
};


//
//  Generate the new vertex buffer object
//
please.StaticDrawNode.prototype.__combine_vbos = function (flat) {
    var all_attrs = {}; // a map from attribute names to expected data type
    var total_vertices = 0;

    // determine all attribute names needed for the new vbo
    ITER(ki, flat.cache_keys) {
        var key = flat.cache_keys[ki];
        var nodes = flat.groups[key];
        ITER(n, nodes) {
            var node_attrs = nodes[n].data;
            var node_types = node_attrs.__types;
            var vertex_count = node_attrs.__vertex_count;
            total_vertices += vertex_count;
            ITER_PROPS(attr, node_attrs) {
                if (!attr.startsWith("__")) {
                    var type_size = node_types[attr];
                    if (!all_attrs[attr]) {
                        all_attrs[attr] = type_size;
                    }
                    else if (all_attrs[attr] !== type_size) {
                        var message = "Mismatched attribute array data types.";
                        message += "  Cannot build static scene.";
                        throw new Error(message);
                    }
                }
            }
        }
    }

    // build the empty arrays
    var attr_data = {}; // the data for the vbo
    ITER_PROPS(attr, all_attrs) {
        attr_data[attr] = new Float32Array(total_vertices * all_attrs[attr]);
    }

    // loop over the mesh data objects and concatinate them together
    // into one array
    var offset = 0;
    ITER(ki, flat.cache_keys) {
        var key = flat.cache_keys[ki];
        var nodes = flat.groups[key];
        ITER(n, nodes) {
            var node_attrs = nodes[n].data;
            var vertex_count = node_attrs.__vertex_count;
            ITER_PROPS(attr, attr_data) {
                var type = all_attrs[attr];
                var size = vertex_count * type;
                var start = offset * type;
                if (node_attrs[attr]) {
                    for (var i=0; i<size; i+=1) {
                        attr_data[attr][start+i] = node_attrs[attr][i];
                    }
                }
                else {
                    for (var i=start; i<start+size; i+=1) {
                        attr_data[attr][i] = 0;
                    }
                }
            }
            offset += vertex_count;
        }
    }

    // create the composite VBO
    return please.gl.vbo(total_vertices, attr_data);
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
    ITER(i, prog.uniform_list) {
        var test = prog.uniform_list[i];
        if (samplers.indexOf(test) == -1 && test.indexOf("matrix") == -1) {
            uniforms.push(test);
        }
    }

    var groups = {};
    var cache_keys = [];
    var sampler_bindings = {};
    graph_node.propogate(function (inspect) {
        if (inspect.__drawable && inspect.visible) {
            var mesh_data = inspect.mesh_data();
            if (mesh_data == null) {
                console.warn("unable to use object for static draw:", inspect);
                return;
            }

            var matrix = inspect.shader.world_matrix;
            var chunk = {
                "data" : this.__apply_matrix(mesh_data, matrix),
                "uniforms" : {},
            };
            
            ITER(i, uniforms) {
                var name = uniforms[i];
                chunk.uniforms[name] = inspect.shader[name];
            }

            // create a cache key from sampler settings to determine
            // which texture group this object belongs in
            var cache_key = ["::"];
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

    return {
        "groups" : groups,
        "cache_keys" : cache_keys,
        "sampler_bindings" : sampler_bindings,
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