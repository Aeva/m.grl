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

import bpy
import mathutils
import bpy_extras.io_utils


def mesh_triangulate(me):
    import bmesh
    bm = bmesh.new()
    bm.from_mesh(me)
    bmesh.ops.triangulate(bm, faces=bm.faces)
    bm.to_mesh(me)
    bm.free()


def save(operator, context, options={}):
    """Implement the actual exporter for JTA files."""

    scene = context.scene
    # Exit edit mode before exporting, so current object states are exported properly.
    if bpy.ops.object.mode_set.poll():
        bpy.ops.object.mode_set(mode='OBJECT')

    print("JTA Export path: {0}".format(options["filepath"]))
    start_time = time.time()

    if options["use_selection"]:
        objects = context.selected_objects
    else:
        objects = scene.objects

    container = {}
    if not options["meta_license"] == "none":
        try:
            license_uri = {
                "CC0" : "http://creativecommons.org/publicdomain/zero/1.0/",
                "CC-BY" : "https://creativecommons.org/licenses/by/4.0/",
                "CC-BY-SA" : "https://creativecommons.org/licenses/by-sa/4.0/",
            }[options["meta_license"]]
        except:
            license_uri = ""

        container["meta"] = {
            "author" : options["meta_author"],
            "url" : options["meta_url"],
            "license" : license_uri,
        }

    with open(options["filepath"], "w", encoding="utf8", newline="\n") as out_file:
        json.dump(container, out_file)
    
    print("JTA Export time: %.2f" % (time.time() - start_time))
    return {"FINISHED"}
