"""Render exported, actual SVG cells at mobile size without a browser server."""
import ctypes as C
import ctypes.util
import sys
from pathlib import Path

source, destination, size = sys.argv[1], sys.argv[2], int(sys.argv[3])
svg = C.CDLL(ctypes.util.find_library('rsvg-2'))
cairo = C.CDLL(ctypes.util.find_library('cairo'))
gobject = C.CDLL(ctypes.util.find_library('gobject-2.0'))
svg.rsvg_handle_new_from_file.argtypes = [C.c_char_p, C.c_void_p]
svg.rsvg_handle_new_from_file.restype = C.c_void_p
svg.rsvg_handle_render_cairo.argtypes = [C.c_void_p, C.c_void_p]
svg.rsvg_handle_render_cairo.restype = C.c_int
cairo.cairo_image_surface_create.argtypes = [C.c_int, C.c_int, C.c_int]
cairo.cairo_image_surface_create.restype = C.c_void_p
cairo.cairo_create.argtypes = [C.c_void_p]
cairo.cairo_create.restype = C.c_void_p
cairo.cairo_scale.argtypes = [C.c_void_p, C.c_double, C.c_double]
cairo.cairo_surface_write_to_png.argtypes = [C.c_void_p, C.c_char_p]
cairo.cairo_surface_write_to_png.restype = C.c_int
cairo.cairo_destroy.argtypes = [C.c_void_p]
cairo.cairo_surface_destroy.argtypes = [C.c_void_p]
gobject.g_object_unref.argtypes = [C.c_void_p]
handle = svg.rsvg_handle_new_from_file(str(Path(source).resolve()).encode(), None)
if not handle:
    raise RuntimeError('SVG could not be loaded')
surface = cairo.cairo_image_surface_create(0, size, size)
context = cairo.cairo_create(surface)
cairo.cairo_scale(context, size / 1000, size / 1000)
try:
    if not svg.rsvg_handle_render_cairo(handle, context):
        raise RuntimeError('SVG could not be rendered')
    if cairo.cairo_surface_write_to_png(surface, str(Path(destination).resolve()).encode()):
        raise RuntimeError('PNG could not be saved')
finally:
    cairo.cairo_destroy(context)
    cairo.cairo_surface_destroy(surface)
    gobject.g_object_unref(handle)
print(destination)
