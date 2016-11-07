// - m.picking.js -------------------------------------------------------- //

/* [+]
 *
 * This part of the module implements the object picking functionality
 * for M.GRL.  This allows for rudimentry 3D mouse events.
 *
 * Here is an example of the most basic usage of this - assigning an
 * event handler to a GraphNode, so that it can receive mouse events:
 *
 * ```
 * var graph_root = new please.SceneGraph();
 * please.picking.graph = graph_root;
 * var some_critter = please.access("fancy_critter.jta").instance();
 * some_critter.selectable = true;
 * some_critter.on_click.connect(function (event) {
 *     console.info("Hi Mom!");
 * });
 * graph_root.add(some_critter);
 * ```
 *
 * It is possible to get the 3D location of the mouse click as well:
 *
 * ```
 * var graph_root = new please.SceneGraph();
 * please.picking.graph = graph_root;
 * please.picking.enable_location_info = true; // <----------
 * graph_root.on_mouseup.connect(function (event) {
 *     var coord = event.world_location;
 *     if (coord) {
 *         console.info("Click coordinate: (" + coord.join(", ") + ")");
 *     }
 * });
 * ```
 *
 * The following event handlers may be used on either selectable
 * GraphNodes (as defined above) or on the root graph node:
 *
 *  - mousedown
 *
 *  - mouseup
 *
 *  - click
 *
 *  - doubleclick
 *
 * For more advanced uses, you can define multiple picking graphs, and
 * assign them as "layers".  Only one layer may be active at any given
 * moment, but you can use an event handler to change the current
 * layer.  This can be used to implement click-and-drag functionality.
 * 
 * ```
 * var picking_graph_a = new please.SceneGraph();
 * var picking_graph_b = new please.SceneGraph();
 * please.picking.graph = [picking_graph_a, picking_graph_b];
 * please.picking.current_layer = 0;
 * 
 * picking_graph_a.on_mousedown.connect(function (event) {
 *     please.picking.current_layer = 1;
 *     console.info("picking layer is now 1");
 * });
 *
 * picking_graph_b.on_mouseup.connect(function (event) {
 *     please.picking.current_layer = 0;
 *     console.info("picking layer is now 0");
 * });
 * ```
 *
 * The "bezier_pick" demo implements click-and-drag using the picking
 * layer API.
 */


//
// Picking settings object.
//
please.picking = {
    "graph" : null,
    "enable_location_info" : false,
    "enable_mouse_move_event" : false,
    "distortion_function" : null,
    "current_layer" : 0,

    "__etc" : {
        "queue" : [],
        "move_event" : null,
        "delay" : -1,
        // __click_test stores what was selected on the last
        // mouse_down event.  If mouse up matches, the objects gets a
        // "click" event after it's mouse up event.  __last_click
        // stores what object recieved a click last, and is reset
        // whenever a contradicting mouseup occurs.  It also stores
        // when that object was clicked on for the double click
        // threshold.
        "click_test" : null,
        "last_click" : null,
        "clear_timer" : null,

        // signal to inform when picking features are enabled or disabled
        "settings_changed" : new please.Signal(),
    },
};


//
//  Redefine enabler properties in the picking namespace, so that they
//  are getter / setters.  This is used to trigger the
//  "settings_changed" signal, so that M.GRL can automatically
//  activate / disable / and optimize picking related functionality.
//
(function () {
    var _private = please.picking.__etc.opt = {};
    please.prop_map(please.picking, function (name, initial) {
        var initial = please.picking[name];
        if (name.startsWith("_") || !!initial) {
            // skip if the property name starts with an underscore, or
            // the value of the property is not a falsey value.
            return;
        }
        _private[name] = initial;
        delete please.picking[name];
        Object.defineProperty(please.picking, name, {
            enumerable: true,
            get : function () {
                return _private[name];
            },
            set : function (value) {
                if (_private[name] != value) {
                    _private[name] = value;
                    please.picking.__etc.settings_changed(name, value);
                }
                return value;
            }
        });
    });
})();


