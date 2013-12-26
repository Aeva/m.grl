// - m.ani.js --------------------------------------------------------------- //


// "gani" media type handler
please.media.search_paths.ani = "";
please.media.handlers.ani = function (url, callback) {
    var req = new XMLHttpRequest();
    please.media._push(req);
    req.onload = function () {
        please.media.assets[url] = new please.media.__Animation(req.response);
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


// Constructor function, parses gani files
please.media.__Animation = function (gani_text) {
    var ani = {
        "__raw_data" : gani_text,
        "__resources" : {}, // files that this gani would load, using dict as a set

        "__sprites" : {},
        "__attrs" : {},
        "__frames" : [],
        
        "single_dir" : false,
        "__setbackto" : 0,

        "get_attr" : function (name) {},
        "set_attr" : function (name, value) {},
    };

    var frames_start = 0;
    var frames_end = 0;

    var split_params = function (line, delim) {
        if (delim === undefined) {
            delim = " ";
        }
        var parts = line.split(delim);
        var params = [];
        for (var i=0; i<parts.length; i+=1) {
            var check = parts[i].trim();
            if (check.length > 0) {
                params.push(check);
            }
        }
        return params;
    };

    var is_number = function (param) {
        var found = param.match(/^\d+$/i);
        return (found !== null && found.length === 1);
    };

    var is_attr = function (param) {
        var found = param.match(/^[A-Z]+[0-9A-Z]*$/);
        return (found !== null && found.length === 1);
    };

    var bind_attr = function (sprite, property, attr_name) {
        if (ani.__attrs[attr_name] === undefined) {
            var value;
            switch (attr_name) {               
            case "SPRITES":
                value = "sprites.png";
                break;
            case "SHIELD":
                value = "shield1.png";
                break;
            case "SWORD":
                value = "sword1.png";
                break;
            case "HEAD":
                value = "head19.png";
                break;
            case "BODY":
                value = "body.png";
                break;
            case "ATTR1":
                value = "hat0.png";
                break;
            default:
                value = 0;
            }
            ani.__attrs[attr_name] = value;
            if (value !== 0) {
                ani.__resources[value] = true;
            }
        };
        var getter = function () {
            return ani.__attrs[attr_name];
        };
        Object.defineProperty(sprite, property, {"get":getter});
    };

    var get_properties = function (dict) {
        var list = [];
        for (var prop in dict) {
            if (dict.hasOwnProperty(prop)) {
                list.push(prop);
            }
        }
        return list;
    };

    var defs_phase = true;
    var lines = gani_text.split("\n");
    for (var i=0; i<lines.length; i+=1) {
        var line = lines[i].trim();
        if (line.length == 0) {
            continue;
        }
        var params = split_params(line);

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
                    if (is_attr(datum)) {
                        bind_attr(sprite, name, datum);
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
                ani.__sprites[sprite_id] = sprite;
            }

            
            // default values for attributes
            if (params[0].startsWith("DEFAULT")) {
                var attr_name = params[0].slice(7);
                var datum = params[1];
                if (is_number(params[1])) {
                    datum = Number(datum);
                }
                else {
                    ani.__resources[datum] = true;
                }
                ani.__attrs[attr_name] = datum;
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


    // pdq just to do something interesting with the data - almost
    // certainly implemented wrong
    for (var i=frames_start; i<=frames_end; i+=1) {
        var line = lines[i].trim();
        if (line.length === 0) {
            // whitespace might actually be important
            continue;
        }
        var params = split_params(line);
        if (params[0] === "WAIT") {
        }
        else if (params[0] === "PLAYSOUND") {
        }
        else if (is_number(params[0]) || is_attr(params[1])) {
            // line is a frame definition
            var defs = split_params(line, ",");
            var frame = [];
            for (var k=0; k<defs.length; k+=1) {
                var chunks = split_params(defs[k], " ");
                var names = ["sprite", "x", "y"];
                var sprite = {};
                for (var n=0; n<names.length; n+=1) {
                    var name = names[n];
                    var datum = chunks[n];
                    if (is_attr(datum)) {
                        bind_attr(sprite, name, datum);
                    }
                    else {
                        sprite[name] = Number(datum);
                    }
                }
                frame.push(sprite);
            }
            ani.__frames.push(frame);
        }
    }


    // Convert the resources dict into a list with no repeating elements eg a set:
    ani.__resources = get_properties(ani.__resources);
    var img_types = [".png", ".gif", ".mng"];

    for (var i=0; i<ani.__resources.length; i+=1) {
        var type, file = ani.__resources[i];
        if (file.indexOf(".") === -1) {
            file += ".gani";
        }
        if (file.endsWith(".gani")) {
            type = "ani";
        }
        else {
            for (var t=0; t<img_types.length; t+=1) {
                if (file.endsWith(img_types[t])) {
                    type = "img";
                }
            }
        }
        var uri = please.relative(type, file);
        please.load(type, uri);
    }

    return ani;
};