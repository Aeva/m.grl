// - m.gani.js -------------------------------------------------------------- //

/* [+]
 *
 * This part of the module is provides functionality for parsing 2D
 * keyframe animatinos defined in the .gani file format as well as the
 * ability to play the animations using m.time's scheduler, and
 * instance them into the scene graph.
 *
 * Please note that the .gani parsing functionality will likely be
 * spun off into an external library at some point, though M.GRL will
 * still make use of it.
 *
 * This file stores most of its API under the __please.gani__ object.
 *
 * The functionality provided by m.gani automatically hooks into
 * m.media's please.load and please.access methods.  As a result there
 * isn't much to document here at the moment.
 *
 */


// "gani" media type handler
please.media.search_paths.gani = "";
please.media.handlers.gani = function (url, asset_name, callback) {
    var media_callback = function (req) {
        please.media.assets[asset_name] = new please.media.__AnimationData(
            req.response, url);
    };
    please.media.__xhr_helper("text", url, asset_name, media_callback, callback);
};


// Namespace for m.ani guts
please.gani = {
    "__frame_cache" : {},

#ifdef WEBGL
    "resolution" : 16,
#endif

    // [+] please.gani.get\_cache\_name(uri, ani)
    //
    // **DEPRECATED** This is a helper function for the
    // **please.gani.on\_bake\_ani\_frameset callback.
    //
    // This method is used to provide a unique cache id for a given
    // combination of attribute values for a given animation.
    //
    "get_cache_name" : function (uri, attrs) {
        var cache_id = uri;
        var props = Object.getOwnPropertyNames(attrs);
        props.sort(); // lexicographic sort
        ITER(p, props) {
            cache_id += ";" + props[p] + ":" + attrs[props[p]];
        }
        return cache_id;
    },

    // [+] please.gani.on\_bake\_ani\_frameset(uri, ani)
    //
    // **DEPRECATED** Since this handler was originally defined, WebGL
    // has progressed enough to the point that M.GRL will not be
    // providing any other rendering mechanisms.  This was intended to
    // bake the sprites into a single image via the magic of the
    // canvas element.  This, however, was never utilized and probably
    // never will be.
    //
    // Override this method to hook you own rendering system into the
    // .gani parser.  The ani parameter provides access to the frame
    // data and calculated sprite offsets and attribute names.
    //
    "on_bake_ani_frameset" : function (uri, ani) {
        // bs frame bake handler
        var cache_id = please.gani.get_cache_name(uri, ani.attrs);
        if (!please.gani.__frame_cache[cache_id]) {
            please.gani.__frame_cache[cache_id] = true;
        }
    },
#ifdef WEBGL
    // not deprecated, though pretty much everything else in this
    // namespace is.
    "build_gl_buffers" : function (animation_data) {
    },
#endif
};


/**
 * Determines if the string contains only a number:
 * @function 
 * @memberOf mgrl.defs
 *
 * @param {Object} param

 * An object to be tested to see if it is a Number or a String that
 * may be parsed as a Number.
 *
 * @return {Boolean} Boolean value.
 *
 * @example
 * please.gani.is_number_def(10); // return true
 * please.gani.is_number_def("42"); // return true
 * please.gani.is_number_def("one hundred"); // return false
 * please.gani.is_number_def({}); // return false
 */


// [+] please.gani.is\_number\_def(param)
//
// **DEPRECATED** this method will likely be renamed in the future,
// or removed all together if .gani parsing functionality is spun off
// into its own library.
//
// **Warning** the name of this method is misleading - it is intended
// to determine if a block of text in a .gani file refers to a number.
//
// This method returns true if the parameter passed to it is either a
// number object or a string that contains only numerical characters.
// Otherwise, false is returned.
//
// - **param** Some object, presumably a string or a number.
//
please.gani.is_number_def = function (param) {
    if (typeof(param) === "number") {
        return true;
    }
    else if (typeof(param) === "string") {
        var found = param.match(/^\d+$/i);
        return (found !== null && found.length === 1);
    }
    else {
        return false;
    }
};


// [+] please.gani.is\_attr(param)
//
// **DEPRECATED** this method will likely be renamed in the future,
// or removed all together if .gani parsing functionality is spun off
// into its own library.
//
// Determines if a string passed to it describes a valid gani
// attribute name.  Returns true or false.
//
// - **param** A string that might refer to a .gani attribute
// something else.
//
please.gani.is_attr = function (param) {
    if (typeof(param) === "string") {
        var found = param.match(/^[A-Za-z]+[0-9A-Za-z]*$/);
        return (found !== null && found.length === 1);
    }
    else {
        return false;
    }
};


