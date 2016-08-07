// - m.picking.js -------------------------------------------------------- //

/* [+] 
 *
 * This part of the module implements the object picking functionality
 * for M.GRL.  This provides the ability to trigger mouse events on
 * applicable GraphNode instances.
 *
 */


//
// Picking settings object.
//
please.picking = {
    "graph" : null,
    "enable_location_info" : false,
    "enable_mouse_move_event" : false,

    "__etc" : {
        "queue" : [],
        "move_event" : null,
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
        "picking_singleton" : null,

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
    ITER_PROPS(name, please.picking) {
        var initial = please.picking[name];
        if (name.startsWith("_") || !!initial) {
            // skip if the property name starts with an underscore, or
            // the value of the property is not a falsey value.
            continue;
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
    }
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
    if (event.type === "mousemove") {
        this.move_event = picking_event
    }
    else {
        this.queue.push(picking_event);
    }
}.bind(please.picking.__etc);


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
    
    please.picking.__etc.picking_singleton = new please.RenderNode("object_picking");
    
    please.time.__frame.register(-1, "mgrl/picking_pass", please.picking_pass).skip_when(
        function () {
            return please.picking.__etc.queue.length === 0 && please.picking.__etc.move_event === null;
        }
    );
    
    please.picking.__etc.settings_changed.connect(function (name, value) {
        console.info("Picking setting '"+name+"' changed to: " + value);
        if (name == "graph") {
            please.picking.__etc.picking_singleton.graph = value;
        }
    });
};


//
// This code facilitates color based picking, when relevant. 
//
please.picking_pass = function () {
    var graph = this.opt.graph;
    if (!graph) {
        return;
    }
    
    var req = please.picking.__etc.queue.shift();
    if (!req) {
        req = please.picking.__etc.move_event;
        please.picking.__etc.move_event = null;
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

    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    if (req.x >= 0 && req.x <= 1 && req.y >= 0 && req.y <= 1) {
        // perform object picking pass
        this.picking_singleton.shader.mgrl_select_mode = true;
        please.render(this.picking_singleton);
        id_color = please.gl.pick(req.x, req.y);
        
        // picked is the object actually clicked on
        info.picked = graph.__picked_node(id_color);
        if (info.picked) {
            // selected is who should recieve an event
            info.selected = info.picked.__find_selection();

            // optionally perform object location picking
            if (this.opt.enable_location_info) {
                this.picking_singleton.shader.mgrl_select_mode = false;
                please.render(this.picking_singleton);
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

    
    // restore original clear color
    gl.clearColor.apply(gl, please.__clear_color);
}.bind(please.picking.__etc);
