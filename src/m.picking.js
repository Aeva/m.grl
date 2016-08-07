// - m.picking.js -------------------------------------------------------- //

/* [+] 
 *
 * This part of the module implements the object picking functionality
 * for M.GRL.  This provides the ability to trigger mouse events on
 * applicable GraphNode instances.
 *
 * A SceneGraph instance needs to be specified as the picking target.
 * The first SceneGraph instance will automatically be made the
 * picking target.  To make change which SceneGraph instance is the
 * picking graph, call the desired SceneGraph instance's
 * make_picking_target() method.
 *
 */


//
// Machinery for activating a picking event.
//
please.__picking = {
    "queue" : [],
    "move_event" : null,
    
    "trigger_event" : function (x, y, event_info) {
        var data = {
            "x" : x,
            "y" : y,
            "event" : event_info,
        };
        if (event_info.type === "mousemove") {
            this.move_event = data
        }
        else {
            this.queue.push(data);
        }
    },

    "set_picking_graph" : function (graph_root) {
        throw new Error("not implemented!");
    },
};


//
// Once a opengl context is created, automatically attach picking
// event bindings to the canvas.
//
addEventListener("mgrl_gl_context_created", function (event) {
    var canvas = please.gl.canvas;
    var pick_trigger = function (event) {
        var rect = canvas.getBoundingClientRect();

        var left_edge = rect.left + window.pageXOffset;
        var top_edge = rect.top + window.pageYOffset;
        var pick_x = (event.pageX - left_edge) / (rect.width-1);
        var pick_y = (event.pageY - top_edge) / (rect.height-1);

        // x and y are normalized to be in the range 0.0 to 1.0
        please.__picking.trigger_event(pick_x, pick_y, event);
    };
    canvas.addEventListener("mousemove", pick_trigger);
    canvas.addEventListener("mousedown", pick_trigger);
    window.addEventListener("mouseup", pick_trigger);

    please.time.__frame.register(-1, "mgrl/picking_pass", please.__picking_pass).skip_when(
        function () {
            return please.__picking.queue.length === 0 && please.__picking.move_event === null;
        }
    );
});


//
// This code facilitates color based picking, when relevant. 
//
please.__picking_pass = function () {
    var req = please.__picking.queue.shift();
    if (!req) {
        req = please.__picking.move_event;
        please.__picking.move_event = null;
    }
    var is_move_event = req.event.type === "mousemove";

    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    ITER(i, please.graph_index.roots) {
        var graph = please.graph_index.roots[i];
        if (graph.picking.enabled && !(is_move_event && graph.picking.skip_on_move_event)) {
            var picking_node = graph.picking.__reference_node;
            var root_node = graph.picking.compositing_root;
            var id_color, loc_color = null;

            var info = {
                "picked" : null,
                "selected" : null,
                "local_location" : null,
                "world_location" : null,
                "trigger" : req,
            };

            if (req.x >= 0 && req.x <= 1 && req.y >= 0 && req.y <= 1) {
                // perform object picking pass
                picking_node.shader.mgrl_select_mode = true;
                please.render(root_node);
                id_color = please.gl.pick(req.x, req.y);

                // picked is the object actually clicked on
                info.picked = graph.__picked_node(id_color);
                if (info.picked) {
                    // selected is who should recieve an event
                    info.selected = info.picked.__find_selection();

                    // optionally perform object location picking
                    if (!graph.picking.skip_location_info) {
                        picking_node.shader.mgrl_select_mode = false;
                        please.render(root_node);
                        loc_color = please.gl.pick(req.x, req.y);
                        var vbo = info.picked.__last_vbo;

                        var tmp_coord = new Float32Array(3);
                        var local_coord = new Float32Array(3);
                        vec3.div(tmp_coord, loc_color, [255, 255, 255]);
                        vec3.mul(tmp_coord, tmp_coord, vbo.stats.size);
                        vec3.add(local_coord, tmp_coord, vbo.stats.min);

                        var world_coord = new Float32Array(3);
                        vec3.transformMat4(world_coord, local_coord, info.picked.shader.world_matrix);
                        info.local_location = local_coord;
                        info.world_location = world_coord;
                    }
                }
            }
            
            // emit event
            if (info.selected) {
                info.selected.dispatch(req.event.type, info);
            }
            graph.dispatch(req.event.type, info);
        }
    }

    // restore original clear color
    gl.clearColor.apply(gl, please.__clear_color);
};


//
// Picking RenderNode
//
please.SceneGraph.prototype.__create_picking_node = function () {
    /*
    var node = new please.RenderNode("object_picking");
    var exclude_test = function (item) {
        return !!item.__is_particle_tracker
    };
    node.render = function () {
        this.graph.draw(exclude_test);
    };
    node.graph = this;
    return node;
    */
};
