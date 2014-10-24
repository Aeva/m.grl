# ##### BEGIN GPL LICENSE BLOCK #####
#
#  This program is free software; you can redistribute it and/or
#  modify it under the terms of the GNU General Public License
#  as published by the Free Software Foundation; either version 2
#  of the License, or (at your option) any later version.
#
#  This program is distributed in the hope that it will be useful,
#  but WITHOUT ANY WARRANTY; without even the implied warranty of
#  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#  GNU General Public License for more details.
#
#  You should have received a copy of the GNU General Public License
#  along with this program; if not, write to the Free Software Foundation,
#  Inc., 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301, USA.
#
# ##### END GPL LICENSE BLOCK #####


import time
import json
import base64
import hashlib
import os.path
from io import BytesIO

import bpy
import bmesh
import mathutils
import bpy_extras.io_utils

import numpy


class Base64Array(object):
    """
    Implements the machinery needed to encode arrays to base64 encoded
    binary data.  The signed parameter is only applicable when the
    type is 'int'.
    """
    def __init__(self, period=3, typed=float, precision=16, signed=True):
        assert period in [1, 2, 3, 4, 9, 16]
        assert typed in [int, float]
        assert precision in [16, 32]
        self.hint = None
        self.dtype = None
        self.period = period
        self.data = []
        self.count = 0
        if typed == int:
            if precision == 16:
                if signed:
                    self.dtype = numpy.int16
                else:
                    self.dtype = numpy.uint16
            elif precision == 32:
                if signed:
                    self.dtype = numpy.int32
                else:
                    self.dtype = numpy.uint32
            if signed:
                self.hint = "Int{0}Array".format(precision)
            else:
                self.hint = "Uint{0}Array".format(precision)
        elif typed == float:
            if precision == 16:
                self.dtype = numpy.float16
            elif precision == 32:
                self.dtype = numpy.float32
            self.hint = "Float{0}Array".format(precision)

    def add_vector(self, *data):
        assert len(data) == self.period
        self.data += data
        self.count += 1

    def export(self):
        ar = numpy.ndarray(shape=(len(self.data)), buffer=None, dtype=self.dtype)
        for i in range(len(self.data)):
            ar[i] = self.data[i]
        return {
            "type" : "Array",
            "hint" : self.hint,
            "item" : self.period,
            "data" : base64.b64encode(ar.tostring()).decode("ascii"),
        }


class Float16Array(Base64Array):
    """
    Type for floating point data arrays.
    """
    def __init__(self, period=3):
        Base64Array.__init__(self, period, typed=float, precision=16)


class Int16Array(Base64Array):
    """
    Type for integer data arrays.
    """
    def __init__(self, period, signed=True):
        Base64Array.__init__(self, period, typed=int, precision=16, signed=signed)
    

