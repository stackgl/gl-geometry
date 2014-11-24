var normalize = require('./normalize')
var createVAO = require('gl-vao')

module.exports = GLGeometry

function GLGeometry(gl) {
  if (!(this instanceof GLGeometry))
    return new GLGeometry(gl)

  this._attributes = []
  this._dirty = true
  this._length = 0
  this._index = null
  this._vao = null
  this._keys = []
  this.gl = gl
}

GLGeometry.prototype.dispose = function() {
  for (var i = 0; i < this._attributes.length; i++) {
    this._attributes[i].buffer.dispose()
  }

  this._attributes = []

  if (this._index) {
    this._index.dispose()
    this._index = null
  }

  if (this._vao) {
    this._vao.dispose()
    this._vao = null
  }
}

GLGeometry.prototype.faces = function faces(attr, opts) {
  var size = opts && opts.size || 3
  attr = attr.cells ? attr.cells : attr

  this._dirty = true

  if (this._index) {
    this._index.dispose()
  }

  this._index = normalize(this.gl
    , attr
    , size
    , this.gl.ELEMENT_ARRAY_BUFFER
    , 'uint16'
  )

  this._length = this._index.length * size
  this._index = this._index.buffer

  return this
}

GLGeometry.prototype.attr = function attr(name, attr, opts) {
  opts = opts || {}
  this._dirty = true

  var gl = this.gl
  var first = !this._attributes.length
  var size = opts.size || 3

  var attribute = normalize(gl, attr, size, gl.ARRAY_BUFFER, 'float32')
  if (!attribute) {
    throw new Error(
        'Unexpected attribute format: needs an ndarray, array, typed array, '
      + 'gl-buffer or simplicial complex'
    )
  }

  var buffer = attribute.buffer
  var length = attribute.length
  var index  = attribute.index

  this._keys.push(name)
  this._attributes.push({
      size: size
    , buffer: buffer
  })

  if (first) {
    this._length = length
  }

  if (first && index) {
    this._index = index
  }

  return this
}

GLGeometry.prototype.bind = function bind(shader) {
  this.update()
  this._vao.bind()

  if (!shader) return
  shader.bind()

  if (!this._keys) return
  for (var i = 0; i < this._keys.length; i++) {
    var attr = shader.attributes[this._keys[i]]
    if (attr) attr.location = i
  }
}

GLGeometry.prototype.draw = function draw(mode) {
  this.update()
  this._vao.draw(typeof mode === 'undefined'
    ? this.gl.TRIANGLES
    : mode
  , this._length)
}

GLGeometry.prototype.unbind = function unbind() {
  this.update()
  this._vao.unbind()
}

GLGeometry.prototype.update = function update() {
  if (!this._dirty) return
  this._dirty = false
  if (this._vao) this._vao.dispose()

  this._vao = createVAO(
      this.gl
    , this._attributes
    , this._index
  )
}
