const routes = require('express').Router();
const path = require('path');
const constants = require('../../constants');
const fs = require('fs-extra');
const json2xml = require('json2xml');
const debug = require('../../debugger');
const route_debugger = new debug('Content Route');

route_debugger.success('Loading \'content\' API routes');

/**
 * [GET]
 * Replacement for: https://account.nintendo.net/v1/api/content/time_zones/REGION/LANGUAGE
 * Description: Sends the client an XML list of timezones
 */
routes.get('/time_zones/:region/:language', (request, response) => {
	response.set('Content-Type', 'text/xml');
	response.set('Server', 'Nintendo 3DS (http)');
	response.set('X-Nintendo-Date', new Date().getTime());

	const headers = request.headers;
	const region = request.params.region;
	const language = request.params.language;

	if (
		!headers['x-nintendo-client-id'] ||
		!headers['x-nintendo-client-secret'] ||
		!constants.VALID_CLIENT_ID_SECRET_PAIRS[headers['x-nintendo-client-id']] ||
		headers['x-nintendo-client-secret'] !== constants.VALID_CLIENT_ID_SECRET_PAIRS[headers['x-nintendo-client-id']]
	) {
		const error = {
			errors: {
				error: {
					cause: 'client_id',
					code: '0004',
					message: 'API application invalid or incorrect application credentials'
				}
			}
		};

		return response.send(json2xml(error));
	}

	if (!fs.pathExistsSync(path.join(__dirname, 'storage', 'timezones', region, language + '.xml'))) {
		const error = {
			errors: {
				error: {
					code: '0000',
					message: 'Unknown error'
				}
			}
		};

		return response.send(json2xml(error));
	}

	response.sendFile(path.join(__dirname, 'storage', 'timezones', region, language + '.xml'));
});


/**
 * [GET]
 * Replacement for: https://account.nintendo.net/v1/api/content/agreements/TYPE/REGION/VERSION
 * Description: Sends the client requested agreement
 */
routes.get('/agreements/:type/:region/:version', (request, response) => {
	response.set('Content-Type', 'text/xml');
	response.set('Server', 'Nintendo 3DS (http)');
	response.set('X-Nintendo-Date', new Date().getTime());

	const headers = request.headers;
	const type = request.params.type;
	const region = request.params.region;
	const version = request.params.version;

	// for some reason, the 3ds won't work if you have this.
	// TODO: fix this for the 3ds
	if (
		!headers['x-nintendo-client-id'] ||
		!headers['x-nintendo-client-secret'] ||
		!constants.VALID_CLIENT_ID_SECRET_PAIRS[headers['x-nintendo-client-id']] ||
		headers['x-nintendo-client-secret'] !== constants.VALID_CLIENT_ID_SECRET_PAIRS[headers['x-nintendo-client-id']]
	) {
		const error = {
			errors: {
				error: {
					cause: 'client_id',
					code: '0004',
					message: 'API application invalid or incorrect application credentials'
				}
			}
		};

		return response.send(json2xml(error));
	}

	if (!fs.pathExistsSync(path.join(__dirname, 'storage', 'agreements', type, region, version + '.xml'))) {
		const error = {
			errors: {
				error: {
					code: '1101',
					message: 'No stored agreement found for this country: ' + region + ' type: ' + type + ' and version: ' + version
				}
			}
		};

		return response.send(json2xml(error));
	}


	/*
	// ALSO NEED TO FIGURE OUT WHEN TO THROW ERROR 1102:
	let error = {
		errors: {
			error: {
				code: '1102',
				message: 'No privacy policy found for this country ' + region + ' version ' + version
			}
		}
	}

	return response.send(json2xml(error));

	// SEEMS TO BE RELATED TO THE `X-Nintendo-Region` HEADER.
	// SETTING `X-Nintendo-Region` TO 4 (and `:region` is `US`) WHEN `:type` IS `Nintendo-Network-EULA` THROWS ERROR 1102
	*/

	response.sendFile(path.join(__dirname, 'storage', 'agreements', type, region, version + '.xml'));
});

module.exports = routes;

Array.prototype.contains = function(el) { // polyfill custom Array method
	return this.indexOf(el) > -1;
};
