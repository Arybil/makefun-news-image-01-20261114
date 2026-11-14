# SPDX-License-Identifier: MIT
# Copyright (c) 2026 Arybil
"""Build-time SVG rasterizer using system librsvg and Cairo via ctypes.

This tool never runs inside the contest sandbox. The runtime copies entry.png.
"""
import ctypes as c
import ctypes.util
import sys


def function(lib, name, returns, *arguments):
    call = getattr(lib, name)
    call.restype = returns
    call.argtypes = arguments
    return call


class Rectangle(c.Structure):
    _fields_ = [(key, c.c_double) for key in ('x', 'y', 'width', 'height')]


def render(source, target):
    svg = c.CDLL(ctypes.util.find_library('rsvg-2'))
    cairo = c.CDLL(ctypes.util.find_library('cairo'))
    objects = c.CDLL(ctypes.util.find_library('gobject-2.0'))
    create = function(svg, 'rsvg_handle_new_from_file', c.c_void_p, c.c_char_p, c.c_void_p)
    document = function(svg, 'rsvg_handle_render_document', c.c_int, c.c_void_p, c.c_void_p, c.POINTER(Rectangle), c.c_void_p)
    surface_new = function(cairo, 'cairo_image_surface_create', c.c_void_p, c.c_int, c.c_int, c.c_int)
    context_new = function(cairo, 'cairo_create', c.c_void_p, c.c_void_p)
    scale = function(cairo, 'cairo_scale', None, c.c_void_p, c.c_double, c.c_double)
    save = function(cairo, 'cairo_surface_write_to_png', c.c_int, c.c_void_p, c.c_char_p)
    context_free = function(cairo, 'cairo_destroy', None, c.c_void_p)
    surface_free = function(cairo, 'cairo_surface_destroy', None, c.c_void_p)
    unref = function(objects, 'g_object_unref', None, c.c_void_p)
    handle = create(source.encode(), None)
    if not handle:
        raise RuntimeError('librsvg could not read the authored SVG')
    surface = surface_new(0, 2048, 2048)
    context = context_new(surface)
    try:
        scale(context, 2, 2)
        viewport = Rectangle(0, 0, 1024, 1024)
        if not document(handle, context, c.byref(viewport), None):
            raise RuntimeError('librsvg could not render the authored SVG')
        status = save(surface, target.encode())
        if status != 0:
            raise RuntimeError(f'Cairo PNG write failed: {status}')
    finally:
        context_free(context)
        surface_free(surface)
        unref(handle)


if __name__ == '__main__':
    render(sys.argv[1], sys.argv[2])
