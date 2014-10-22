// - m.jta.js ------------------------------------------------------------- //


// "jta" media type handler
please.media.search_paths.jta = "";
please.media.handlers.jta = function (url, callback) {
    var media_callback = function (req) {
        please.media.assets[url] = please.gl.__jta_model(req.response, url);
    };
    please.media.__xhr_helper("text", url, media_callback, callback);
};


// JTA model loader.  This is just a quick-and-dirty implementation.
please.gl.__jta_model = function (src, uri) {
    // The structure of a JTA file is json.  Large blocks of agregate
    // data are base64 encoded binary data.

    var directory = JSON.parse(src);
    var groups = directory["vertex_groups"];
    var uniforms = directory["vars"];
    var model = {
        "__groups" : [],
        "uniforms" : {},

        "bind" : function () {
            for (var i=0; i<this.__groups.length; i+=1) {
                this.__groups[i].bind();
            }
        },

        "draw" : function () {
            for (var i=0; i<this.__groups.length; i+=1) {
                this.__groups[i].draw();
            }
        },
    };

    // Note suggested uniform values, unpack data, and possibly queue
    // up additional image downloads:
    please.get_properties(uniforms).map(function(name) {
        var meta = uniforms[name];
        if (meta.hint === "Sampler2D") {
            var uri;
            if (meta.mode === "linked") {
                uri = meta.uri;
                if (please.gl.relative_lookup) {
                    please.relative_load("img", uri);

                }
                else {
                    please.load("img", uri);                    
                }
            }
            else if (meta.mode === "packed") {
                uri = meta.md5;
                if (!please.access(uri, true)) {
                    var img = new Image();
                    img.src = meta.uri;
                    please.media.assets[uri] = img;
                }
            }
            else {
                console.error("Cannot load texture of type: " + meta.mode);
            }
            if (uri) {
                model.uniforms[name] = uri;
            }
        }
        else {
            console.warn("Not implemented: " + meta.hint);
        }
    });


    // Create our attribute lists.  Closure to avoid scope polution.
    please.get_properties(groups).map(function(name) {
        var vertices = groups[name];
        if (!vertices.position) {
            throw("JTA model " + uri + " is missing the 'position' attribute!!");
        }

        var attr_map = {};

        for (var attr in vertices) {
            var hint = vertices[attr].hint;
            var raw = vertices[attr].data;
            attr_map[attr] = please.typed_array(raw, hint);
        }

        var faces = attr_map.position.length / 3;
        var vbo = please.gl.vbo(faces, attr_map);

        if (vbo) {
            console.info("Created vbo for: " + uri + " / " + name);
            model.__groups.push(vbo);
        }
    });

    return model;
};
