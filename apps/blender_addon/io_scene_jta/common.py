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


from .mgrl_types import Float16Array


def format_matrix(matrix):
    """
    Formats a Blender matrix object for export, and transposes it so
    gl-matrix can use it correctly.
    """
    target_matrix = matrix.copy()
    target_matrix.transpose()
    matrix_builder = Float16Array(period=4)
    for vector in target_matrix.to_4x4():
        matrix_builder.add_vector(*vector[:])
    return matrix_builder.export()


def ani_transforms(entity, cache, updates, first_frame=True):
    """
    Used for animations.  Should probably go in its own file along
    with the code that calls this as a class.
    """
    obj = entity.obj
    location, rotation, scale = obj.matrix_local.decompose()
    current = {
        "position" : dict(zip("xyz", location)),
        "quaternion" : {
            "x" : rotation.x,
            "y" : rotation.y,
            "z" : rotation.z,
            "w" : rotation.w,
        },
        "scale" : dict(zip("xyz", scale)),
    }    
    if not first_frame:
        changed = {}
        for prop in current.keys():
            for channel in current[prop].keys():
                old_value = round(cache[obj.name][prop][channel], 5)
                new_value = round(current[prop][channel], 5)
                if not old_value == new_value:
                    changed[prop] = {}
                    changed[prop][channel] = new_value
                    cache[obj.name][prop][channel] = new_value
        if changed:
            updates[obj.name] = changed            

    else:
        cache[obj.name] = current
        updates[obj.name] = current

    #import pdb; pdb.set_trace()
    return current

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
            rotation = matrix.to_quaternion()
            target["quaternion"] = {
                "x" : rotation.x,
                "y" : rotation.y,
                "z" : rotation.z,
                "w" : rotation.w,
            }
            
        target["scale"] = dict(zip("xyz", matrix.to_scale()))
        return target

    def export(self):
        """
        This returns the basic aspects of a graph node being exported.
        The return value will be serialized elsewhere.
        """
        parent = None
        local_matrix = self.obj.matrix_local
        if self.obj.parent:
            if self.obj.parent.type == "ARMATURE":
                bone_name = self.obj.parent_bone
                parent = "{0}:bone:{1}".format(self.obj.parent.name, bone_name)
                pose = self.obj.parent.pose.bones[bone_name]
                local_matrix = pose.matrix.inverted() * self.obj.matrix_world
            else:
                parent = self.obj.parent.name

        # Note other state information such as position info, texture
        # maps, etc.  State values coorespond directly to uniform
        # variables and textures.
        state = {}

        # Save the world matrix as used for rendering.
        state["world_matrix"] = format_matrix(self.obj.matrix_world)

        # Extra values are not used in rendering, but may be used to
        # store other useful information.
        extras = self.extract_matrix_to_object(
            local_matrix, mode=self.obj.rotation_mode)

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
