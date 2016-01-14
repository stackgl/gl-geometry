var pack         = require('array-pack-2d')
var ista         = require('is-typedarray')
var createBuffer = require('gl-buffer')
var isnd         = require('isndarray')
var dtype        = require('dtype')

module.exports = normalize

function normalize(gl, attr, size, mode, type) {
  // if we get a nested 2D array
  if (Array.isArray(attr) && Array.isArray(attr[0])) {
    return {
        buffer: createBuffer(gl, pack(attr, type), mode)
      , length: attr.length
    }
  }

  // if we get a nested 2D array (with the second array being typed)
  if (Array.isArray(attr) && ista(attr[0])) {
    return {
        buffer: createBuffer(gl, pack(attr, type), mode)
      , length: ( attr.length * attr[0].length ) / size
    }
  }

  // if we get a 1D array
  if (Array.isArray(attr)) {
    return {
        buffer: createBuffer(gl, new (dtype(type))(attr), mode)
      , length: attr.length / size
    }
  }

  // if we get a gl-buffer
  if (attr.handle instanceof WebGLBuffer) {
    return {
        buffer: attr
      , length: attr.length / size / 4
    }
  }

  // if we get an ndarray
  if (isnd(attr)) {
    return {
        buffer: createBuffer(gl, attr, mode)
      , length: ndlength(attr.shape) / size
    }
  }

  // if we get a typed array
  if (ista(attr)) {
    if (type && !(attr instanceof dtype(type))) {
      attr = convert(attr, dtype(type))
    }

    return {
        buffer: createBuffer(gl, attr, mode)
      , length: attr.length / size
    }
  }
}

function ndlength(shape) {
  var length = 1
  for (var i = 0; i < shape.length; i++)
    length *= shape[i]

  return length
}

function convert(a, b) {
  b = new b(a.length)
  for (var i = 0; i < a.length; i++) b[i] = a[i]
  return b
}
