import path from 'path';
import { Server } from 'http';
import Express from 'express';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { match, RouterContext } from 'react-router';
import routes from './routes';
import NotFoundPage from './components/NotFoundPage';
import LDD from 'libraryd-data';
import seo from 'oip-seo';

// initialize the server and configure support for ejs templates
const app = new Express();
const server = new Server(app);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// define the folder that will be used for static assets
app.use('/static', Express.static(path.join(__dirname, 'static')));

// universal routing and rendering
app.get('*', function(req, res) {
//	console.log(req.params);
	match({ routes, location: req.url }, function (err, redirectLocation, renderProps) {
		// in case of error display the error message
		if (err) {
			return res.status(500).send(err.message);
		}

		// in case of redirect propagate the redirect to the browser
		if (redirectLocation) {
			return res.redirect(302, redirectLocation.pathname + redirectLocation.search);
		}

		// generate the React markup for the current route
		let markup;
		if (renderProps) {
			// if the current route matched we have renderProps
			markup = renderToString(<RouterContext {...renderProps}/>);
		} else {
			// otherwise we can render a 404 page
			markup = renderToString(<NotFoundPage/>);
			res.status(404);
		}

		var metaseo;

		var splits = req.params[0].split('/');
		var urlHash = splits[splits.length-1];
		if ((urlHash.length == 6 || urlHash.length == 64) && urlHash.split('.').length == 1){
			console.log(urlHash);
			if (req.params[0].includes('/player/')){
				urlHash = req.params[0].replace('/player/', '');
				console.log("Player: " + urlHash);
				LDD.getArtifact(urlHash, function(data){
					var artifact = '';

					// alexandria-media
					if (data[0]['media-data'])
						artifact = data[0]['media-data']['alexandria-media'];
					else //OIP
						artifact = data[0]['oip-041'].artifact;

					console.log(artifact);
					var playerEmbed = '';
					if (artifact.type == 'music') {
						playerEmbed = '<audio class="video" width="100%" controls><source src="https://ipfs.alexandria.io/ipfs/' + artifact.torrent + '/' + artifact.info['extra-info'].filename + '" type="audio/mpeg">Your browser does not support audio</audio>'
					} else {
						playerEmbed = '<video class="video" width="100%" controls><source src="https://ipfs.alexandria.io/ipfs/' + artifact.torrent + '/' + artifact.info['extra-info'].filename + '" type="video/mp4">Your browser does not support video</video>'
					}
					var container = '<!DOCTYPE html><html><body style="margin: 0px;"><style type="text/css"> .video { width:100%; height:auto; }</style><div class="'+artifact.type+'">'+playerEmbed+'</div></body></html>';
					
					return res.send(container);
				});
			} else {

				LDD.getArtifact(urlHash, function(data){
					if (!data[0]){
						return res.render('index', { metaseo: '', markup: markup });
					}
					

					var artifact = '';

					// alexandria-media
					if (data[0]['media-data'])
						artifact = data[0]['media-data']['alexandria-media'];
					else //OIP
						artifact = data[0]['oip-041'].artifact;

					metaseo = seo.generateTags(data[0], 'http://' + req.headers.host + req.url, req.headers.host);

					return res.render('index', { metaseo: metaseo, markup: markup });
				});
			}
		} else {			
			metaseo = '';

			// render the index template with the embedded React markup
			return res.render('index', { metaseo: '', markup: markup });
		}
	});
});

// start the server
const port = process.env.PORT || 3000;
const env = process.env.NODE_ENV || 'production';
server.listen(port, err => {
	if (err) {
		return console.error(err);
	}
	console.info(`Server running on http://localhost:${port} [${env}]`);
});