
import struct
from parser_common import ModelParser, ParserError


class BinarySTLParser(ModelParser):
    def parse(self, fileob):
        fileob.seek(80) # skip the header
        count = struct.unpack("<I", fileob.read(4))[0]
        for i in range(count):
            #fileob.read(12) # skip the normal vector # FIXME
            face_normal = struct.unpack("<3f", fileob.read(12))
            for n in range(3):
                self.normals += face_normal
            for v in range(3):
                self.verts += struct.unpack("<3f", fileob.read(12))
            fileob.read(2) # skip the attribute bytes


class STLParser(ModelParser):
    def parse(self, raw_data):
        raise ParserError()