//
// Eventlistener that converts dom mouse events to M.GRL's internal
// picking event representation.
//
please.picking.__etc.event_listener = function (event) {
    var rect = please.gl.canvas.getBoundingClientRect();
    var left_edge = rect.left + window.pageXOffset;
    var top_edge = rect.top + window.pageYOffset;
    
    // x and y are normalized to be in the range 0.0 to 1.0
    var picking_event = {
        "x" : (event.pageX - left_edge) / (rect.width-1),
        "y" : (event.pageY - top_edge) / (rect.height-1),
        "event" : event,
    };
    
    if (this.opt.distortion_function) {
        var pick_x = picking_event.x;
        var pick_y = 1.0 - picking_event.y;
        var time = please.__compositing_viewport.__last_framestart/1000.0;
        var new_coords = this.opt.distortion_function(time, pick_x, pick_y);
        var new_x = new_coords[0];
        var new_y = new_coords[1];
        if (new_x < 0.0 || new_x > 1.0) {
            var fract = new_x % 1;
            new_x = new_x < 0.0 ? 1.0 - fract : fract;
        }
        if (new_y < 0.0 || new_y > 1.0) {
            var fract = new_y % 1;
            new_y = new_y < 0.0 ? 1.0 - fract : fract;
        }
        picking_event.x = new_x;
        picking_event.y = 1.0 - new_y;
    };

    if (event.type === "mousemove") {
        this.move_event = picking_event
    }
    else {
        this.queue.push(picking_event);
        this.delay = -1;
    }
}.bind(please.picking.__etc);


//
//
//
please.picking.__etc.color_encode = function (pick_index) {
    var r = (pick_index & 255); // 255 = 2**8-1
    var g = (pick_index & 65280) >> 8; // 65280 = (2**8-1) << 8;
    var b = (pick_index & 16711680) >> 16; // 16711680 = (2**8-1) << 16;
    var id = [r/255, g/255, b/255];
    return id;
};


//
// Decodes a picking ID from a given color, and returns the
// corresponding GraphNode from the picking graph.
//
please.picking.__etc.node_lookup = function (graph, color_array) {
    if (r===0 && g===0 && b===0) {
        return null;
    }
    else {
        var r = color_array[0];
        var g = color_array[1];
        var b = color_array[2];
        var color_index = r + g*256 + b*65536;
        return graph.__all_drawables[color_index-1];
    }
};


//
// Adds a picking RenderNode to the provided GraphNode object.
//
please.picking.__etc.attach_renderer = function(graph) {
    if (graph.__picking_renderer) {
        throw new Error("Attempted to attach a redundant picking RenderNode to graph.");
    }

    var options = {
        "is_picking_pass" : true,
    };
    var renderer = new please.RenderNode("object_picking", options);
    renderer.req = {x:0, y:0};
    renderer.clear_color = [0.0, 0.0, 0.0, 0.0];
    renderer.stream_callback = function (picked_color) {
        this.selected_color = picked_color;
    };
    renderer.graph = graph;
    graph.__picking_renderer = renderer;
};


//
// This is responsible for selecting the picking graph being rendered.
// If there is no associated picking RenderNode for the graph, one
// will be created.  This will cause lag depending on where it is
// triggered.
//
// Returns null if no appropriate picking graph could be found.
//
please.picking.__etc.get_layer = function () {
    var selected = this.opt.graph;
    if (selected && selected.length) {
        var layer = this.opt.current_layer;
        selected = selected[layer];
    }
    if (!selected) {
        console.warn("Picking layer out of bounds: " + layer);
        return null;
    }

    if (!selected.__picking_renderer) {
        please.picking.__etc.attach_renderer(selected);
    }
    return selected;
};


