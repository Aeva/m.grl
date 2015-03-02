// - m.jta.js ------------------------------------------------------------- //


// "jta" media type handler
please.media.search_paths.jta = "";
please.media.handlers.jta = function (url, asset_name, callback) {
    var media_callback = function (req) {
        please.media.assets[asset_name] = please.gl.__jta_model(req.response, url);
    };
    please.media.__xhr_helper("text", url, asset_name, media_callback, callback);
};


// JTA model loader.  This will replace the old one once it works.
please.gl.__jta_model = function (src, uri) {
    // The structure of a JTA file is json.  Large blocks of agregate
    // data are base64 encoded binary data.

    var directory = JSON.parse(src);
    var scene = {
        "uri" : uri,
        "meta" : directory.meta,
        "models" : {},
        "empties" : {},
    };

    // assert a minimum and maximum version number
    console.assert(directory.meta.jta_version >= 0.1);
    console.assert(directory.meta.jta_version < 1.0);

    // unpack textures
    please.gl.__jta_unpack_textures(directory.packed_data);
    directory.packed_data=null;// free up a potentially large amount of memory.

    // stash bones data FIXME: there is no spec yet for this...
    if (directory.bones) {
        scene.bones = bones;
    }

    // stash optional data
    if (directory.extras) {
        scene.extras = extras;
    }

    // extract model data
    var buffer_objects = please.gl.__jta_extract_buffer_objects(
        directory.models, directory.attributes);
    scene.models = please.gl.__jta_extract_models(directory.models, buffer_objects);

    please.prop_map(scene.models, function(name, model) {
        please.prop_map(model.samplers, function(name, uri) {
            // this if-statement is to ignore packed textures, not to
            // verify that relative ones are actually downloaded.
            if (!please.media.assets[uri]) {
                please.load(uri);
            }
        });
    });

    // extract empty graph nodes
    if (directory.empties) {
        scene.empties = please.gl__jta_extract_empties(directory.empties);
    }

    // add a method for generating a GraphNode (or a small tree
    // thereof) for this particular model.
    scene.instance = function (model_name) {
        // model_name can be set to null to return an empty group of
        // all object
        if (!model_name) {
            var models = please.get_properties(scene.models);
            if (models.length === 1) {
                return scene.instance(models[0]);
            }
            else {
                var added = {};
                var root = new please.GraphNode();
                root.__asset = model;
                root.__asset_hint = uri + ":";

                var resolve_inheritance = function (name, model) {
                    if (added[name] === undefined) {
                        var target = root;
                        var node = scene.instance(name);
                        var parent = model.parent;
                        var parent_node;
                        if (parent) {
                            resolve_inheritance(
                                parent,
                                scene.models[parent] || scene.empties[parent]);
                            target = added[parent];
                        }
                        added[name] = node;
                        target.add(node);
                    }
                };

                please.prop_map(scene.empties, function(name, model) {
                    resolve_inheritance(name, model);
                });
                please.prop_map(scene.models, function(name, model) {
                    resolve_inheritance(name, model);
                });
                return root;
            }
        }
        else {
            var model = scene.models[model_name];
            var empty = scene.empties[model_name];
            var entity = model || empty;
            if (entity) {
                var node = new please.GraphNode();
                if (model) {
                    node.__asset_hint = uri + ":" + model.__vbo_hint;
                    node.__asset = model;
                    node.__drawable = true;
                    please.prop_map(model.samplers, function(name, uri) {
                        if (node.shader.hasOwnProperty(name)) {
                            node.shader[name] = uri;
                        }
                    });
                    please.prop_map(model.uniforms, function(name, value) {
                        if (node.shader.hasOwnProperty(name)) {
                            node.shader[name] = value;
                        }
                    });
                    node.bind = function () {
                        model.vbo.bind();
                        model.ibo.bind();
                    };
                    node.draw = function () {
                        ITER_PROPS(group_name, model.groups) {
                            var group = model.groups[group_name];
                            model.ibo.draw(group.start, group.count);
                        };
                    };
                }
                if (entity.extra.position) {
                    node.location_x = entity.extra.position.x;
                    node.location_y = entity.extra.position.y;
                    node.location_z = entity.extra.position.z;
                }
                if (entity.extra.quaternion) {
                    // My 'matrix' math lib uses 'xyzw' for quats
                    // whereas blender prefers 'wxyz', so for the sake
                    // of caution, mgrl uses 'abcd'.
                    node.quaternion_a = entity.extra.quaternion.a;
                    node.quaternion_b = entity.extra.quaternion.b;
                    node.quaternion_c = entity.extra.quaternion.c;
                    node.quaternion_d = entity.extra.quaternion.d;
                }
                else if (entity.extra.rotation) {
                    // Planning on removing the need to convert to
                    // degrees here.  The JTA format should always
                    // store angles in degrees :P
                    node.rotation_x = please.degrees(entity.extra.rotation.x);
                    node.rotation_y = please.degrees(entity.extra.rotation.y);
                    node.rotation_z = please.degrees(entity.extra.rotation.z);
                }
                if (entity.extra.scale) {
                    node.scale_x = entity.extra.scale.x;
                    node.scale_y = entity.extra.scale.y;
                    node.scale_z = entity.extra.scale.z;
                }
                return node;
            }
            else {
                throw("no such object in " + uri + ": " + model_name);
            }
        }
    };

    scene.get_license_html = function () {
        return please.gl.__jta_metadata_html(scene);
    };

    console.info("Done loading " + uri + " ...?");
    return scene;
};


