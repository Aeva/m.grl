from setuptools import setup

setup(name="jta_tool",
      version="zero",
      description="",
      url="http://pirateradiotheater.org/files/m.grl/demos/",
      author="Aeva Palecek",
      author_email="",
      license="GPLv3",
      packages=["jta_tool"],
      zip_safe=False,
      
      entry_points = {
          "console_scripts" : [
              "jta_tool=jta_tool.jta_tool:main",
              ],
      },

      install_requires = [
      ])
