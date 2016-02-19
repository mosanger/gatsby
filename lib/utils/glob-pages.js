import glob from 'glob'
import path from 'path'
import parsePath from 'parse-filepath'
import fs from 'fs'
import frontMatter from 'front-matter'
import htmlFrontMatter from 'html-frontmatter'
import _ from 'underscore'
const debug = require('debug')('gatsby:glob')

module.exports = (directory, callback) => {
  const pagesData = []

  const app = require(`${directory}/app`)

  // Make this list easy to modify through the config?
  // Or just keep adding extensions...?
  const globQuery = '/pages/**/?(*.coffee|*.cjsx|*.jsx|*.js|*.md|*.html)'
  glob(`directory${globQuery}`, null, (err, pages) => {
    if (err) { return callback(err) }

    pages.forEach((page) => {
      let parsed
      let ext
      const pageData = {}
      pageData.file = {}

      pageData.file = parsed = parsePath(path.relative(`${directory}/pages`, page))

      pageData.file.ext = ext = parsed.extname.slice(1)

      // Determine require path
      pageData.requirePath = path.relative(`${directory}/pages`, page)

      // Load data for each file type.
      let data
      if (ext === 'md') {
        const rawData = frontMatter(fs.readFileSync(page, 'utf-8'))
        data = _.extend({}, rawData.attributes)
        pageData.data = data
      } else if (ext === 'html') {
        const html = fs.readFileSync(page, 'utf-8')
        data = _.extend({}, htmlFrontMatter(html), { body: html })
        pageData.data = data
      } else {
        data = {}
      }

      // Determine path for page (unless it's a file that starts with an
      // underscore as these don't become pages).
      if (!(parsed.name.slice(0, 1) === '_')) {
        if (data.path) {
          // Path was hardcoded.
          pageData.path = data.path
        } else if (app.rewritePath) {
          pageData.path = app.rewritePath(parsed, pageData)
        }

        // If none of the above options set a path.
        if (!(pageData.path !== null)) {
          // If this is an index page or template, it's path is /foo/bar/
          if (parsed.name === 'index' || parsed.name === 'template') {
            if (parsed.dirname === '') {
              pageData.path = '/'
            } else {
              pageData.path = `/${parsed.dirname}/`
            }
          // Else if not an index, create a path like /foo/bar/
          // and rely upon static-site-generator-webpack-plugin to add index.html
          } else {
            if (parsed.dirname === '') {
              pageData.path = `/${parsed.name}/`
            } else {
              pageData.path = `/${parsed.dirname}/${parsed.name}/`
            }
          }
        }

      // Set the "template path"
      } else if (parsed.name === '_template') {
        pageData.templatePath = `/${parsed.dirname}/`
      }

      pagesData.push(pageData)
    })

    debug('globbed', pagesData.length, 'pages')
    return callback(null, pagesData)
  })
}