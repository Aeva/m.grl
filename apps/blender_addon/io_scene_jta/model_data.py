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


import bpy
import bmesh
import mathutils

from .mgrl_types import Float16Array, IntArray
from .common import Exportable


class Vertex(object):
    """
    In WebGL, a vertex is not defined by its coordinates, but rather it
    is a grouping of attributes.  Coordinates are attributes.
    """
    def __init__(self, position=[], uvs=[], weights=[], normals=[], face=None):
        assert len(position) == 3
        assert len(weights) == 0 or len(weights) == 4
        for uv_group in uvs:
            assert len(uv_group) == 2
        self.position = tuple(position)
        self.uvs = tuple([tuple(uv) for uv in uvs]) or None
        self.weights = tuple(weights) or None
        self.normals = tuple(normals) or None
        self.face = face;
        assert face

        def simplify(num):
            return round(num, 5)

        if self.normals:
            self.normals = tuple(map(simplify, self.normals))
    
    def __hash__(self):
        return hash((self.position, self.uvs, self.weights))

    def __eq__(self, another):
        lhs = (self.position, self.uvs, self.weights, self.normals, self.face)
        rhs = (another.position, another.uvs, another.weights, another.normals, another.face)
        return lhs == rhs


class Model(Exportable):
    """
    This class is used to build the "model" entries in the exported
    JTA file, and to organize references to bpy data relevant to the
    item.
    """
    def __init__(self, selection, scene, options, texture_store):
        Exportable.__init__(self, selection, scene, options)

        self.texture_store = texture_store
        self.mesh = self.obj.to_mesh()
        self.mesh.transform(mathutils.Matrix.Scale(options["global_scale"], 4))
        self.__triangulate()

        self.use_smooth = self.__is_smooth_shading()
        self.use_weights = len(self.obj.vertex_groups) > 0
        self.texture_count = len(self.mesh.uv_layers)
        self.__generate_vertices()

        self.attr_struct = None
        self.offset = None
        self.export_ready = False
        self.group_export = {}

    def __is_smooth_shading(self):
        """
        Determines if smooth shading is in use or not.
        """
        smooth = False
        for face in self.mesh.polygons:
            smooth = smooth or face.use_smooth
        return smooth
    
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

            # # winding order test
            # verts = [mathutils.Vector(self.mesh.vertices[i].co)
            #          for i in face.vertices]
            # lhs = verts[1] - verts[0]
            # rhs = verts[2] - verts[0]
            # normal = lhs.cross(rhs)
            # normal.normalize()

            # estimate_a = [round(n, 2) for n in normal]
            # estimate_b = [round(n, 2) for n in face.normal]

            # for i in range(3):
            #     if estimate_a[i] != estimate_b[i]:
            #         import pdb; pdb.set_trace()
            # del normal

                    
            for vertex_index, loop_index in zip(face.vertices, face.loop_indices):
                vdata = self.mesh.vertices[vertex_index]

                # determine group membership first
                groups = []
                meta_name = self.get_meta_group_name(vdata)
                if vdata.groups:
                    groups = vdata.groups
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
                        weights = [group.weight for group in vdata.groups]
                    while len(weights) < 4:
                        weights.append(0.0)

                normal = [] if self.use_smooth else vdata.normal
                vertex = Vertex(position, uvs, weights, normal, face)
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
            self.face_vertices[face] = [vert_indices[vert] for vert in vertices]

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