class Model(object):
    """
    This class used to build the "model" entries in the exported JTA
    file, and to organize references to bpy data relevant to the item.
    """
    def __init__(self, selection, scene, options, texture_store):
        self.obj = selection
        self.scene = scene
        self.options = options
        self.texture_store = texture_store
        self.mesh = self.obj.to_mesh(
            scene, options["use_mesh_modifiers"], "PREVIEW", calc_tessface=False)
        self.mesh.transform(mathutils.Matrix.Scale(options["global_scale"], 4))
        self.__triangulate()

        self.texture_count = len(self.mesh.uv_textures)
        self.vertices = self.mesh.vertices[:]
        self.face_indices = [(face, index) for index, face in enumerate(self.mesh.polygons)]
        self.__determine_vertex_groups()
        self.use_weights = len(self.obj.vertex_groups) > 0

        self.attr_struct = None
        self.offset = None
        self.export_ready = False
        
    def __triangulate(self):
        """
        Triangulate the mesh.  This should be called early on because it
        reallocates arrays.
        """
        bm = bmesh.new()
        bm.from_mesh(self.mesh)
        bmesh.ops.triangulate(bm, faces=bm.faces)
        bm.to_mesh(self.mesh)
        bm.free()

    def get_meta_group_name(self, vertex):
        name = "default"
        if vertex.groups:
            name = "+" + ",".join(
                [self.obj.vertex_groups[g.group].name for g in vertex.groups])
        return name

    def __determine_vertex_groups(self):
        """
        Determine meta groups.  A meta group is zero or more vertex groups,
        determined by what vertex groups individual vertices are in.
        """
        # determine meta vertex groups
        self.meta_groups = {}
        for polygon in self.mesh.polygons:
            for vertex_index in polygon.vertices:
                vertex = self.vertices[vertex_index]
                groups = []
                meta_name = self.get_meta_group_name(vertex)
                if vertex.groups:
                    groups = vertex.groups
                    assert len(groups) <= 4
                if not self.meta_groups.get(meta_name):
                    self.meta_groups[meta_name] = {
                        "data" : [],
                        "groups" : groups,
                    }
                self.meta_groups[meta_name]["data"].append(vertex_index)

    def attach(self, attr):
        """
        Attach this object to an attribute structure.
        """
        self.attr_struct = attr
        attr.models.append(self)

    def report(self, data):
        """
        Adds data pertaining to vertex positions, uv_map coordinates, and
        whatever else to a common pool represented by the parameter
        'data'.  Also updates local offset indicies and flags the
        model to be ready for export.
        """
        # record the current offest *first*
        self.offset = data["position"].count

        # HACK build a map of "loop indices"
        loop_indices = [0 for i in range(len(self.vertices))]
        for face in self.mesh.polygons:
            for vertex, loop in zip(face.vertices, face.loop_indices):
                loop_indices[vertex] = loop;

        for vertex_index in range(len(self.vertices)):
            vertex = self.vertices[vertex_index]
            data["position"].add_vector(*vertex.co[:])
            
            # add this model's uv coordinates to the pool
            for uv_layer, tcoord_set in zip(self.mesh.uv_layers, data["tcoords"]):
                # HACK
                loop_index = loop_indices[vertex_index]
                uv_coord = uv_layer.data[loop_index].uv[:]
                tcoord_set.add_vector(*uv_coord)

            # determine vertex group weights
            if self.use_weights:
                meta_group = self.get_meta_group_name(vertex)
                weights = []
                if meta_group != "default":
                    weights = [group.weight for group in vertex.groups]
                while len(weights) < 4:
                    weights.append(0.0)
                data["weights"].add_vector(*weights)

        # flag the model as being ready for export
        self.export_ready = True

    def export(self):
        """
        This returns the object for export, to be serialized elsewhere in
        json.
        """
        assert self.export_ready

        group_cache = {}
        for meta_name, meta_group in self.meta_groups.items():
            builder = Int16Array(period=1, signed=False)
            for vertex in meta_group["data"]:
                builder.add_vector(self.offset + vertex)

            group_cache[meta_name] = {
                "faces" : builder.export(),
                "bones" : [],
            }

            # FIXME determine influencing bones

        # note the name of the object's parent
        parent = None
        if self.obj.parent is not None:
            parent = self.obj.parent.name

        # Note other state information such as position info, texture
        # maps, etc.  State values coorespond directly to uniform
        # variables and textures.
        state = {}

        # Save the world matrix as used for rendering.
        target_matrix = self.obj.matrix_world.copy()
        target_matrix.transpose()
        matrix_builder = Float16Array(period=4)
        for vector in target_matrix.to_4x4():
            matrix_builder.add_vector(*vector[:])
        state["world_matrix"] = matrix_builder.export()

        # Save the active texture:
        if self.texture_count > 0:
            # FIXME look for image textures flagged as various
            # material types eg diffuse, normal map etc first before
            # falling back on what the display texture probably is
            refcode = self.texture_store.refcode_for_model(self)
            if refcode:
                state["diffuse_texture"] = {
                    "type" : "Sampler2D",
                    "uri" : refcode,
                }

        # Extra values are not used in rendering, but may be used to
        # store other useful information.
        extras = {}

        # Note the object's coordinates and postion values in Extras.
        extras["position"] = dict(zip("xyz", self.obj.matrix_local.to_translation()))
        extras["rotation"] = dict(zip("xyz", self.obj.matrix_local.to_euler()))

        return {
            "struct" : self.attr_struct.index,
            "groups" : group_cache,
            "parent" : parent,
            "state" : state,
            "extra" : extras,
        }


class Attribute(object):
    """
    This class loosely represents a hypothetical VBO, and is used to
    organize data to be exported.
    """
    def __init__(self, attr_index, textures=0, weights=False):
        self.textures = textures # how many different uv maps
        self.weights = weights # whether or not we are using bone weights
        self.models = []
        self.index = attr_index

    def export(self):
        data = {
            "position" : Float16Array(3),
            "tcoords" : [Float16Array(2) for i in range(self.textures)],
            "weights" : Float16Array(4) if self.weights else None,
        }
        for model in self.models:
            model.report(data)
        blob = {
            "position" : data["position"].export(),
        }
        if self.textures > 0:
            blob["tcoords"] = [tcoord.export() for tcoord in data["tcoords"]]
        if self.weights > 0:
            blob["weights"] = data["weights"].export()
        return blob


