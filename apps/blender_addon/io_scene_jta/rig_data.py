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


from .common import format_matrix, Exportable


class Bone(object):
    """
    This class stores information about the bones in a rig.
    """

    def __init__(self, bone, rig):
        self.rig = rig
        self.bone = bone
        self.name = self.get_name()
        self.parent_bone = self.get_name(bone.parent) if bone.parent else None
        self.parent = self.parent_bone or self.rig.name

        # FIXME the state object is deprecated and should be removed.
        state = {
            "world_matrix" : format_matrix(bone.matrix),
        }
        
        self.data = {
            "parent" : self.parent,
            "state" : state,
            "extra" : None,
            "bone" : self.bone.name,
            "bone_parent" : self.parent_bone,
        }
        self.regen_transforms()

    def get_name(self, bone=None, rig=None):
        """
        Formats the name of the bone for m.grl
        """
        if not bone:
            bone = self.bone
        if not rig:
            rig = self.rig
        return "{0}:bone:{1}".format(rig.name, bone.name)

    def regen_transforms(self, bone=None, armature=None, target=None):
        """
        Returns the position, rotation, and scale vectors.  Rotation is
        expressed in quaternions.
        """
        if not (bone or armature):
            bone = self.bone
            armature = self.rig
            
        if not target:
            target = {}

        matrix = bone.matrix
        if bone.parent:
            matrix = bone.parent.matrix.inverted() * matrix
        head, rotation, scale = matrix.decompose()
        
        target["position"] = dict(zip("xyz", head))
        target["quaternion"] = {
            "x" : rotation.x,
            "y" : rotation.y,
            "z" : rotation.z,
            "w" : rotation.w,
        }
        target["scale"] = dict(zip("xyz", scale))
        self.data['extra'] = target
        return target

    def updates_since(self, reference):
        """
        Compares the output of regen_transforms with that cached from a
        different keyframe to see if anything has changed.  If so, the
        different fields are returned in a new dictionary.  Returns
        None if nothing was changed.
        """
        updates = {}
        target = self.regen_transforms()
        changed = []
        for prop in ["position", "quaternion", "scale"]:
            for channel in target[prop].keys():
                old_value = round(reference[prop][channel], 5)
                new_value = round(target[prop][channel], 5)
                if not old_value == new_value:
                    changed.append(prop)
                    break
        for prop in changed:
            updates[prop] = target[prop]
        return updates

    
class Rig(Exportable):
    """
    This class stores information about a rig.
    """
    def __init__(self, selection, scene, options):
        Exportable.__init__(self, selection, scene, options)
        self.bones = [Bone(bone, self.obj) for bone in selection.pose.bones]
