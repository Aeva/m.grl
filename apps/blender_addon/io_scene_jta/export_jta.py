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


class IntArray(Base64Array):
    """
    Type for integer data arrays.
    """
    def __init__(self, period, signed=True, precision=16):
        Base64Array.__init__(self, period, typed=int, precision=precision, signed=signed)


class Vertex(object):
    """
    In WebGL, a vertex is not defined by its coordinates, but rather it
    is a grouping of attributes.  Coordinates are attributes.
    """
    def __init__(self, position=[], uvs=[], weights=[]):
        assert len(position) == 3
        assert len(weights) == 0 or len(weights) == 4
        for uv_group in uvs:
            assert len(uv_group) == 2
        self.position = tuple(position)
        self.uvs = tuple([tuple(uv) for uv in uvs]) or None
        self.weights = tuple(weights) or None
    
    def __hash__(self):
        return hash((self.position, self.uvs, self.weights))

    def __eq__(self, another):
        lhs = (self.position, self.uvs, self.weights)
        rhs = (another.position, another.uvs, another.weights)
        return lhs == rhs


class Exportable(object):
    """
    This class contains mechanisms for exportable objects.
    """
    def __init__(self, selection, scene, options):
        self.obj = selection
        self.scene = scene
        self.options = options

    def extract_matrix_to_object(self, matrix, target=None, mode="XYZ"):
        if not target:
            target = {}
        target["position"] = dict(zip("xyz", matrix.to_translation()))
        if set(mode) == set("XYZ"):
            target["rotation"] = dict(zip("xyz", matrix.to_euler('XYZ')))
        else:
            target["quaternion"] = dict(zip("dabc", matrix.to_quaternion()))
            
        target["scale"] = dict(zip("xyz", matrix.to_scale()))
        return target

    def extract_bone_transforms(self, bone, world_matrix, target=None):
        if not target:
            target = {}

        matrix = bone.matrix
        flip = 1
        if bone.parent:
            parent_matrix = bone.parent.matrix
            matrix = parent_matrix.inverted() * matrix
            # Using the unreal exporter as a reference; they negate
            # the x/y/z parts of the quaternions to flip the
            # handedness.  I'm not sure if this is needed for m.grl,
            # so will likely remove this at some point.
            
            #flip = -1
        head = matrix.to_translation()
        rotation = matrix.to_quaternion().normalized()
        
        target["position"] = dict(zip("xyz", head))
        target["quaternion"] = {
            "x" : rotation.x * flip,
            "y" : rotation.y * flip,
            "z" : rotation.z * flip,
            "w" : rotation.w,
        }
        target["scale"] = dict(zip("xyz", bone.scale))
        return target

    def format_matrix(self, matrix):
        target_matrix = matrix.copy()
        target_matrix.transpose()
        matrix_builder = Float16Array(period=4)
        for vector in target_matrix.to_4x4():
            matrix_builder.add_vector(*vector[:])
        return matrix_builder.export()

    def export(self):
        """
        This returns the basic aspects of a graph node being exported.
        The return value will be serialized elsewhere.
        """
        parent = None
        if self.obj.parent is not None:
            if self.obj.parent.type == "ARMATURE":
                parent = "{0}:bone:{1}".format(
                    self.obj.parent.name, self.obj.parent_bone)
                pass
            else:
                parent = self.obj.parent.name

        # Note other state information such as position info, texture
        # maps, etc.  State values coorespond directly to uniform
        # variables and textures.
        state = {}

        # Save the world matrix as used for rendering.
        state["world_matrix"] = self.format_matrix(self.obj.matrix_world)

        # Extra values are not used in rendering, but may be used to
        # store other useful information.
        extras = {}

        # Note the object's coordinates and postion values in Extras.
        self.extract_matrix_to_object(self.obj.matrix_local,
                                      extras, mode=self.obj.rotation_mode)

        return {
            "parent" : parent,
            "extra" : extras,
            "state" : state,
        }


class Empty(Exportable):
    """
    This class stores information about empty scene graph nodes for
    export.
    """
    pass


class Rig(Exportable):
    """
    This class stores information about a rig, for export.
    """
    def __init__(self, selection, scene, options):
        Exportable.__init__(self, selection, scene, options)
        self.bones = selection.pose.bones

    def create_bone_nodes(self):
        """
        Creates graph entries for the bone data.
        """
        def fake_node(bone):
            name = "{0}:bone:{1}".format(self.obj.name, bone.name)
            parent = self.obj.name
            rig_parent = parent
            if bone.parent:
                rig_parent = "{0}:bone:{1}".format(self.obj.name, bone.parent.name)
                parent = rig_parent

            extra = self.extract_bone_transforms(bone, self.obj.matrix_world)
            state = {
                "world_matrix" : self.format_matrix(self.obj.matrix_world),
            }
            blob = {
                "parent" : parent,
                "state" : state,
                "extra" : extra,
                "bone" : bone.name,
                "bone_parent" : rig_parent,
            }
            return name, blob
        return [i for i in map(fake_node, self.bones)]
        # FIXME for some reason, the return value here ends up being
        # wrong - the 'position' value and who knows what else ends up
        # being set to the same (arbitrary?) value


