// - m.ani.js --------------------------------------------------------------- //


// "gani" media type handler
please.media.search_paths.ani = "";
please.media.handlers.ani = function (url, callback) {
    var req = new XMLHttpRequest();
    please.media._push(req);
    req.onload = function () {
        //please.media.assets[url] = new please.media.__Animation(req.response);
        please.media.assets[url] = new please.media.__AnimationData(req.response);
        if (typeof(callback) === "function") {
            please.schedule(function(){callback("pass", url);});
        }
        please.media._pop(req);
    };
    req.onerror = function () {
        if (typeof(callback) === "function") {
            please.schedule(function(){callback("fail", url);});
        }
        please.media._pop(req);
    };
    req.open('GET', url, true);
    req.responseType = "text";
    req.send();
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
        "__frame_pointer" : 0,
        "__frame_cache" : undefined,
        "__dir" : 2, // index of "north" "east" "south" "west"
        // access .__dir via .dir

        // method functions
        "change_animation" : function (animation_data) {},
        "play" : function () {},
        "get_current_frame" : function () {},

        // event handler
        "on_dirty" : function (ani, frame_data) {},
        "on_change_reel" : function (ani, new_ani) {},
    };

    Object.defineProperty(ani, "dir", {
        "get" : function () {
            return ani.__dir;
        },
        "set" : function (value) {
            return ani.__dir = value % 4;
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
        ani.__frame_pointer += 1;
        try {
            var frame = ani.__frame_cache = ani.get_current_frame();
        } catch (err) {
            var frame = undefined;
        }
        if (frame === undefined) {
            var stopped = true;
            var pointer_changed = false;
            if (ani.data.looping) {
                // looping
                ani.__frame_pointer = -1;
                pointer_changed = true;
                stopped = false;
            }
            if (ani.data.setbackto === false) {
                pointer_changed = false;
                stopped = true;
            }
            else if (typeof(ani.data.setbackto) === "number") {
                // set back to frame
                pointer_changed = true;
                ani.__frame_pointer = ani.data.setbackto - 1;
            }
            else if (ani.data.setbackto) {
                // value is a file name
                // FIXME: implement
                console.warn("gani linking not yet supported");
                stopped = true; // wouldn't normally be the case
            }
            if (ani.data.continuous) {
                // not really sure what this is for
            }
            if (pointer_changed) {
                advance(stopped);
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
                timer = setTimeout(advance, frame.durration);
            }
        }
    };


    // play function starts the animation sequence
    ani.play = function () {
        ani.__frame_pointer = -1;
        advance();
    };


    // get_current_frame retrieves the frame that currently should be
    // visible
    ani.get_current_frame = function () {
        var block_i = ani.__frame_pointer;
        var dir = ani.dir;
        if (ani.data.single_dir) {
            dir = ani.__frame_pointer % 4;
            block_i = Math.floor(ani.__frame_pointer / 4);
        }
        var frame = ani.frames[block_i][dir];
        frame.durration = ani.frames[block_i].durration;
        if (!ani.data.single_dir || dir === 0) {
            frame.sound = ani.frames[block_i].sound;
        }
        return frame;
    };


    // Schedules a repaint
    ani.__set_dirty = function () {
        if (ani.on_dirty) {
            window.requestAnimationFrame(function () {
                ani.on_dirty(ani, ani.__frame_cache);
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
        for (var prop in ani.data.attrs) {
            if (ani.data.attrs.hasOwnProperty(prop)) {
                var datum = ani.data.attrs[prop];
                if (!ani.__attrs.hasOwnProperty(prop)) {
                    ani.__attrs[prop] = datum;
                    setup_attr(prop);
                }
            }
        }

        // next, copy over sprite defs and do data binding:
        ani.sprites = {};
        for (var sprite_id in ani.data.sprites) {
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
        for (var i=0; i<ani.data.frames.length; i+=1) {
            var target_block = ani.data.frames[i];
            var block = [];
            if (target_block.wait !== undefined) {
                bind_or_copy(block, "wait", target_block.wait);
            }
            block.durration = ani.data.base_speed;
            if (block.wait) {
                block.durration = ani.data.base_speed*(block.wait+1);
            }
            if (target_block.sound !== undefined) {
                block.sound = {};
                for (var sound_prop in target_block.sound) {
                    var value = target_block.sound[sound_prop];
                    bind_or_copy(block.sound, sound_prop, value);
                }
            }
            for (var k=0; k<target_block.length; k+=1) {
                var keyframe = target_block[k];
                block.push([]); // add keyframe to new block
                for (var s=0; s<keyframe.length; s+=1) {
                    var target_key = keyframe[s];
                    var key = {};
                    for (var key_prop in target_key) {
                        var value = target_key[key_prop];
                        bind_or_copy(key, key_prop, value);
                    }
                    block[k].push(key);
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
    for (var i=0; i<lines.length; i+=1) {
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
                for (var k=0; k<names.length; k+=1) {
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
    var attr_names = please.get_properties(ani.attrs);
    for (var i=0; i<attr_names.length; i+=1) {
        var attr = attr_names[i];
        var datum = ani.attrs[attr];
        if (typeof(datum) !== "number") {
            ani.__resources[datum] = true;
        }
    }


    // next up is to parse out the frame data
    var last_frame = -1;
    var new_block = function () {
        last_frame += 1;
        ani.frames.push([]);
    };
    new_block();

    // pdq just to do something interesting with the data - almost
    // certainly implemented wrong
    for (var i=frames_start; i<=frames_end; i+=1) {
        var line = lines[i].trim();
        if (line.length === 0) {
            // whitespace might actually be important
            continue;
        }
        var params = please.split_params(line);
        if (params[0] === "WAIT") {
            ani.frames[last_frame].wait = Number(params[1]);
        }
        else if (params[0] === "PLAYSOUND") {
            var sound_file = params[1];
            if (!please.is_attr(sound_file)) {
                ani.__resources[sound_file] = true;
            }
            ani.frames[last_frame].sound = {
                "file" : sound_file,
                "x" : Number(params[2]),
                "y" : Number(params[3]),
            };
        }
        else if (please.is_number(params[0]) || please.is_attr(params[1])) {
            // line is a frame definition
            if (ani.frames[last_frame].length === 4) {
                new_block();
            }

            var defs = please.split_params(line, ",");
            var frame = [];                
            for (var k=0; k<defs.length; k+=1) {
                var chunks = please.split_params(defs[k], " ");
                var names = ["sprite", "x", "y"];
                var sprite = {};
                for (var n=0; n<names.length; n+=1) {
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
            ani.frames[last_frame].push(frame);
        }
    }


    // Convert the resources dict into a list with no repeating elements eg a set:
    ani.__resources = please.get_properties(ani.__resources);

    for (var i=0; i<ani.__resources.length; i+=1) {
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