// Function returns Animation Instance object.  AnimationData.create()
// wraps this function, so you don't need to use it directly.
please.media.__AnimationInstance = function (animation_data) {
    console.info("DEPRECATION WARNING: old gani instancing functionality to be removed in a future update.\nGani parsing and non-webgl rendering functionality will eventually be pulled out into its own library to be used by m.grl.  Please use .instance() instead of .create() to create animation instances with the scene graph.");
    var ani = {
        "data" : animation_data,
        "__attrs" : {},
        "attrs" : {},
        "sprites" : {},
        "frames" : [],
        "__start_time" : 0,
        "__frame_pointer" : 0,
        "__frame_cache" : undefined,
        "__dir" : 2, // index of "north" "east" "south" "west"
        // access .__dir via .dir

        // method functions
        "change_animation" : function (animation_data) {},
        "play" : function () {},
        "stop" : function () {},
        "get_current_frame" : function () {},
        "__set_dirty" : function (regen_cache) {},

        // event handler
        "on_dirty" : function (ani, frame_data) {},
        "on_change_reel" : function (ani, new_ani) {},
    };

    Object.defineProperty(ani, "dir", {
        "get" : function () {
            return ani.__dir;
        },
        "set" : function (value) {
            var old_val = ani.__dir;
            ani.__dir = value % 4;
            if (ani.__dir !== old_val) {
                ani.__set_dirty(true);
            }
            return ani.__dir;
        },
    });


    // This is used to bind an object's proprety to an "attribute".
    var bind_or_copy = function (object, key, value) {
        if (please.gani.is_attr(value)) {
            var getter = function () {
                return ani.__attrs[value];
            };
            Object.defineProperty(object, key, {"get":getter});
        }
        else {
            object[key] = value;
        }
    };
    

    // advance animaiton sets up events to flag when the animation has
    // updated
    var advance = function (time_stamp) {
        if (!time_stamp) {
            time_stamp = please.time.__last_frame;
        }
        var progress = time_stamp - ani.__start_time;
        var frame = ani.get_current_frame(progress);
        if (frame === -1) {
            // This means we tried to seek past the end of the animation.
            if (typeof(ani.data.setbackto) === "number") {
                // set back to frame
                ani.reset(ani.data.setbackto);
            }
            else if (ani.data.setbackto) {
                // value is another gani
                ani.on_change_reel(ani, ani.data.setbackto);
                stopped = true;
            }
        }
        else {
            if (frame.sound) {
                var resource = please.access(frame.sound.file, true);
                if (resource) {
                    var sound = new Audio();
                    sound.src = resource.src;
                    sound.play();
                }
            }
            ani.__set_dirty();
            please.time.schedule(advance, frame.wait);
        }
    };


    // play function starts the animation sequence
    ani.play = function () {
        ani.__start_time = please.time.__last_frame;
        ani.__frame_pointer = 0;
        advance(ani.__start_time);
    };


    // reset the animation 
    ani.reset = function (start_frame) {
        ani.__start_time = please.time.__last_frame;
        ani.__frame_pointer = 0;
        if (start_frame) {
            ani.__frame_pointer = start_frame;
            for (var i=0; i<start_frame; i+=1) {
                ani.__start_time -= ani.frames[i].wait;
            }
        };
        advance(ani.__start_time);
    };


    // stop the animation
    ani.stop = function () {
        please.time.remove(advance);
    };


    // get_current_frame retrieves the frame that currently should be
    // visible
    ani.get_current_frame = function (progress) {
        if (progress > ani.data.durration) {
            if (ani.data.looping && !typeof(ani.data.setbackto) === "number") {
                progress = progress % ani.data.durration;
            }
            else {
                return -1;
            }
        }
        var offset = 0;
        var start, late = 0;
        ani.__frame_pointer = ani.frames.length -1;
        ITER(i, ani.frames) {
            offset += ani.frames[i].wait;
            if (offset >= progress) {
                start = offset - ani.frames[i].wait;
                late = progress - start;
                ani.__frame_pointer = i;
                break;
            }
        }
        var block = ani.frames[ani.__frame_pointer]
        var frame;
        if (block) {
            frame = block.data[ani.data.single_dir ? 0 : ani.dir];
            frame.wait = block.wait - late;
            frame.sound = block.sound;
        }
        if (frame) {
            ani.__frame_cache = frame;
        }
        return frame;
    };


    // Event for baking frame sets
    var pending_rebuild = false;
    ani.__cue_rebuild = function () {
        if (!pending_rebuild) {
            pending_rebuild = true;
            please.postpone(function () {
                please.gani.on_bake_ani_frameset(ani.data.__uri, ani);
                pending_rebuild = false;
            });
        }
    };


    // Schedules a repaint
    ani.__set_dirty = function (regen_cache) {
        if (regen_cache) {
            var block = ani.frames[ani.__frame_pointer]
            var frame;
            if (block) {
                frame = block.data[ani.data.single_dir ? 0 : ani.dir];
                frame.wait = block.wait;
                frame.sound = block.sound;
            }
            if (frame) {
                ani.__frame_cache = frame;
            }
        }
        if (ani.on_dirty) {
            ani.on_dirty(ani, ani.__frame_cache);
        }
    };

    
    // Defines the getters and setters a given property on ani.attrs
    var setup_attr = function (property) {
        var handle = property.toLowerCase();
        Object.defineProperty(ani.attrs, handle, {
            "get" : function () {
                return ani.__attrs[property];
            },
            "set" : function (value) {
                if (value !== ani.__attrs[property] && ani.__frame_cache) {
                    ani.__set_dirty();
                    ani.__cue_rebuild();
                }
                return ani.__attrs[property] = value;
            },
        });
    };


    // called when the object is created but also if the animation is
    // changed at some point.
    var build_bindings = function () {
        // first, pull in any new defaults:
        ITER_PROPS (prop, ani.data.attrs) {
            var datum = ani.data.attrs[prop];
            if (!ani.__attrs.hasOwnProperty(prop)) {
                ani.__attrs[prop] = datum;
                setup_attr(prop);
            }
        }

        // next, copy over sprite defs and do data binding:
        ani.sprites = {};
        ITER_PROPS(sprite_id, ani.data.sprites) {
            var copy_target = ani.data.sprites[sprite_id];
            var sprite = {};
            for (var prop in copy_target) {
                var datum = copy_target[prop];
                bind_or_copy(sprite, prop, datum);
            }
            ani.sprites[sprite_id] = sprite;
        }
        
        // last, copy over the framesets and do data binding:
        ani.frames = [];
        ITER(i, ani.data.frames) {
            var target_block = ani.data.frames[i];
            var block = {
                "data" : [],
                "wait" : target_block.wait,
                "sound" : false,
            }                
            if (target_block.sound) {
                block.sound = {};
                ITER_PROPS(sound_prop, target_block.sound) {
                    var value = target_block.sound[sound_prop];
                    bind_or_copy(block.sound, sound_prop, value);
                }
            }
            ITER(k, target_block.data) {
                var dir = target_block.data[k];
                block.data.push([]);
                ITER(n, dir) {
                    var target_key = dir[n];
                    var key = {};
                    ITER_PROPS(key_prop, target_key) {
                        var value = target_key[key_prop];
                        bind_or_copy(key, key_prop, value);
                    }
                    block.data[k].push(key);
                }
            }
            ani.frames.push(block);
        }
        ani.__frame_pointer = 0;
    };
    build_bindings();
    return ani;
};


