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


import base64
import numpy


class Base64Array(object):
    """
    Implements the machinery needed to encode arrays to base64 encoded
    binary data.  The signed parameter is only applicable when the
    type is 'int'.
    """
    def __init__(self, period=3, typed=float, precision=16, signed=True):
        assert period in [1, 2, 3, 4, 9, 16]
        assert typed in [int, float]
        assert precision in [16, 32]
        self.hint = None
        self.dtype = None
        self.period = period
        self.data = []
        self.count = 0
        if typed == int:
            if precision == 16:
                if signed:
                    self.dtype = numpy.int16
                else:
                    self.dtype = numpy.uint16
            elif precision == 32:
                if signed:
                    self.dtype = numpy.int32
                else:
                    self.dtype = numpy.uint32
            if signed:
                self.hint = "Int{0}Array".format(precision)
            else:
                self.hint = "Uint{0}Array".format(precision)
        elif typed == float:
            if precision == 16:
                self.dtype = numpy.float16
            elif precision == 32:
                self.dtype = numpy.float32
            self.hint = "Float{0}Array".format(precision)

    def add_vector(self, *data):
        assert len(data) == self.period
        self.data += data
        self.count += 1

    def export(self):
        ar = numpy.ndarray(shape=(len(self.data)), buffer=None, dtype=self.dtype)
        for i in range(len(self.data)):
            ar[i] = self.data[i]
        return {
            "type" : "Array",
            "hint" : self.hint,
            "item" : self.period,
            "data" : base64.b64encode(ar.tostring()).decode("ascii"),
        }


class Float16Array(Base64Array):
    """
    Type for floating point data arrays.
    """
    def __init__(self, period=3):
        Base64Array.__init__(self, period, typed=float, precision=16)


class IntArray(Base64Array):
    """
    Type for integer data arrays.
    """
    def __init__(self, period, signed=True, precision=16):
        Base64Array.__init__(self, period, typed=int, precision=precision, signed=signed)
