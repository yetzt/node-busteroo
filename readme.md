# Busteroo

Adds a Cache-Busting Query String to references in files.

## Install

`npm i -g busteroo`

## Usage

`busteroo -b <breaker string> -t <extensions> -d <extensions> <path>`
	
* `-b` string added to query string
* `-t` comma separated list of extensions of files to check, can be `html`, `js`, `css`
* `-d` comma separated list of destionation extensions of references to change
* `path` directory to be scanned

## Example

`busteroo -b 1 -t html,js -d jpeg,jpg,gif,png ./website`

This would add `?1` after all references to images in .html and .js files in the dir `./website`

## License

[Unlicense](http://unlicense.org/UNLICENSE)