// Constructor function, parses gani files
please.media.__AnimationData = function (gani_text, uri) {
    var ani = {
        "__raw_data" : gani_text,
        "__resources" : {}, // files that this gani would load, using dict as a set
        "__uri" : uri,

        "sprites" : {},
        // 'sprites' is an object, not an array, but all of the keys
        // are numbers.  Values are objects like so:
        /*
        0 : {
            'hint' : "Coin Frame 1",
            'resource': "COIN",
            'x': 0, 
            'y': 0, 
            'w': 32, 
            'h': 32,
        }
        */

        "attrs" : {
            /*
            "SPRITES" : "sprites.png",
            "HEAD" : "head19.png",
            "BODY" : "body.png",
            "SWORD" : "sword1.png",
            "SHIELD" : "shield1.png",
            */
        },
        
        "frames" : [],
        /*
        {"data" : [
            // index corresponds to facing index "dir", so there 
            // will be 1 or 4 entries here.
            // this is determined by 'single dir'
            [{"sprite" : 608, // num is the key for this.sprites
              "x" : -8,
              "y" : -16,

              // these are used by webgl
              "ibo_start" : 0,
              "ibo_total" : 10,
              },
             //...
            ],
        ],
         "wait" : 40, // frame duration
         "sound" : false, // or sound to play
        },
        // ...
        */

        "base_speed" : 50,
        "durration" : 0,
        
        "single_dir" : false,
        "looping" : false,
        "continuous" : false,
        "setbackto" : false,

        "create" : function () {},
#ifdef WEBGL
        "vbo" : null,
        "ibo" : null,
        "instance" : function () {},
#endif
    };

    // the create function returns an AnimationInstance for this
    // animation.
    ani.create = function () {
        return please.media.__AnimationInstance(ani);
    };

    var frames_start = 0;
    var frames_end = 0;
    var defs_phase = true;

    var lines = gani_text.split("\n");
    ITER(i, lines) {
        var line = lines[i].trim();
        if (line.length == 0) {
            continue;
        }
        var params = please.split_params(line);

        if (defs_phase) {
            // update a sprite definition
            if (params[0] === "SPRITE") {
                var sprite_id = Number(params[1]);
                var sprite = {
                    "hint" : params.slice(7).join(" "),
                };
                var names = ["resource", "x", "y", "w", "h"];
                ITER(k, names) {
                    var datum = params[k+2];
                    var name = names[k];
                    if (please.gani.is_attr(datum)) {
                        sprite[name] = datum.toLowerCase();
                    }
                    else {
                        if (k > 0 && k < 5) {
                            sprite[name] = Number(datum);
                        }
                        else {
                            if (k == 0) {
                                ani.__resources[datum] = true;
                            }
                            sprite[name] = datum;
                        }
                    }
                }
                ani.sprites[sprite_id] = sprite;
            }


            // single direction mode
            if (params[0] === "SINGLEDIRECTION") {
                ani.single_dir = true;
            }

            // loop mode
            if (params[0] === "LOOP") {
                ani.looping = true;
                if (!ani.setbackto) {
                    ani.setbackto = 0;
                }
            }

            // continuous mode
            if (params[0] === "CONTINUOUS") {
                ani.continuous = true;
            }

            // setbackto setting
            if (params[0] === "SETBACKTO") {
                ani.continuous = false;
                if (please.gani.is_number_def(params[1])) {
                    ani.setbackto = Number(params[1]);
                }
                else {
                    var next_file = params[1];
                    if (!next_file.endsWith(".gani")) {
                        next_file += ".gani";
                    }
                    ani.setbackto = next_file;
                    ani.__resources[next_file] = true;
                }
            }
            
            // default values for attributes
            if (params[0].startsWith("DEFAULT")) {
                var attr_name = params[0].slice(7).toLowerCase();
                var datum = params[1];
                if (please.gani.is_number_def(params[1])) {
                    datum = Number(datum);
                }
                ani.attrs[attr_name] = datum;
            }

            
            // determine frameset boundaries
            if (params[0] === "ANI") {
                frames_start = i+1;
                defs_phase = false;
            }
        }
        else {
            if (params[0] === "ANIEND") {
                frames_end = i-1;
            }
        }
    }


    // add default attrs that might be file names to the load queue
    ITER_PROPS(attr, ani.attrs) {
        var datum = ani.attrs[attr];
        if (typeof(datum) !== "number") {
            ani.__resources[datum] = true;
        }
    }


    // next up is to parse out the frame data
    var pending_lines = [];
    var frame_size = ani.single_dir ? 1 : 4;

    var parse_frame_defs = function (line) {
        // parses a single direction's data from a frame line in the
        // gani file
        var defs =  please.split_params(line, ",");
        var frame = [];
        ITER(k, defs) {
            var chunks = please.split_params(defs[k], " ");
            var names = ["sprite", "x", "y"];
            var sprite = {};
            ITER(n, names) {
                var name = names[n];
                var datum = chunks[n];
                if (please.gani.is_attr(datum)) {
                    sprite[name] = datum;
                }
                else {
                    sprite[name] = Number(datum);
                }
            }
            frame.push(sprite);
        }
        return frame;
    };

    for (var i=frames_start; i<=frames_end; i+=1) {
        var line = lines[i].trim();
        pending_lines.push(line);
        if (pending_lines.length > frame_size && line.length === 0) {
            // blank line indicates that the pending data should be
            // processed as a new frame.            
            var frame = {
                "data" : [],
                "wait" : ani.base_speed,
                "sound" : false,
            }
            for (var dir=0; dir<frame_size; dir+=1) {
                // frame.data.length === 1 for singledir and 4 for multidir
                frame.data.push(parse_frame_defs(pending_lines[dir]));
            }
            for (var k=frame_size; k<pending_lines.length; k+=1) {
                var params = please.split_params(pending_lines[k]);
                if (params[0] === "WAIT") {
                    frame.wait = ani.base_speed*(Number(params[1])+1);
                }
                else if (params[0] === "PLAYSOUND") {
                    var sound_file = params[1];
                    if (!please.gani.is_attr(sound_file)) {
                        ani.__resources[sound_file] = true;
                    }
                    frame.sound = {
                        "file" : sound_file,
                        "x" : Number(params[2]),
                        "y" : Number(params[3]),
                    };
                }
            }
            ani.frames.push(frame);
            pending_lines = [];
        }
    }

    // calculate animation durration
    ITER(i, ani.frames) {
        ani.durration += ani.frames[i].wait;
    };


    // Convert the resources dict into a list with no repeating elements eg a set:
    ani.__resources = please.get_properties(ani.__resources);

    ITER(i, ani.__resources) {
        var file = ani.__resources[i].toLowerCase();
        if (file.indexOf(".") === -1) {
            file += ".gani";
        }
        try {
            please.load(file);
        } catch (err) {
            console.warn(err);
        }
    }

    if (typeof(please.gani.on_bake_ani_frameset) === "function") {
        please.postpone(function () {
            please.gani.on_bake_ani_frameset(ani.__uri, ani);
        });
    }

#ifdef WEBGL
    // return a graph node instance of this animation
    ani.instance = function (alpha) {
        DEFAULT(alpha, true);
        var node = new please.GraphNode();
        node.__drawable = true;
        node.ext = {};
        node.vars = {};
        node.samplers = {};
        node.draw_type = "sprite";
        node.sort_mode = "alpha";

        // cache of gani data
        node.__ganis = {};
        node.__current_gani = null;
        node.__current_frame = null;

        var get_action_name = function (uri) {
            var name = uri.split("/").slice(-1)[0];
            if (name.endsWith(".gani")) {
                name = name.slice(0, -5);
            }
            return name;
        };

        // The .add_gani method can be used to load additional
        // animations on to a gani graph node.  This is useful for
        // things like characters.
        node.add_gani = function (resource) {
            if (typeof(resource) === "string") {
                resource = please.access(resource);
            }
            // We just want 'resource', since we don't need any of the
            // animation machinery and won't be state tracking on the
            // gani object.
            var ani_name = resource.__uri;
            var action_name = get_action_name(ani_name);
            if (!node.__ganis[action_name]) {
                node.__ganis[action_name] = resource;
                
                if (please.renderer.name == "gl" && !resource.ibo) {
                    // build the VBO and IBO for this animation.
                    please.gani.build_gl_buffers(resource);
                }
                else if (please.renderer.name == "dom") {
                    node.div = please.overlay.new_element();
                    node.canvas = document.createElement("canvas");
                    node.div.appendChild(node.canvas);
                    node.div.bind_to_node(node);
                    node.canvas.width = please.dom.orthographic_grid * 2;
                    node.canvas.height = please.dom.orthographic_grid * 2;
                    node.context = node.canvas.getContext("2d");
                }

                // Bind new attributes
                please.prop_map(resource.attrs, function (name, value) {
                    if (!node[name]) {
                        node[name] = value;
                        //please.make_animatable(node, name, value);
                    }
                });

                // Bind direction handle
                if (!node.hasOwnProperty("dir")) {
                    var write_hook = function (target, prop, obj) {
                        var cache = obj.__ani_cache;
                        var store = obj.__ani_store;
                        var old_value = store[prop];

                        var new_value = Math.floor(old_value % 4);
                        if (new_value < 0) {
                            new_value += 4;
                        }
                        if (new_value !== old_value) {
                            cache[prop] = null;
                            store[prop] = new_value;
                        }
                    };
                    please.make_animatable(node, "dir", 0, null, null, write_hook);
                }

                // Generate the frameset for the animation.
                var score = resource.frames.map(function (frame) {
                    var callback;
                    if (please.renderer.name == "dom") {
                        callback = function (speed, skip_to) {
                            node.context.clearRect(0, 0, node.canvas.width, node.canvas.height);
                            for (var i = 0; i < frame.data[node.dir].length; ++i) {
                                var f = frame.data[node.dir][i];
                                var sprite = resource.sprites[f.sprite];
                                var uri = resource.attrs[sprite.resource];
                                var asset = please.access(uri);
                                node.context.drawImage(asset, sprite.x, sprite.y, sprite.w, sprite.h, f.x, f.y, sprite.w, sprite.h);
                            }
                        };
                    }
                    else {
                        callback = function (speed, skip_to) {
                            // FIXME play frame.sound
                            node.__current_frame = frame;
                            node.__current_gani = resource;
                        };
                    }
                    return {
                        "speed" : frame.wait,
                        "callback" : callback,
                    };
                });
                
                // add the action for this animation
                please.time.add_score(node, action_name, score);

                // configure the new action
                var action = node.actions[action_name];
                action.repeat = resource.looping;
                //action.queue = resource.setbackto; // not sure about this
            }
        };
        node.add_gani(this);
        node.play(get_action_name(this.__uri));


        // draw function for the animation
        node.draw = function () {
            var frame = node.__current_frame;
            var resource = node.__current_gani;
            if (frame) {
                if (node.sort_mode === "alpha") {
                    gl.depthMask(false);
                }
                else {
                    var offset_factor = -1;
                    var offset_units = -10; // was -2
                    gl.enable(gl.POLYGON_OFFSET_FILL);
                }
                resource.vbo.bind();
                resource.ibo.bind();

                var ibo = resource.ibo;
                
                var dir = resource.single_dir ? 0 : node.dir;
                var draw_set = frame.data[dir];
                ITER(i, draw_set) {
                    var blit = draw_set[i];
                    var attr = resource.sprites[blit.sprite].resource;
                    //var asset_name = resource.attrs[attr];
                    var asset_name = node[attr];
                    var asset = please.access(asset_name, null);
                    if (asset) {
                        asset.scale_filter = "NEAREST";
                    }
                    var prog = please.gl.get_program();
                    prog.samplers["diffuse_texture"] = asset_name;
                    if (node.sort_mode !== "alpha") {
                        gl.polygonOffset(offset_factor, offset_units*i);
                    }
                    ibo.draw(blit.ibo_start, blit.ibo_total);
                }
                if (node.sort_mode === "alpha") {
                    gl.depthMask(true);
                }
                else {
                    gl.disable(gl.POLYGON_OFFSET_FILL);
                }
            }
        };
        return node;
    };
#endif
    return ani;
};


