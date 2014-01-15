// - m.ani.js --------------------------------------------------------------- //


// "gani" media type handler
please.media.search_paths.ani = "";
please.media.handlers.ani = function (url, callback) {
    var media_callback = function (req) {
        //please.media.assets[url] = new please.media.__Animation(req.response);
        please.media.assets[url] = new please.media.__AnimationData(req.response);
    };
    please.media.__xhr_helper("text", url, media_callback, callback);
};


// Function returns Animation Instance object.  AnimationData.create()
// wraps this function, so you don't need to use it directly.
please.media.__AnimationInstance = function (animation_data) {
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
        if (please.is_attr(value)) {
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
    var timer = -1;
    var advance = function (stop_animation/*=false*/) {
        clearTimeout(timer);
        var progress = Date.now() - ani.__start_time;
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
                var uri = please.relative("audio", frame.sound.file);
                var resource = please.access(uri, true);
                if (resource) {
                    var sound = new Audio();
                    sound.src = resource.src;
                    sound.play();
                }
            }
            ani.__set_dirty();
            if (!stop_animation) {
                timer = setTimeout(advance, frame.wait);
            }
        }
    };


    // play function starts the animation sequence
    ani.play = function () {
        ani.__start_time = Date.now();
        ani.__frame_pointer = 0;
        advance();
    };


    // reset the animation 
    ani.reset = function (start_frame) {
        ani.__start_time = Date.now();
        ani.__frame_pointer = 0;
        if (start_frame) {
            ani.__frame_pointer = start_frame;
            for (var i=0; i<start_frame; i+=1) {
                ani.__start_time -= ani.frames[i].wait;
            }
        };
        advance();
    };


    // stop the animation
    ani.stop = function () {
        clearTimeout(timer);
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
        ani.__frame_pointer = ani.frames.length -1;
        ITER(i, ani.frames) {
            offset += ani.frames[i].wait;
            if (offset > progress) {
                ani.__frame_pointer = i;
                break;
            }
        }
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
        return frame;
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
            requestAnimationFrame(function () {
                if (ani.on_dirty) {
                    ani.on_dirty(ani, ani.__frame_cache);
                }
            });
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
please.media.__AnimationData = function (gani_text) {
    var ani = {
        "__raw_data" : gani_text,
        "__resources" : {}, // files that this gani would load, using dict as a set

        "sprites" : {},
        "attrs" : {
            "SPRITES" : "sprites.png",
            "HEAD" : "head19.png",
            "BODY" : "body.png",
            "SWORD" : "sword1.png",
            "SHIELD" : "shield1.png",
        },
        
        "frames" : [],

        "base_speed" : 50,
        "durration" : 0,
        
        "single_dir" : false,
        "looping" : false,
        "continuous" : false,
        "setbackto" : false,

        "create" : function () {},
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
                    if (please.is_attr(datum)) {
                        sprite[name] = datum;
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
                if (please.is_number(params[1])) {
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
                var attr_name = params[0].slice(7);
                var datum = params[1];
                if (please.is_number(params[1])) {
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
                if (please.is_attr(datum)) {
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
                    if (!please.is_attr(sound_file)) {
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
        var type = please.media.guess_type(file);
        try {
            if (type !== undefined) {
                var uri = please.relative(type, file);
                please.load(type, uri);
            }
            else {
                throw("Couldn't determine media type for: " + file);
            }
        } catch (err) {
            console.warn(err);
        }
    }

    return ani;
};