// Create an html snippet from the licensing metadata, if applicable
please.gl.__jta_metadata_html = function (scene) {
    if (scene.meta) {
        var work_title = scene.uri.slice(scene.uri.lastIndexOf("/")+1);
        var author = scene.meta["author"].trim();
        var attrib_url = scene.meta["url"].trim();
        var src_url = scene.meta["src_url"].trim();
        var license_url = scene.meta["license"] ? scene.meta["license"] : "Unknown License";
        var license_name = {
            "http://creativecommons.org/publicdomain/zero/1.0/" : "Public Domain",
            "http://creativecommons.org/licenses/by/4.0/" : "Creative Commons Attribution 4.0",
            "http://creativecommons.org/licenses/by-sa/4.0/" : "Creative Commons Attribution-ShareAlike 4.0",
        }[license_url];
        var license_img_key = {
            "http://creativecommons.org/publicdomain/zero/1.0/" : "p/zero/1.0/80x15.png",
            "http://creativecommons.org/licenses/by/4.0/" : "l/by/4.0/80x15.png",
            "http://creativecommons.org/licenses/by-sa/4.0/" : "l/by-sa/4.0/80x15.png",
        }[license_url];
        var license_img = license_img_key ? "https://i.creativecommons.org/" + license_img_key : null;
        if (!license_name) {
            // If we don't know which license it is, or the work is
            // all rights reserved, it is better to just not return
            // anything.
            return null;
        }
        else {
            var block = null;
            if (license_name !== "Public Domain") {
                // cc-by or cc-by-sa
                var title_part = "<span xmlns:dct='http://purl.org/dc/terms/' " +
                    "property='dct:title'>" + work_title + "</span>";
                var author_part = "<a xmlns:cc='http://creativecommons.org/ns#' " +
                    "href='" + attrib_url + "' property='cc:attributionName' " +
                    "rel='cc:attributionURL'>" + author + "</a>";
                var license_part = "<a rel='license' href='" + license_url + "'>" +
                    license_name + "</a>";
                var block = "<span class='work_attribution'>" +
                    title_part + " by " + author_part + "</span> " +
                    "<span class='work_license'>is licensed under a " +
                    license_part + ".</span> ";
                
                if (src_url.length > 0) {
                    // add the src_url part, if applicable
                    var src_part = "<a xmlns:dct='http://purl.org/dc/terms/' " +
                        "href='" + src_url + "' rel='dct:source'>available here</a>.";
                    block += "<span class='derived_work'>Based on a work " + src_part +
                        "</span>";
                }

                if (license_img) {
                    // add an image badge, if applicable
                    var img_part = "<a rel='license' href='" + license_url + "'>" +
                        "<img alt='Creative Commons License'" +
                        "style='border-width:0' src='" + license_img + "' /></a>";
                    block = img_part + "<div> " + block + "</div>";
                }
            }
            else {
                // public domain
                var block = "To the extent possible under law, " +
                    "<a xmlns:dct='http://purl.org/dc/terms/' rel='dct:publisher' " + 
                    "href='" + attrib_url + "'>" +
                    "<span xmlns:dct='http://purl.org/dc/terms/' property='dct:creator'>" +
                    author + "</span> " +
                    "has waived all copyright and related or neighboring rights to " +
                    "<span xmlns:dct='http://purl.org/dc/terms/' property='dct:title'>" +
                    work_title +" </span>";

                if (license_img) {
                    // add an image badge, if applicable
                    var img_part = "<a rel='license' href='" + license_url + "'>" +
                        "<img alt='CC0'" + "style='border-width:0' src='" + license_img + "' /></a>";
                    block = img_part + " " + "<div> " + block + "</div>";
                }
            }
            if (block !== null) {
                var el = document.createElement("div");
                el.className = "mgrl_asset_license";
                el.innerHTML = block;
                return el;
            }
        }
    }
    return null;
};


