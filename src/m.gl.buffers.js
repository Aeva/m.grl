// - m.gl.buffers.js ----------------------------------------------------- //

please.gl.__buffers = {
    "last_vbo" : null,
    "last_ibo" : null,
    "all" : [],
};


// Register the buffer so that it can be looked up later by index.
please.gl.__register_buffer = function (buffer) {
    please.gl.__buffers.all.push(buffer);
    return buffer.buffer_index = please.gl.__buffers.all.length -1;
};


/* [+] please.gl.vbo(vertex_count, attr_map, options)
 *
 * Create a VBO from attribute array data.
 *
 */
please.gl.vbo = function (vertex_count, attr_map, options) {
    var opt = {
        "type" : gl.FLOAT,
        "mode" : gl.TRIANGLES,
        "hint" : gl.STATIC_DRAW,
    }
    if (options) {
        please.get_properties(opt).map(function (name) {
            if (options.hasOwnProperty(name)) {
                opt[name] = options[name];
            }
        });
    }

    var vbo = {
        "id" : null,
        "opt" : opt,
        "count" : vertex_count,
        "bind" : null,
        "draw" : function (start, total) {
            DEFAULT(start, 0);
            DEFAULT(total, vertex_count);
            gl.drawArrays(opt.mode, start, total);
        },
        "static_bind" : null,
        "static_draw" : function (start, total, instances) {
            if (!start) {
                start = 0;
            }
            if (!total) {
                total = vertex_count;
            }
            if (!instances) {
                instances = 0;
            }

            if (instances > 0) {
                var ext = "please.gl.ext.ANGLE_instanced_arrays";
                return please.format_invocation(
                    ext + ".drawArraysInstancedANGLE",
                    "gl.drawArrays", opt.mode, start, total, instances);
            }
            else {
                return please.format_invocation(
                    "gl.drawArrays", opt.mode, start, total);
            }
        },
        "stats" : {
            "min" : null,
            "max" : null,
            "size" : null,
            "average" : null,
        },
        "reference" : {
            "size" : vertex_count,
            "type" : {},
            "options" : opt,
        },
    };
    please.gl.__register_buffer(vbo);

    var attr_names = please.get_properties(attr_map);
    
    // generate the type info for each attr in the buffer (eg vec4 = 4)
    ITER_PROPS(attr, attr_map) {
        vbo.reference.type[attr] = attr_map[attr].length / vertex_count;
    }

    // generate spacial stats about the buffer if applicable
    if (attr_map.position !== undefined) {
        var point, sum = null;
        var channels = attr_map.position.length / vertex_count;
        for(var i=0; i<vertex_count*channels; i+=channels) {
            point = attr_map.position.slice(i, i+channels);
            if (sum === null) {
                // We call point.slice() here to copy the array's contents.
                // Otherwise, we'll just be editing references to the same object.
                sum = point.slice();
                vbo.stats.min = point.slice();
                vbo.stats.max = point.slice();
            }
            else {
                for (var ch=0; ch<channels; ch+=1) {
                    sum[ch] += point[ch];
                    if (point[ch] < vbo.stats.min[ch]) {
                        vbo.stats.min[ch] = point[ch];
                    }
                    if (point[ch] > vbo.stats.max[ch]) {
                        vbo.stats.max[ch] = point[ch];
                    }
                }
            }
        }
        vbo.stats.size = [];
        vbo.stats.average = [];
        for (var ch=0; ch<channels; ch+=1) {
            vbo.stats.size.push(vbo.stats.max[ch] - vbo.stats.min[ch]);
            vbo.stats.average.push(sum[ch] / vertex_count);
        }
    }
    
    // Common functionality used by both versions of vbo.bind.
    // Returns true if the buffer can be bound, otherwise returns
    // false.
    var common_bind = function () {
        var prog = please.gl.__cache.current;
        if (prog && please.gl.__buffers.last_vbo !== vbo) {
            please.gl.__buffers.last_vbo = this;
            for (var name in vbo.stats) {
                var glsl_name = "mgrl_model_local_" + name;
                if (prog.vars.hasOwnProperty(glsl_name)) {
                    prog.vars[glsl_name] = vbo.stats[name];
                }
            }
            for (var name in prog.attrs) {
                prog.attrs[name].enabled = attr_names.indexOf(name) !== -1;
            }
            return true;
        }
        return false;
    };


    if (attr_names.length === 1) {
        // create a single-attribute VBO

        var attr = attr_names[0];
        var data = attr_map(attr);
        var item_size = data.length / vbo.count;
        
        // copy the data to the buffer
        vbo.id = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo.id);
        gl.bufferData(gl.ARRAY_BUFFER, data, opt.hint);

        // create binding functions
        vbo.bind = function () {
            if (common_bind()) {
                if (prog.hasOwnProperty(prog.attrs[attr])) {
                    gl.bindBuffer(gl.ARRAY_BUFFER, this.id);
                    gl.vertexAttribPointer(
                        prog.attrs[attr].loc, item_size, opt.type, false, 0, 0);
                }
            }
        };
    }
    else {
        // create a multi-attribute VBO (interlaced)

        var offset = 0;
        var buffer_size = 0;
        var bind_order = [];
        var bind_offset = [];
        var item_sizes = {};

        // determine item sizes and bind offsets
        for (var i=0; i<attr_names.length; i+=1) {
            var attr = attr_names[i];
            item_sizes[attr] = attr_map[attr].length / vbo.count;
            buffer_size += attr_map[attr].length;
            bind_order.push(attr);
            bind_offset.push(offset);
            offset += item_sizes[attr];
        };

        // calculate the packing stride
        var stride = offset;

        // build the interlaced vertex array:
        var builder = new Float32Array(buffer_size);
        for (var i=0; i<bind_order.length; i+=1) {
            var attr = bind_order[i];
            var data = attr_map[attr];
            var item_size = item_sizes[attr];
            for (var k=0; k<data.length/item_size; k+=1) {
                for (var n=0; n<item_sizes[attr]; n+=1) {
                    var attr_offset = bind_offset[i] + (stride*k);
                    builder[attr_offset+n] = data[(k*item_sizes[attr])+n];
                }
            }
        }

        // copy the new data to the buffer
        vbo.id = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo.id);
        gl.bufferData(gl.ARRAY_BUFFER, builder, opt.hint);

        vbo.bind = function () {
            if (common_bind()) {
                var prog = please.gl.__cache.current;
                gl.bindBuffer(gl.ARRAY_BUFFER, this.id);
                for (var i=0; i<bind_order.length; i+=1) {
                    var attr = bind_order[i];
                    var offset = bind_offset[i];
                    var item_size = item_sizes[attr];
                    if (prog.attrs[attr]) {
                        gl.vertexAttribPointer(
                            prog.attrs[attr].loc, item_size, 
                            opt.type, false, stride*4, offset*4);
                    }
                }
            }
        }
    }


    // For generating static bind methods.
    vbo.static_bind = function (prog, state_tracker, instanced) {
        var src = "";
        state_tracker = state_tracker || {};
        var redundant = state_tracker["vbo"] == this.id;
        state_tracker["vbo"] = this.id;
        // we don't just return here if this is a redundant call,
        // because instancing will have an effect on how attrs are
        // bound
        
        // enable attributes
        if (instanced) {
            // don't disable other arrays
            ITER(a, attr_names) {
                var name = attr_names[a];
                var state = "attr:" + name;
                if (prog.attrs[name] && !state_tracker[state]) {
                    src += "this.prog.attrs['"+name+"'].enabled = true;\n";
                }
                state_tracker[state] = true;
            }
        }
        else {
            // only enable what we need, disable everything else
            for (var name in prog.attrs) {
                var enabled = attr_names.indexOf(name) !== -1;
                var state = "attr:" + name;
                if (state_tracker[state] != enabled) {
                    src += "this.prog.attrs['"+name+"'].enabled = "+enabled+";\n";
                }
                state_tracker[state] = enabled
            }
        }

        if (!redundant) {
            // upload vbo spacial statistics
            if (attr_map.position) {
                for (var name in vbo.stats) {
                    var glsl_name = "mgrl_model_local_" + name;
                    if (prog.vars.hasOwnProperty(glsl_name)) {
                        src += "this.prog.vars['"+glsl_name+"'] = ";
                        src += please.array_src(vbo.stats[name]) + ";\n";
                    }
                }
            }
            
            // bind the buffer for use
            src += please.format_invocation(
                "gl.bindBuffer",
                "gl.ARRAY_BUFFER",
                "please.gl.__buffers.all[" + vbo.buffer_index + "].id") + "\n";

            if (attr_names.length === 1) {
                // single attribute buffer binding
                src += please.format_invocation(
                    "gl.vertexAttribPointer",
                    "this.prog.attrs['" + attr + "'].loc",
                    item_size, opt.type, false, 0, 0) + "\n";
            }
            else {
                // multi-attribute buffer bindings
                for (var i=0; i<bind_order.length; i+=1) {
                    var attr = bind_order[i];
                    var offset = bind_offset[i];
                    var item_size = item_sizes[attr];
                    if (prog.attrs[attr]) {
                        src += please.format_invocation(
                            "gl.vertexAttribPointer",
                            "this.prog.attrs['" + attr + "'].loc",
                            item_size, opt.type, false, stride*4, offset*4) + "\n";
                    }
                }
            }
        }

        if (instanced) {
            // enable instancing
            var ext = "please.gl.ext.ANGLE_instanced_arrays";
            ITER (a, attr_names) {
                var name = attr_names[a];
                if (prog.attrs[name]) {
                    src += "\n" + please.format_invocation(
                        ext+".vertexAttribDivisorANGLE",
                        "this.prog.attrs['" + name + "'].loc", 1);
                }
            }
        }
        return src.trim();
    };

    return vbo;
};


