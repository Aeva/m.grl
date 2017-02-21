// - m.drawcompiler.js ------------------------------------------------------ //

/* [+]
 * 
 * The draw compiler is used to generate optimized rendering
 * functions.  Currently this is used by the compositing system's
 * RenderNodes who have GraphNodes assigned to them.
 * 
 */


please.RenderNode.prototype.__recompile_draw = function () {
    // Mark the static draw function as being dirty, schedule a
    // 'recompile_draw' call.  Using set timeout to run the call
    // after the current callstack returns, so as to prevent
    // some redundant recompiles.

    if (!this.__graph) {
        this.render = this.__splat_draw;
    }
    else if (!this.__dirty_draw) {
        this.__dirty_draw = true;
        window.setTimeout(function () {
            this.__compile_graph_draw();
        }.bind(this), 0);
    }
};


please.RenderNode.prototype.__compile_graph_draw = function () {
    // (Re)compiles the draw function for this RenderNode, so as to
    // most efficiently render the information described in the
    // assigned graph root.
    
    var graph = this.__graph;
    var ir = [];

    // regen master list of drawable objects
    graph.__all_drawables = graph.__statics.concat(graph.__flat);

    // Generate render function prefix IR.
    ir.push(
// ☿ quote
        var camera = this.graph.camera || null;
        var graph = this.graph;
        var prog = this.prog;
        if (graph.__last_framestart < please.time.__framestart) {
            // note, this.__last_framestart can be null, but
            // null<positive_number will evaluate to true anyway.
            graph.tick();
        }
        if (camera) {
            graph.camera.update_camera();
            prog.vars.projection_matrix = camera.projection_matrix;
            prog.vars.view_matrix = camera.view_matrix;
            prog.vars.focal_distance = camera.focal_distance;
            prog.vars.depth_of_field = camera.depth_of_field;
            prog.vars.depth_falloff = camera.depth_falloff;
            if (camera.__projection_mode === "orthographic") {
                prog.vars.mgrl_orthographic_scale = 32/camera.orthographic_grid;
            }
            else {
                prog.vars.mgrl_orthographic_scale = 1.0;
            }
        }
        else {
            console.error("The scene graph has no camera in it!");
            return;
        }
        
        // BEGIN GENERATED GRAPH RENDERING CODE
// ☿ endquote
    );

    var state_tracker = {};
    var instancing_available = !!please.gl.ext.ANGLE_instanced_arrays;
    
    // Generate the IR for stamped drawables.
    ITER_PROPS(state_key, graph.__drawable_ir) {
        var stamped_ir = graph.__drawable_ir[state_key];
        if (stamped_ir.length > 100 && instancing_available) {
            // Instancing might be worthwhile here.  The 'requires'
            // array contains the uniforms that have to be instancable.
            var requires = [];
            var instances = stamped_ir.length;
            ITER(v, graph.__ir_variance[state_key]) {
                var uniform = graph.__ir_variance[state_key][v];
                if (this.__prog.vars.hasOwnProperty(uniform)) {
                    requires.push(uniform);
                }
            }
            var instancing_possible = true;
            ITER(r, requires) {
                var uniform = requires[r];
                if (!this.__prog.instanceable[uniform]) {
                    instancing_possible = false;
                    break;
                }
            }
            if (instancing_possible) {
                ir.push("//");
                ir.push("// begin instancing for " + instances + " stamps");
                var buffer = please.gl.get_instance_buffer(
                    this.__prog.name + ":" + state_key,
                    this.__prog, stamped_ir);
                var prototype = stamped_ir[0];
                var new_ir = prototype.generate(
                    this.__prog, state_tracker, instances);
                ITER(p, new_ir) {
                    var token = new_ir[p];
                    if (token.constructor == please.JSIR) {
                        token.compiled = true;
                    }
                    ir.push(token);

                    if (p == 0) {
                        // HACK
                        ir.push(
                            buffer.static_bind(this.__prog, state_tracker, true));
                    }
                }
                continue;
            }
        }
                
        ITER(i, stamped_ir) {
            ir.push("//");
            ir.push("// begin graphless-but-not-instanced draw calls");
            var drawable = stamped_ir[i];
            var node_ir = drawable.generate(this.__prog, state_tracker);
            ITER(p, node_ir) {
                var token = node_ir[p];
                if (token.constructor == please.JSIR) {
                    token.compiled = true;
                }
                ir.push(token);
            }
        }
    }

    // Generate the IR for rendering the individual graph nodes.
    var last_hint = null;
    ITER(s, graph.__statics) {
        var node = graph.__statics[s];
        if (this.__is_picking_pass) {
            var obj_index = graph.__all_drawables.indexOf(node) + 1;
            var picking_color = please.picking.__etc.color_encode(obj_index);
            var color_string = please.array_src(picking_color);
            var pick_uni = "this.prog.vars['object_index'] = " + color_string + ";";
            ir.push(pick_uni);
        }
        if (!this.__graph_filter || this.__graph_filter(node)) {
            var node_ir = node.__ir.generate(this.__prog, state_tracker) || [];
            if (node_ir) {
                if (node.__asset_hint) {
                    if (node.__asset_hint !== last_hint) {
                        ir.push("//");
                        ir.push("// begin draw calls for " + node.__asset_hint);
                        last_hint = node.__asset_hint;
                    }
                }
                else {
                    ir.push("//");
                    ir.push("// begin draw calls for anonymous object");
                    last_hint = null;
                }
            }
            ITER(p, node_ir) {
                var token = node_ir[p];
                if (token.constructor == please.JSIR) {
                    token.compiled = true;
                }
                ir.push(token);
            }
        }
    }

    if (this.__is_picking_pass) {
        ITER(f, graph.__flat) {
            var node = graph.__flat[f];
            var obj_index = graph.__all_drawables.indexOf(node) + 1;
            node.__ani_store.object_index = please.picking.__etc.color_encode(obj_index);
        }
    }
    
    // Generate render function suffix IR.
    ir.push(
// ☿ quote
        please.gl.__buffers.last_vbo = null;
        please.gl.__buffers.last_ibo = null;
        // END GENERATED GRAPH RENDERING CODE
        
        // Legacy dynamic rendering code follows:
        if (graph.__states) {
            ITER_PROPS(hint, graph.__states) {
                var children = graph.__states[hint];
                ITER(i, children) {
                    var child = children[i];
                    if (!this.exclude_test || this.exclude_test(child)) {
                        child.__bind(prog);
                        child.__draw(prog);
                    }
                }
            }
        }
        if (graph.__alpha) {
            // sort the transparent items by z
            var screen_matrix = mat4.create();
            mat4.multiply(
                screen_matrix,
                camera.projection_matrix,
                camera.view_matrix);
            ITER(i, graph.__alpha) {
                var child = graph.__alpha[i];
                child.__z_sort_prep(screen_matrix);
            };
            graph.__alpha.sort(graph.__z_sort_function);
            
            // draw translucent elements
            gl.depthMask(false);
            ITER(i, graph.__alpha) {
                var child = graph.__alpha[i];
                if (!this.exclude_test || this.exclude_test(child)) {
                    child.__bind(prog);
                    child.__draw(prog);
                }
            }
            gl.depthMask(true);
        }
// ☿ endquote
    );

    var src_url = "rendernode:" + this.__graph.__id + ":" + this.__prog.name;
    var src = please.__compile_ir(ir, this.__static_draw_cache, src_url);
    this.__render_src = src;
    this.__render_ir = ir;
    this.render = new Function(src).bind(this.__static_draw_cache);
    this.__dirty_draw = false;
    console.info("recompiled a static draw function");
};
