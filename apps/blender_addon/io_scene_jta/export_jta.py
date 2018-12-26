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
import os.path

import bpy
import bmesh
import mathutils
import bpy_extras.io_utils

from .common import Empty
from .texture_data import TextureStore
from .model_data import Model, Attribute
from .ani_data import export_keyframes
from .rig_data import Rig


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
        if selection.instance_type == "NONE" and selection.type == "MESH":
            model = Model(selection, scene, options, texture_store)
            if not model.face_vertices:
                print("Skipping empty mesh {0}".format(selection))
            else:
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
            if selection.instance_type != "NONE":
                print("Skipping object {0} of instance_type {1}".format(selection, selection.instance_type))
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

    # export renderable data
    for attr in attr_sets:
        container["attributes"].append(attr.export())
    for model in export_meshes:
        container["models"][model.obj.name] = model.export()

    # create object for empties and bones
    if export_empties or export_rigs:
        container["empties"] = {}

    # export empties
    for empty in export_empties:
        container["empties"][empty.obj.name] = empty.export()

    # export bones
    for rig in export_rigs:
        container["empties"][rig.obj.name] = rig.export()
        for bone in rig.bones:
            container["empties"][bone.name] = bone.data

    # export keyframes, if applicable
    if len(bpy.data.actions):
        container["ani"] = export_keyframes(
            scene, export_meshes, export_empties, export_rigs)
    
    # add packed data if applicable
    container["packed_data"] = texture_store.export()

    with open(options["filepath"], "w", encoding="utf8", newline="\n") as out_file:
        json.dump(container, out_file)

    print("JTA Export time: %.2f" % (time.time() - start_time))
    return {"FINISHED"}
