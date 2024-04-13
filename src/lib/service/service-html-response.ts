import { ServerResponse } from 'http';

/**
 * Return status 200 HTML with standard headers
 * @param res response object
 * @param title <title> content
 * @param body contents of <body>
 */
export function serviceHTMLResponse(res: ServerResponse & { _responded?: boolean }, title: string, body: string): void {
  try {
    res['_responded'] = true;
    res.setHeader('Content-Type', 'text/html');
    res.write(`<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>Webdir ${title}</title>
    <link rel="stylesheet" href="/.webdir/directory-index.css">
  </head>
  <body>
  <script>
  try {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.body.className = 'dark';
    }
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
      try {
        document.body.className = event.matches ? 'dark' : '';
      } catch (e) {}
    });
  } catch (e) {}
  </script>
${body}  </body>
</html>`);
    res.end();
  } catch (e) {}
}