//
// Once a opengl context is created, automatically attach picking
// event bindings to the canvas.
//
please.__init_picking = function () {
    var canvas = please.gl.canvas;
    var event_listener = please.picking.__etc.event_listener;
    canvas.addEventListener("mousemove", event_listener);
    canvas.addEventListener("mousedown", event_listener);
    window.addEventListener("mouseup", event_listener);
    
    please.time.__frame.register(-1, "mgrl/picking_pass", please.picking.__etc.picking_pass).skip_when(
        function () {
            if (please.__compositing_viewport) {
                var delay = please.picking.__etc.delay;
                var start_time = please.__compositing_viewport.__last_framestart;
                var items_in_queue = please.picking.__etc.queue.length;
                var pending_move = please.picking.__etc.move_event;
                return (delay > start_time) || !(items_in_queue || pending_move);
            }
            else {
                return true;
            }
        }
    );
    
    please.picking.__etc.settings_changed.connect(function (name, value) {
        console.info("Picking setting '"+name+"' changed to: " + value);
        if (name == "graph" || name == "current_layer") {
            var opt = please.picking.__etc.opt;
            if (opt.graph && opt.current_layer) {
                please.picking.__etc.get_layer();
            }
        }
    });
};


//
// This code facilitates color based picking, when relevant. 
//
please.picking.__etc.picking_pass = function () {
    var graph = please.picking.__etc.get_layer();
    if (!graph) {
        return;
    }
    
    var req = please.picking.__etc.queue.shift();
    if (!req) {
        req = please.picking.__etc.move_event;
        please.picking.__etc.move_event = null;
        if (req) {
            var start_time = please.__compositing_viewport.__last_framestart;
            if (please.picking.__etc.delay < start_time) {
                please.picking.__etc.delay = start_time + (1/24 * 1000);
            }
            else {
                // skip rendering for this move event, because it is
                // too soon.
                return;
            }
        }
    }
    var is_move_event = req.event.type === "mousemove";
    if (is_move_event && !this.opt.enable_mouse_move_event) {
        return;
    }
    var id_color, loc_color = null;
    var info = {
        "picked" : null,
        "selected" : null,
        "local_location" : null,
        "world_location" : null,
        "trigger" : req,
    };

    var renderer = graph.__picking_renderer;
    if (req.x >= 0 && req.x <= 1 && req.y >= 0 && req.y <= 1) {
        // perform object picking pass
        renderer.shader.mgrl_select_mode = true;
        renderer.req = req;
        renderer.shader.frame_offset = [ req.x, 1.0-req.y ];

        please.indirect_render(renderer);
        id_color = renderer.selected_color;
        
        // picked is the object actually clicked on
        info.picked = please.picking.__etc.node_lookup(graph, id_color);
        if (info.picked) {
            // selected is who should recieve an event
            info.selected = info.picked.__find_selection();

            // optionally perform object location picking
            var override = info.picked.override_location_picking
            if ((this.opt.enable_location_info && override !== false) || override === true) {
                renderer.shader.mgrl_select_mode = false;
                renderer.__cached_framebuffer = null; // force cache bypass
                please.indirect_render(renderer);
                loc_color = renderer.selected_color;
                var vbo = info.picked.__buffers.vbo;

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
    please.picking.__etc.dispatch_events(graph, req.event.type, info);
    
    // restore original clear color
    gl.clearColor.apply(gl, please.__clear_color);
}.bind(please.picking.__etc);

//
please.picking.__etc.dispatch_events = function (graph, event_name, event_info) {
    var event_type = event_info.trigger.event.type;    
    var selected = event_info.selected || null;
    var events = [event_type];
    
    if (selected) {
        if (event_type === "mousedown") {
            // set the click counter
            this.click_test = selected;
        }
        else if (event_type === "mouseup") {
            if (this.click_test === selected) {
                // single click
                events.push("click");
                
                if (this.last_click === event_info.selected) {
                    // double click
                    this.set_click_counter(null);
                    events.push("doubleclick");
                }
                else {
                    // double click pending
                    this.set_click_counter(selected);
                }
            }
            else {
                // clear double click counter
                this.set_click_counter(null);
            }
            // clear the click test counter
            this.click_test = null;
        }
    }

    ITER(e, events) {
        var event = events[e];
        if (selected) {
            selected.dispatch(event, event_info);
        }
        graph.dispatch(event, event_info);
    }
};


// Used by the dispatcher function below
please.picking.__etc.set_click_counter = function (val) {
    this.last_click = val;
    window.clearTimeout(this.clear_timer);
    if (val) {
        this.clear_timer = window.setTimeout(function () {
            this.last_click = null;
        }.bind(this), 500);
    }
};