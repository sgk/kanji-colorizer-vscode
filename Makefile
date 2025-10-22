VERSION := $(shell node -p "require('./package.json').version")
VSIX := kanji-grade-colorizer-$(VERSION).vsix

.PHONY: build package install

build:
	npm run build

package: build
	npx vsce package --out $(VSIX)

install: package
	code --install-extension ./$(VSIX)
