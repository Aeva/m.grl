#!/usr/bin/env python

import sys, os.path
import gi
gi.require_version("WebKit", "3.0")
from gi.repository import WebKit, Gtk, GObject


class MainWindow(Gtk.Window):
    def __init__(self, *args, **kargs):
        Gtk.Window.__init__(self, *args, **kargs)
        self.set_default_size(1024, 768)
        self.connect("destroy", Gtk.main_quit)
        self.webview = WebKit.WebView()
        settings = self.webview.get_settings()
        settings.set_property("enable-webgl", True)
        settings.set_property("enable-developer-extras", True)


        self.add(self.webview)
        self.show_all()
        self.webview.open("http://localhost:8000/demos/06_models")
        

if __name__ == "__main__":
    w = MainWindow()
    Gtk.main()
