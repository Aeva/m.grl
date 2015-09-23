// - m.jta.js ------------------------------------------------------------- //

/* [+] 
 *
 * This part of M.GRL implements the importer for JTA encoded models
 * and animations.  The basic usage of JTA models is as follows:
 *
 * ```
 * var jta_scene = please.access("some_model.jta");
 * var model_node = jta_scene.instance();
 * your_scene_graph.add(model_node);
 * ```
 *
 * When called with no arguments, the ".instance" method returns a
 * graph node which contains all objects in the jta file, preserving
 * inheritance.  To select a specific object (and its children) in the
 * scene, you can specify the name of the object like so instead:
 *
 * ```
 * var node = jta_scene.instance("some_named_object");
 * ```
 *
 */


// "jta" media type handler
please.media.search_paths.jta = "";
please.media.handlers.jta = function (url, asset_name, callback) {
    var media_callback = function (req) {
        please.media.assets[asset_name] = please.gl.__jta_model(req.response, url);
    };
    please.media.__xhr_helper("text", url, asset_name, media_callback, callback);
};


// JTA model loader.
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

    // extract keyframe data
    if (directory.ani) {
        scene.actions = please.gl.__jta_extract_keyframes(directory.ani);
    }

    // add a method for generating a GraphNode (or a small tree
    // thereof) for this particular model.
    scene.instance = function (model_name) {
        // model_name can be set to null to return an empty group of
        // all object
        if (!model_name) {
            var models = please.get_properties(scene.models);
            var empties = please.get_properties(scene.empties);
            var root = null;
            if (models.length + empties.length === 1) {
                root = scene.instance(models[0]);
            }
            else {
                var added = {};
                root = new please.GraphNode();
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

                var rig = {};
                var has_rig = false;
                root.node_lookup = {};
                root.propogate(function (node) {
                    if (node.is_bone) {
                        has_rig = true;
                        rig[node.bone_name] = node;
                    }
                    else if (node.node_name) {
                        root.node_lookup[node.node_name] = node;
                    }
                });
                if (has_rig) {
                    root.armature_lookup = rig;
                }
            }
            if (scene.actions) {
                please.prop_map(scene.actions, function(name, data) {
                    please.gl.__jta_add_action(root, name, data);
                });
            }
            return root;
        }
        else {
            var model = scene.models[model_name];
            var empty = scene.empties[model_name];
            var entity = model || empty;
            if (entity) {
                var node = new please.GraphNode();
                node.node_name = model_name;
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
                if (entity.bone_name) {
                    node.is_bone = true;
                    node.bone_name = entity.bone_name;
                    node.bone_parent = entity.bone_parent;
                }
                if (entity.extra.position) {
                    node.location_x = entity.extra.position.x;
                    node.location_y = entity.extra.position.y;
                    node.location_z = entity.extra.position.z;
                }
                if (entity.extra.quaternion) {
                    node.quaternion_x = entity.extra.quaternion.x;
                    node.quaternion_y = entity.extra.quaternion.y;
                    node.quaternion_z = entity.extra.quaternion.z;
                    node.quaternion_w = entity.extra.quaternion.w;
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


// Hook up the animation events to the object.
please.gl.__jta_add_action = function (root_node, action_name, raw_data) {

    // this method finds an object within the root graph node by a
    // given name
    var find_object = function(export_id) {
        var local_id = export_id;
        var bone_index = export_id.indexOf(":bone:");
        if (bone_index !== -1) {
            local_id = export_id.slice(bone_index + 6);
            return root_node.armature_lookup[local_id];
        }
        else {
            return root_node.node_lookup[local_id];
        }
    };

    var attr_constants = [
        "location",
        "quaternion",
        "scale",
    ];

    // this method creates the frame-ready callback that sets up the
    // driver functions for animation.
    var make_frame_callback = function(start_updates, end_updates) {
        return function(speed, skip_to) {
            ITER_PROPS(object_id, start_updates) {
                var obj_start = start_updates[object_id];
                var obj_end = end_updates[object_id];
                if (obj_start && obj_end) {
                    var node = find_object(object_id);
                    if (node) {
                        ITER(i, attr_constants) {
                            var attr = attr_constants[i];
                            if (obj_start[attr] && obj_end[attr]) {
                                var lhs = obj_start[attr];
                                var rhs = obj_end[attr];
                                if (skip_to) {
                                    lhs = please.mix(lhs, rhs, skip_to);
                                }
                                var path = please.linear_path(lhs, rhs)
                                node[attr] = please.path_driver(path, speed);
                            }
                        }
                    }
                }
            }
        };
    };

    // this bit cycles through the exported frame data from blender
    // and produces a set of frame callbacks for mgrl's animation system.
    var frame_set = [];
    for (var low, high, i=0; i<raw_data.track.length-1; i+=1) {
        low = raw_data.track[i];
        high = raw_data.track[i+1];
        
        frame_set.push({
            "speed" : (high.start - low.start),
            "callback" : make_frame_callback(low.updates, high.updates),
        });
    }

    if (frame_set.length>0) {
        please.time.add_score(root_node, action_name, frame_set);
    }
    else {
        console.warn("No frames found for action " + action_name);
    }
};


// Reads the raw animation data defined in the jta file and returns a
// similar object tree.  The main difference is instead of storing
// vectors and quats as dictionaries of their channels to values, the
// result is vec3 or quat objects as defined in gl-matrix.
please.gl.__jta_extract_keyframes = function (data) {
    var animations = please.prop_map(data, function (name, data) {
        var action = {};
        action.track = [];
        action.repeat = data.repeat || false;
        action.duration = data.duration;
        for (var i=0; i<data.track.length; i+=1) {
            var ref = data.track[i];
            var frame = {};
            frame.start = ref.frame;
            frame.updates = please.prop_map(ref.updates, function(bone_name, val) {
                var node_data = please.prop_map(val, function (property, defs) {
                    if (["position", "scale", "rotation"].indexOf(property) > -1) {
                        return vec3.fromValues(defs.x, defs.y, defs.z);
                    }
                    else if (property === "quaternion") {
                        return quat.fromValues(defs.x, defs.y, defs.z, defs.w);
                    }
                });
                if (node_data["position"]) {
                    node_data["location"] = node_data["position"];
                    delete node_data["position"];
                }
                return node_data;
            });
            action.track.push(frame);
        }
        return action;
    });
    return animations;
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
        var dict = please.gl__jta_extract_common(empty_def);
        if (empty_def.bone) {
            dict.bone_name = empty_def.bone;
            dict.bone_parent = empty_def.bone_parent;
        }
        return dict;
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
    var lhs = vec3.create();
    var rhs = vec3.create();
    var norm = vec3.create();
    var cache = {};
    var visited = Object.create(null); // used like a set

    var vector_for_index = function (f) {
        var i = indices[f]*3;
        visited[f] = true;
        return vec3.fromValues(verts[i], verts[i+1], verts[i+2]);
    };
    
    var store_normal = function (f, normal) {
        var i = indices[f]*3
        normals[i] = normal[0];
        normals[i+1] = normal[1];
        normals[i+2] = normal[2];
    };
    
    var cache_key = function (vertex) {
        return ""+vertex[0]+":"+vertex[1]+":"+vertex[2];
    };

    for (var f=0; f<indices.length; f+=3) {
        // Here, we loop accross the set of vertex indices for each
        // face.  The variable 'f' indicates which face we are on.
        // Each index f, f+1 and f+2 coorespond to a particular
        // vertex.  Each vertex is in turn three distinct values from
        // the 'verts' argument to a total of three sets of three
        // floats read from 'verts' per face.  These will be used to
        // populate three vectors, 'a', 'b', and 'c'.

        var a = vector_for_index(f);
        var b = vector_for_index(f+1);
        var c = vector_for_index(f+2);

        // Calculate the normal for this face.
        vec3.subtract(lhs, b, a);
        vec3.subtract(rhs, c, a);
        vec3.cross(norm, lhs, rhs); // swap lhs and rhs to flip the normal
        vec3.normalize(norm, norm);

        // Accumulate/cache/log the calculated normal for each
        // position of vertex 'n'.  This will allow us to determine
        // the smooth normal, where applicable.
        var tmp = [a, b, c];
        for (var i=0; i<3; i+=1) {
            var key = cache_key(tmp[i]);
            if (!cache[key]) {
                // copy the normal into a new cache entry
                cache[key] = vec3.clone(norm);
            }
            else {
                // add the normal with the old cache entry
                vec3.add(cache[key], cache[key], norm);
            }
            store_normal(f+i, norm);
        }
    }
    var set_smooth = function() {
        /*
          The process of calculating the smooth normals is already
          accomplished by the caching / logging step done durring the
          calculation of face normals.  As a result, all we need to do
          is normalize the resulting vector and save that in the right
          place.  Note, this is probably not technically correct, but
          it looks fine.

          The variable 'visited' stores which vertices have normals
          generated for them, so all we have to do is pay those
          indexes a visit and applied the cached results to the
          corresponding slots in the 'normals' array.
        */

        for (var v in visited) {
            var i = v*3;
            var vertex = vec3.fromValues(verts[i], verts[i+1], verts[i+2]);
            var cached = cache[cache_key(vertex)];
            if (cached) {
                var normal = vec3.normalize(vec3.create(), cached);
                normals[i] = normal[0];
                normals[i+1] = normal[1];
                normals[i+2] = normal[2];
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
