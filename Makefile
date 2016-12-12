all:
	./build.sh

clean:
	git checkout \
		mgrl.js \
		templates/basic_project.zip \
		templates/basic_project/libs/mgrl.js \
		templates/common_assets/libs/mgrl.js

.PHONY: all clean
