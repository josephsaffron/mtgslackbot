'use strict';

var
	querystring = require('querystring'),
	request = require('request'),
	Slack = require('slack-client'),
	slack = new Slack(process.env.SLACK_TOKEN || '');


var CARD_COMMAND = '/card ';
var API_COMMAND = '/api';

slack.on('error', onError);
slack.on('open', onOpen);
slack.on('message', onMessage);
slack.login();

function onError(error) {
	console.error('Error', error);
}

function onOpen() {
	console.log('Connected to ' + slack.team.name + ' as @#' + slack.self.name);
}

function onMessage(message) {
	var messageText = message.text;

	if (!messageText && message.message && message.message.text) {
		messageText = message.message.text;
	}

	// Is this a valid message?
	if (!messageText
		|| message.type !== 'message'
		|| message.subtype === 'bot_message' // bots are ignored, including ourselves
		|| !isMentioned(messageText)
		|| (messageText.indexOf(CARD_COMMAND) < 0 && messageText.indexOf(API_COMMAND) < 0)
	) {
		console.log('invalid message ' + message);
		return;
	}

	console.log('Acting on message: ' + messageText);

	var	channel = slack.getChannelGroupOrDMByID(message.channel);

	if (messageText.indexOf(API_COMMAND) >= 0){
		var apirequest = messageText.substr(messageText.indexOf(API_COMMAND) + API_COMMAND.length);
		request('https://api.deckbrew.com/mtg' + apirequest,
			function(error, response, body){
				if (!error && response.statusCode == 200) {
					var apiResponse = JSON.parse(body);
					if (typeof apiResponse !== 'undefined' && apiResponse.length > 0){
						var card = apiResponse[0];
						channel.send(
							body
						);
					}
				} else {
					console.error( error + body);
				}
			}
		);
		return;
	}

	var cardName = messageText.substr(messageText.indexOf(CARD_COMMAND) + CARD_COMMAND.length);

	console.log('Resolved card name: ' + cardName);
	request('https://api.deckbrew.com/mtg/cards/typeahead?q=' + querystring.escape(cardName),
		function(error, response, body){
			if (!error && response.statusCode == 200) {
				var apiResponse = JSON.parse(body);
				if (typeof apiResponse !== 'undefined' && apiResponse.length > 0){
					var card = apiResponse[0];
					channel.send(
						'Found ' +
						apiResponse.length +
						' cards that match your search.\n' +
						card.editions[0].image_url
					);
				}
			} else {
				console.error( error + body);
			}
		}
	);
}

function isMentioned(text) {
	var id = '<@' + slack.self.id + '>';
	return text.indexOf(id) >= 0;
}

var http = require('http');

var server = http.createServer(function(request, response){});

server.listen(process.env.PORT || 5000);
