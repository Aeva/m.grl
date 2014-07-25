
import struct
from parser_common import ModelParser, ParserError, VertexGroup


class BinarySTLParser(ModelParser):
    def parse(self, fileob):
        group = VertexGroup()
        self.groups.append(group)
        
        fileob.seek(80) # skip the header
        count = struct.unpack("<I", fileob.read(4))[0]
        for i in range(count):
            #fileob.read(12) # skip the normal vector # FIXME
            face_normal = struct.unpack("<3f", fileob.read(12))
            if face_normal != (0,0,0):
                # Either by spec or by of custom, if all of the
                # normals in an STL file are (0,0,0), then the normals
                # are instead to be calculated from the order of the
                # verticies "via the right hand rule"
                # - https://en.wikipedia.org/wiki/STL_format#The_facet_normal
                self.generate_normals = False

            for n in range(3):
                group.normal += face_normal
            for v in range(3):
                group.position += struct.unpack("<3f", fileob.read(12))
            fileob.read(2) # skip the attribute bytes


class STLParser(ModelParser):
    def parse(self, raw_data):
        raise ParserError()