// This function extracts a stored typed array.
please.gl.__jta_array = function (array) {
    console.assert(array.type === "Array");
    console.assert(array.hint !== undefined);
    console.assert(array.data !== undefined);
    var blob = array.data;
    var hint = array.hint;
    return please.typed_array(blob, hint);
};


// Extract common node data defined in the jta file.
please.gl__jta_extract_common = function (node_def) {
    return {
        "parent" : node_def.parent,
        "uniforms" : {},
        "samplers" : {},
        "extra" : node_def.extra,
    };
};


// Extract the empty nodes defined in the jta file.
please.gl__jta_extract_empties = function (empty_defs) {
    var empties = please.prop_map(empty_defs, function(name, empty_def) {
        return please.gl__jta_extract_common(empty_def);
    });
    return empties;
};


// Extract the model objects defined in the jta file.
please.gl.__jta_extract_models = function (model_defs, buffer_objects) {
    var models = please.prop_map(model_defs, function(name, model_def) {
        // The model object contains all the data needed to render a
        // singular model within a scene. All of the models in a scene
        // with similar propreties will share the same vbo (within
        // reason).

        var model = please.gl__jta_extract_common(model_def);
        model.__vbo_hint = model_def.struct;
        model.vbo = buffer_objects[model_def.struct]['vbo'];
        model.ibo = buffer_objects[model_def.struct]['ibo'];
        model.groups = [];

        please.prop_map(model_def.groups, function(group_name, group) {
            // groups coorespond to IBOs, but also store the name of
            // relevant bone matrices.
            var group = {
                "start" : group["start"],
                "count" : group["count"],
            };
            model.groups.push(group);
        });
        please.prop_map(model_def.state, function(state_name, state) {
            if (state.type === "Sampler2D") {
                var uri = null;
                if (state.uri.startsWith("ref:")) {
                    // target is relative loaded
                    uri = state.uri.slice(4);
                }
                else if (state.uri.startsWith("packed:")) {
                    // target is a packed image
                    uri = state.uri.slice(7);
                }
                if (uri) {
                    model.samplers[state_name] = uri;
                }
            }
            else if (state.type === "Array") {
                model.uniforms[state_name] = please.gl.__jta_array(state);
            }
            else {
                throw ("Not implemented: non-array uniforms from jta export");
            }
        });
        return model;
    });
    return models;
};


// Extract the vertex buffer objects defined in the jta file.
please.gl.__jta_extract_buffer_objects = function (model_defs, attributes) {
    return attributes.map(function(buffer_defs) {
        var attr_data = buffer_defs["vertices"];
        var poly_data = please.gl.__jta_array(buffer_defs["polygons"]);
        var position_data = please.gl.__jta_array(attr_data["position"]);
        var normal_data = please.gl.__jta_generate_normals(
            position_data, poly_data, model_defs);
        
        // organize data for the VBO creation
        var attr_map = {
            "position" : position_data,
            "normal" : normal_data,
        };
        // extract UV coordinates
        if (attr_data.tcoords !== undefined && attr_data.tcoords.length >= 1) {
            // FIXME: use all UV layers, not just the first one
            attr_map["tcoords"] = please.gl.__jta_array(attr_data["tcoords"][0]);
        }
        // extract bone weights
        if (attr_data.weights !== undefined) {
            attr_map["weights"] = please.gl.__jta_array(attr_data["weights"]);
        }
        var vertex_count = attr_map.position.length / attr_data["position"].item;

        // create the buffer objects
        var VBO = please.gl.vbo(vertex_count, attr_map);
        var IBO = please.gl.ibo(poly_data);
        return {"vbo" : VBO, "ibo" : IBO};
    });
};