class TextureStore(object):
    """
    This class is used for optionally baking the textures within the
    file.
    """
    def __init__(self, options):
        self.force_pack = options["pack_images"]
        self.trim_paths = options["trim_paths"];
        self.packed = {}

    def pack_image(self, img_file, ext):
        raw = img_file.read()
        tag = hashlib.md5(raw).hexdigest()
        if not self.packed.get(tag):
            uri = "data:image/{0};base64,{1}"
            mimetype = ext.lower()
            self.packed[tag] = uri.format(mimetype, base64.b64encode(raw).decode("ascii"))
        return "packed:{0}".format(tag)

    def refcode_for_model(self, model):
        """
        Finds the diffuse texture for a given model, and returns a
        reference code based on if it is a relative path (to an
        external file) or an md5 hash for a packed image.  If the
        image is to be packed and has not yet been referenced, this
        will also pack the image.
        """
        renderer = bpy.context.scene.render.engine
        if renderer == "CYCLES":
            image = self.__cycles_refcode_target(model)
        elif renderer == "BLENDER_RENDER":
            image = self.__blender_refcode_target(model)
        else:
            raise NotImplementedError(
                "Finding image maps with {0} as the current renderer.".format(renderer))
        if image:
            assert image.file_format in ["PNG", "JPEG"]
            if image.filepath == "" or self.force_pack:
                if image.filepath == "":
                    return self.pack_image(BytesIO(image.packed_file.data), image.file_format)
                else:
                    return self.pack_image(open(image.filepath, "r"), image.file_format)
            else:
                if self.trim_paths:
                    img_path = os.path.basename(image.filepath)
                else:
                    img_path = image.filepath
                return "ref:{0}".format(img_path)
        else:
            return None

    def __cycles_refcode_target(self, model):
        """
        'refcode_for_model' behavior if the current rendering engine is
        cycles.
        """
        # HACK - assume there is only one material for this object
        assert len(model.mesh.materials) == 1
        nodes = model.mesh.materials[0].node_tree.nodes
        tex_nodes = [n for n in nodes if n.type=='TEX_IMAGE']

        if len(tex_nodes) == 1:
            # FIXME: not sure if this is correct
            return tex_nodes[0].image
        elif len(tex_nodes) > 1:
            for node in tex_nodes:
                if node.select:
                    # FIXME: not sure if this is correct
                    return node.image

        print("No diffuse map found for {0}".format(model.obj.name))
        return None
        
    def __blender_refcode_target(self, model):
        """
        'refcode_for_model' behavior if the current rendering engine is
        blender internal.
        """
        raise NotImplementedError(
            "Searching for diffuse maps used by Blender internal.")
        
    def export(self):
        """
        Create the value for "packed data".
        """
        return self.packed


def save(operator, context, options={}):
    """Implement the actual exporter for JTA files."""

    scene = context.scene
    # Exit edit mode before exporting, so current object states are exported properly.
    if bpy.ops.object.mode_set.poll():
        bpy.ops.object.mode_set(mode='OBJECT')

    print("JTA Export path: {0}".format(options["filepath"]))
    start_time = time.time()

    if options["use_selection"]:
        selections = context.selected_objects
    else:
        selections = scene.objects

    scale_matrix = mathutils.Matrix.Scale(options["global_scale"], 4)

    # The variable 'container' is where we will structure the data to
    # be exported.  This will conclude with it being encoded as json.
    container = {}


    # store meta data
    container["meta"] = {}
    if not options["meta_license"] == "none":
        try:
            # We want to save the canonical URI that represents the
            # license, not the code for it.
            license_uri = {
                "CC0" : "http://creativecommons.org/publicdomain/zero/1.0/",
                "CC-BY" : "http://creativecommons.org/licenses/by/4.0/",
                "CC-BY-SA" : "http://creativecommons.org/licenses/by-sa/4.0/",
            }[options["meta_license"]]
        except:
            license_uri = ""
        if license_uri:
            # Record the author metadata
            container["meta"] = {
                "author" : options["meta_author"],
                "url" : options["meta_url"],
                "license" : license_uri,
            }
        else:
            print("Unknown license? {0}".format(options["meta_license"]))

    # record the target file format version in the meta block
    container["meta"]["jta_version"] = 0.1,

    # store object / mesh data and attributes
    container["attributes"] = []
    container["models"] = {}

    # create a texture store if we're packing textures
    texture_store = TextureStore(options)
    
    # cache the objects we're exporting
    export_objects = []
    for selection in selections:
        model = None
        if selection.dupli_type == "NONE" and selection.type == "MESH":
            model = Model(selection, scene, options, texture_store)
        else:
            if selection.dupli_type != "NONE":
                print("Skipping object {0} of dupli_type {1}".format(selection, selection.dupli_type))
            if selection.type != "MESH":
                print("Skipping non-mesh object {0}".format(selection))
        if model:
            print("Adding object {0}".format(selection.name))
            export_objects.append(model)
        
    # determine what sort of attribute structures we'll need
    attr_sets = []
    for model in export_objects:
        for attr in attr_sets:
            if attr.textures == model.texture_count and attr.weights == model.use_weights:
                model.attach(attr)
        if not model.attr_struct:
            attr = Attribute(
                len(attr_sets), 
                textures = model.texture_count,
                weights = model.use_weights)
            attr_sets.append(attr)
            model.attach(attr)

    # export everything
    for attr in attr_sets:
        container["attributes"].append(attr.export())
    for model in export_objects:
        container["models"][model.obj.name] = model.export()

    # add packed data if applicable
    container["packed_data"] = texture_store.export()

    with open(options["filepath"], "w", encoding="utf8", newline="\n") as out_file:
        json.dump(container, out_file)

    print("JTA Export time: %.2f" % (time.time() - start_time))
    return {"FINISHED"}
