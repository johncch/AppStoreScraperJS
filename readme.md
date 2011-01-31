# Apple iTunes App Store web scraper

## Introduction
This is the script I used to pull icons from Apple's iTunes app store. It runs on node.js 0.26 with a few npm libraries such as step, sqlite and jquery.

The code is pretty messy but it works. There's some soft of basic redundancy support so if the code crashes for some reason, it can restart and continue off the same spot. This script uses a modified version of http-agent (adds a addUrlInFront method) so the dependencies are required via npm.

Therefore, this script is highly dependent on the availability of npm. To run, simply type

    node startScrape.js

This scripts takes in a file, allGenres.txt that includes a 20 category file manually parsed by hand. Technically speaking it can be crawled but it just happened to be convenient to manually parse it.

If you happen to chance upon it, have fun.

## Questions
email me at johncch @ gmail.com

## License

The MIT License

Copyright (c) 2010 Chong Han Chua

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

