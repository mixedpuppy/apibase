ifeq ($(OS),Windows_NT)
BIN_DIR = Scripts
else
BIN_DIR = bin
endif

APPNAME = apibase
PKGNAME = apibase
DEPS = hg-mixedpuppy:jsonor
VIRTUALENV = virtualenv
NOSE = $(BIN_DIR)/nosetests
NOSETESTS_ARGS = -s
NOSETESTS_ARGS_C = -s --with-xunit --with-coverage --cover-package=$(APPNAME) --cover-erase
TESTS = $(APPNAME)/tests
PYTHON = $(BIN_DIR)/python
version = $(shell $(PYTHON) setup.py --version)
tag = $(shell grep tag_build setup.cfg  | cut -d= -f2 | xargs echo )

# *sob* - just running easy_install on Windows prompts for UAC...
ifeq ($(OS),Windows_NT)
EZ = $(PYTHON) $(BIN_DIR)/easy_install-script.py
else
EZ = $(BIN_DIR)/easy_install
endif
COVEROPTS = --cover-html --cover-html-dir=html --with-coverage --cover-package=linkdrop
COVERAGE := coverage
PYLINT = $(BIN_DIR)/pylint
PKGS = linkdrop

GIT_DESCRIBE := `git describe --long`

ifeq ($(TOPSRCDIR),)
  export TOPSRCDIR = $(shell pwd)
endif

web_dir=$(TOPSRCDIR)/web/dev
static_dir=$(TOPSRCDIR)/web/$(version)
webbuild_dir=$(TOPSRCDIR)/tools/webbuild
requirejs_dir=$(webbuild_dir)/requirejs

SLINK = ln -sf
ifneq ($(findstring MINGW,$(shell uname -s)),)
  SLINK = cp -r
  export NO_SYMLINK = 1
endif

web: $(static_dir)

$(static_dir):
	rsync -av $(web_dir)/ $(static_dir)/

	perl -i -pe "s:VERSION='[^']+':VERSION='$(version)':" $(TOPSRCDIR)/setup.py

	find $(static_dir) -name \*.html | xargs perl -i -pe 's:/dev/:/$(version)/:go'

	cd $(static_dir) && $(requirejs_dir)/build/build.sh build.js

clean:
	rm -rf $(static_dir)
	rm -f $(APPNAME).spec

dist:   $(APPNAME).spec
	$(PYTHON) setup.py sdist --formats gztar,zip
	# This is so Hudson can get stable urls to this tarball
	ln -sf $(APPNAME)-$(version)$(tag).tar.gz dist/$(APPNAME)-current.tar.gz

rpm:	$(APPNAME).spec
	$(PYTHON) setup.py bdist_rpm

$(APPNAME).spec: $(APPNAME).spec.in Makefile tools/makespec
	tools/makespec $(version)$(tag) $(PKGNAME).egg-info/requires.txt $(GIT_DESCRIBE) < $(APPNAME).spec.in > $(APPNAME).spec

build:
	$(VIRTUALENV) --no-site-packages --distribute .
	$(PYTHON) build.py $(APPNAME) $(DEPS)
	$(EZ) nose
	$(EZ) WebTest
	$(EZ) Funkload
	$(EZ) pylint
	$(EZ) coverage

test:
	$(NOSE) $(NOSETESTS_ARGS) $(TESTS)

coverage:
	$(NOSE) $(NOSETESTS_ARGS_C) $(TESTS)
	$(COVERAGE) xml

.PHONY: xpi clean dist rpm build test coverage web $(static_dir)