// [+] please.gl.ibo(data, options)
//
// Create a IBO.
//
please.gl.ibo = function (data, options) {
    var opt = {
        "type" : gl.UNSIGNED_SHORT,
        "mode" : gl.TRIANGLES,
        "hint" : gl.STATIC_DRAW,
    }
    if (options) {
        please.get_properties(opt).map(function (name) {
            if (options.hasOwnProperty(name)) {
                opt[name] = options[name];
            }
        });
    }
    if (data.BYTES_PER_ELEMENT == 2) {
        opt["type"] = gl.UNSIGNED_SHORT;
    }
    else if (data.BYTES_PER_ELEMENT == 4) {
        opt["type"] = gl.UNSIGNED_INT;
    }
    var poly_size = 3; // fixme this should be determined by opt.mode
    var face_count = data.length;

    var ibo = {
        "id" : gl.createBuffer(),
        "bind" : function () {
            if (please.gl.__buffers.last_ibo !== this) {
                please.gl.__buffers.last_ibo = this;
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.id);
            }
        },
        "draw" : function (start, total) {
            if (start === undefined || total === undefined) {
                start = 0;
                total = face_count;
            }
            gl.drawElements(opt.mode, total, opt.type, start*data.BYTES_PER_ELEMENT);
        },
        "static_bind" : null,
        "static_draw" : function (start, total, instances) {
            if (!start) {
                start = 0;
            }
            if (!total) {
                total = face_count;
            }
            if (!instances) {
                instances = 0;
            }
            
            if (instances > 0) {
                var ext = "please.gl.ext.ANGLE_instanced_arrays";
                return please.format_invocation(
                    ext + ".drawElementsInstancedANGLE",
                    opt.mode, total, opt.type, start*data.BYTES_PER_ELEMENT,
                    instances);
            }
            else {
                return please.format_invocation(
                    "gl.drawElements", opt.mode, total, opt.type,
                    start*data.BYTES_PER_ELEMENT);
            }
        },
        "reference" : {
            "options" : opt,
        },
    };
    please.gl.__register_buffer(ibo);

    ibo.static_bind = please.format_invocation(
        "gl.bindBuffer", "gl.ELEMENT_ARRAY_BUFFER",
        "please.gl.__buffers.all[" + ibo.buffer_index + "].id"
    );

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo.id);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data, opt.hint);
    return ibo;
};


