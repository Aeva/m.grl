

class ParserError(Exception):
    pass


class VertexGroup(object):
    def __init__(self, group_name="default"):
        self.name = group_name
        self.position = []
        self.normal = []
        self.tcoord = []


class ModelParser(object):
    def __init__(self, model_path, transpose=True):
        self.path = model_path
        self.transpose = transpose

        self.groups = []
        self.generate_normals = True

        self.parse(open(self.path, "r"))

        if self.generate_normals:
            self.calculate_normals()

    def parse(self, raw_data):
        raise NotImplementedError("Model Parsing")

    def calculate_normals(self):
        raise NotImplementedError("Calculating Normals")