#ifdef WEBGL
// [+] please.gani.build\_gl\_buffers(ani)
//
// This method builds the buffer objects needed to render an instance
// of the animation via WebGL.  The buffer objects are saved upon the
// animation object.
//
please.gani.build_gl_buffers = function (ani) {
    if (ani.vbo && ani.ibo) {
        // Buffer objects are already present, so do nothing.
        return;
    }

    var builder = new please.builder.SpriteBuilder(
        false, please.gani.resolution);
    var directions = ani.single_dir ? 1 : 4;

    var images = {};
    ITER_PROPS(sprite, ani.attrs) {
        var asset_name = ani.attrs[sprite];
        var lower = asset_name.toLowerCase();
        if (lower.endsWith(".png") || lower.endsWith(".jpg") || lower.endsWith(".gif") || lower.endsWith(".jpeg")) {
            // it is required that the default images are
            // all loaded before the vbo can be built
            var asset = please.access(asset_name, false);
            console.assert(asset);
            images[sprite] = asset;
        }
    };

    for (var dir = 0; dir<directions; dir +=1) {
        for (var f = 0; f<ani.frames.length; f+=1) {
            var defs = ani.frames[f].data[dir];
            for (var i=0; i<defs.length; i+=1) {
                var part = ani.frames[f].data[dir][i];
                var sprite = ani.sprites[part.sprite];
                var img = images[sprite.resource];
                var width = img.width;
                var height = img.height;
                var clip_x = sprite.x;
                var clip_y = sprite.y;
                var clip_width = sprite.w;
                var clip_height = sprite.h;
                var offset_x = part.x-24;
                var offset_y = 48-part.y-clip_height;
                var receipt = builder.add_flat(
                    width, height, clip_x, clip_y,
                    clip_width, clip_height, 
                    offset_x, offset_y);
                part.ibo_start = receipt.offset;
                part.ibo_total = receipt.count;
            }
        }
    }

    var buffers = builder.build();
    ani.vbo = buffers.vbo;
    ani.ibo = buffers.ibo;
};
#endif