//
please.gl.get_instance_buffer = function (state_key, shader, tokens) {
    var buffer_key = shader.name + ":" + state_key;
    var instances = tokens.length;
    var size_chart = {
        "float" : 1,
        "vec2" : 2,
        "vec3" : 3,
        "vec4" : 4,
        "mat2" : 4, // both rows are packed into the same array
        "mat3" : 3, // will be split into three attributes
        "mat4" : 4, // will be split into four attributes
    };

    // allocate the arrays
    var attr_map = {};
    ITER_PROPS(name, shader.instanceable) {
        var type = shader.instanceable[name];
        var size = size_chart[type];
        var attr_names = [];
        if (type == "mat3" || type == "mat4") {
            RANGE(c, size) {
                var attr_name = "inst_attr" + c + "_" + name;
                attr_map[attr_name] = new Float32Array(instances * size);
                attr_names.push(attr_name);
            }
        }
        else {
            var attr_name = "inst_attr_" + name;
            attr_map[attr_name] = new Float32Array(instances * size);
            attr_names.push(attr_name);
        }
        // populate the array
        ITER(t, tokens) {
            var token = tokens[t];
            var column = 0;
            ITER(n, attr_names) {
                var attr_name = attr_names[n];
                var attr = attr_map[attr_name];

                var size = attr.length / tokens.length;
                var insert = t*size;
                if (size == 1) {
                    attr[insert] = token.__defaults[name];
                }
                else {
                    RANGE(s, size) {
                        attr[insert + s] = token.__defaults[name][column+s];
                    }
                }
                column += size;
            }
        }
    }
    return new please.gl.vbo(instances, attr_map);
};