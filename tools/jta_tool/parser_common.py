

class ParserError(Exception):
    pass


class ModelParser(object):
    def __init__(self, model_path):
        self.path = model_path
        self.verts = []
        self.normals = []
        self.tcoords = []

        self.parse()

    def parse(self):
        raise NotImplementedError("Model Parsing")
