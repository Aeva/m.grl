
from parser_common import ModelParser, VertexGroup


class GroupBuilder(object):
    def __init__(self, group_name="default"):
        self.name = group_name
        self.verts = []
        self.tcoords = []
        self.normals = []
        self.faces = []
        self.data = VertexGroup(group_name)

    def write_elements(self, vert, tcoord=None, norm=None):
        self.data.position += self.verts[vert]
        if tcoord is not None:
            self.data.tcoord += self.tcoords[tcoord]
        if norm is not None:
            self.data.normal += self.normals[norm]




class OBJParser(ModelParser):
    def calculate_normals(self):
        raise NotImplementedError("Calculating Normals")

    def __transpose(self, data):
        if self.transpose:
            return [data[0], data[2], data[1]]
        else:
            return data

    def parse(self, raw_data):
        groups = []
        groups.append(GroupBuilder())
        for raw_line in raw_data.readlines():
            line = raw_line.strip()
            if line.startswith("#") or not line:
                continue
            
            parts = line.split(" ")
            command = parts.pop(0)
            
            if command == "g":
                # define a new group
                new_group = GroupBuilder(" ".join(parts))
                if len(groups[-1].verts):
                    # remove the last group if it doesn't have any
                    # data
                    groups.pop()
                groups.append(new_group)
                continue

            if command == "v":
                # store vertex position
                groups[-1].verts.append(self.__transpose(map(float, parts)))
                continue

            if command == "vt":
                # store optional texture coordinates
                groups[-1].tcoords.append(map(float, parts))
                continue

            if command == "vn":
                # store optional surface normal
                groups[-1].normals.append(self.__transpose(map(float, parts)))
                self.generate_normals = False
                continue

            if command == "f":
                # lookup the data associated to a given face and store
                # it in the actual vertex group object

                # triangulate quads
                tris = []
                assert len(parts) == 3 or len(parts) == 4
                if len(parts) == 3:
                    tris.append(parts)
                else:
                    # FIXME is this correct?
                    tris.append(parts[0:2])
                    tris.append(parts[1:3])

                # parse out the indicies and write them to the actual
                # vertex group object:
                for tri in tris:
                    for chunk in tri:
                        indices = [int(n)-1 if n!="" else None \
                                   for n in chunk.split("/")]
                        groups[-1].write_elements(*indices)
                continue
        for group in groups:
            self.groups.append(group.data)




class MTLParser(ModelParser):
    pass
