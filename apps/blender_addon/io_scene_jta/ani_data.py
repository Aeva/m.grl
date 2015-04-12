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
import bpy


def frame_to_time(frame_number):
    """
    Returns the timestamp for a give frame number.
    """
    raw_time = frame_number / bpy.context.scene.render.fps
    return raw_time * 1000.0


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
                if old_value != new_value:
                    changed[prop] = current[prop]
                    cache[obj.name][prop] = changed[prop]
                    break
        if changed:
            updates[obj.name] = changed            

    else:
        cache[obj.name] = current
        updates[obj.name] = current

    return current


def has_bone_ancestor(obj):
    """
    Returns true if the object claims a bone as an ancestor.
    """
    if obj.parent_bone:
        return True
    elif obj.parent:
        return has_bone_ancestor(obj.parent)
    else:
        return False
    
    
def export_keyframes(scene, export_meshes, export_empties, export_rigs):
    """
    Returns an object storing animation keyframe data for export.
    """
    container = {}

    # FIXME actions should be cut out into their own class
    for action in bpy.data.actions:
        name = action.name
        start, stop = map(int, action.frame_range)
        container[name] = {
            "duration" : frame_to_time(stop - start),
            "repeat" : False,
            "track" : [],
        }

        # figure out where the keyframes are
        frames = [start, stop]
        for fcurve in action.fcurves:
            for point in fcurve.keyframe_points:
                frames.append(int(point.co.x))
        frames = list(set(frames))
        frames.sort()

        # for each frame, find the set of all objects with
        # changes.  Note, I think this is not the correct way to
        # do this.
        cache = {}
        first = True
        for frame in frames:
            scene.frame_set(frame)
            updates = {}
            # check bones for updates
            for rig in export_rigs:
                for bone in rig.bones:
                    if first:
                        changed = bone.regen_transforms()
                        updates[bone.name] = changed
                        cache[bone.name] = changed.copy()
                    else:
                        changed = bone.updates_since(cache[bone.name])
                        if changed:
                            updates[bone.name] = changed
                            for key, value in changed.items():
                                cache[bone.name][key] = value

            # check other objecs for updates
            for group in [export_meshes, export_empties]:
                for entity in group:
                    if not has_bone_ancestor(entity.obj):
                        ani_transforms(entity, cache, updates, first)

            first = False
            if updates:
                keyframe = {
                    "frame" : frame_to_time(frame),
                    "updates" : updates,
                }
                container[name]["track"].append(keyframe)
                
    return container
