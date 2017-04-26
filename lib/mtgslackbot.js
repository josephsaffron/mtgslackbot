'use strict';
var MemoryDataStore = require('@slack/client').MemoryDataStore
var
	querystring = require('querystring'),
	request = require('request'),

	RtmClient = require('@slack/client').RtmClient,
	CLIENT_EVENTS = require('@slack/client').CLIENT_EVENTS,
	slack = new RtmClient(process.env.SLACK_TOKEN || '', {dataStore: new MemoryDataStore()});

var CARD_COMMAND = '/card ';
var API_COMMAND = '/api';
var myself;

slack.on('error', onError);
slack.on(CLIENT_EVENTS.RTM.AUTHENTICATED, onOpen);
slack.on('message', onMessage);
slack.start();

function onError(error) {
	console.error('Error', error);
}

function onOpen(rtmStartData) {
	console.log('Connected to ' + rtmStartData.team.name + ' as @' + rtmStartData.self.name);
	myself = rtmStartData.self;
}

function onMessage(message) {
	console.log('got message');
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
		console.log ('invalid message');
		return;
	}

	console.log('Acting on message: ' + messageText);
	var	channel = slack.dataStore.getChannelGroupOrDMById(message.channel);

	if (messageText.indexOf(API_COMMAND) >= 0){
		var apirequest = messageText.substr(messageText.indexOf(API_COMMAND) + API_COMMAND.length);
		request('https://api.deckbrew.com/mtg' + apirequest,
			function(error, response, body){
				if (!error && response.statusCode == 200) {
					var apiResponse = JSON.parse(body);
					if (typeof apiResponse !== 'undefined' && apiResponse.length > 0){
						var card = apiResponse[0];
						slack.sendMessage.send(
							body,
							channel.id
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
					slack.sendMessage(
						'Found ' +
						apiResponse.length +
						' cards that match your search.\n' +
						card.editions[0].image_url,
						channel.id
					);
				}
			} else {
				console.error( error + body);
			}
		}
	);
}

function isMentioned(text) {
	var id = '<@' + myself.id + '>';
	return text.indexOf(id) >= 0;
}

var http = require('http');

var server = http.createServer(function(request, response){});

server.listen(process.env.PORT || 5000);
