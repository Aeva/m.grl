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

    var flattened = this.__flatten_graph(graph_node);
    flattened.cache_keys.sort();

    // generate the static vbo
    var vbo = this.__combine_vbos(flattened);
    this.__static_vbo = vbo;
    this.__last_vbo = vbo;

    // generate the draw callback
    this.__draw = this.__generate_draw_callback(flattened);
};
please.StaticDrawNode.prototype = Object.create(please.GraphNode.prototype);


//
// Generate a branchless draw function for the static draw set.
//
please.StaticDrawNode.prototype.__generate_draw_callback = function (flat) {
    var src = "";
    src += "if (!this.visible) { return; }\n";
    src += "this.__static_vbo.bind();\n";
    src += "this.__static_vbo.draw();\n"; // WRONG

    return new Function(src);
};


//
//  Generate the new vertex buffer object
//
please.StaticDrawNode.prototype.__combine_vbos = function (flat) {
    var all_attrs = {}; // a map from attribute names to expected data type
    var attr_data = {}; // the data for the vbo

    // determine all attribute names needed for the new vbo
    ITER(key, flat.cache_keys) {
        var nodes = flat.groups[key];
        ITER(n, nodes) {
            var node_attrs = nodes[n].data;
            var vertex_count = node_attrs.__vertex_count;
            ITER_PROPS(attr, node_attrs) {
                if (attr.startsWith("__")) {
                    continue;
                }
                var items = node_attrs[attr];
                var type_size = items.length / vertex_count;
                if (!all_attrs[attr]) {
                    all_attrs[attr] = type_size;
                    attr_data[attr] = [];
                }
                else if (all_attrs[attr] !== type_size) {
                    var message = "Mismatched attribute array data types.";
                    message += "  Cannot build static scene.";
                    throw new Error(message);
                }
            }
        }
    }

    var zeros = function (vertex_count, type_size) {
        return Array.apply(null, new Float32Array(vertex_count * type_size));
    };

    // loop over the mesh data objects and concatinate them together
    // into one array
    ITER(key, flat.cache_keys) {
        var nodes = flat.groups[key];
        ITER(n, nodes) {
            var node_attrs = nodes[n].data;
            var vertex_count = node_attrs.__vertex_count;
            ITER_PROPS(attr, attr_data) {
                if (node_attrs[attr]) {
                    attr_data[attr] = attr_data[attr].concat(node_attrs[attr]);
                }
                else {
                    var padding = zeros(vertex_count, all_attrs[attr]);
                    attr_data[attr] = attr_data[attr].concat(padding);
                }
            }
        }
    }

    // cast the attribute arrays to Float32Array buffers
    var buffers = {};
    ITER_PROPS(attr, attr_data) {
        buffers[attr] = new Float32Array(attr_data);
    }

    // create the composite VBO
    var vertex_count = buffers.position.length / 3.0;
    return please.gl.vbo(vertex_count, buffers);
};


//
//  Take a graph node and it's children, freeze the values for shader
//  variables, generate mesh data with world matrix applied, and sort
//  into texture groups.
//
please.StaticDrawNode.prototype.__flatten_graph = function (graph) {
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
        if (inspect.__drawable && inspect.__visible) {
            if (mesh_data == null) {
                console.warn("unable to use object for static draw:", inspect);
                return;
            }

            var matrix = inspect.shader.world_matrix;
            var chunk = {
                "data" : this.__bake_mesh(mesh_data, matrix),
                "uniforms" : {},
            };
            
            ITER(i, uniforms) {
                var name = uniforms[i];
                chunk.uniforms[name] = inspect.shader[name];
            }

            // create a cache key from sampler settings to determine
            // which texture group this object belongs in
            var cache_key = [];
            ITER(i, samplers) {
                var name = samplers[i];
                var uri = inspect.shader[name];
                if (uri) {
                    cache_key.push(uri);
                }
            }
            cache_key = cache_key.join(String.fromCharCode(29));

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
    });

    return {
        "groups" : groups,
        "cache_keys" : cache_keys,
        "sampler_bindings" : sampler_bindings,
    };
};


//
//  Apply a world matrix to an array of vertex positions.
//
please.StaticDrawNode.prototype.__bake_mesh = function (mesh_data, matrix) {
    var vertex_count = mesh_data.__vertex_count;
    var old_coords = mesh_data.position;
    var new_coords = [];
    
    ITER(i, vertex_count) {
        var seek = i*3;
        var coord = old_coords.slice(seek, seek+3);
        var morph = [0,0,0];
        vec3.transform(morph, coord, matrix);
        new_coords = new_coords.concat(morph);
    };
    
    mesh_data.position = new_coords;
    return mesh_data;
};