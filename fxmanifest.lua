fx_version 'cerulean'
game 'gta5'

author 'resource_name'
description 'Simple reusable TypeScript boilerplate for FiveM resources'
version '1.0.0'

ui_page 'dist/web/index.html'

files {
  'dist/web/index.html',
  'dist/web/style.css',
  'dist/web/app.js'
}

server_scripts {
  'dist/server/main.js'
}

client_scripts {
  'dist/client/main.js'
}