// Generate data for surface normals
please.gl.__jta_generate_normals = function (verts, indices, model_defs) {
    var normals = new Float32Array(verts.length);
    var k, a, b, c;
    var lhs = vec3.create();
    var rhs = vec3.create();
    var norm = vec3.create();
    var cache = {};

    for (var i=0; i<indices.length; i+=3) {
        /*
          For every three attribute indices, gerenate a surface normal
          via taking the cross product of the vectors created by two
          of the edges.  Value 'k' corresponds to vertex componets
          ('i' points to a vector). Values 'a', 'b', and 'c' are the
          three vectors coordinates of the triangle selected by an
          iteration of this loop.
         */
        k = i*3;
        a = vec3.fromValues(verts[k], verts[k+1], verts[k+2]);
        b = vec3.fromValues(verts[k+3], verts[k+4], verts[k+5]);
        c = vec3.fromValues(verts[k+6], verts[k+7], verts[k+8]);

        // Calculate the normal for this face.
        vec3.subtract(lhs, b, a);
        vec3.subtract(rhs, c, a);
        vec3.cross(norm, lhs, rhs); // swap lhs and rhs to flip the normal
        vec3.normalize(norm, norm);

        // Accumulate/cache/log the calculated normal for each
        // position of vertex 'n'.  This will allow us to determine
        // the smooth normal, where applicable.
        for (var n=0; n<3; n+=1) {
            var m = n*3;
            var key = ""+verts[k+m]+":"+verts[k+m+1]+":"+verts[k+m+2];
            if (!cache[key]) {
                // copy the normal into a new cache entry
                cache[key] = vec3.clone(norm);
            }
            else {
                // add the normal with the old cache entry
                vec3.add(cache[key], cache[key], norm);
            }
        }
        // set normal for vertex 0
        normals[k] = norm[0];
        normals[k+1] = norm[1];
        normals[k+2] = norm[2];
        // set normal for vertex 1
        normals[k+3] = norm[0];
        normals[k+4] = norm[1];
        normals[k+5] = norm[2];
        // set normal for vertex 2
        normals[k+6] = norm[0];
        normals[k+7] = norm[1];
        normals[k+8] = norm[2];
    }
    var set_smooth = function(start, total) {
        /*
          The process of calculating the smooth normals is already
          accomplished by the caching / logging step done durring the
          calculation of face normals.  As a result, all we need to do
          is normalize the resulting vector and save that in the right
          place.  Note, this is probably not technically correct, but
          it looks fine.

          Start is the first face index, total is the total number of
          indices in the group.
         */
        for (var i=start; i<start+total; i+=3) {
            /* 
               For each face 'i' in the range provided, and each value
               'k' being the beginning offset of the vectors in the
               position and normal arrays...
             */
            var k = i*3;
            for (var n=0; n<3; n+=1) {
                var m = n*3;
                var key = ""+verts[k+m]+":"+verts[k+m+1]+":"+verts[k+m+2];
                var norm = vec3.normalize(vec3.create(), cache[key]);
                normals[k+m] = norm[0];
                normals[k+m+1] = norm[1];
                normals[k+m+2] = norm[2];
            }
        }
    }
    ITER_PROPS(model_name, model_defs) {
        /*
          For each model definition, check to see if it requires
          smooth normals, and adjust appropriately.
         */
        var model = model_defs[model_name];
        if (model.extra.smooth_normals) {
            ITER_PROPS(group_name, model.groups) {
                /*
                  Get the index ranges per group and call the smooth
                  normals method for those ranges.
                 */
                var group = model.groups[group_name];
                set_smooth(group.start, group.count);
            }   
        }
    }
    return normals;
};


// This function creates image objects for any textures packed in the
// jta file.
please.gl.__jta_unpack_textures = function (packed_data) {
    ITER_PROPS(checksum, packed_data) {
        if (!please.access(checksum, true)) {
            var img = new Image();
            img.src = packed_data[checksum];
            please.media.assets[checksum] = img;
        }
    }
};