class Model(Exportable):
    """
    This class is used to build the "model" entries in the exported
    JTA file, and to organize references to bpy data relevant to the
    item.
    """
    def __init__(self, selection, scene, options, texture_store):
        Exportable.__init__(self, selection, scene, options)

        self.texture_store = texture_store
        self.mesh = self.obj.to_mesh(
            scene, options["use_mesh_modifiers"], "PREVIEW", calc_tessface=False)
        self.mesh.transform(mathutils.Matrix.Scale(options["global_scale"], 4))
        self.__triangulate()

        self.use_smooth = False
        self.use_weights = len(self.obj.vertex_groups) > 0
        self.texture_count = len(self.mesh.uv_textures)
        self.__generate_vertices()

        self.attr_struct = None
        self.offset = None
        self.export_ready = False
        self.group_export = {}

    def __generate_vertices(self):
        """
        Run through the face data and populate a set of Vertex class
        instances, as well as a dictionary for mapping between the
        two.  Also determines the vertex metagroups.
        """
        mapping = {}
        group_map = {}

        self.vertices = []
        self.meta_groups = {}
        self.face_vertices = {}

        # extract the position, uv coordinates, and weights for
        # each vertex in the face, generate a Vertex object, save
        # it in a set and record it in a mapping dict.
        for face in self.mesh.polygons:
            face_vertices = []
            self.use_smooth = self.use_smooth or face.use_smooth
            for vertex_index, loop_index in zip(face.vertices, face.loop_indices):
                vdata = self.mesh.vertices[vertex_index]

                # determine group membership first
                groups = []
                meta_name = self.get_meta_group_name(vdata)
                if vdata.groups:
                    groups = vertex.groups
                    assert len(groups) <= 4
            
                # extract the vertex attributes
                position = vdata.co[:]
                uvs = []
                weights = []
                for uv_layer in self.mesh.uv_layers:
                    uvs.append(uv_layer.data[loop_index].uv[:])
                
                if self.use_weights:
                    meta_group = self.get_meta_group_name(vdata)
                    if meta_group != "default":
                        weights = [group.weight for group in vertex.groups]
                    while len(weights) < 4:
                        weights.append(0.0)
                
                vertex = Vertex(position, uvs, weights)
                self.vertices.append(vertex)
                face_vertices.append(vertex)

                # add the vertex to its meta group
                if not group_map.get(meta_name):
                    group_map[meta_name] = []
                    self.meta_groups[meta_name] = {
                        "data" : [],
                        "groups" : groups,
                    }
                group_map[meta_name].append(vertex)

            mapping[face.index] = tuple(face_vertices)

        # speedup HACK - store the indices of each vertex, so we don't need to
        # call self.vertices.index(vert).
        vert_indices = dict(zip(self.vertices, range(len(self.vertices))))

        # use the face mapping to produce a set of indices per face
        for face, vertices in mapping.items():            
            self.face_vertices[face] = [vert_indices[vert] for vert in mapping[face]]

        # record a mapping of meta vertex groups to the vertex indices
        for meta_name, verts in group_map.items():
            for vertex in verts:
                self.meta_groups[meta_name]["data"].append(vert_indices[vertex])
        
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

    def attach(self, attr):
        """
        Attach this object to an attribute structure.
        """
        self.attr_struct = attr
        attr.models.append(self)

    def report_attributes(self, data):
        """
        Adds data pertaining to vertex positions, uv_map coordinates, and
        whatever else to a common pool represented by the parameter
        'data'.  Also updates local offset indicies and flags the
        model to be ready for export.
        """
        # record the current offest *first*
        self.offset = data["position"].count

        for vertex in self.vertices:
            # add the position data
            data["position"].add_vector(*vertex.position)

            # add the tcoord data
            if self.texture_count:
                for uv, tcoord_set in zip(vertex.uvs, data["tcoords"]):
                    tcoord_set.add_vector(*uv)

            # add the weight data
            if self.use_weights:
                assert vertex.weights is not None
                data["weights"].add_vector(*vertex.weights)

        # flag the model as being ready for export
        self.export_ready = True

    def report_polygons(self, data):
        """
        Adds this object's polygon data to the Attribute object.
        """
        # IMPORTANT NOTE - self.offset is set by self.report_attributes

        start_value = data.count

        for indices in self.face_vertices.values():
            for vert_index in indices:
                # again:
                # self.offset is set by self.report_attributes
                data.add_vector(self.offset + vert_index)

        total = data.count-start_value

        ### HACK - the spec was changed so each model only has one
        ### IBO, and so the scheme we came up with for working with
        ### bone data isn't going to work without another attribute.
        if total > 0:
            self.group_export["default"] = {
                "start" : start_value,
                "count" : total,
            }

    def export(self):
        """
        This returns the object for export, to be serialized elsewhere in
        json.
        """
        assert self.export_ready
        assert len(self.group_export.keys())

        node_base = Exportable.export(self)

        # Save the active texture:
        if self.texture_count > 0:
            # FIXME look for image textures flagged as various
            # material types eg diffuse, normal map etc first before
            # falling back on what the display texture probably is
            refcode = self.texture_store.refcode_for_model(self)
            if refcode:
                node_base["state"]["diffuse_texture"] = {
                    "type" : "Sampler2D",
                    "uri" : refcode,
                }
        
        # Note the usage of smooth shading.
        node_base["extra"]["smooth_normals"] = self.use_smooth

        # Track ofther stuff
        node_base["struct"] = self.attr_struct.index
        node_base["groups"] = self.group_export
        
        return node_base


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
        vertex_data = {
            "position" : Float16Array(3),
            "tcoords" : [Float16Array(2) for i in range(self.textures)],
            "weights" : Float16Array(4) if self.weights else None,
        }
        for model in self.models:
            model.report_attributes(vertex_data)
            
        max_index = vertex_data["position"].count
        buffer_precision = 16 if max_index < 2**16 else 32
        if max_index >= 2**32:
            raise BufferError(
                "Unable to allocate enough precision to store pending export objects.\n"
                "Consider reducing the total vertex count to less than 4,294,967,296.")
        indices = IntArray(period=1, signed=False, precision=buffer_precision)
        for model in self.models:
            model.report_polygons(indices)

        vertices = {
            "position" : vertex_data["position"].export(),
        }
        if self.textures > 0:
            vertices["tcoords"] = [tcoord.export() for tcoord in vertex_data["tcoords"]]
        if self.weights > 0:
            vertices["weights"] = vertex_data["weights"].export()

        buffer_objects = {
            "vertices" : vertices,
            "polygons" : indices.export(),
        }

        return buffer_objects


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
    # Exit edit mode before exporting, so current object states are
    # exported properly.
    if bpy.ops.object.mode_set.poll():
        bpy.ops.object.mode_set(mode='OBJECT')

    print("JTA Export path: {0}".format(options["filepath"]))
    start_time = time.time()

    if options["use_selection"]:
        def get_selections_and_children(objects = context.selected_objects):
            if objects:
                selections = list(objects)
                for obj_ in objects:
                    if obj_ and obj_.children:
                        selections += get_selections_and_children(obj_.children)
                return selections
            else:
                return []

        selections = get_selections_and_children()
    else:
        selections = scene.objects

    scale_matrix = mathutils.Matrix.Scale(options["global_scale"], 4)

    # call the update thing for good measure
    scene.update()

    
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
                "src_url" : options["meta_src_url"],
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
    export_meshes = []
    export_empties = []
    export_rigs = []
    for selection in selections:
        used_selection = False
        if selection.dupli_type == "NONE" and selection.type == "MESH":
            model = Model(selection, scene, options, texture_store)
            export_meshes.append(model)
            used_selection = True

        elif selection.type == "EMPTY":
            empty = Empty(selection, scene, options)
            export_empties.append(empty)
            used_selection = True
        
        elif selection.type == "ARMATURE":
            arma = Rig(selection, scene, options)
            export_rigs.append(arma)
            used_selection = True

        else:
            if selection.dupli_type != "NONE":
                print("Skipping object {0} of dupli_type {1}".format(selection, selection.dupli_type))
            if selection.type != "MESH":
                print("Skipping non-mesh object {0}".format(selection))

        if used_selection:
            print("Adding object {0}".format(selection.name))
        
    # determine what sort of attribute structures we'll need
    attr_sets = []
    for model in export_meshes:
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
    for model in export_meshes:
        container["models"][model.obj.name] = model.export()

    if export_empties or export_rigs:
        container["empties"] = {}

    for empty in export_empties:
        container["empties"][empty.obj.name] = empty.export()

    for rig in export_rigs:
        container["empties"][rig.obj.name] = rig.export()
        bones = rig.create_bone_nodes()
        for bone_name, bone_data in bones:
            container["empties"][bone_name] = bone_data
    
    # add packed data if applicable
    container["packed_data"] = texture_store.export()

    with open(options["filepath"], "w", encoding="utf8", newline="\n") as out_file:
        json.dump(container, out_file)

    print("JTA Export time: %.2f" % (time.time() - start_time))
    return {"FINISHED"}
