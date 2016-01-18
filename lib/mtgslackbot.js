'use strict';

var
	querystring = require('querystring'),
	request = require('request'),
	Slack = require('slack-client'),
	slack = new Slack(process.env.SLACK_TOKEN || '');

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
		|| messageText.indexOf('/card') < 0
	) {
		return;
	}

	console.log('Acting on message: ' + messageText);

	var	channel = slack.getChannelGroupOrDMByID(message.channel);

	var cardName = messageText.substr(messageText.indexOf('/card') + 6);

	console.log('Resolved card name: ' + cardName);
	request('https://api.deckbrew.com/mtg/cards?name=' + querystring.escape(cardName),
		function(error, response, body){
			console.log(body);
			if (!error && response.statusCode == 200) {
				var apiResponse = JSON.parse(body);
				if (typeof apiResponse !== 'undefined' && apiResponse.length > 0){
					var card = apiResponse[0];
					channel.send(card.editions[0].image_url);
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